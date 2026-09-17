import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CardService } from './card.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { PurchaseCardDto, StaffOpenCardDto } from './dto/card.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get('my')
  listMy(@CurrentUser() user: JwtPayload) {
    return this.cardService.listMy(user);
  }

  @Post('purchase')
  purchase(@CurrentUser() user: JwtPayload, @Body() dto: PurchaseCardDto) {
    return this.cardService.purchase(user, dto.templateId);
  }

  @Post('open')
  @UseGuards(RolesGuard)
  @Roles('staff', 'manager', 'owner')
  openCard(@CurrentUser() user: JwtPayload, @Body() dto: StaffOpenCardDto) {
    return this.cardService.adminOpenCard(
      user,
      dto.memberId,
      dto.templateId,
      dto.remark || '店员开卡',
    );
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.cardService.getOne(user, id);
  }
}
