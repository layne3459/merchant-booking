import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingService } from '../modules/booking/booking.service';
import { NotifyService } from '../modules/notify/notify.service';
import { PlatformService } from '../modules/platform/platform.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly notify: NotifyService,
    private readonly platform: PlatformService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async closeUnpaidBookings() {
    const result = await this.bookingService.closeExpiredPending();
    if (result.closed > 0) {
      this.logger.log(`Closed ${result.closed} unpaid bookings`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendBookingReminders() {
    const result = await this.notify.sendBookingReminders();
    if (result.sent > 0) {
      this.logger.log(`Sent ${result.sent} booking reminders`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireCards() {
    const result = await this.prisma.memberCard.updateMany({
      where: {
        expireAt: { lt: new Date() },
        status: 1,
      },
      data: { status: 2 },
    });
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} member cards`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions() {
    const result = await this.platform.expireDueSubscriptions();
    if (result.expired > 0) {
      this.logger.log(`Expired ${result.expired} shop subscriptions`);
    }
  }
}
