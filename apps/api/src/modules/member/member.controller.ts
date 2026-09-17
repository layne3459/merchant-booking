import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('members')
@UseGuards(RolesGuard)
@Roles('staff', 'manager', 'owner')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('search')
  search(@CurrentUser() user: JwtPayload, @Query('phone') phone: string) {
    return this.memberService.search(user, phone);
  }

  @Get(':id')
  getDetail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.memberService.getDetail(user, id);
  }
}
