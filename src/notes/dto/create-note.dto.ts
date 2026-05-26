import { IsInt, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({ example: 1, description: '材料 ID' })
  @IsInt()
  material_id!: number;

  @ApiPropertyOptional({ example: 5, description: '关联的句子 ID（可选）' })
  @IsInt()
  @IsOptional()
  sentence_id?: number;

  @ApiProperty({ example: 'This phrase means...', description: '笔记内容' })
  @IsString()
  content!: string;
}