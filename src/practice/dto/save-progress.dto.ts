import { IsInt, IsArray, ValidateNested, IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerRecordDto {
  @IsInt()
  sentence_id!: number;

  @IsString()
  user_answer!: string;

  @IsString()
  correct_answer!: string;

  @IsNumber()
  @IsOptional()
  accuracy_score?: number;
}

export class SaveProgressDto {
  @IsInt()
  session_id!: number;

  @IsInt()
  material_id!: number;

  @IsNumber()
  progress_percentage!: number;

  @IsInt()
  @IsOptional()
  current_sentence_id?: number;

  // 本次同步的实际练习秒数（前端用 Date.now() 计算）
  @IsInt()
  @IsOptional()
  time_spent_seconds?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerRecordDto)
  answers!: AnswerRecordDto[];
}