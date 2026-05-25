import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 正在清理旧的 Category 和 Material 数据，并重置 ID...');

  // 临时关闭外键约束，清空表并重置自增 ID，然后再打开外键约束
  // TRUNCATE 会清空表数据，并将 AUTO_INCREMENT 强制重置为 1
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE Material;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE Category;`);
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);

  console.log('✨ 清理完毕！表已清空，ID 已重置为 1。');

  const audioBaseDir = path.join(__dirname, '../public/audio');
  console.log('📂 开始扫描文件夹...', audioBaseDir);

  const categories = fs.readdirSync(audioBaseDir).filter(f => !f.startsWith('.'));

  for (const catName of categories) {
    console.log(`\n正在处理分类: ${catName}`);
    
    const category = await prisma.category.create({
      data: {
        name: catName,
        description: `雅思听力 ${catName} 真题`,
      }
    });

    const categoryPath = path.join(audioBaseDir, catName);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.mp3'));

    for (const file of files) {
      const title = file.replace('.mp3', '');
      const audioUrl = `/audio/${catName}/${file}`;

      await prisma.material.create({
        data: {
          category_id: category.id,
          title: title,
          audio_url: audioUrl,
          difficulty_level: 'B2',
          is_published: true,
        }
      });
      
      console.log(`  - 成功导入材料: ${title}`);
    }
  }
  console.log('\n✅ 所有音频数据导入数据库完毕！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });