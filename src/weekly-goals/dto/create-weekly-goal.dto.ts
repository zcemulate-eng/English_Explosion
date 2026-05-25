import { IsNumber, Min, Max } from 'class-validator';

export class CreateWeeklyGoalDto {
  // Decimal 字段用 @IsNumber() 接收，支持小数（如 1.5 小时）
  @IsNumber()
  @Min(1)
  @Max(40)
  target_hours!: number;
}