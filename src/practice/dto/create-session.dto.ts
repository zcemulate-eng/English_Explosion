import { IsInt, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @IsInt()
  material_id!: number;

  // 若传入则为 Resume 场景，恢复已有 session
  @IsInt()
  @IsOptional()
  resume_session_id?: number;
}