import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { WechatPayService } from './wechat-pay.service';
import { CardModule } from '../card/card.module';
import { NotifyModule } from '../notify/notify.module';

@Module({
  imports: [forwardRef(() => CardModule), NotifyModule],
  controllers: [PaymentController],
  providers: [PaymentService, WechatPayService],
  exports: [PaymentService],
})
export class PaymentModule {}
