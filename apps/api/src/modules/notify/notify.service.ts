import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WechatService } from '../auth/wechat.service';
import { WxConfigService } from '../wx-config/wx-config.service';
import { BookingStatus } from '../../common/constants/business';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wechat: WechatService,
    private readonly wxConfig: WxConfigService,
  ) {}

  async sendBookingSuccess(params: {
    shopId: bigint;
    memberId: bigint;
    serviceName: string;
    bookDate: string;
    timeSlot: string;
  }) {
    const member = await this.prisma.member.findUnique({ where: { id: params.memberId } });
    if (!member) return;

    const config = await this.wxConfig.getEffective(params.shopId);
    const templateId = config.tplBookingSuccess;
    await this.send(params.shopId, member.openid, templateId, params.shopId, params.memberId, {
      thing1: { value: this.clip(params.serviceName, 20) },
      date2: { value: params.bookDate },
      time3: { value: params.timeSlot },
    });
  }

  async sendNewBookingToStaff(params: {
    shopId: bigint;
    memberName: string;
    serviceName: string;
    bookDate: string;
    timeSlot: string;
  }) {
    const config = await this.wxConfig.getEffective(params.shopId);
    const templateId = config.tplNewBooking;
    if (!templateId) return;

    const staffList = await this.prisma.staff.findMany({
      where: { shopId: params.shopId, status: 1, role: { in: [1, 2] } },
    });

    for (const staff of staffList) {
      if (!staff.phone) continue;
      const member = await this.prisma.member.findFirst({
        where: { shopId: params.shopId, phone: staff.phone },
      });
      if (!member?.openid) continue;

      await this.send(params.shopId, member.openid, templateId, params.shopId, member.id, {
        thing1: { value: this.clip(params.memberName, 20) },
        thing2: { value: this.clip(params.serviceName, 20) },
        date3: { value: params.bookDate },
        time4: { value: params.timeSlot },
      });
    }
  }

  async sendBookingReminders() {
    const shops = await this.prisma.shop.findMany({
      where: { status: 1 },
      select: { id: true, wxConfig: true },
    });

    let sent = 0;
    for (const shop of shops) {
      const config = await this.wxConfig.getEffective(shop.id);
      const templateId = config.tplBookingRemind;
      if (!templateId && !(await this.wechat.isDevMode(shop.id))) continue;

      const now = new Date();
      const today = new Date(now);
      today.setUTCHours(0, 0, 0, 0);

      const targetMinutes = now.getHours() * 60 + now.getMinutes() + 120;
      const targetSlot = `${Math.floor(targetMinutes / 60)
        .toString()
        .padStart(2, '0')}:${(targetMinutes % 60).toString().padStart(2, '0')}`;

      const bookings = await this.prisma.booking.findMany({
        where: {
          shopId: shop.id,
          bookDate: today,
          timeSlot: targetSlot,
          status: BookingStatus.BOOKED,
        },
        include: { member: true, service: true },
      });

      for (const b of bookings) {
        if (!b.member.openid) continue;
        const ok = await this.send(
          shop.id,
          b.member.openid,
          templateId,
          b.shopId,
          b.memberId,
          {
            thing1: { value: this.clip(b.service.name, 20) },
            date2: { value: today.toISOString().slice(0, 10) },
            time3: { value: b.timeSlot },
          },
          `remind:${b.id}`,
        );
        if (ok) sent++;
      }
    }
    return { sent };
  }

  private async send(
    shopId: bigint,
    openid: string,
    templateId: string,
    logShopId: bigint,
    memberId: bigint,
    data: Record<string, { value: string }>,
    dedupeKey?: string,
  ): Promise<boolean> {
    if (dedupeKey) {
      const recent = await this.prisma.subscribeLog.findMany({
        where: { shopId: logShopId, memberId, createdAt: { gte: new Date(Date.now() - 86400000) } },
        take: 50,
      });
      if (recent.some((r) => (r.payload as { dedupeKey?: string })?.dedupeKey === dedupeKey)) {
        return false;
      }
    }

    const payload = { ...data, dedupeKey };
    let status = 1;
    let errMsg: string | null = null;

    try {
      if (!templateId) {
        if (!(await this.wechat.isDevMode(shopId))) return false;
        this.logger.log(`[dev] subscribe → ${openid}: ${JSON.stringify(data)}`);
      } else {
        const ok = await this.wechat.sendSubscribeMessage(shopId, { openid, templateId, data });
        if (!ok) {
          status = 0;
          errMsg = 'send failed';
        }
      }
    } catch (e) {
      status = 0;
      errMsg = e instanceof Error ? e.message : 'unknown';
    }

    await this.prisma.subscribeLog.create({
      data: {
        shopId: logShopId,
        memberId,
        templateId: templateId || 'dev',
        payload,
        status,
        errMsg,
      },
    });

    return status === 1;
  }

  private clip(text: string, max: number) {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }
}
