import { Module, forwardRef } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PaymentModule } from '../payment/payment.module';
import { NotifyModule } from '../notify/notify.module';

@Module({
  imports: [forwardRef(() => PaymentModule), NotifyModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
