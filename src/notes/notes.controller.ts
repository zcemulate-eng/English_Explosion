import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  getMyNotes(@Request() req: { user: { id: number } }) {
    return this.notesService.getMyNotes(req.user.id);
  }

  @Post()
  createNote(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.createNote(req.user.id, dto);
  }

  @Delete(':id')
  deleteNote(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notesService.deleteNote(req.user.id, id);
  }
}