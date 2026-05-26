import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateNoteDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}