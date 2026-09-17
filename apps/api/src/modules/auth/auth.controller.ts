import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BindPhoneDto, StaffLoginDto, WxLoginDto, WxPhoneDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './types/jwt-payload.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('wx-login')
  wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto);
  }

  @Public()
  @Post('staff-login')
  staffLogin(@Body() dto: StaffLoginDto) {
    return this.authService.staffLogin(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('staff-enter')
  staffEnter(@CurrentUser() user: JwtPayload) {
    return this.authService.staffEnter(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bind-phone')
  bindPhone(@CurrentUser() user: JwtPayload, @Body() dto: BindPhoneDto) {
    return this.authService.bindPhone(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('wx-phone')
  bindWxPhone(@CurrentUser() user: JwtPayload, @Body() dto: WxPhoneDto) {
    return this.authService.bindPhoneByCode(user, dto);
  }
}
