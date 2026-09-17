import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CardService } from '../card/card.service';
import { NotifyService } from '../notify/notify.service';
import { WechatPayService, WxPayNotifyBody } from './wechat-pay.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { PaymentStatus, BookingStatus, RefundStatus } from '../../common/constants/business';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly wechatPay: WechatPayService,
    @Inject(forwardRef(() => CardService))
    private readonly cardService: CardService,
    private readonly notify: NotifyService,
  ) {}

  async createCardPayment(user: JwtPayload, templateId: number, amount: number) {
    const member = await this.getMemberOpenid(user);
    const outTradeNo = this.genOutTradeNo();
    await this.prisma.payment.create({
      data: {
        shopId: BigInt(user.shopId),
        outTradeNo,
        memberId: BigInt(user.sub),
        amount,
        type: 2,
        refType: 'card',
        refId: BigInt(templateId),
        status: PaymentStatus.PENDING,
      },
    });

    return this.finalizePayment(user.shopId, outTradeNo, member.openid, amount, '购买会员卡');
  }

  async createBookingPayment(
    user: JwtPayload,
    bookingId: bigint,
    amount: number,
    description: string,
  ) {
    const member = await this.getMemberOpenid(user);
    const outTradeNo = this.genOutTradeNo();
    await this.prisma.payment.create({
      data: {
        shopId: BigInt(user.shopId),
        outTradeNo,
        memberId: BigInt(user.sub),
        amount,
        type: 1,
        refType: 'booking',
        refId: bookingId,
        status: PaymentStatus.PENDING,
      },
    });

    return this.finalizePayment(user.shopId, outTradeNo, member.openid, amount, description);
  }

  private async finalizePayment(
    shopId: number | bigint | string,
    outTradeNo: string,
    openid: string,
    amount: number,
    description: string,
  ) {
    const devMode = !(await this.wechatPay.isConfigured(shopId));

    if (devMode) {
      await this.completePayment(outTradeNo);
      return {
        outTradeNo,
        status: PaymentStatus.PAID,
        devAutoPaid: true,
      };
    }

    const payParams = await this.wechatPay.createJsapiOrder(shopId, {
      outTradeNo,
      amount,
      description,
      openid,
    });

    if (!payParams) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '创建支付单失败，请检查微信支付配置');
    }

    return {
      outTradeNo,
      status: PaymentStatus.PENDING,
      payParams,
    };
  }

  async getStatus(outTradeNo: string) {
    const payment = await this.prisma.payment.findUnique({ where: { outTradeNo } });
    if (!payment) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '支付单不存在');
    }
    return {
      outTradeNo: payment.outTradeNo,
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt,
    };
  }

  async handleNotify(
    shopId: number | bigint | string | undefined,
    body: WxPayNotifyBody,
    headers?: { timestamp: string; nonce: string; signature: string; serial: string },
    rawBody?: Buffer | string,
  ) {
    let resolvedShopId = shopId ? BigInt(shopId) : undefined;

    if (!resolvedShopId && body.outTradeNo) {
      const payment = await this.prisma.payment.findUnique({ where: { outTradeNo: body.outTradeNo } });
      if (payment) resolvedShopId = payment.shopId;
    }
    if (!resolvedShopId && body.outRefundNo) {
      const refund = await this.prisma.refund.findUnique({ where: { outRefundNo: body.outRefundNo } });
      if (refund) resolvedShopId = refund.shopId;
    }

    if (!resolvedShopId) {
      return { code: 'FAIL', message: '缺少店铺参数' };
    }

    const parsed = await this.wechatPay.parseNotify(resolvedShopId, body, headers, rawBody);
    if (!parsed) {
      return { code: 'FAIL', message: '无效通知' };
    }

    if (parsed.kind === 'refund') {
      if (!parsed.outRefundNo) {
        return { code: 'FAIL', message: '缺少退款单号' };
      }
      const refundOk =
        !parsed.refundStatus || parsed.refundStatus.toUpperCase() === 'SUCCESS';
      await this.completeRefundByOutRefundNo(
        parsed.outRefundNo,
        refundOk,
        parsed.refundId,
      );
      return { code: 'SUCCESS', message: '成功' };
    }

    if (!parsed.outTradeNo) {
      return { code: 'FAIL', message: '无效通知' };
    }
    await this.completePayment(parsed.outTradeNo);
    return { code: 'SUCCESS', message: '成功' };
  }

  async completePayment(outTradeNo: string) {
    const payment = await this.prisma.payment.findUnique({ where: { outTradeNo } });
    if (!payment || payment.status === PaymentStatus.PAID) {
      return payment;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        transactionId: `WX${Date.now()}`,
      },
    });

    if (payment.refType === 'card' && payment.refId) {
      await this.cardService.openCardFromPayment(
        payment.shopId,
        payment.memberId,
        payment.refId,
        payment.id,
      );
    }

    if (payment.refType === 'booking' && payment.refId) {
      await this.prisma.booking.update({
        where: { id: payment.refId },
        data: { status: BookingStatus.BOOKED },
      });
      const booking = await this.prisma.booking.findUnique({
        where: { id: payment.refId },
        include: { service: true, member: true },
      });
      if (booking) {
        const bookDate = booking.bookDate.toISOString().slice(0, 10);
        await this.notify.sendBookingSuccess({
          shopId: booking.shopId,
          memberId: booking.memberId,
          serviceName: booking.service.name,
          bookDate,
          timeSlot: booking.timeSlot,
        });
        await this.notify.sendNewBookingToStaff({
          shopId: booking.shopId,
          memberName: booking.member.nickname ?? '顾客',
          serviceName: booking.service.name,
          bookDate,
          timeSlot: booking.timeSlot,
        });
      }
    }

    return payment;
  }

  private async getMemberOpenid(user: JwtPayload) {
    const member = await this.prisma.member.findFirst({
      where: { id: BigInt(user.sub), shopId: BigInt(user.shopId) },
    });
    if (!member?.openid) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '会员信息异常');
    }
    return member;
  }

  private genOutTradeNo() {
    return `P${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  private genOutRefundNo() {
    return `R${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  async listPayments(user: JwtPayload, page = 1, pageSize = 20, status?: number) {
    const shopId = BigInt(user.shopId);
    const where = {
      shopId,
      ...(status !== undefined ? { status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { refunds: true },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const memberIds = [...new Set(rows.map((r) => r.memberId))];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
    });
    const memberMap = new Map(members.map((m) => [m.id.toString(), m]));

    const PAY_TYPE_LABEL: Record<number, string> = { 1: '预约订金', 2: '购卡' };
    const PAY_STATUS_LABEL: Record<number, string> = { 0: '待支付', 1: '已支付', 2: '已退款' };

    const list = rows.map((r) => ({
      id: Number(r.id),
      outTradeNo: r.outTradeNo,
      amount: r.amount,
      type: r.type,
      typeLabel: PAY_TYPE_LABEL[r.type] ?? String(r.type),
      status: r.status,
      statusLabel: PAY_STATUS_LABEL[r.status] ?? String(r.status),
      refType: r.refType,
      refId: r.refId ? Number(r.refId) : null,
      memberName: memberMap.get(r.memberId.toString())?.nickname,
      memberPhone: memberMap.get(r.memberId.toString())?.phone,
      paidAt: r.paidAt,
      createdAt: r.createdAt,
      hasRefund: r.refunds.some((f) => f.status === 1),
    }));

    return { list, total, page, pageSize };
  }

  async createRefund(user: JwtPayload, paymentId: number, remark?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: BigInt(paymentId),
        shopId: BigInt(user.shopId),
        status: PaymentStatus.PAID,
      },
      include: { refunds: true },
    });
    if (!payment) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '支付单不存在或不可退款');
    }
    if (payment.refunds.some((r) => r.status === RefundStatus.SUCCESS)) {
      throw new BusinessException(ErrorCodes.ALREADY_REFUNDED, '该支付单已退款');
    }

    const existing = payment.refunds.find((r) => r.status === RefundStatus.PROCESSING);
    const refund =
      existing ??
      (await this.prisma.refund.create({
        data: {
          shopId: payment.shopId,
          paymentId: payment.id,
          outRefundNo: this.genOutRefundNo(),
          amount: payment.amount,
          status: RefundStatus.PROCESSING,
        },
      }));

    await this.requestAndSettleRefund(refund.id, remark);
    const latest = await this.prisma.refund.findUnique({ where: { id: refund.id } });
    return {
      outRefundNo: refund.outRefundNo,
      amount: refund.amount,
      status: latest?.status ?? RefundStatus.PROCESSING,
    };
  }

  async refundByBookingId(bookingId: bigint) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        refType: 'booking',
        refId: bookingId,
        status: PaymentStatus.PAID,
      },
      include: { refunds: true },
    });
    if (!payment || payment.refunds.some((r) => r.status === RefundStatus.SUCCESS)) {
      return null;
    }

    const existing = payment.refunds.find((r) => r.status === RefundStatus.PROCESSING);
    const refund =
      existing ??
      (await this.prisma.refund.create({
        data: {
          shopId: payment.shopId,
          paymentId: payment.id,
          outRefundNo: this.genOutRefundNo(),
          amount: payment.amount,
          status: RefundStatus.PROCESSING,
        },
      }));
    await this.requestAndSettleRefund(refund.id, '预约取消退款');
    return refund;
  }

  async completeRefundByOutRefundNo(outRefundNo: string, success: boolean, wxRefundId?: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { outRefundNo },
      include: { payment: true },
    });
    if (!refund) return null;
    if (success) {
      return this.applyRefundSuccess(refund.id, undefined, wxRefundId);
    }
    if (refund.status !== RefundStatus.SUCCESS) {
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { status: RefundStatus.FAILED, refundId: wxRefundId },
      });
    }
    return refund;
  }

  private async requestAndSettleRefund(refundId: bigint, remark?: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });
    if (!refund || refund.status === RefundStatus.SUCCESS) return refund;

    const devMode = !(await this.wechatPay.isConfigured(refund.payment.shopId));
    if (devMode) {
      return this.applyRefundSuccess(refund.id, remark, `WXR${Date.now()}`);
    }

    const result = await this.wechatPay.createRefund(refund.payment.shopId, {
      outTradeNo: refund.payment.outTradeNo,
      outRefundNo: refund.outRefundNo,
      amount: refund.amount,
      total: refund.payment.amount,
      reason: remark,
    });
    if (!result.ok) {
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { status: RefundStatus.FAILED },
      });
      throw new BusinessException(ErrorCodes.PAYMENT_FAILED, result.message || '微信退款失败，请稍后重试');
    }

    if (result.refundId) {
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { refundId: result.refundId },
      });
    }

    if (result.status === 'SUCCESS') {
      return this.applyRefundSuccess(refund.id, remark, result.refundId);
    }
    return refund;
  }

  private async applyRefundSuccess(refundId: bigint, remark?: string, wxRefundId?: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true },
    });
    if (!refund || refund.status === RefundStatus.SUCCESS) return refund;

    await this.prisma.$transaction([
      this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.SUCCESS,
          refundId: wxRefundId || refund.refundId || `WXR${Date.now()}`,
        },
      }),
      this.prisma.payment.update({
        where: { id: refund.paymentId },
        data: { status: PaymentStatus.REFUNDED },
      }),
    ]);

    if (refund.payment.refType === 'card' && refund.payment.refId) {
      await this.prisma.memberCard.updateMany({
        where: {
          shopId: refund.payment.shopId,
          memberId: refund.payment.memberId,
          templateId: refund.payment.refId,
          status: 1,
        },
        data: { status: 0 },
      });
    }

    return refund;
  }
}
