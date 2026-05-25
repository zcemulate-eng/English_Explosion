import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JUNK_PATTERNS: RegExp[] = [
  // 版权信息
  /cambridge (english|ielts|university press|esol)/i,
  /published by cambridge/i,
  /this recording is copyright/i,

  // 媒体标记
  /^cd\s*\d+\.?$/i,
  /^test\s*\d+\.?$/i,
  /^section\s*\d+\.?$/i,
  /^part\s*\d+\.?$/i,

  // Section/Part 开头带描述
  /^section\s*\d+[.,]?\s+you('ll|'ll| will| are going to) hear/i,
  /^part\s*\d+[.,]?\s+you('ll|'ll| will| are going to) hear/i,

  // "You'll/You will hear..." 开头的描述句（所有场景）
  /^you('ll|'ll| will| are going to) hear\b/i,

  // 场景描述：以 "A/An/Two + 名词 + 动词ing" 开头的非对话句
  // 如 "A young student asking the social organiser..."
  // 如 "Two students discussing their assignment..."
  /^(a|an|two|three|some)\s+\w+\s+\w+(ing|ed)\s+(the|a|an|his|her|their|about|for|with|to)\b/i,

  // "You will see that there is an example"
  /you('ll|'ll| will| are going to) see that there is an example/i,

  // 考试操作指令
  /first[,]?\s+(you have|you've got) some time to look at questions/i,
  /now listen carefully and answer questions/i,
  /listen carefully and answer questions/i,
  /you have some time to (look at|read) (the )?questions/i,
  /you('ll|'ll| will) (now |)have (some )?time to look at/i,

  // 开始/结束指令
  /now (turn|we shall begin|we'll begin)/i,
  /you may now turn to (section|part)/i,
  /that is the end of (section|part|the test)/i,
  /this is the end of (section|part|the test)/i,

  // 作答说明
  /you should answer the questions as you listen/i,
  /because you will not hear the recording/i,
  /you will not hear the recording a second time/i,
  /all the recordings will be played once only/i,
  /the (test|exam) is in (four|three|five) sections/i,
  /there will be time for you to read the instructions/i,
  /you('ll|'ll| will) have a chance to check your work/i,
  /you('ll| will) (now |)be given ten minutes to transfer/i,
  /at the end of the test.*ten minutes/i,
  /transfer your answers to (an |the )?answer sheet/i,
  /you('ll|'ll| will) hear a number of different recordings/i,

  // 检查答案
  /you now have (half a minute|one minute|a minute|\d+ minutes?) to check/i,
  /please (check|look at) your (answers|work)/i,

  // 纯标点/乱码
  /^[.،。\s]+$/,
  /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0600-\u06ff]/,  // 中日韩阿拉伯文
];

function isJunk(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (/^[^a-zA-Z0-9]+$/.test(trimmed)) return true;
  return JUNK_PATTERNS.some((p) => p.test(trimmed));
}

async function main() {
  const allSentences = await prisma.sentence.findMany({
    select: { id: true, content: true, material_id: true },
  });

  const junkSentences = allSentences.filter((s) => isJunk(s.content));
  const junkIds = junkSentences.map((s) => s.id);

  console.log(`📊 总句子数：${allSentences.length}`);
  console.log(`🗑  识别到无用句子：${junkIds.length} 条`);

  if (junkIds.length === 0) {
    console.log('✅ 没有需要删除的句子');
    return;
  }

  console.log('\n将删除的句子（全部）:');
  junkSentences.forEach((s) => console.log(`  [id=${s.id}] "${s.content}"`));

  console.log('\n🔄 删除关联数据...');
  const nd = await prisma.note.deleteMany({ where: { sentence_id: { in: junkIds } } });
  const rd = await prisma.practiceResult.deleteMany({ where: { sentence_id: { in: junkIds } } });
  await prisma.practiceSession.updateMany({ where: { current_sentence_id: { in: junkIds } }, data: { current_sentence_id: null } });
  console.log(`   Note: ${nd.count}, PracticeResult: ${rd.count}`);

  const { count } = await prisma.sentence.deleteMany({ where: { id: { in: junkIds } } });

  const affectedMatIds = [...new Set(junkSentences.map((s) => s.material_id))];
  console.log(`\n🔄 重建 ${affectedMatIds.length} 个材料的句子序号...`);
  for (const matId of affectedMatIds) {
    const remaining = await prisma.sentence.findMany({
      where: { material_id: matId },
      orderBy: { audio_start_time: 'asc' },
      select: { id: true },
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.sentence.update({ where: { id: remaining[i].id }, data: { order_index: i + 1 } });
    }
    await prisma.material.update({ where: { id: matId }, data: { total_sentences: remaining.length } });
  }

  console.log(`\n✅ 完成！删除 ${count} 条，剩余 ${allSentences.length - count} 条`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });