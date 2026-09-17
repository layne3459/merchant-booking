import { createHmac, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.module';
import { CardService } from '../card/card.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { findCardType, mergeCardTypes } from '../../common/constants/card-types';
import { normalizeNumericIds } from '../../common/utils/numeric-ids';
import { formatCardNo } from '../../common/utils/card-no';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class VerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly cardService: CardService,
  ) {}

  private parseVerifyCache(cached: string): { memberId: bigint; cardId: bigint } {
    const parts = cached.split(':');
    if (parts.length !== 2) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '核销码已失效，请让顾客重新选择会员卡并刷新');
    }
    const memberId = BigInt(parts[0]);
    const cardId = BigInt(parts[1]);
    if (!memberId || !cardId) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '核销码已失效，请让顾客重新选择会员卡并刷新');
    }
    return { memberId, cardId };
  }

  private async getMemberCard(shopId: bigint, memberId: bigint, cardId: bigint) {
    const card = await this.prisma.memberCard.findFirst({
      where: { id: cardId, shopId, memberId, status: 1 },
      include: { template: true },
    });
    if (!card) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '会员卡不存在或已失效');
    }
    if (card.expireAt && card.expireAt < new Date()) {
      throw new BusinessException(ErrorCodes.CARD_EXPIRED, '会员卡已过期');
    }
    return card;
  }

  private async assertCardUsable(card: {
    type: number;
    balance: number;
    remainTimes: number;
    template: { serviceIds: unknown };
  }, shopId: bigint, serviceId: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { cardTypes: true },
    });
    const cardTypes = mergeCardTypes(shop?.cardTypes);
    const deductMode = findCardType(cardTypes, card.type)?.deductMode ?? 'times';

    const serviceIds = normalizeNumericIds(card.template.serviceIds);
    if (serviceId > 0 && serviceIds?.length && !serviceIds.includes(serviceId)) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '该卡不适用此项目');
    }

    if (deductMode === 'balance' && card.balance <= 0) {
      throw new BusinessException(ErrorCodes.INSUFFICIENT_BALANCE, '储值余额不足');
    }
    if (deductMode === 'times' && card.remainTimes < 1) {
      throw new BusinessException(ErrorCodes.INSUFFICIENT_BALANCE, '剩余次数不足');
    }
  }

  async generateCode(user: JwtPayload, cardId: number) {
    const shopId = BigInt(user.shopId);
    const memberId = BigInt(user.sub);
    const card = await this.getMemberCard(shopId, memberId, BigInt(cardId));
    await this.assertCardUsable(card, shopId, 0);

    const timestamp = Date.now();
    const payload = `${user.sub}:${cardId}:${timestamp}`;
    const secret = this.config.get('JWT_SECRET', 'dev-secret');
    const sig = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);
    const code = Buffer.from(`${payload}:${sig}`).toString('base64url');

    await this.redis.set(`verify:${code}`, `${memberId}:${cardId}`, 60);

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { cardTypes: true },
    });
    const typeDef = findCardType(mergeCardTypes(shop?.cardTypes), card.type);

    return {
      code,
      expiresIn: 60,
      expireAt: new Date(Date.now() + 60_000).toISOString(),
      cardId: Number(card.id),
      cardNo: formatCardNo(card.id),
      cardName: card.template.name,
      typeName: typeDef?.name ?? '会员卡',
      deductMode: typeDef?.deductMode ?? 'times',
    };
  }

  async consume(user: JwtPayload, code: string, serviceId: number) {
    const cached = await this.redis.get(`verify:${code}`);
    if (!cached) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '核销码无效或已过期');
    }

    const existing = await this.prisma.verifyRecord.findUnique({ where: { code } });
    if (existing) {
      throw new BusinessException(ErrorCodes.DUPLICATE_VERIFY, '该码已核销');
    }

    const { memberId, cardId } = this.parseVerifyCache(cached);
    const shopId = BigInt(user.shopId);
    const card = await this.getMemberCard(shopId, memberId, cardId);
    await this.assertCardUsable(card, shopId, Number(serviceId));

    const record = await this.prisma.verifyRecord.create({
      data: {
        shopId,
        code,
        memberId,
        cardId: card.id,
        serviceId: BigInt(serviceId),
        operatorId: BigInt(user.sub),
      },
    });

    const result = await this.cardService.deductForVerify(
      shopId,
      memberId,
      card.id,
      BigInt(serviceId),
      BigInt(user.sub),
      record.id,
    );

    await this.redis.del(`verify:${code}`);

    const member = await this.prisma.member.findUnique({ where: { id: memberId } });

    return {
      memberName: member?.nickname,
      cardName: card.template.name,
      cardNo: formatCardNo(card.id),
      ...result,
    };
  }

  async manualVerify(user: JwtPayload, phone: string, serviceId: number, cardId: number) {
    const member = await this.prisma.member.findFirst({
      where: { shopId: BigInt(user.shopId), phone },
    });
    if (!member) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '会员不存在');
    }

    const shopId = BigInt(user.shopId);
    const card = await this.getMemberCard(shopId, member.id, BigInt(cardId));
    await this.assertCardUsable(card, shopId, Number(serviceId));

    const code = `manual_${randomBytes(8).toString('hex')}`;
    const record = await this.prisma.verifyRecord.create({
      data: {
        shopId,
        code,
        memberId: member.id,
        cardId: card.id,
        serviceId: BigInt(serviceId),
        operatorId: BigInt(user.sub),
      },
    });

    const result = await this.cardService.deductForVerify(
      shopId,
      member.id,
      card.id,
      BigInt(serviceId),
      BigInt(user.sub),
      record.id,
    );

    return {
      memberName: member.nickname,
      cardName: card.template.name,
      cardNo: formatCardNo(card.id),
      ...result,
    };
  }

  async reverse(user: JwtPayload, verifyRecordId: number) {
    const shopId = BigInt(user.shopId);
    const record = await this.prisma.verifyRecord.findFirst({
      where: { id: BigInt(verifyRecordId), shopId },
    });
    if (!record) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '核销记录不存在');
    }

    const result = await this.cardService.reverseVerifyDeduction(
      shopId,
      record.id,
      BigInt(user.sub),
    );

    const [member, card] = await Promise.all([
      this.prisma.member.findUnique({ where: { id: record.memberId } }),
      this.prisma.memberCard.findUnique({
        where: { id: record.cardId },
        include: { template: true },
      }),
    ]);

    return {
      verifyRecordId: Number(record.id),
      memberName: member?.nickname,
      cardName: card?.template.name,
      cardNo: card ? formatCardNo(card.id) : null,
      ...result,
    };
  }

  async listRecords(user: JwtPayload, page = 1, pageSize = 20, todayOnly = false) {
    const shopId = BigInt(user.shopId);
    const skip = (page - 1) * pageSize;
    const where: { shopId: bigint; createdAt?: { gte: Date; lt: Date } } = { shopId };
    if (todayOnly) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }
    const [records, total] = await Promise.all([
      this.prisma.verifyRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.verifyRecord.count({ where }),
    ]);

    const memberIds = [...new Set(records.map((r) => r.memberId))];
    const cardIds = [...new Set(records.map((r) => r.cardId))];
    const serviceIds = [
      ...new Set(records.map((r) => r.serviceId).filter((id): id is bigint => id !== null)),
    ];
    const [members, cards, services, reversedTxs] = await Promise.all([
      this.prisma.member.findMany({ where: { id: { in: memberIds } } }),
      this.prisma.memberCard.findMany({
        where: { id: { in: cardIds } },
        include: { template: true },
      }),
      serviceIds.length
        ? this.prisma.service.findMany({ where: { id: { in: serviceIds } } })
        : Promise.resolve([]),
      this.prisma.cardTransaction.findMany({
        where: { shopId, refType: 'verify', type: 5 },
        select: { refId: true },
      }),
    ]);

    const memberMap = new Map(members.map((m) => [m.id.toString(), m]));
    const cardMap = new Map(cards.map((c) => [c.id.toString(), c]));
    const serviceMap = new Map(services.map((s) => [s.id.toString(), s]));
    const reversedIds = new Set(reversedTxs.map((t) => Number(t.refId)));

    return {
      list: records.map((r) => {
        const member = memberMap.get(r.memberId.toString());
        const card = cardMap.get(r.cardId.toString());
        const service = r.serviceId ? serviceMap.get(r.serviceId.toString()) : null;
        return {
          id: Number(r.id),
          memberName: member?.nickname,
          memberPhone: member?.phone,
          cardName: card?.template.name,
          cardNo: card ? formatCardNo(card.id) : null,
          serviceId: r.serviceId ? Number(r.serviceId) : null,
          serviceName: service?.name ?? null,
          createdAt: r.createdAt,
          reversed: reversedIds.has(Number(r.id)),
        };
      }),
      total,
      page,
      pageSize,
    };
  }
}
