import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @ApiOperation({ summary: '获取我的所有笔记' })
  @Get()
  getMyNotes(@Request() req: { user: { id: number } }) {
    return this.notesService.getMyNotes(req.user.id);
  }

  @ApiOperation({ summary: '新增笔记' })
  @Post()
  createNote(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.createNote(req.user.id, dto);
  }

  @ApiOperation({ summary: '编辑笔记内容' })
  @Patch(':id')
  updateNote(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.updateNote(req.user.id, id, dto);
  }

  @ApiOperation({ summary: '删除笔记' })
  @Delete(':id')
  deleteNote(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notesService.deleteNote(req.user.id, id);
  }
}