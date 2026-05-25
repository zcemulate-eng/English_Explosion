/**
 * 句子数据导入脚本
 * 读取 transcripts/ 目录下的 Whisper 转录 JSON，
 * 匹配数据库中的 Material，写入 Sentence 表。
 *
 * 运行方式（在 back_end/ 目录下）：
 *   npx ts-node prisma/seed_sentences.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TranscriptEntry {
  order_index: number;
  content: string;
  start: number;
  end: number;
}

async function main() {
  // transcripts/ 与 prisma/ 同级，都在 back_end/ 下
  const transcriptsDir = path.join(__dirname, '..', 'transcripts');

  if (!fs.existsSync(transcriptsDir)) {
    console.error('❌ transcripts/ 目录不存在，请先运行 whisper_transcribe.py');
    process.exit(1);
  }

  const jsonFiles = fs.readdirSync(transcriptsDir).filter((f) => f.endsWith('.json'));
  console.log(`📂 找到 ${jsonFiles.length} 个转录文件\n`);

  let totalSentences = 0;
  let importedCount  = 0;
  let skippedCount   = 0;

  for (const file of jsonFiles) {
    const title    = file.replace('.json', '');
    const material = await prisma.material.findFirst({ where: { title } });

    if (!material) {
      console.log(`  [skip] ${title} — 数据库中找不到对应材料`);
      skippedCount++;
      continue;
    }

    const existingCount = await prisma.sentence.count({
      where: { material_id: material.id },
    });
    if (existingCount > 0) {
      console.log(`  [skip] ${title} — 已有 ${existingCount} 条句子记录`);
      skippedCount++;
      continue;
    }

    const filePath = path.join(transcriptsDir, file);
    const raw      = fs.readFileSync(filePath, 'utf-8').trim();

    if (!raw) {
      console.log(`  [skip] ${title} — 文件为空`);
      skippedCount++;
      continue;
    }

    let entries: TranscriptEntry[];
    try {
      entries = JSON.parse(raw);
    } catch {
      console.log(`  [skip] ${title} — JSON 解析失败`);
      skippedCount++;
      continue;
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      console.log(`  [skip] ${title} — 转录结果为空`);
      skippedCount++;
      continue;
    }

    await prisma.sentence.createMany({
      data: entries.map((entry) => ({
        material_id:      material.id,
        order_index:      entry.order_index,
        content:          entry.content,
        audio_start_time: entry.start,
        audio_end_time:   entry.end,
      })),
    });

    await prisma.material.update({
      where: { id: material.id },
      data:  { total_sentences: entries.length },
    });

    console.log(`  [done] ${title} (id=${material.id}) → ${entries.length} 条句子`);
    totalSentences += entries.length;
    importedCount++;
  }

  console.log(`\n✅ 导入完成！`);
  console.log(`   导入材料：${importedCount} 个`);
  console.log(`   跳过材料：${skippedCount} 个`);
  console.log(`   总句子数：${totalSentences} 条`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });