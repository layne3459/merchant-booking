import { Injectable } from '@nestjs/common';
import { WxConfigService } from '../wx-config/wx-config.service';
import { ShopStatus } from '../../common/constants/business';
import { Service, CardTemplate } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { mergeMiniDisplay } from '../../common/constants/mini-display';
import { findCardType, mergeCardTypes } from '../../common/constants/card-types';
import { normalizeServiceHighlights, normalizeServiceTags } from '../../common/constants/service-display';
import { normalizeStaffIds } from '../../common/utils/staff-ids';
import { buildCardBenefits, resolveServiceNames } from '../../common/utils/card-benefits';
import { normalizeNumericIds } from '../../common/utils/numeric-ids';

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wxConfig: WxConfigService,
  ) {}

  async getShop(id: number) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: BigInt(id) },
    });
    if (!shop) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '店铺不存在');
    }
    if (shop.status !== ShopStatus.ACTIVE) {
      throw new BusinessException(ErrorCodes.FORBIDDEN, '店铺已暂停服务，请联系商家');
    }
    const wx = await this.wxConfig.getEffective(shop.id);
    const subscribeTmplIds = [
      wx.tplBookingSuccess,
      wx.tplBookingRemind,
      wx.tplNewBooking,
    ].filter(Boolean);
    return {
      id: Number(shop.id),
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      logo: shop.logo,
      businessHours: shop.businessHours,
      miniDisplay: mergeMiniDisplay(shop.miniConfig),
      cardTypes: mergeCardTypes(shop.cardTypes),
      subscribeTmplIds,
    };
  }

  async getServices(shopId: number) {
    const list = await this.prisma.service.findMany({
      where: { shopId: BigInt(shopId), status: 1 },
      orderBy: { id: 'asc' },
    });
    return list.map((s: Service) => ({
      id: Number(s.id),
      name: s.name,
      price: s.price,
      duration: s.duration,
      cover: s.cover,
      description: s.description,
      tags: normalizeServiceTags(s.tags),
      highlights: normalizeServiceHighlights(s.highlights),
      staffIds: normalizeStaffIds(s.staffIds),
      depositRatio: s.depositRatio,
      depositType: s.depositType,
      depositFixed: s.depositFixed,
    }));
  }

  async getCardTemplates(shopId: number) {
    const [list, services, shop] = await Promise.all([
      this.prisma.cardTemplate.findMany({
        where: { shopId: BigInt(shopId), status: 1 },
        orderBy: { id: 'asc' },
      }),
      this.prisma.service.findMany({
        where: { shopId: BigInt(shopId), status: 1 },
        select: { id: true, name: true },
      }),
      this.prisma.shop.findUnique({
        where: { id: BigInt(shopId) },
        select: { cardTypes: true },
      }),
    ]);
    const cardTypes = mergeCardTypes(shop?.cardTypes);
    const serviceMap = new Map(services.map((s) => [Number(s.id), s.name]));

    return list.map((c: CardTemplate) => {
      const serviceIds = normalizeNumericIds(c.serviceIds) || [];
      const serviceNames = resolveServiceNames(c.serviceIds, serviceMap);
      const typeDef = findCardType(cardTypes, c.type);
      const deductMode = typeDef?.deductMode ?? 'times';
      return {
        id: Number(c.id),
        name: c.name,
        type: c.type,
        typeName: typeDef?.name ?? '会员卡',
        deductMode,
        theme: typeDef?.theme ?? deductMode,
        price: c.price,
        value: c.value,
        validDays: c.validDays,
        description: c.description,
        serviceIds: serviceIds.length ? serviceIds : null,
        serviceNames,
        benefits: buildCardBenefits({
          deductMode,
          value: c.value,
          validDays: c.validDays,
          serviceNames,
        }),
      };
    });
  }
}
