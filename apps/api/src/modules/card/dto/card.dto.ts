import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class PurchaseCardDto {
  @IsInt()
  @Min(1)
  templateId!: number;
}

export class ConsumeVerifyDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsInt()
  @Min(1)
  serviceId!: number;
}

export class ManualVerifyDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsInt()
  @Min(1)
  serviceId!: number;

  @IsInt()
  @Min(1)
  cardId!: number;
}

export class ReverseVerifyDto {
  @IsInt()
  @Min(1)
  verifyRecordId!: number;
}

export class AdminOpenCardDto {
  @IsInt()
  @Min(1)
  templateId!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class StaffOpenCardDto {
  @IsInt()
  @Min(1)
  memberId!: number;

  @IsInt()
  @Min(1)
  templateId!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class AdminRechargeDto {
  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
