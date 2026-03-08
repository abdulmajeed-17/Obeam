import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { OkraController } from './okra.controller';
import { OkraService } from './okra.service';

@Module({
  imports: [PrismaModule],
  controllers: [OkraController],
  providers: [OkraService],
  exports: [OkraService],
})
export class OkraModule {}
