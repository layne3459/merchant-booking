import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WechatService } from '../auth/wechat.service';
import { WxConfigService } from '../wx-config/wx-config.service';
import { ShopWxConfigInput } from '../../common/constants/wx-config';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { BookingStatus } from '../../common/constants/business';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { mergeMiniDisplay } from '../../common/constants/mini-display';
import {
  ListBookingsQueryDto,
  ListMembersQueryDto,
  ListTransactionsQueryDto,
} from './dto/admin-query.dto';
import {
  normalizeServiceHighlights,
  normalizeServiceTags,
} from '../../common/constants/service-display';
import { normalizeNumericIds } from '../../common/utils/numeric-ids';
import { mergeCardTypes, findCardType } from '../../common/constants/card-types';
import { formatCardNo } from '../../common/utils/card-no';
import { buildCardBenefits, resolveServiceNames } from '../../common/utils/card-benefits';
import { normalizeStaffIds } from '../../common/utils/staff-ids';
import { DEFAULT_SERVICE_DEPOSIT_RATIO, DepositType } from '../../common/utils/deposit';

const TX_TYPE_LABEL: Record<number, string> = {
  1: '开卡',
  2: '核销',
  3: '充值',
  4: '退款',
  5: '反核销',
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wechat: WechatService,
    private readonly wxConfig: WxConfigService,
  ) {}

  private shopId(user: JwtPayload) {
    return BigInt(user.shopId);
  }

  // ---- Services ----
  async listServices(user: JwtPayload) {
    const rows = await this.prisma.service.findMany({
      where: { shopId: this.shopId(user) },
      orderBy: { id: 'asc' },
    });
    return rows.map((s) => ({
      ...s,
      id: Number(s.id),
      shopId: Number(s.shopId),
    }));
  }

  createService(user: JwtPayload, data: Record<string, unknown>) {
    return this.prisma.service.create({
      data: {
        shopId: this.shopId(user),
        name: String(data.name),
        price: Number(data.price),
        duration: Number(data.duration ?? 60),
        cover: data.cover ? String(data.cover) : null,
        description: data.description ? String(data.description) : null,
        ...(data.tags !== undefined
          ? { tags: normalizeServiceTags(data.tags) as Prisma.InputJsonValue }
          : {}),
        ...(data.highlights !== undefined
          ? { highlights: normalizeServiceHighlights(data.highlights) as unknown as Prisma.InputJsonValue }
          : {}),
        staffIds: normalizeStaffIds(data.staffIds) as Prisma.InputJsonValue | undefined,
        depositRatio: Number(data.depositRatio ?? DEFAULT_SERVICE_DEPOSIT_RATIO),
        depositType: Number(data.depositType ?? DepositType.RATIO),
        depositFixed: Number(data.depositFixed ?? 0),
        status: 1,
      },
    });
  }

  updateService(user: JwtPayload, id: number, data: Record<string, unknown>) {
    return this.prisma.service.update({
      where: { id: BigInt(id) },
      data: this.pickService(data) as Prisma.ServiceUpdateInput,
    });
  }

  deleteService(user: JwtPayload, id: number) {
    return this.prisma.service.update({
      where: { id: BigInt(id) },
      data: { status: 0 },
    });
  }

  // ---- Staff ----
  listStaff(user: JwtPayload) {
    return this.prisma.staff.findMany({
      where: { shopId: this.shopId(user) },
      orderBy: { id: 'asc' },
    });
  }

  createStaff(user: JwtPayload, data: Record<string, unknown>) {
    return this.prisma.staff.create({
      data: {
        shopId: this.shopId(user),
        name: String(data.name),
        phone: data.phone ? String(data.phone) : null,
        role: Number(data.role ?? 3),
        status: 1,
      },
    });
  }

  updateStaff(user: JwtPayload, id: number, data: Record<string, unknown>) {
    return this.prisma.staff.update({
      where: { id: BigInt(id) },
      data: {
        ...(data.name !== undefined ? { name: String(data.name) } : {}),
        ...(data.phone !== undefined ? { phone: String(data.phone) } : {}),
        ...(data.role !== undefined ? { role: Number(data.role) } : {}),
        ...(data.status !== undefined ? { status: Number(data.status) } : {}),
      },
    });
  }

  // ---- Schedules ----
  listSchedules(user: JwtPayload, staffId?: number) {
    return this.prisma.staffSchedule.findMany({
      where: {
        shopId: this.shopId(user),
        ...(staffId ? { staffId: BigInt(staffId) } : {}),
      },
    });
  }

  async upsertSchedule(user: JwtPayload, data: Record<string, unknown>) {
    const shopId = this.shopId(user);
    const staffId = BigInt(Number(data.staffId));
    const dayOfWeek = Number(data.dayOfWeek ?? 0);
    const exceptionDate = data.exceptionDate
      ? new Date(`${String(data.exceptionDate)}T00:00:00.000Z`)
      : null;
    const payload = {
      startTime: String(data.startTime),
      endTime: String(data.endTime),
      isRest: Number(data.isRest ?? 0),
    };

    if (!exceptionDate) {
      const existing = await this.prisma.staffSchedule.findFirst({
        where: { shopId, staffId, dayOfWeek, exceptionDate: null },
      });
      if (existing) {
        return this.prisma.staffSchedule.update({
          where: { id: existing.id },
          data: payload,
        });
      }
      return this.prisma.staffSchedule.create({
        data: { shopId, staffId, dayOfWeek, exceptionDate: null, ...payload },
      });
    }

    const existing = await this.prisma.staffSchedule.findFirst({
      where: { shopId, staffId, exceptionDate },
    });
    if (existing) {
      return this.prisma.staffSchedule.update({
        where: { id: existing.id },
        data: payload,
      });
    }
    return this.prisma.staffSchedule.create({
      data: { shopId, staffId, dayOfWeek, exceptionDate, ...payload },
    });
  }

  updateSchedule(user: JwtPayload, id: number, data: Record<string, unknown>) {
    return this.prisma.staffSchedule.update({
      where: { id: BigInt(id), shopId: this.shopId(user) },
      data: {
        ...(data.startTime !== undefined ? { startTime: String(data.startTime) } : {}),
        ...(data.endTime !== undefined ? { endTime: String(data.endTime) } : {}),
        ...(data.isRest !== undefined ? { isRest: Number(data.isRest) } : {}),
        ...(data.dayOfWeek !== undefined ? { dayOfWeek: Number(data.dayOfWeek) } : {}),
        ...(data.exceptionDate !== undefined
          ? {
              exceptionDate: data.exceptionDate
                ? new Date(`${String(data.exceptionDate)}T00:00:00.000Z`)
                : null,
            }
          : {}),
      },
    });
  }

  deleteSchedule(user: JwtPayload, id: number) {
    return this.prisma.staffSchedule.delete({
      where: { id: BigInt(id), shopId: this.shopId(user) },
    });
  }

  // ---- Card templates ----
  private async shopCardTypes(user: JwtPayload) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: this.shopId(user) },
      select: { cardTypes: true },
    });
    return mergeCardTypes(shop?.cardTypes);
  }

  async listCardTemplates(user: JwtPayload) {
    const [rows, cardTypes] = await Promise.all([
      this.prisma.cardTemplate.findMany({
        where: { shopId: this.shopId(user) },
      }),
      this.shopCardTypes(user),
    ]);
    return rows.map((c) => {
      const typeDef = findCardType(cardTypes, c.type);
      const deductMode = typeDef?.deductMode ?? 'times';
      return {
        id: Number(c.id),
        shopId: Number(c.shopId),
        name: c.name,
        type: c.type,
        typeName: typeDef?.name ?? '会员卡',
        deductMode,
        theme: typeDef?.theme ?? deductMode,
        price: c.price,
        value: c.value,
        validDays: c.validDays,
        description: c.description,
        serviceIds: normalizeNumericIds(c.serviceIds),
        status: c.status,
        createdAt: c.createdAt,
      };
    });
  }

  async createCardTemplate(user: JwtPayload, data: Record<string, unknown>) {
    const cardTypes = await this.shopCardTypes(user);
    const typeId = Number(data.type);
    const typeDef = findCardType(cardTypes, typeId);
    if (!typeDef || !typeDef.enabled) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '卡类型无效或已停用');
    }
    const serviceIds = normalizeNumericIds(data.serviceIds);
    if ((typeDef.deductMode === 'times' || typeDef.deductMode === 'period') && !serviceIds?.length) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '次卡/周期卡请至少选择一个适用项目');
    }
    return this.prisma.cardTemplate.create({
      data: {
        shopId: this.shopId(user),
        name: String(data.name),
        type: typeId,
        price: Number(data.price),
        value: Number(data.value),
        validDays: Number(data.validDays ?? 0),
        description: data.description ? String(data.description) : null,
        serviceIds: serviceIds ?? undefined,
        status: 1,
      },
    });
  }

  async updateCardTemplate(user: JwtPayload, id: number, data: Record<string, unknown>) {
    if (data.type !== undefined) {
      const cardTypes = await this.shopCardTypes(user);
      const typeId = Number(data.type);
      const typeDef = findCardType(cardTypes, typeId);
      if (!typeDef || !typeDef.enabled) {
        throw new BusinessException(ErrorCodes.BAD_REQUEST, '卡类型无效或已停用');
      }
    }
    if (data.serviceIds !== undefined || data.type !== undefined) {
      const cardTypes = await this.shopCardTypes(user);
      const existing = await this.prisma.cardTemplate.findFirst({
        where: { id: BigInt(id), shopId: this.shopId(user) },
      });
      if (existing) {
        const typeId = data.type !== undefined ? Number(data.type) : existing.type;
        const typeDef = findCardType(cardTypes, typeId);
        const serviceIds =
          data.serviceIds !== undefined ? normalizeNumericIds(data.serviceIds) : normalizeNumericIds(existing.serviceIds);
        if ((typeDef?.deductMode === 'times' || typeDef?.deductMode === 'period') && !serviceIds?.length) {
          throw new BusinessException(ErrorCodes.BAD_REQUEST, '次卡/周期卡请至少选择一个适用项目');
        }
      }
    }
    return this.prisma.cardTemplate.update({
      where: { id: BigInt(id) },
      data: {
        ...(data.name !== undefined ? { name: String(data.name) } : {}),
        ...(data.price !== undefined ? { price: Number(data.price) } : {}),
        ...(data.value !== undefined ? { value: Number(data.value) } : {}),
        ...(data.validDays !== undefined ? { validDays: Number(data.validDays) } : {}),
        ...(data.type !== undefined ? { type: Number(data.type) } : {}),
        ...(data.description !== undefined ? { description: data.description ? String(data.description) : null } : {}),
        ...(data.serviceIds !== undefined
          ? {
              serviceIds: (() => {
                const ids = normalizeNumericIds(data.serviceIds);
                return ids?.length ? (ids as Prisma.InputJsonValue) : Prisma.DbNull;
              })(),
            }
          : {}),
        ...(data.status !== undefined ? { status: Number(data.status) } : {}),
      },
    });
  }

  // ---- Bookings / Members ----
  async listBookings(user: JwtPayload, query: ListBookingsQueryDto) {
    const shopId = this.shopId(user);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.BookingWhereInput = { shopId };

    if (query.status !== undefined) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.bookDate = {
        ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T00:00:00.000Z`) } : {}),
      };
    }
    if (query.keyword) {
      where.member = {
        OR: [
          { phone: { contains: query.keyword } },
          { nickname: { contains: query.keyword } },
        ],
      };
    }

    const [list, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: { service: true, staff: true, member: true },
        orderBy: [{ bookDate: 'desc' }, { timeSlot: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async listMembers(user: JwtPayload, query: ListMembersQueryDto) {
    const shopId = this.shopId(user);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.MemberWhereInput = { shopId };

    if (query.keyword) {
      where.OR = [
        { phone: { contains: query.keyword } },
        { nickname: { contains: query.keyword } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { memberCards: { where: { status: 1 } }, bookings: true } },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    const list = rows.map((m) => ({
      id: Number(m.id),
      nickname: m.nickname,
      phone: m.phone,
      avatar: m.avatar,
      openid: m.openid,
      status: m.status,
      createdAt: m.createdAt,
      cardCount: m._count.memberCards,
      bookingCount: m._count.bookings,
    }));

    return { list, total, page, pageSize };
  }

  async getMemberDetail(user: JwtPayload, id: number) {
    const [member, cardTypes] = await Promise.all([
      this.prisma.member.findFirst({
        where: { id: BigInt(id), shopId: this.shopId(user) },
        include: {
          memberCards: {
            where: { status: 1 },
            include: { template: true },
            orderBy: { createdAt: 'desc' },
          },
          bookings: {
            take: 10,
            orderBy: [{ bookDate: 'desc' }, { timeSlot: 'desc' }],
            include: { service: true, staff: true },
          },
        },
      }),
      this.shopCardTypes(user),
    ]);
    if (!member) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '会员不存在');
    }

    return {
      id: Number(member.id),
      nickname: member.nickname,
      phone: member.phone,
      avatar: member.avatar,
      openid: member.openid,
      createdAt: member.createdAt,
      cards: member.memberCards.map((c) => {
        const typeDef = findCardType(cardTypes, c.type);
        const deductMode = typeDef?.deductMode ?? 'times';
        return {
          id: Number(c.id),
          cardNo: formatCardNo(c.id),
          name: c.template.name,
          type: c.type,
          typeName: typeDef?.name ?? '会员卡',
          deductMode,
          balance: c.balance,
          remainTimes: c.remainTimes,
          expireAt: c.expireAt,
        };
      }),
      recentBookings: member.bookings.map((b) => ({
        id: Number(b.id),
        serviceName: b.service.name,
        staffName: b.staff.name,
        bookDate: b.bookDate.toISOString().slice(0, 10),
        timeSlot: b.timeSlot,
        status: b.status,
      })),
    };
  }

  async listTransactions(user: JwtPayload, query: ListTransactionsQueryDto) {
    const shopId = this.shopId(user);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CardTransactionWhereInput = {
      shopId,
      ...(query.type !== undefined ? { type: query.type } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.cardTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.cardTransaction.count({ where }),
    ]);

    const memberIds = [...new Set(rows.map((r) => r.memberId))];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
    });
    const memberMap = new Map(members.map((m) => [m.id.toString(), m]));

    const list = rows.map((r) => ({
      ...r,
      id: Number(r.id),
      cardId: Number(r.cardId),
      memberId: Number(r.memberId),
      typeLabel: TX_TYPE_LABEL[r.type] ?? String(r.type),
      memberName: memberMap.get(r.memberId.toString())?.nickname,
      memberPhone: memberMap.get(r.memberId.toString())?.phone,
    }));

    return { list, total, page, pageSize };
  }

  async exportTransactionsCsv(user: JwtPayload) {
    const shopId = this.shopId(user);
    const rows = await this.prisma.cardTransaction.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const memberIds = [...new Set(rows.map((r) => r.memberId))];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds } },
    });
    const memberMap = new Map(members.map((m) => [m.id.toString(), m]));

    const header = 'ID,卡ID,会员,手机,类型,变动,变动前,变动后,备注,时间\n';
    const body = rows
      .map((r) => {
        const m = memberMap.get(r.memberId.toString());
        const cols = [
          r.id,
          r.cardId,
          m?.nickname ?? '',
          m?.phone ?? '',
          TX_TYPE_LABEL[r.type] ?? r.type,
          r.amount,
          r.beforeValue,
          r.afterValue,
          r.remark ?? '',
          r.createdAt.toISOString(),
        ];
        return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
      })
      .join('\n');

    return Buffer.from(`\uFEFF${header}${body}`, 'utf8');
  }

  async dailyReport(user: JwtPayload) {
    const shopId = this.shopId(user);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [bookings, payments, verifies, cardConsume, newMembers] = await Promise.all([
      this.prisma.booking.count({
        where: { shopId, bookDate: today, status: { in: [BookingStatus.BOOKED, BookingStatus.ARRIVED, BookingStatus.COMPLETED] } },
      }),
      this.prisma.payment.aggregate({
        where: { shopId, status: 1, paidAt: { gte: today } },
        _sum: { amount: true },
      }),
      this.prisma.verifyRecord.count({
        where: { shopId, createdAt: { gte: today } },
      }),
      this.prisma.cardTransaction.aggregate({
        where: { shopId, type: 2, createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      this.prisma.member.count({
        where: { shopId, createdAt: { gte: today } },
      }),
    ]);

    return {
      date: today.toISOString().slice(0, 10),
      bookingCount: bookings,
      revenue: payments._sum.amount ?? 0,
      verifyCount: verifies,
      cardConsume: cardConsume._sum.amount ?? 0,
      newMemberCount: newMembers,
    };
  }

  async monthlyReport(user: JwtPayload) {
    const shopId = this.shopId(user);
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);

    const [bookings, payments, verifies, cardConsume, newMembers] = await Promise.all([
      this.prisma.booking.count({
        where: {
          shopId,
          bookDate: { gte: start },
          status: { in: [BookingStatus.BOOKED, BookingStatus.ARRIVED, BookingStatus.COMPLETED] },
        },
      }),
      this.prisma.payment.aggregate({
        where: { shopId, status: 1, paidAt: { gte: start } },
        _sum: { amount: true },
      }),
      this.prisma.verifyRecord.count({
        where: { shopId, createdAt: { gte: start } },
      }),
      this.prisma.cardTransaction.aggregate({
        where: { shopId, type: 2, createdAt: { gte: start } },
        _sum: { amount: true },
      }),
      this.prisma.member.count({
        where: { shopId, createdAt: { gte: start } },
      }),
    ]);

    return {
      month: start.toISOString().slice(0, 7),
      bookingCount: bookings,
      revenue: payments._sum.amount ?? 0,
      verifyCount: verifies,
      cardConsume: cardConsume._sum.amount ?? 0,
      newMemberCount: newMembers,
    };
  }

  async trendReport(user: JwtPayload, days = 7) {
    const shopId = this.shopId(user);
    const safeDays = Math.min(Math.max(days, 3), 30);
    const items: Array<{
      date: string;
      label: string;
      bookingCount: number;
      revenue: number;
      verifyCount: number;
    }> = [];

    for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      day.setUTCDate(day.getUTCDate() - offset);
      const next = new Date(day);
      next.setUTCDate(next.getUTCDate() + 1);

      const [bookings, payments, verifies] = await Promise.all([
        this.prisma.booking.count({
          where: {
            shopId,
            bookDate: day,
            status: { in: [BookingStatus.BOOKED, BookingStatus.ARRIVED, BookingStatus.COMPLETED] },
          },
        }),
        this.prisma.payment.aggregate({
          where: { shopId, status: 1, paidAt: { gte: day, lt: next } },
          _sum: { amount: true },
        }),
        this.prisma.verifyRecord.count({
          where: { shopId, createdAt: { gte: day, lt: next } },
        }),
      ]);

      items.push({
        date: day.toISOString().slice(0, 10),
        label: `${day.getUTCMonth() + 1}/${day.getUTCDate()}`,
        bookingCount: bookings,
        revenue: payments._sum.amount ?? 0,
        verifyCount: verifies,
      });
    }

    return items;
  }

  async getShopQrcode(user: JwtPayload) {
    const shopId = Number(this.shopId(user));
    const scene = `s${shopId}`;
    const buffer = await this.wechat.getUnlimitedQrCode(shopId, scene);
    if (!buffer) {
      return {
        dev: true,
        scene,
        page: 'pages/index/index',
        tip: '开发模式：在微信开发者工具用 scene 参数调试，或配置真实 AppID 后生成小程序码',
      };
    }
    return {
      qrcodeBase64: `data:image/png;base64,${buffer.toString('base64')}`,
      scene,
      page: 'pages/index/index',
    };
  }

  async updateShop(user: JwtPayload, data: Record<string, unknown>) {
    const shopId = this.shopId(user);

    if (data.wxConfig !== undefined) {
      await this.wxConfig.mergeAndSave(shopId, data.wxConfig as ShopWxConfigInput);
    }

    let miniConfig: Prisma.InputJsonValue | undefined;
    if (data.miniConfig !== undefined) {
      const current = await this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { miniConfig: true },
      });
      miniConfig = mergeMiniDisplay({
        ...(current?.miniConfig && typeof current.miniConfig === 'object' ? current.miniConfig : {}),
        ...(data.miniConfig as object),
      }) as unknown as Prisma.InputJsonValue;
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(data.name !== undefined ? { name: String(data.name) } : {}),
        ...(data.address !== undefined ? { address: String(data.address) } : {}),
        ...(data.phone !== undefined ? { phone: String(data.phone) } : {}),
        ...(data.logo !== undefined ? { logo: String(data.logo) } : {}),
        ...(data.businessHours !== undefined
          ? { businessHours: data.businessHours as Prisma.InputJsonValue }
          : {}),
        ...(miniConfig !== undefined ? { miniConfig } : {}),
        ...(data.cardTypes !== undefined
          ? { cardTypes: data.cardTypes as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async getShop(user: JwtPayload) {
    const shopId = this.shopId(user);
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return null;

    const wxConfig = await this.wxConfig.toPublic(shopId);
    const wxStatus = await this.wxConfig.getStatus(shopId);

    return {
      ...shop,
      id: Number(shop.id),
      cardTypes: mergeCardTypes(shop.cardTypes),
      wxConfig,
      wxStatus: { ...wxStatus, shopId: Number(shopId) },
    };
  }

  uploadWxCert(user: JwtPayload, type: 'privateKey' | 'platformCert', file: Express.Multer.File) {
    return this.wxConfig.saveCert(this.shopId(user), type, file.buffer);
  }

  private pickService(data: Record<string, unknown>) {
    return {
      ...(data.name !== undefined ? { name: String(data.name) } : {}),
      ...(data.price !== undefined ? { price: Number(data.price) } : {}),
      ...(data.duration !== undefined ? { duration: Number(data.duration) } : {}),
      ...(data.cover !== undefined ? { cover: String(data.cover) } : {}),
      ...(data.description !== undefined ? { description: String(data.description) } : {}),
      ...(data.tags !== undefined
        ? { tags: normalizeServiceTags(data.tags) as Prisma.InputJsonValue }
        : {}),
      ...(data.highlights !== undefined
        ? { highlights: normalizeServiceHighlights(data.highlights) as unknown as Prisma.InputJsonValue }
        : {}),
      ...(data.staffIds !== undefined
        ? { staffIds: normalizeStaffIds(data.staffIds) as Prisma.InputJsonValue }
        : {}),
      ...(data.depositRatio !== undefined ? { depositRatio: Number(data.depositRatio) } : {}),
      ...(data.depositType !== undefined ? { depositType: Number(data.depositType) } : {}),
      ...(data.depositFixed !== undefined ? { depositFixed: Number(data.depositFixed) } : {}),
      ...(data.status !== undefined ? { status: Number(data.status) } : {}),
    };
  }
}
