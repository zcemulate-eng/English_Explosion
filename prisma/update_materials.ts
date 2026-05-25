/**
 * 更新材料难度和时长脚本
 * 运行：cd back_end && npx ts-node prisma/update_materials.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 根据材料标题解析书号、Section 号
function parseMaterialTitle(title: string): { book: number; section: number } | null {
  // 匹配 C4T1S1 / C10T2S3 格式
  const m = title.match(/^C(\d+)T\d+S(\d+)$/i);
  if (!m) return null;
  return { book: parseInt(m[1]), section: parseInt(m[2]) };
}

// 根据书号和 section 判断难度
function getDifficulty(book: number, section: number): string {
  if (book <= 6) {
    // 剑4-6：S1/S2 → B1，S3/S4 → B2
    return section <= 2 ? 'B1' : 'B2';
  } else if (book <= 9) {
    // 剑7-9：S1/S2 → B2，S3/S4 → B2
    return section <= 2 ? 'B2' : 'B2';
  } else if (book <= 12) {
    // 剑10-12：S1/S2 → B2，S3/S4 → C1
    return section <= 2 ? 'B2' : 'C1';
  } else {
    // 剑13+：S1/S2 → C1，S3/S4 → C1
    return 'C1';
  }
}

async function main() {
  const materials = await prisma.material.findMany({
    select: { id: true, title: true },
  });

  console.log(`📊 共 ${materials.length} 个材料\n`);

  let updated = 0;
  let skipped = 0;

  for (const mat of materials) {
    const parsed = parseMaterialTitle(mat.title);
    if (!parsed) {
      console.log(`  [skip] ${mat.title} — 无法解析标题格式`);
      skipped++;
      continue;
    }

    const { book, section } = parsed;
    const difficulty = getDifficulty(book, section);

    // 从最后一句的 audio_end_time 计算音频时长（分钟）
    const lastSentence = await prisma.sentence.findFirst({
      where: { material_id: mat.id },
      orderBy: { audio_end_time: 'desc' },
      select: { audio_end_time: true, audio_start_time: true },
    });

    // 取第一句的 start_time 作为音频开始（跳过前面的版权声明部分）
    const firstSentence = await prisma.sentence.findFirst({
      where: { material_id: mat.id },
      orderBy: { audio_start_time: 'asc' },
      select: { audio_start_time: true },
    });

    let totalDuration: number | null = null;
    if (lastSentence?.audio_end_time != null && firstSentence?.audio_start_time != null) {
      const seconds = lastSentence.audio_end_time - firstSentence.audio_start_time;
      totalDuration = Math.round(seconds / 60); // 转为分钟，取整
      if (totalDuration < 1) totalDuration = 1;
    }

    await prisma.material.update({
      where: { id: mat.id },
      data: {
        difficulty_level: difficulty as any,
        total_duration: totalDuration,
      },
    });

    console.log(`  [done] ${mat.title} → 难度: ${difficulty}, 时长: ${totalDuration ?? '?'} min`);
    updated++;
  }

  console.log(`\n✅ 完成！更新 ${updated} 个，跳过 ${skipped} 个`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });