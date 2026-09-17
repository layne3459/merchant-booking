import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsService } from './jobs.service';
import { BookingModule } from '../modules/booking/booking.module';
import { NotifyModule } from '../modules/notify/notify.module';
import { PlatformModule } from '../modules/platform/platform.module';

@Module({
  imports: [ScheduleModule.forRoot(), BookingModule, NotifyModule, PlatformModule],
  providers: [JobsService],
})
export class JobsModule {}
