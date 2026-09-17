import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { Public } from '../../common/decorators/public.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { WxPayNotifyBody } from './wechat-pay.service';

class PayNotifyDto {
  outTradeNo!: string;
}

@Controller('pay')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('status/:outTradeNo')
  getStatus(@Param('outTradeNo') outTradeNo: string) {
    return this.paymentService.getStatus(outTradeNo);
  }

  @Public()
  @Post('notify')
  @SkipTransform()
  notify(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: WxPayNotifyBody | PayNotifyDto,
    @Query('shop') shop?: string,
    @Headers('wechatpay-timestamp') timestamp?: string,
    @Headers('wechatpay-nonce') nonce?: string,
    @Headers('wechatpay-signature') signature?: string,
    @Headers('wechatpay-serial') serial?: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body));
    const headers =
      timestamp && nonce && signature && serial
        ? { timestamp, nonce, signature, serial }
        : undefined;
    const shopId = shop ? Number(shop) : undefined;
    return this.paymentService.handleNotify(shopId, body, headers, rawBody);
  }
}
