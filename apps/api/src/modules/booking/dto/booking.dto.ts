import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GetSlotsQueryDto {
  @IsInt()
  @Min(1)
  shopId!: number;

  @IsInt()
  @Min(1)
  serviceId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  staffId?: number;

  @IsDateString()
  date!: string;
}

export class GetAvailabilityQueryDto {
  @IsInt()
  @Min(1)
  shopId!: number;

  @IsInt()
  @Min(1)
  serviceId!: number;

  @IsDateString()
  from!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  staffId?: number;
}

export class CreateBookingDto {
  @IsInt()
  @Min(1)
  serviceId!: number;

  @IsInt()
  @Min(1)
  staffId!: number;

  @IsDateString()
  bookDate!: string;

  @IsString()
  @IsNotEmpty()
  timeSlot!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class RescheduleBookingDto {
  @IsDateString()
  bookDate!: string;

  @IsString()
  @IsNotEmpty()
  timeSlot!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  staffId?: number;
}
