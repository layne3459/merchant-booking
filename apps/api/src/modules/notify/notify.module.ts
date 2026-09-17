import { Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}
