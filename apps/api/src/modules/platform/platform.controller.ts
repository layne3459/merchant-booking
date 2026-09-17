import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { CreateShopDto, RenewShopDto, ResetShopPasswordDto } from './dto/platform.dto';
import { PaginationQueryDto } from '../admin/dto/admin-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IsOptional, IsString } from 'class-validator';

class ListShopsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}

@Controller('platform')
@UseGuards(RolesGuard)
@Roles('platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('plans')
  listPlans() {
    return this.platform.listPlans();
  }

  @Get('shops')
  listShops(@Query() query: ListShopsQueryDto) {
    return this.platform.listShops(query.page, query.pageSize, query.keyword);
  }

  @Post('shops')
  createShop(@Body() dto: CreateShopDto) {
    return this.platform.createShop(dto);
  }

  @Post('shops/:id/freeze')
  freeze(@Param('id', ParseIntPipe) id: number) {
    return this.platform.freezeShop(id);
  }

  @Post('shops/:id/unfreeze')
  unfreeze(@Param('id', ParseIntPipe) id: number) {
    return this.platform.unfreezeShop(id);
  }

  @Post('shops/:id/renew')
  renew(@Param('id', ParseIntPipe) id: number, @Body() dto: RenewShopDto) {
    return this.platform.renewShop(id, dto);
  }

  @Post('shops/:id/reset-password')
  resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetShopPasswordDto) {
    return this.platform.resetOwnerPassword(id, dto.password);
  }
}
