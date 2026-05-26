import { IsInt, IsArray, ValidateNested, IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AnswerRecordDto {
  @ApiProperty({ example: 5, description: '句子 ID' })
  @IsInt()
  sentence_id!: number;

  @ApiProperty({ example: 'the quick brown fox', description: '用户作答内容' })
  @IsString()
  user_answer!: string;

  @ApiProperty({ example: 'The quick brown fox.', description: '正确答案' })
  @IsString()
  correct_answer!: string;

  @ApiPropertyOptional({ example: 92.5, description: '本句准确率（0-100）' })
  @IsNumber()
  @IsOptional()
  accuracy_score?: number;
}

export class SaveProgressDto {
  @ApiProperty({ example: 10, description: '会话 ID' })
  @IsInt()
  session_id!: number;

  @ApiProperty({ example: 1, description: '材料 ID' })
  @IsInt()
  material_id!: number;

  @ApiProperty({ example: 75.0, description: '当前进度百分比（0-100），达到100视为完成' })
  @IsNumber()
  progress_percentage!: number;

  @ApiPropertyOptional({ example: 5, description: '当前所在句子 ID（用于续播）' })
  @IsInt()
  @IsOptional()
  current_sentence_id?: number;

  // 本次同步的实际练习秒数（前端用 Date.now() 计算）
  @ApiPropertyOptional({ example: 120, description: '本次同步的实际练习秒数' })
  @IsInt()
  @IsOptional()
  time_spent_seconds?: number;

  @ApiProperty({ type: [AnswerRecordDto], description: '本次提交的答案列表' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerRecordDto)
  answers!: AnswerRecordDto[];
}