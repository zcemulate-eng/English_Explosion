import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import type { Response } from 'express';

// 材料相关接口全部跳过限流：
// - 是公开只读接口，无安全风险
// - 精听页会频繁调用 /audio（Range 请求），限流会导致播放中断
@ApiTags('materials')
@SkipThrottle()
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @ApiOperation({ summary: '获取所有材料列表' })
  @Get()
  getAllMaterials() {
    return this.materialsService.findAll();
  }

  @ApiOperation({ summary: '获取单个材料详情' })
  @Get(':id')
  getMaterial(@Param('id', ParseIntPipe) id: number) {
    return this.materialsService.findById(id);
  }

  @ApiOperation({ summary: '获取材料的句子列表' })
  @Get(':id/sentences')
  getSentences(@Param('id', ParseIntPipe) id: number) {
    return this.materialsService.findSentences(id);
  }

  @ApiOperation({ summary: '获取材料音频（重定向到 OSS 或本地流式返回）' })
  @Get(':id/audio')
  async streamAudio(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const material = await this.materialsService.findById(id);

    // audio_url 已经是完整的 OSS URL，直接重定向
    // 浏览器会直接从 OSS 下载音频，不经过后端，节省带宽
    if (material.audio_url.startsWith('http')) {
      res.redirect(material.audio_url);
    } else {
      // 兼容旧的本地路径格式（开发环境）
      const { join } = await import('path');
      const { createReadStream, existsSync, statSync } = await import('fs');
      const filePath = join(process.cwd(), 'public', material.audio_url);

      if (!existsSync(filePath)) {
        res.status(404).json({ message: 'Audio file not found' });
        return;
      }

      const { size } = statSync(filePath);
      res.setHeader('Content-Length', size);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      createReadStream(filePath).pipe(res);
    }
  }
}