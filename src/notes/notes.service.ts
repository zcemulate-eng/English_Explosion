import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  // GET /notes
  async getMyNotes(userId: number) {
    return this.prisma.note.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        material: { select: { id: true, title: true } },
        sentence: { select: { id: true, content: true, order_index: true } },
      },
    });
  }

  // POST /notes
  async createNote(userId: number, dto: CreateNoteDto) {
    return this.prisma.note.create({
      data: {
        user_id:     userId,
        material_id: dto.material_id,
        sentence_id: dto.sentence_id ?? null,
        content:     dto.content,
        note_type:   dto.note_type ?? null,
      },
    });
  }

  // DELETE /notes/:id
  async deleteNote(userId: number, noteId: number) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, user_id: userId },
    });
    if (!note) throw new NotFoundException('Note not found');

    await this.prisma.note.delete({ where: { id: noteId } });
    return { message: 'Note deleted.' };
  }
}