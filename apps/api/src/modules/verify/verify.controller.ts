import { Body, Controller, Get, Post, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { VerifyService } from './verify.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { ConsumeVerifyDto, ManualVerifyDto, ReverseVerifyDto } from '../card/dto/card.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('verify')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Get('code')
  generateCode(
    @CurrentUser() user: JwtPayload,
    @Query('cardId', ParseIntPipe) cardId: number,
  ) {
    return this.verifyService.generateCode(user, cardId);
  }

  @Get('records')
  @UseGuards(RolesGuard)
  @Roles('staff', 'manager', 'owner')
  listRecords(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('today') today?: string,
  ) {
    return this.verifyService.listRecords(
      user,
      Number(page) || 1,
      Number(pageSize) || 20,
      today === '1',
    );
  }

  @Post('consume')
  @UseGuards(RolesGuard)
  @Roles('staff', 'manager', 'owner')
  consume(@CurrentUser() user: JwtPayload, @Body() dto: ConsumeVerifyDto) {
    return this.verifyService.consume(user, dto.code, dto.serviceId);
  }

  @Post('manual')
  @UseGuards(RolesGuard)
  @Roles('staff', 'manager', 'owner')
  manual(@CurrentUser() user: JwtPayload, @Body() dto: ManualVerifyDto) {
    return this.verifyService.manualVerify(user, dto.phone, dto.serviceId, dto.cardId);
  }

  @Post('reverse')
  @UseGuards(RolesGuard)
  @Roles('manager', 'owner')
  reverse(@CurrentUser() user: JwtPayload, @Body() dto: ReverseVerifyDto) {
    return this.verifyService.reverse(user, dto.verifyRecordId);
  }
}
