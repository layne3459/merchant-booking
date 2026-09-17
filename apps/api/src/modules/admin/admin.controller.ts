import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminService } from './admin.service';
import { VerifyService } from '../verify/verify.service';
import { BookingService } from '../booking/booking.service';
import { CardService } from '../card/card.service';
import { PaymentService } from '../payment/payment.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/constants/error-codes';
import {
  ListBookingsQueryDto,
  ListMembersQueryDto,
  ListPaymentsQueryDto,
  ListTransactionsQueryDto,
  PaginationQueryDto,
} from './dto/admin-query.dto';
import { ReverseVerifyDto, AdminOpenCardDto, AdminRechargeDto } from '../card/dto/card.dto';
import { RescheduleBookingDto } from '../booking/dto/booking.dto';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles('owner', 'manager')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly verifyService: VerifyService,
    private readonly bookingService: BookingService,
    private readonly cardService: CardService,
    private readonly paymentService: PaymentService,
  ) {}

  @Get('services')
  listServices(@CurrentUser() user: JwtPayload) {
    return this.adminService.listServices(user);
  }

  @Post('services')
  createService(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.adminService.createService(user, body);
  }

  @Put('services/:id')
  updateService(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateService(user, id, body);
  }

  @Delete('services/:id')
  deleteService(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteService(user, id);
  }

  @Get('staff')
  listStaff(@CurrentUser() user: JwtPayload) {
    return this.adminService.listStaff(user);
  }

  @Post('staff')
  createStaff(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.adminService.createStaff(user, body);
  }

  @Put('staff/:id')
  updateStaff(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateStaff(user, id, body);
  }

  @Get('schedules')
  listSchedules(@CurrentUser() user: JwtPayload, @Query('staffId') staffId?: string) {
    return this.adminService.listSchedules(user, staffId ? Number(staffId) : undefined);
  }

  @Post('schedules')
  createSchedule(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.adminService.upsertSchedule(user, body);
  }

  @Put('schedules/:id')
  updateSchedule(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateSchedule(user, id, body);
  }

  @Delete('schedules/:id')
  deleteSchedule(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteSchedule(user, id);
  }

  @Get('card-templates')
  listCardTemplates(@CurrentUser() user: JwtPayload) {
    return this.adminService.listCardTemplates(user);
  }

  @Post('card-templates')
  createCardTemplate(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.adminService.createCardTemplate(user, body);
  }

  @Put('card-templates/:id')
  updateCardTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateCardTemplate(user, id, body);
  }

  @Get('bookings')
  listBookings(@CurrentUser() user: JwtPayload, @Query() query: ListBookingsQueryDto) {
    return this.adminService.listBookings(user, query);
  }

  @Put('bookings/:id/cancel')
  cancelBooking(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.adminCancel(user, id);
  }

  @Put('bookings/:id/arrive')
  arriveBooking(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.adminArrive(user, id);
  }

  @Put('bookings/:id/no-show')
  noShowBooking(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.adminNoShow(user, id);
  }

  @Put('bookings/:id/reschedule')
  rescheduleBooking(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingService.adminReschedule(user, id, dto);
  }

  @Put('bookings/:id/complete')
  completeBooking(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.adminComplete(user, id);
  }

  @Get('members')
  listMembers(@CurrentUser() user: JwtPayload, @Query() query: ListMembersQueryDto) {
    return this.adminService.listMembers(user, query);
  }

  @Get('members/:id')
  getMember(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.adminService.getMemberDetail(user, id);
  }

  @Post('members/:id/open-card')
  openCard(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) memberId: number,
    @Body() dto: AdminOpenCardDto,
  ) {
    return this.cardService.adminOpenCard(user, memberId, dto.templateId, dto.remark);
  }

  @Post('cards/:id/recharge')
  rechargeCard(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) cardId: number,
    @Body() dto: AdminRechargeDto,
  ) {
    return this.cardService.adminRecharge(user, cardId, dto.amount, dto.remark);
  }

  @Get('payments')
  listPayments(@CurrentUser() user: JwtPayload, @Query() query: ListPaymentsQueryDto) {
    return this.paymentService.listPayments(user, query.page, query.pageSize, query.status);
  }

  @Post('payments/:id/refund')
  refundPayment(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.paymentService.createRefund(user, id);
  }

  @Get('transactions/export')
  @SkipTransform()
  async exportTransactions(@CurrentUser() user: JwtPayload) {
    const buffer = await this.adminService.exportTransactionsCsv(user);
    return new StreamableFile(buffer, {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="transactions.csv"',
    });
  }

  @Get('transactions')
  listTransactions(@CurrentUser() user: JwtPayload, @Query() query: ListTransactionsQueryDto) {
    return this.adminService.listTransactions(user, query);
  }

  @Get('verify-records')
  listVerifyRecords(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
    return this.verifyService.listRecords(user, query.page, query.pageSize);
  }

  @Post('verify/reverse')
  reverseVerify(@CurrentUser() user: JwtPayload, @Body() dto: ReverseVerifyDto) {
    return this.verifyService.reverse(user, dto.verifyRecordId);
  }

  @Get('reports/daily')
  dailyReport(@CurrentUser() user: JwtPayload) {
    return this.adminService.dailyReport(user);
  }

  @Get('reports/monthly')
  monthlyReport(@CurrentUser() user: JwtPayload) {
    return this.adminService.monthlyReport(user);
  }

  @Get('reports/trend')
  trendReport(@CurrentUser() user: JwtPayload, @Query('days') days?: string) {
    return this.adminService.trendReport(user, days ? Number(days) : 7);
  }

  @Get('shop/qrcode')
  getShopQrcode(@CurrentUser() user: JwtPayload) {
    return this.adminService.getShopQrcode(user);
  }

  @Get('shop')
  getShop(@CurrentUser() user: JwtPayload) {
    return this.adminService.getShop(user);
  }

  @Put('shop')
  updateShop(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.adminService.updateShop(user, body);
  }

  @Post('shop/wx-cert')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 1024 * 1024 },
    }),
  )
  uploadWxCert(
    @CurrentUser() user: JwtPayload,
    @Body('type') type: 'privateKey' | 'platformCert',
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '请选择证书文件');
    }
    if (!['privateKey', 'platformCert'].includes(type)) {
      throw new BusinessException(ErrorCodes.BAD_REQUEST, '证书类型无效');
    }
    return this.adminService.uploadWxCert(user, type, file);
  }
}

