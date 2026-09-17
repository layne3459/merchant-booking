import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.module';
import { PaymentService } from '../payment/payment.service';
import { NotifyService } from '../notify/notify.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import {
  ACTIVE_BOOKING_STATUSES,
  BookingStatus,
} from '../../common/constants/business';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateBookingDto, RescheduleBookingDto } from './dto/booking.dto';
import { isStaffAllowedForService } from '../../common/utils/staff-ids';
import { calcServiceDeposit } from '../../common/utils/deposit';
import { mergeMiniDisplay } from '../../common/constants/mini-display';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => PaymentService))
    private readonly payment: PaymentService,
    private readonly notify: NotifyService,
  ) {}

  async getSlots(
    shopId: number,
    serviceId: number,
    date: string,
    staffId?: number,
  ) {
    const service = await this.prisma.service.findFirst({
      where: { id: BigInt(serviceId), shopId: BigInt(shopId), status: 1 },
    });
    if (!service) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '项目不存在');
    }

    const staffList = await this.prisma.staff.findMany({
      where: {
        shopId: BigInt(shopId),
        status: 1,
        ...(staffId ? { id: BigInt(staffId) } : {}),
      },
    });

    const bookDate = this.parseBookDate(date);
    const dayOfWeek = this.getDayOfWeek(date);

    const result: Array<{
      staffId: number;
      staffName: string;
      slots: Array<{ time: string; available: boolean }>;
    }> = [];

    for (const staff of staffList) {
      if (!isStaffAllowedForService(service.staffIds, staff.id)) {
        continue;
      }

      const schedule = await this.resolveSchedule(
        shopId,
        Number(staff.id),
        dayOfWeek,
        date,
      );
      if (!schedule || schedule.isRest) {
        continue;
      }

      const slots = this.generateTimeSlots(
        schedule.startTime,
        schedule.endTime,
        service.duration,
      );

      const booked = await this.prisma.booking.findMany({
        where: {
          shopId: BigInt(shopId),
          staffId: staff.id,
          bookDate,
          status: { in: ACTIVE_BOOKING_STATUSES },
        },
        select: { timeSlot: true },
      });
      const bookedSet = new Set(booked.map((b) => b.timeSlot));

      result.push({
        staffId: Number(staff.id),
        staffName: staff.name,
        slots: slots.map((time) => ({
          time,
          available: !bookedSet.has(time) && !this.isPastSlot(date, time),
        })),
      });
    }

    return result;
  }

  async getAvailability(
    shopId: number,
    serviceId: number,
    fromDate: string,
    days = 14,
    staffId?: number,
  ) {
    const startDate = fromDate || this.todayLocal();
    const rangeDays = days > 0 ? days : 14;
    const result: Array<{
      date: string;
      availableCount: number;
      status: 'available' | 'full' | 'rest';
    }> = [];

    for (let i = 0; i < rangeDays; i++) {
      const date = this.addDays(startDate, i);
      const groups = await this.getSlots(shopId, serviceId, date, staffId);
      const availableCount = this.countAvailableSlots(groups);
      const status =
        groups.length === 0 ? 'rest' : availableCount > 0 ? 'available' : 'full';
      result.push({ date, availableCount, status });
    }

    return result;
  }

  async create(user: JwtPayload, dto: CreateBookingDto) {
    const shopId = BigInt(user.shopId);
    const lockKey = `booking:${user.shopId}:${dto.staffId}:${dto.bookDate}:${dto.timeSlot}`;

    try {
      return await this.redis.withLock(lockKey, 10, async () => {
        const service = await this.prisma.service.findFirst({
          where: {
            id: BigInt(dto.serviceId),
            shopId,
            status: 1,
          },
        });
        if (!service) {
          throw new BusinessException(ErrorCodes.NOT_FOUND, '项目不存在');
        }

        const bookDate = new Date(`${dto.bookDate}T00:00:00.000Z`);
        const conflict = await this.prisma.booking.count({
          where: {
            shopId,
            staffId: BigInt(dto.staffId),
            bookDate,
            timeSlot: dto.timeSlot,
            status: { in: ACTIVE_BOOKING_STATUSES },
          },
        });
        if (conflict > 0) {
          throw new BusinessException(ErrorCodes.SLOT_FULL, '该时段已满');
        }

        const depositAmount = calcServiceDeposit({
          depositType: service.depositType,
          depositRatio: service.depositRatio,
          depositFixed: service.depositFixed,
          price: service.price,
        });
        const booking = await this.prisma.booking.create({
          data: {
            shopId,
            memberId: BigInt(user.sub),
            serviceId: BigInt(dto.serviceId),
            staffId: BigInt(dto.staffId),
            bookDate,
            timeSlot: dto.timeSlot,
            status: depositAmount > 0 ? BookingStatus.PENDING_PAY : BookingStatus.BOOKED,
            depositAmount,
            remark: dto.remark,
          },
        });

        await this.logStatus(
          shopId,
          booking.id,
          null,
          booking.status,
          BigInt(user.sub),
        );

        const result = this.serializeBooking(booking, service.name);

        if (depositAmount > 0) {
          const payment = await this.payment.createBookingPayment(
            user,
            booking.id,
            depositAmount,
            `预约订金-${service.name}`,
          );
          return { ...result, payment };
        }

        await this.notifyBookingConfirmed(booking.id);
        return result;
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'LOCK_BUSY') {
        throw new BusinessException(ErrorCodes.SLOT_FULL, '该时段正在被预约，请重试');
      }
      throw e;
    }
  }

  async listMy(user: JwtPayload) {
    const list = await this.prisma.booking.findMany({
      where: {
        shopId: BigInt(user.shopId),
        memberId: BigInt(user.sub),
      },
      include: { service: true, staff: true },
      orderBy: [{ bookDate: 'desc' }, { timeSlot: 'desc' }],
    });
    return list.map((b) => this.serializeBooking(b, b.service.name, b.staff.name));
  }

  async getOne(user: JwtPayload, id: number) {
    const isStaff = ['staff', 'manager', 'owner'].includes(user.role);
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: BigInt(id),
        shopId: BigInt(user.shopId),
        ...(isStaff ? {} : { memberId: BigInt(user.sub) }),
      },
      include: { service: true, staff: true, member: true },
    });
    if (!booking) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '预约不存在');
    }
    return {
      ...this.serializeBooking(booking, booking.service.name, booking.staff.name),
      member: booking.member
        ? {
            id: Number(booking.member.id),
            nickname: booking.member.nickname,
            phone: booking.member.phone,
          }
        : undefined,
    };
  }

  async cancel(user: JwtPayload, id: number) {
    const result = await this.updateStatus(user, id, BookingStatus.CANCELLED, [
      BookingStatus.PENDING_PAY,
      BookingStatus.BOOKED,
    ]);
    await this.payment.refundByBookingId(BigInt(id));
    return result;
  }

  async reschedule(user: JwtPayload, id: number, dto: RescheduleBookingDto) {
    const booking = await this.getMemberBooking(user, id);
    if (booking.status !== BookingStatus.BOOKED && booking.status !== BookingStatus.PENDING_PAY) {
      throw new BusinessException(ErrorCodes.BOOKING_NOT_CANCELABLE, '当前状态不可改约');
    }

    const staffId = dto.staffId ?? Number(booking.staffId);
    const lockKey = `booking:${user.shopId}:${staffId}:${dto.bookDate}:${dto.timeSlot}`;

    return this.redis.withLock(lockKey, 10, async () => {
      const bookDate = new Date(`${dto.bookDate}T00:00:00.000Z`);
      const conflict = await this.prisma.booking.count({
        where: {
          shopId: booking.shopId,
          staffId: BigInt(staffId),
          bookDate,
          timeSlot: dto.timeSlot,
          status: { in: ACTIVE_BOOKING_STATUSES },
          id: { not: booking.id },
        },
      });
      if (conflict > 0) {
        throw new BusinessException(ErrorCodes.SLOT_FULL, '该时段已满');
      }

      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          bookDate,
          timeSlot: dto.timeSlot,
          staffId: BigInt(staffId),
        },
        include: { service: true, staff: true },
      });
      return this.serializeBooking(updated, updated.service.name, updated.staff.name);
    });
  }

  async listToday(user: JwtPayload) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const list = await this.prisma.booking.findMany({
      where: {
        shopId: BigInt(user.shopId),
        bookDate: today,
        status: { in: [BookingStatus.BOOKED, BookingStatus.ARRIVED, BookingStatus.PENDING_PAY] },
      },
      include: { service: true, staff: true, member: true },
      orderBy: { timeSlot: 'asc' },
    });
    return list.map((b) => ({
      ...this.serializeBooking(b, b.service.name, b.staff.name),
      memberName: b.member.nickname,
      memberPhone: b.member.phone,
    }));
  }

  async arrive(user: JwtPayload, id: number) {
    return this.updateStatus(user, id, BookingStatus.ARRIVED, [BookingStatus.BOOKED], true);
  }

  async noShow(user: JwtPayload, id: number) {
    const result = await this.updateStatus(user, id, BookingStatus.NO_SHOW, [BookingStatus.BOOKED], true);
    await this.handleNoShowDeposit(user.shopId, id);
    return result;
  }

  async complete(user: JwtPayload, id: number) {
    return this.updateStatus(user, id, BookingStatus.COMPLETED, [BookingStatus.ARRIVED], true);
  }

  async adminComplete(user: JwtPayload, id: number) {
    return this.adminUpdateStatus(user, id, BookingStatus.COMPLETED, [BookingStatus.ARRIVED]);
  }

  async adminCancel(user: JwtPayload, id: number, refundDeposit = true) {
    const result = await this.adminUpdateStatus(user, id, BookingStatus.CANCELLED, [
      BookingStatus.PENDING_PAY,
      BookingStatus.BOOKED,
    ]);
    if (refundDeposit) {
      await this.payment.refundByBookingId(BigInt(id));
    }
    return result;
  }

  adminArrive(user: JwtPayload, id: number) {
    return this.adminUpdateStatus(user, id, BookingStatus.ARRIVED, [BookingStatus.BOOKED]);
  }

  adminNoShow(user: JwtPayload, id: number) {
    return this.adminUpdateStatus(user, id, BookingStatus.NO_SHOW, [BookingStatus.BOOKED]).then(
      async (result) => {
        await this.handleNoShowDeposit(user.shopId, id);
        return result;
      },
    );
  }

  async adminReschedule(user: JwtPayload, id: number, dto: RescheduleBookingDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: BigInt(id), shopId: BigInt(user.shopId) },
    });
    if (!booking) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '预约不存在');
    }
    if (booking.status !== BookingStatus.BOOKED && booking.status !== BookingStatus.PENDING_PAY) {
      throw new BusinessException(ErrorCodes.BOOKING_NOT_CANCELABLE, '当前状态不可改约');
    }

    const staffId = dto.staffId ?? Number(booking.staffId);
    const lockKey = `booking:${user.shopId}:${staffId}:${dto.bookDate}:${dto.timeSlot}`;

    return this.redis.withLock(lockKey, 10, async () => {
      const bookDate = new Date(`${dto.bookDate}T00:00:00.000Z`);
      const conflict = await this.prisma.booking.count({
        where: {
          shopId: booking.shopId,
          staffId: BigInt(staffId),
          bookDate,
          timeSlot: dto.timeSlot,
          status: { in: ACTIVE_BOOKING_STATUSES },
          id: { not: booking.id },
        },
      });
      if (conflict > 0) {
        throw new BusinessException(ErrorCodes.SLOT_FULL, '该时段已满');
      }

      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          bookDate,
          timeSlot: dto.timeSlot,
          staffId: BigInt(staffId),
        },
        include: { service: true, staff: true },
      });
      return this.serializeBooking(updated, updated.service.name, updated.staff.name);
    });
  }

  async closeExpiredPending() {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const expired = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING_PAY,
        createdAt: { lt: cutoff },
      },
    });
    for (const booking of expired) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED },
      });
      await this.logStatus(booking.shopId, booking.id, BookingStatus.PENDING_PAY, BookingStatus.CANCELLED, 0n);
    }
    return { closed: expired.length };
  }

  private async updateStatus(
    user: JwtPayload,
    id: number,
    toStatus: number,
    fromStatuses: number[],
    staffAction = false,
  ) {
    const booking = staffAction
      ? await this.getStaffBooking(user, id)
      : await this.getMemberBooking(user, id);

    if (!fromStatuses.includes(booking.status)) {
      throw new BusinessException(ErrorCodes.BOOKING_NOT_CANCELABLE, '当前状态不允许此操作');
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: toStatus },
      include: { service: true, staff: true },
    });
    await this.logStatus(
      booking.shopId,
      booking.id,
      booking.status,
      toStatus,
      BigInt(user.sub),
    );
    return this.serializeBooking(updated, updated.service.name, updated.staff.name);
  }

  private async getMemberBooking(user: JwtPayload, id: number) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: BigInt(id),
        shopId: BigInt(user.shopId),
        memberId: BigInt(user.sub),
      },
    });
    if (!booking) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '预约不存在');
    }
    return booking;
  }

  private async getStaffBooking(user: JwtPayload, id: number) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: BigInt(id), shopId: BigInt(user.shopId) },
    });
    if (!booking) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '预约不存在');
    }
    return booking;
  }

  private async adminUpdateStatus(
    user: JwtPayload,
    id: number,
    toStatus: number,
    fromStatuses: number[],
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: BigInt(id), shopId: BigInt(user.shopId) },
    });
    if (!booking) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '预约不存在');
    }
    if (!fromStatuses.includes(booking.status)) {
      throw new BusinessException(ErrorCodes.BOOKING_NOT_CANCELABLE, '当前状态不允许此操作');
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: toStatus },
      include: { service: true, staff: true },
    });
    await this.logStatus(booking.shopId, booking.id, booking.status, toStatus, BigInt(user.sub));
    return this.serializeBooking(updated, updated.service.name, updated.staff.name);
  }

  private parseBookDate(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  private getDayOfWeek(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }

  private addDays(dateStr: string, days: number) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + days);
    return this.formatLocalDate(dt);
  }

  private formatLocalDate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private todayLocal() {
    return this.formatLocalDate(new Date());
  }

  private isPastSlot(date: string, time: string) {
    if (date !== this.todayLocal()) return false;
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
  }

  private countAvailableSlots(
    groups: Array<{ slots: Array<{ time: string; available: boolean }> }>,
  ) {
    let count = 0;
    for (const group of groups) {
      for (const slot of group.slots) {
        if (slot.available) count++;
      }
    }
    return count;
  }

  private async resolveSchedule(
    shopId: number,
    staffId: number,
    dayOfWeek: number,
    date: string,
  ) {
    const exception = await this.prisma.staffSchedule.findFirst({
      where: {
        shopId: BigInt(shopId),
        staffId: BigInt(staffId),
        exceptionDate: this.parseBookDate(date),
      },
    });
    if (exception) {
      return {
        startTime: exception.startTime,
        endTime: exception.endTime,
        isRest: exception.isRest === 1,
      };
    }

    const weekly = await this.prisma.staffSchedule.findFirst({
      where: {
        shopId: BigInt(shopId),
        staffId: BigInt(staffId),
        dayOfWeek,
        exceptionDate: null,
      },
    });
    if (!weekly) {
      return { startTime: '09:00', endTime: '21:00', isRest: false };
    }
    return {
      startTime: weekly.startTime,
      endTime: weekly.endTime,
      isRest: weekly.isRest === 1,
    };
  }

  private generateTimeSlots(start: string, end: string, durationMinutes: number) {
    const slots: string[] = [];
    let current = this.toMinutes(start);
    const endMin = this.toMinutes(end);
    while (current + durationMinutes <= endMin) {
      slots.push(this.fromMinutes(current));
      current += durationMinutes;
    }
    return slots;
  }

  private toMinutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private fromMinutes(total: number) {
    const h = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const m = (total % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  async notifyBookingConfirmed(bookingId: bigint) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, member: true },
    });
    if (!booking) return;

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

  private async logStatus(
    shopId: bigint,
    bookingId: bigint,
    fromStatus: number | null,
    toStatus: number,
    operatorId: bigint,
  ) {
    await this.prisma.bookingLog.create({
      data: {
        shopId,
        bookingId,
        fromStatus: fromStatus ?? toStatus,
        toStatus,
        operatorId,
      },
    });
  }

  private async handleNoShowDeposit(shopId: string | number, bookingId: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: BigInt(shopId) },
      select: { miniConfig: true },
    });
    const rules = mergeMiniDisplay(shop?.miniConfig).bookingRules;
    if (rules.noShowDepositPolicy === 'refund') {
      await this.payment.refundByBookingId(BigInt(bookingId));
    }
  }

  private serializeBooking(
    booking: {
      id: bigint;
      shopId: bigint;
      memberId: bigint;
      serviceId: bigint;
      staffId: bigint;
      bookDate: Date;
      timeSlot: string;
      status: number;
      depositAmount: number;
      remark: string | null;
      createdAt: Date;
    },
    serviceName?: string,
    staffName?: string,
  ) {
    return {
      id: Number(booking.id),
      shopId: Number(booking.shopId),
      memberId: Number(booking.memberId),
      serviceId: Number(booking.serviceId),
      staffId: Number(booking.staffId),
      serviceName,
      staffName,
      bookDate: booking.bookDate.toISOString().slice(0, 10),
      timeSlot: booking.timeSlot,
      status: booking.status,
      depositAmount: booking.depositAmount,
      remark: booking.remark,
      createdAt: booking.createdAt,
    };
  }
}
