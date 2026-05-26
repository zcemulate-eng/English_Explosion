import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import sanitizeHtml from 'sanitize-html';

// 笔记为纯文本，剥离所有 HTML 标签与属性，防止存储型 XSS
function clean(text: string): string {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();
}

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
        content:     clean(dto.content),
      },
    });
  }

  // PATCH /notes/:id
  async updateNote(userId: number, noteId: number, dto: UpdateNoteDto) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, user_id: userId },
    });
    if (!note) throw new NotFoundException('Note not found');

    return this.prisma.note.update({
      where: { id: noteId },
      data: { content: clean(dto.content) },
      include: {
        material: { select: { id: true, title: true } },
        sentence: { select: { id: true, content: true, order_index: true } },
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