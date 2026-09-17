import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ShopService } from './shop.service';
import { BookingService } from '../booking/booking.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('shops')
export class ShopController {
  constructor(
    private readonly shopService: ShopService,
    private readonly bookingService: BookingService,
  ) {}

  @Public()
  @Get(':id')
  getShop(@Param('id', ParseIntPipe) id: number) {
    return this.shopService.getShop(id);
  }

  @Public()
  @Get(':id/services')
  getServices(@Param('id', ParseIntPipe) id: number) {
    return this.shopService.getServices(id);
  }

  @Public()
  @Get(':id/services/:serviceId/slots')
  getServiceSlots(
    @Param('id', ParseIntPipe) shopId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Query('date') date: string,
    @Query('staffId') staffId?: number,
  ) {
    return this.bookingService.getSlots(
      shopId,
      serviceId,
      date,
      staffId ? Number(staffId) : undefined,
    );
  }

  @Public()
  @Get(':id/services/:serviceId/availability')
  getServiceAvailability(
    @Param('id', ParseIntPipe) shopId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Query('from') from: string,
    @Query('days') days?: number,
    @Query('staffId') staffId?: number,
  ) {
    return this.bookingService.getAvailability(
      shopId,
      serviceId,
      from,
      days ? Number(days) : 14,
      staffId ? Number(staffId) : undefined,
    );
  }

  @Public()
  @Get(':id/card-templates')
  getCardTemplates(@Param('id', ParseIntPipe) id: number) {
    return this.shopService.getCardTemplates(id);
  }
}
