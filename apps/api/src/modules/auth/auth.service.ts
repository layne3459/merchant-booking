import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { WechatService } from './wechat.service';
import { BindPhoneDto, AdminLoginDto, StaffLoginDto, WxLoginDto, WxPhoneDto } from './dto/auth.dto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import { mergeMiniDisplay } from '../../common/constants/mini-display';
import { JwtPayload, UserRole } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly wechat: WechatService,
  ) {}

  async wxLogin(dto: WxLoginDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: BigInt(dto.shopId), status: 1 },
    });
    if (!shop) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '店铺不存在或已停用');
    }

    const session = await this.wechat.code2Session(dto.shopId, dto.code);

    let member = await this.prisma.member.findUnique({
      where: {
        shopId_openid: {
          shopId: BigInt(dto.shopId),
          openid: session.openid,
        },
      },
    });

    if (!member) {
      member = await this.prisma.member.create({
        data: {
          shopId: BigInt(dto.shopId),
          openid: session.openid,
          unionid: session.unionid,
        },
      });
      const nickname = `用户${member.id.toString().slice(-4).padStart(4, '0')}`;
      member = await this.prisma.member.update({
        where: { id: member.id },
        data: { nickname },
      });
    }

    const token = await this.signToken({
      sub: member.id.toString(),
      shopId: dto.shopId.toString(),
      role: 'member',
      type: 'member',
    });

    return {
      token,
      member: await this.serializeMemberWithStaff(member),
    };
  }

  async getProfile(user: JwtPayload) {
    if (user.type !== 'member') {
      throw new BusinessException(ErrorCodes.FORBIDDEN, '仅顾客账号可查询');
    }
    const member = await this.prisma.member.findUnique({
      where: { id: BigInt(user.sub) },
    });
    if (!member) {
      throw new BusinessException(ErrorCodes.NOT_FOUND, '会员不存在');
    }
    return this.serializeMemberWithStaff(member);
  }

  async staffEnter(user: JwtPayload) {
    if (user.type !== 'member') {
      throw new BusinessException(ErrorCodes.FORBIDDEN, '请使用顾客账号进入');
    }
    const member = await this.prisma.member.findUnique({
      where: { id: BigInt(user.sub) },
    });
    if (!member?.phone) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '请先绑定与员工档案一致的手机号');
    }
    const staff = await this.findStaffByPhone(member.shopId, member.phone);
    if (!staff) {
      throw new BusinessException(ErrorCodes.FORBIDDEN, '当前账号不是本店员工');
    }
    return this.issueStaffSession(staff, member.shopId);
  }

  async bindPhone(user: JwtPayload, dto: BindPhoneDto) {
    if (!(await this.isManualPhoneBindAllowed(user.shopId))) {
      throw new BusinessException(ErrorCodes.FORBIDDEN, '请使用微信授权绑定手机号');
    }
    return this.updateMemberPhone(user, dto.phone);
  }

  async bindPhoneByCode(user: JwtPayload, dto: WxPhoneDto) {
    const phone = await this.wechat.getPhoneNumber(user.shopId, dto.phoneCode);
    return this.updateMemberPhone(user, phone);
  }

  private async updateMemberPhone(user: JwtPayload, phone: string) {
    const member = await this.prisma.member.update({
      where: { id: BigInt(user.sub) },
      data: { phone },
    });
    return this.serializeMemberWithStaff(member);
  }

  async adminLogin(dto: AdminLoginDto) {
    const shopId = dto.shopId?.trim();

    const platform = await this.prisma.platformUser.findFirst({
      where: { username: dto.username, status: 1 },
    });
    if (platform) {
      const ok = await bcrypt.compare(dto.password, platform.passwordHash);
      if (!ok) {
        throw new BusinessException(ErrorCodes.UNAUTHORIZED, '账号或密码错误', HttpStatus.UNAUTHORIZED);
      }
      const token = await this.signToken({
        sub: platform.id.toString(),
        shopId: '0',
        role: 'platform',
        type: 'platform',
      });
      return {
        token,
        admin: {
          id: Number(platform.id),
          username: platform.username,
          role: 'platform',
        },
      };
    }

    const admin = await this.prisma.adminUser.findFirst({
      where: {
        username: dto.username,
        status: 1,
        ...(shopId ? { shopId: BigInt(shopId) } : {}),
      },
      include: { shop: true },
    });

    if (!admin && !shopId) {
      const matches = await this.prisma.adminUser.count({
        where: { username: dto.username, status: 1 },
      });
      if (matches > 1) {
        throw new BusinessException(ErrorCodes.BAD_REQUEST, '该账号绑定多家店，请填写店铺 ID');
      }
    }

    if (!admin) {
      throw new BusinessException(ErrorCodes.UNAUTHORIZED, '账号或密码错误', HttpStatus.UNAUTHORIZED);
    }

    const ok = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!ok) {
      throw new BusinessException(ErrorCodes.UNAUTHORIZED, '账号或密码错误', HttpStatus.UNAUTHORIZED);
    }

    if (admin.shop.status !== 1) {
      throw new BusinessException(ErrorCodes.FORBIDDEN, '店铺已暂停，请联系服务商续费');
    }

    const role: UserRole = admin.role === 1 ? 'owner' : 'manager';
    const token = await this.signToken({
      sub: admin.id.toString(),
      shopId: admin.shopId.toString(),
      role,
      type: 'admin',
    });

    return {
      token,
      admin: {
        id: Number(admin.id),
        username: admin.username,
        role,
        shop: {
          id: Number(admin.shop.id),
          name: admin.shop.name,
        },
      },
    };
  }

  async staffLogin(dto: StaffLoginDto) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        shopId: BigInt(dto.shopId),
        phone: dto.phone,
        status: 1,
      },
    });
    if (!staff) {
      throw new BusinessException(ErrorCodes.UNAUTHORIZED, '员工不存在');
    }
    return this.issueStaffSession(staff, BigInt(dto.shopId));
  }

  private async issueStaffSession(
    staff: { id: bigint; name: string; phone: string | null; role: number },
    shopId: bigint,
  ) {
    const roleMap: Record<number, UserRole> = {
      1: 'owner',
      2: 'manager',
      3: 'staff',
    };
    const role = roleMap[staff.role] ?? 'staff';

    const token = await this.signToken({
      sub: staff.id.toString(),
      shopId: shopId.toString(),
      role,
      type: 'admin',
    });

    return {
      token,
      staff: {
        id: Number(staff.id),
        name: staff.name,
        phone: staff.phone,
        role,
      },
    };
  }

  private async findStaffByPhone(shopId: bigint, phone: string) {
    const normalized = phone.trim();
    if (!normalized) return null;
    return this.prisma.staff.findFirst({
      where: { shopId, phone: normalized, status: 1 },
    });
  }

  private staffRoleLabel(role: number): UserRole {
    const roleMap: Record<number, UserRole> = {
      1: 'owner',
      2: 'manager',
      3: 'staff',
    };
    return roleMap[role] ?? 'staff';
  }

  private async serializeMemberWithStaff(member: {
    id: bigint;
    shopId: bigint;
    openid: string;
    phone: string | null;
    nickname: string | null;
    avatar: string | null;
  }) {
    const staff = member.phone ? await this.findStaffByPhone(member.shopId, member.phone) : null;
    return {
      ...this.serializeMember(member),
      staff: staff
        ? {
            id: Number(staff.id),
            name: staff.name,
            phone: staff.phone,
            role: this.staffRoleLabel(staff.role),
          }
        : null,
    };
  }

  private signToken(payload: JwtPayload) {
    return this.jwt.signAsync(payload);
  }

  /** 读取店铺后台配置：是否允许手动输入手机号绑定 */
  private async isManualPhoneBindAllowed(shopId: string): Promise<boolean> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: BigInt(shopId) },
      select: { miniConfig: true },
    });
    return mergeMiniDisplay(shop?.miniConfig).allowManualPhoneBind;
  }

  private serializeMember(member: {
    id: bigint;
    shopId: bigint;
    openid: string;
    phone: string | null;
    nickname: string | null;
    avatar: string | null;
  }) {
    return {
      id: Number(member.id),
      shopId: Number(member.shopId),
      openid: member.openid,
      phone: member.phone,
      nickname: member.nickname,
      avatar: member.avatar,
    };
  }
}
