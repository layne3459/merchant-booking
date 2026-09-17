import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { DEFAULT_MINI_DISPLAY } from '../../common/constants/mini-display';
import { DEFAULT_CARD_TYPES } from '../../common/constants/card-types';
import { ShopStatus, SubscriptionStatus } from '../../common/constants/business';
import { CreateShopDto, RenewShopDto } from './dto/platform.dto';

const DEFAULT_HOURS = {
  mon: ['09:00', '21:00'],
  tue: ['09:00', '21:00'],
  wed: ['09:00', '21:00'],
  thu: ['09:00', '21:00'],
  fri: ['09:00', '21:00'],
  sat: ['10:00', '20:00'],
  sun: ['10:00', '20:00'],
};

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { status: 1 },
      orderBy: { priceMonth: 'asc' },
    });
    return plans.map((p) => this.serializePlan(p));
  }

  async listShops(page = 1, pageSize = 20, keyword?: string) {
    const where: Prisma.ShopWhereInput = keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { phone: { contains: keyword } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        include: { plan: true, subscription: { include: { plan: true } } },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.shop.count({ where }),
    ]);

    return {
      list: rows.map((s) => this.serializeShop(s)),
      total,
      page,
      pageSize,
    };
  }

  async createShop(dto: CreateShopDto) {
    const username = dto.username.trim();
    const exists = await this.prisma.adminUser.findFirst({ where: { username } });
    if (exists) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '老板账号已被使用，请换一个用户名');
    }

    const plan = await this.resolvePlan(dto.planCode || 'trial');
    const now = new Date();
    const expireAt = new Date(now);
    const isTrial = plan.code === 'trial' || plan.priceMonth === 0;
    expireAt.setDate(expireAt.getDate() + (isTrial ? plan.trialDays || 14 : 30));

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const shop = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shop.create({
        data: {
          name: dto.name.trim(),
          phone: dto.phone?.trim() || null,
          address: dto.address?.trim() || null,
          businessHours: DEFAULT_HOURS,
          miniConfig: { ...DEFAULT_MINI_DISPLAY } as unknown as Prisma.InputJsonValue,
          cardTypes: DEFAULT_CARD_TYPES as unknown as Prisma.InputJsonValue,
          planId: plan.id,
          status: ShopStatus.ACTIVE,
        },
      });

      await tx.adminUser.create({
        data: {
          shopId: created.id,
          username,
          passwordHash,
          role: 1,
          status: 1,
        },
      });

      const staff = await tx.staff.create({
        data: {
          shopId: created.id,
          name: '店长',
          phone: dto.phone?.trim() || null,
          role: 1,
          status: 1,
        },
      });

      for (let day = 1; day <= 6; day++) {
        await tx.staffSchedule.create({
          data: {
            shopId: created.id,
            staffId: staff.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '21:00',
            isRest: 0,
          },
        });
      }
      await tx.staffSchedule.create({
        data: {
          shopId: created.id,
          staffId: staff.id,
          dayOfWeek: 0,
          startTime: '10:00',
          endTime: '20:00',
          isRest: 0,
        },
      });

      const wash = await tx.service.create({
        data: {
          shopId: created.id,
          name: '洗剪吹',
          price: 6800,
          duration: 60,
          description: '经典洗剪吹，到店即可预约。',
          staffIds: [Number(staff.id)],
          status: 1,
        },
      });
      await tx.service.create({
        data: {
          shopId: created.id,
          name: '护理',
          price: 12800,
          duration: 90,
          description: '发质护理，建议提前预约。',
          staffIds: [Number(staff.id)],
          status: 1,
        },
      });

      await tx.cardTemplate.create({
        data: {
          shopId: created.id,
          name: '储值卡 500',
          type: 1,
          price: 50000,
          value: 50000,
          validDays: 365,
          status: 1,
        },
      });
      await tx.cardTemplate.create({
        data: {
          shopId: created.id,
          name: '次卡 10 次',
          type: 2,
          price: 58000,
          value: 10,
          validDays: 180,
          serviceIds: [Number(wash.id)],
          status: 1,
        },
      });

      await tx.subscription.create({
        data: {
          shopId: created.id,
          planId: plan.id,
          status: isTrial ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
          startAt: now,
          expireAt,
        },
      });

      return created;
    });

    const full = await this.prisma.shop.findUnique({
      where: { id: shop.id },
      include: { plan: true, subscription: { include: { plan: true } } },
    });
    return this.serializeShop(full!);
  }

  async freezeShop(id: number) {
    const shop = await this.requireShop(id);
    await this.prisma.$transaction([
      this.prisma.shop.update({
        where: { id: shop.id },
        data: { status: ShopStatus.DISABLED },
      }),
      this.prisma.subscription.updateMany({
        where: { shopId: shop.id },
        data: { status: SubscriptionStatus.FROZEN },
      }),
    ]);
    return { id, status: ShopStatus.DISABLED };
  }

  async unfreezeShop(id: number) {
    const shop = await this.requireShop(id);
    const sub = await this.prisma.subscription.findUnique({ where: { shopId: shop.id } });
    const expired = sub && sub.expireAt < new Date();
    await this.prisma.$transaction([
      this.prisma.shop.update({
        where: { id: shop.id },
        data: { status: expired ? ShopStatus.DISABLED : ShopStatus.ACTIVE },
      }),
      this.prisma.subscription.updateMany({
        where: { shopId: shop.id },
        data: {
          status: expired ? SubscriptionStatus.EXPIRED : SubscriptionStatus.ACTIVE,
        },
      }),
    ]);
    return { id, status: expired ? ShopStatus.DISABLED : ShopStatus.ACTIVE };
  }

  async renewShop(id: number, dto: RenewShopDto) {
    const shop = await this.requireShop(id);
    const plan = await this.resolvePlan(dto.planCode, shop.planId);
    const months = dto.months ?? 1;
    const sub = await this.prisma.subscription.findUnique({ where: { shopId: shop.id } });
    const base = sub && sub.expireAt > new Date() ? sub.expireAt : new Date();
    const expireAt = new Date(base);
    expireAt.setMonth(expireAt.getMonth() + months);

    await this.prisma.$transaction([
      this.prisma.shop.update({
        where: { id: shop.id },
        data: { planId: plan.id, status: ShopStatus.ACTIVE },
      }),
      sub
        ? this.prisma.subscription.update({
            where: { id: sub.id },
            data: {
              planId: plan.id,
              status: SubscriptionStatus.ACTIVE,
              expireAt,
            },
          })
        : this.prisma.subscription.create({
            data: {
              shopId: shop.id,
              planId: plan.id,
              status: SubscriptionStatus.ACTIVE,
              startAt: new Date(),
              expireAt,
            },
          }),
    ]);

    const full = await this.prisma.shop.findUnique({
      where: { id: shop.id },
      include: { plan: true, subscription: { include: { plan: true } } },
    });
    return this.serializeShop(full!);
  }

  async resetOwnerPassword(id: number, password: string) {
    const shop = await this.requireShop(id);
    const owner = await this.prisma.adminUser.findFirst({
      where: { shopId: shop.id, status: 1 },
      orderBy: { id: 'asc' },
    });
    if (!owner) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '该店没有老板账号');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.adminUser.update({
      where: { id: owner.id },
      data: { passwordHash },
    });
    return { id, username: owner.username };
  }

  async expireDueSubscriptions() {
    const now = new Date();
    const due = await this.prisma.subscription.findMany({
      where: {
        expireAt: { lt: now },
        status: { in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE] },
      },
    });
    for (const sub of due) {
      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.shop.update({
          where: { id: sub.shopId },
          data: { status: ShopStatus.DISABLED },
        }),
      ]);
    }
    return { expired: due.length };
  }

  private async requireShop(id: number) {
    const shop = await this.prisma.shop.findUnique({ where: { id: BigInt(id) } });
    if (!shop) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '店铺不存在');
    }
    return shop;
  }

  private async resolvePlan(code?: string, fallbackId?: bigint | null) {
    if (code) {
      const plan = await this.prisma.plan.findFirst({ where: { code, status: 1 } });
      if (plan) return plan;
    }
    if (fallbackId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: fallbackId } });
      if (plan) return plan;
    }
    const trial = await this.prisma.plan.findFirst({ where: { code: 'trial' } });
    if (!trial) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '请先初始化套餐数据', HttpStatus.BAD_REQUEST);
    }
    return trial;
  }

  private serializePlan(plan: {
    id: bigint;
    code: string;
    name: string;
    priceMonth: number;
    trialDays: number;
    maxStaff: number;
    allowPay: number;
    allowCards: number;
  }) {
    return {
      id: Number(plan.id),
      code: plan.code,
      name: plan.name,
      priceMonth: plan.priceMonth,
      trialDays: plan.trialDays,
      maxStaff: plan.maxStaff,
      allowPay: Boolean(plan.allowPay),
      allowCards: Boolean(plan.allowCards),
    };
  }

  private serializeShop(shop: {
    id: bigint;
    name: string;
    phone: string | null;
    address: string | null;
    status: number;
    createdAt: Date;
    plan?: { code: string; name: string; priceMonth: number } | null;
    subscription?: {
      status: number;
      startAt: Date;
      expireAt: Date;
      plan?: { code: string; name: string } | null;
    } | null;
  }) {
    return {
      id: Number(shop.id),
      name: shop.name,
      phone: shop.phone,
      address: shop.address,
      status: shop.status,
      createdAt: shop.createdAt,
      planCode: shop.plan?.code || shop.subscription?.plan?.code,
      planName: shop.plan?.name || shop.subscription?.plan?.name,
      subscriptionStatus: shop.subscription?.status ?? null,
      startAt: shop.subscription?.startAt ?? null,
      expireAt: shop.subscription?.expireAt ?? null,
    };
  }
}
