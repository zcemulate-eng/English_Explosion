import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWeeklyGoalDto {
  // Decimal 字段用 @IsNumber() 接收，支持小数（如 1.5 小时）
  @ApiProperty({ example: 5, minimum: 1, maximum: 40, description: '每周目标小时数（1-40，支持小数）' })
  @IsNumber()
  @Min(1)
  @Max(40)
  target_hours!: number;
}