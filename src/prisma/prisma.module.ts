import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // 设为全局模块，到处都能直接用
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // 别忘了 export
})
export class PrismaModule {}