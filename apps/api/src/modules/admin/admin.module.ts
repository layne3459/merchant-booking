import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { VerifyModule } from '../verify/verify.module';
import { BookingModule } from '../booking/booking.module';
import { CardModule } from '../card/card.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [AuthModule, VerifyModule, BookingModule, CardModule, PaymentModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
