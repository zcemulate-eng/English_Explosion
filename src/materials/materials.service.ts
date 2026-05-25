import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.material.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        difficulty_level: true,
        total_duration: true,
        total_sentences: true,
        description: true,
        audio_url: true,
      },
    });
  }

  async findById(id: number) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        audio_url: true,
        difficulty_level: true,
        total_duration: true,
        total_sentences: true,
      },
    });
    if (!material) throw new NotFoundException(`Material #${id} not found`);
    return material;
  }

  async findSentences(id: number) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException(`Material #${id} not found`);

    return this.prisma.sentence.findMany({
      where: { material_id: id },
      orderBy: { order_index: 'asc' },
      select: {
        id: true,
        order_index: true,
        content: true,
        audio_start_time: true,
        audio_end_time: true,
        translation: true,
      },
    });
  }
}