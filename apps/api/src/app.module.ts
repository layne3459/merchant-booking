import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { ShopModule } from './modules/shop/shop.module';
import { HealthModule } from './modules/health/health.module';
import { BookingModule } from './modules/booking/booking.module';
import { CardModule } from './modules/card/card.module';
import { PaymentModule } from './modules/payment/payment.module';
import { VerifyModule } from './modules/verify/verify.module';
import { MemberModule } from './modules/member/member.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotifyModule } from './modules/notify/notify.module';
import { UploadModule } from './modules/upload/upload.module';
import { WxConfigModule } from './modules/wx-config/wx-config.module';
import { PlatformModule } from './modules/platform/platform.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    ShopModule,
    HealthModule,
    BookingModule,
    CardModule,
    PaymentModule,
    VerifyModule,
    MemberModule,
    AdminModule,
    NotifyModule,
    UploadModule,
    WxConfigModule,
    PlatformModule,
    JobsModule,
  ],
})
export class AppModule {}
