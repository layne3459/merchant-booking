import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { normalizeNumericIds } from '../../common/utils/numeric-ids';
import { ErrorCodes } from '../../common/constants/error-codes';
import { CardDeductMode, findCardType, mergeCardTypes } from '../../common/constants/card-types';
import { formatCardNo } from '../../common/utils/card-no';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class CardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentService))
    private readonly payment: PaymentService,
  ) {}

  private async getShopCardTypes(shopId: bigint) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { cardTypes: true },
    });
    return mergeCardTypes(shop?.cardTypes);
  }

  private resolveDeductMode(cardTypes: ReturnType<typeof mergeCardTypes>, typeId: number): CardDeductMode {
    return findCardType(cardTypes, typeId)?.deductMode ?? 'times';
  }

  async listMy(user: JwtPayload) {
    const shopId = BigInt(user.shopId);
    const [cards, cardTypes] = await Promise.all([
      this.prisma.memberCard.findMany({
        where: {
          shopId,
          memberId: BigInt(user.sub),
          status: 1,
        },
        include: { template: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.getShopCardTypes(shopId),
    ]);
    return cards.map((c) => this.serializeCard(c, c.template.name, cardTypes));
  }

  async getOne(user: JwtPayload, id: number) {
    const shopId = BigInt(user.shopId);
    const [card, cardTypes] = await Promise.all([
      this.prisma.memberCard.findFirst({
        where: {
          id: BigInt(id),
          shopId,
          memberId: BigInt(user.sub),
        },
        include: {
          template: true,
          transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      }),
      this.getShopCardTypes(shopId),
    ]);
    if (!card) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '会员卡不存在');
    }
    return {
      ...this.serializeCard(card, card.template.name, cardTypes),
      transactions: card.transactions.map((t) => ({
        id: Number(t.id),
        type: t.type,
        amount: t.amount,
        beforeValue: t.beforeValue,
        afterValue: t.afterValue,
        createdAt: t.createdAt,
      })),
    };
  }

  async purchase(user: JwtPayload, templateId: number) {
    const template = await this.prisma.cardTemplate.findFirst({
      where: {
        id: BigInt(templateId),
        shopId: BigInt(user.shopId),
        status: 1,
      },
    });
    if (!template) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '卡种不存在');
    }

    const payment = await this.payment.createCardPayment(
      user,
      Number(template.id),
      template.price,
    );

    return {
      templateId: Number(template.id),
      templateName: template.name,
      amount: template.price,
      payment,
    };
  }

  async openCardFromPayment(
    shopId: bigint,
    memberId: bigint,
    templateId: bigint,
    paymentId: bigint,
  ) {
    const template = await this.prisma.cardTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) return;

    const cardTypes = await this.getShopCardTypes(shopId);
    const deductMode = this.resolveDeductMode(cardTypes, template.type);

    const expireAt =
      template.validDays > 0
        ? new Date(Date.now() + template.validDays * 86400000)
        : null;

    const card = await this.prisma.memberCard.create({
      data: {
        shopId,
        memberId,
        templateId,
        type: template.type,
        balance: deductMode === 'balance' ? template.value : 0,
        remainTimes: deductMode === 'times' ? template.value : 0,
        expireAt,
        status: 1,
      },
    });

    const afterValue =
      deductMode === 'balance' || deductMode === 'times' ? template.value : 0;

    await this.prisma.cardTransaction.create({
      data: {
        shopId,
        cardId: card.id,
        memberId,
        type: 1,
        amount: afterValue,
        beforeValue: 0,
        afterValue,
        refType: 'payment',
        refId: paymentId,
      },
    });

    return card;
  }

  async deductForVerify(
    shopId: bigint,
    memberId: bigint,
    cardId: bigint,
    serviceId: bigint,
    operatorId: bigint,
    verifyRecordId: bigint,
  ) {
    const card = await this.prisma.memberCard.findFirst({
      where: {
        id: cardId,
        shopId,
        memberId,
        status: 1,
      },
      include: { template: true },
    });
    if (!card) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '会员卡不存在');
    }
    if (card.expireAt && card.expireAt < new Date()) {
      throw new BusinessException(ErrorCodes.CARD_EXPIRED, '会员卡已过期');
    }

    const serviceIds = normalizeNumericIds(card.template.serviceIds);
    if (serviceIds?.length && !serviceIds.includes(Number(serviceId))) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '该卡不适用此项目');
    }

    const cardTypes = await this.getShopCardTypes(shopId);
    const deductMode = this.resolveDeductMode(cardTypes, card.type);

    if (deductMode === 'balance') {
      const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
      const deduct = service?.price ?? 0;
      if (card.balance < deduct) {
        throw new BusinessException(ErrorCodes.INSUFFICIENT_BALANCE, '余额不足');
      }
      const after = card.balance - deduct;
      await this.prisma.$transaction([
        this.prisma.memberCard.update({
          where: { id: card.id },
          data: { balance: after },
        }),
        this.prisma.cardTransaction.create({
          data: {
            shopId,
            cardId: card.id,
            memberId,
            type: 2,
            amount: deduct,
            beforeValue: card.balance,
            afterValue: after,
            refType: 'verify',
            refId: verifyRecordId,
            operatorId,
          },
        }),
      ]);
      return { deductAmount: deduct, remainBalance: after, deductTimes: 0, remainTimes: card.remainTimes };
    }

    if (deductMode === 'times') {
      if (card.remainTimes < 1) {
        throw new BusinessException(ErrorCodes.INSUFFICIENT_BALANCE, '次数不足');
      }
      const after = card.remainTimes - 1;
      await this.prisma.$transaction([
        this.prisma.memberCard.update({
          where: { id: card.id },
          data: { remainTimes: after },
        }),
        this.prisma.cardTransaction.create({
          data: {
            shopId,
            cardId: card.id,
            memberId,
            type: 2,
            amount: 1,
            beforeValue: card.remainTimes,
            afterValue: after,
            refType: 'verify',
            refId: verifyRecordId,
            operatorId,
          },
        }),
      ]);
      return { deductAmount: 0, remainBalance: card.balance, deductTimes: 1, remainTimes: after };
    }

    await this.prisma.cardTransaction.create({
      data: {
        shopId,
        cardId: card.id,
        memberId,
        type: 2,
        amount: 1,
        beforeValue: 1,
        afterValue: 0,
        refType: 'verify',
        refId: verifyRecordId,
        operatorId,
      },
    });
    return { deductAmount: 0, remainBalance: 0, deductTimes: 1, remainTimes: card.remainTimes };
  }

  async reverseVerifyDeduction(
    shopId: bigint,
    verifyRecordId: bigint,
    operatorId: bigint,
  ) {
    const consumeTx = await this.prisma.cardTransaction.findFirst({
      where: { shopId, refType: 'verify', refId: verifyRecordId, type: 2 },
    });
    if (!consumeTx) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '核销流水不存在');
    }

    const reversed = await this.prisma.cardTransaction.findFirst({
      where: { shopId, refType: 'verify', refId: verifyRecordId, type: 5 },
    });
    if (reversed) {
      throw new BusinessException(ErrorCodes.ALREADY_REVERSED, '该核销已反核销');
    }

    const card = await this.prisma.memberCard.findFirst({
      where: { id: consumeTx.cardId, shopId },
    });
    if (!card) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '会员卡不存在');
    }

    const cardTypes = await this.getShopCardTypes(shopId);
    const deductMode = this.resolveDeductMode(cardTypes, card.type);

    if (deductMode === 'balance') {
      const after = card.balance + consumeTx.amount;
      await this.prisma.$transaction([
        this.prisma.memberCard.update({
          where: { id: card.id },
          data: { balance: after },
        }),
        this.prisma.cardTransaction.create({
          data: {
            shopId,
            cardId: card.id,
            memberId: card.memberId,
            type: 5,
            amount: consumeTx.amount,
            beforeValue: card.balance,
            afterValue: after,
            refType: 'verify',
            refId: verifyRecordId,
            operatorId,
            remark: '反核销',
          },
        }),
      ]);
      return { remainBalance: after, remainTimes: card.remainTimes };
    }

    if (deductMode === 'times') {
      const after = card.remainTimes + consumeTx.amount;
      await this.prisma.$transaction([
        this.prisma.memberCard.update({
          where: { id: card.id },
          data: { remainTimes: after },
        }),
        this.prisma.cardTransaction.create({
          data: {
            shopId,
            cardId: card.id,
            memberId: card.memberId,
            type: 5,
            amount: consumeTx.amount,
            beforeValue: card.remainTimes,
            afterValue: after,
            refType: 'verify',
            refId: verifyRecordId,
            operatorId,
            remark: '反核销',
          },
        }),
      ]);
      return { remainBalance: card.balance, remainTimes: after };
    }

    await this.prisma.cardTransaction.create({
      data: {
        shopId,
        cardId: card.id,
        memberId: card.memberId,
        type: 5,
        amount: 1,
        beforeValue: 0,
        afterValue: 1,
        refType: 'verify',
        refId: verifyRecordId,
        operatorId,
        remark: '反核销',
      },
    });
    return { remainBalance: card.balance, remainTimes: card.remainTimes };
  }

  async adminOpenCard(user: JwtPayload, memberId: number, templateId: number, remark?: string) {
    const shopId = BigInt(user.shopId);
    const member = await this.prisma.member.findFirst({
      where: { id: BigInt(memberId), shopId },
    });
    if (!member) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '会员不存在');
    }

    const template = await this.prisma.cardTemplate.findFirst({
      where: { id: BigInt(templateId), shopId, status: 1 },
    });
    if (!template) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '卡种不存在');
    }

    const cardTypes = await this.getShopCardTypes(shopId);
    const deductMode = this.resolveDeductMode(cardTypes, template.type);

    const expireAt =
      template.validDays > 0
        ? new Date(Date.now() + template.validDays * 86400000)
        : null;

    const card = await this.prisma.memberCard.create({
      data: {
        shopId,
        memberId: BigInt(memberId),
        templateId: template.id,
        type: template.type,
        balance: deductMode === 'balance' ? template.value : 0,
        remainTimes: deductMode === 'times' ? template.value : 0,
        expireAt,
        status: 1,
      },
      include: { template: true },
    });

    const afterValue =
      deductMode === 'balance' || deductMode === 'times' ? template.value : 0;

    await this.prisma.cardTransaction.create({
      data: {
        shopId,
        cardId: card.id,
        memberId: BigInt(memberId),
        type: 1,
        amount: afterValue,
        beforeValue: 0,
        afterValue,
        refType: 'admin',
        operatorId: BigInt(user.sub),
        remark: remark || '后台开卡',
      },
    });

    return this.serializeCard(card, card.template.name, cardTypes);
  }

  async adminRecharge(user: JwtPayload, cardId: number, amount: number, remark?: string) {
    const shopId = BigInt(user.shopId);
    const [card, cardTypes] = await Promise.all([
      this.prisma.memberCard.findFirst({
        where: { id: BigInt(cardId), shopId, status: 1 },
        include: { template: true },
      }),
      this.getShopCardTypes(shopId),
    ]);
    if (!card) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '会员卡不存在');
    }
    if (card.expireAt && card.expireAt < new Date()) {
      throw new BusinessException(ErrorCodes.CARD_EXPIRED, '会员卡已过期');
    }

    const deductMode = this.resolveDeductMode(cardTypes, card.type);

    if (deductMode === 'balance') {
      const after = card.balance + amount;
      await this.prisma.$transaction([
        this.prisma.memberCard.update({
          where: { id: card.id },
          data: { balance: after },
        }),
        this.prisma.cardTransaction.create({
          data: {
            shopId,
            cardId: card.id,
            memberId: card.memberId,
            type: 3,
            amount,
            beforeValue: card.balance,
            afterValue: after,
            refType: 'admin',
            operatorId: BigInt(user.sub),
            remark: remark || '后台充值',
          },
        }),
      ]);
      return { ...this.serializeCard({ ...card, balance: after }, card.template.name, cardTypes), added: amount };
    }

    if (deductMode === 'times') {
      const after = card.remainTimes + amount;
      await this.prisma.$transaction([
        this.prisma.memberCard.update({
          where: { id: card.id },
          data: { remainTimes: after },
        }),
        this.prisma.cardTransaction.create({
          data: {
            shopId,
            cardId: card.id,
            memberId: card.memberId,
            type: 3,
            amount,
            beforeValue: card.remainTimes,
            afterValue: after,
            refType: 'admin',
            operatorId: BigInt(user.sub),
            remark: remark || '后台充值',
          },
        }),
      ]);
      return { ...this.serializeCard({ ...card, remainTimes: after }, card.template.name, cardTypes), added: amount };
    }

    throw new BusinessException(ErrorCodes.BAD_REQUEST, '周期卡不支持充值');
  }

  private serializeCard(
    card: {
      id: bigint;
      type: number;
      balance: number;
      remainTimes: number;
      expireAt: Date | null;
      status: number;
    },
    cardName: string,
    cardTypes: ReturnType<typeof mergeCardTypes>,
  ) {
    const typeDef = findCardType(cardTypes, card.type);
    const deductMode = typeDef?.deductMode ?? 'times';
    return {
      id: Number(card.id),
      cardNo: formatCardNo(card.id),
      name: cardName,
      type: card.type,
      typeName: typeDef?.name ?? '会员卡',
      deductMode,
      theme: typeDef?.theme ?? deductMode,
      balance: card.balance,
      remainTimes: card.remainTimes,
      expireAt: card.expireAt,
      status: card.status,
    };
  }
}
