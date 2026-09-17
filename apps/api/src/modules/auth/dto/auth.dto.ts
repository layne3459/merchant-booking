import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class WxLoginDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @Matches(/^\d{1,20}$/, { message: '店铺ID须为数字' })
  shopId!: string;
}

export class BindPhoneDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class WxPhoneDto {
  @IsString()
  @IsNotEmpty()
  phoneCode!: string;
}

export class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value)))
  @IsString()
  @Matches(/^\d{1,20}$/, { message: '店铺ID须为数字' })
  shopId?: string;
}

export class StaffLoginDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @Matches(/^\d{1,20}$/, { message: '店铺ID须为数字' })
  shopId!: string;
}
