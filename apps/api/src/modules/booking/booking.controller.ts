import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { GetSlotsQueryDto, CreateBookingDto, RescheduleBookingDto, GetAvailabilityQueryDto } from './dto/booking.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Public()
  @Get('availability')
  getAvailability(@Query() query: GetAvailabilityQueryDto) {
    return this.bookingService.getAvailability(
      query.shopId,
      query.serviceId,
      query.from,
      query.days ?? 14,
      query.staffId,
    );
  }

  @Public()
  @Get('slots')
  getSlots(@Query() query: GetSlotsQueryDto) {
    return this.bookingService.getSlots(
      query.shopId,
      query.serviceId,
      query.date,
      query.staffId,
    );
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBookingDto) {
    return this.bookingService.create(user, dto);
  }

  @Get('my')
  listMy(@CurrentUser() user: JwtPayload) {
    return this.bookingService.listMy(user);
  }

  @Get('today')
  @UseGuards(RolesGuard)
  @Roles('staff', 'manager', 'owner')
  listToday(@CurrentUser() user: JwtPayload) {
    return this.bookingService.listToday(user);
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.getOne(user, id);
  }

  @Put(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.cancel(user, id);
  }

  @Put(':id/reschedule')
  reschedule(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingService.reschedule(user, id, dto);
  }

  @Put(':id/arrive')
  @UseGuards(RolesGuard)
  @Roles('staff', 'manager', 'owner')
  arrive(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.arrive(user, id);
  }

  @Put(':id/no-show')
  @UseGuards(RolesGuard)
  @Roles('staff', 'manager', 'owner')
  noShow(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.noShow(user, id);
  }

  @Put(':id/complete')
  @UseGuards(RolesGuard)
  @Roles('staff', 'manager', 'owner')
  complete(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.complete(user, id);
  }
}
