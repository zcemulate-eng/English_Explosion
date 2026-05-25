import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';
import { NoteType } from '@prisma/client';

export class CreateNoteDto {
  @IsInt()
  material_id!: number;

  @IsInt()
  @IsOptional()
  sentence_id?: number;

  @IsString()
  content!: string;

  @IsEnum(NoteType)
  @IsOptional()
  note_type?: NoteType;
}