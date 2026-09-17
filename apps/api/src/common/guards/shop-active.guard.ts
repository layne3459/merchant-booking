import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../modules/auth/types/jwt-payload.type';
import { ShopStatus } from '../constants/business';

@Injectable()
export class ShopActiveGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    if (!user || user.role === 'platform' || user.type === 'platform') {
      return true;
    }
    if (!user.shopId || user.shopId === '0') {
      return true;
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: BigInt(user.shopId) },
      select: { status: true },
    });
    if (!shop || shop.status !== ShopStatus.ACTIVE) {
      throw new ForbiddenException('店铺已暂停，请联系服务商续费');
    }
    return true;
  }
}
