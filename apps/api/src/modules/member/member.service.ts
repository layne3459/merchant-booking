import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { findCardType, mergeCardTypes } from '../../common/constants/card-types';
import { formatCardNo } from '../../common/utils/card-no';
import { JwtPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class MemberService {
  constructor(private readonly prisma: PrismaService) {}

  async search(user: JwtPayload, phone: string) {
    const members = await this.prisma.member.findMany({
      where: {
        shopId: BigInt(user.shopId),
        phone: { contains: phone },
      },
      take: 20,
    });
    return members.map((m) => ({
      id: Number(m.id),
      nickname: m.nickname,
      phone: m.phone,
      avatar: m.avatar,
    }));
  }

  async getDetail(user: JwtPayload, id: number) {
    const shopId = BigInt(user.shopId);
    const [member, shop] = await Promise.all([
      this.prisma.member.findFirst({
        where: { id: BigInt(id), shopId },
        include: {
          memberCards: {
            where: { status: 1 },
            include: { template: true },
          },
        },
      }),
      this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { cardTypes: true },
      }),
    ]);
    if (!member) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '会员不存在');
    }
    const cardTypes = mergeCardTypes(shop?.cardTypes);
    return {
      id: Number(member.id),
      nickname: member.nickname,
      phone: member.phone,
      avatar: member.avatar,
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
    };
  }
}
