import { Global, Module } from '@nestjs/common';
import { WxConfigService } from './wx-config.service';

@Global()
@Module({
  providers: [WxConfigService],
  exports: [WxConfigService],
})
export class WxConfigModule {}
