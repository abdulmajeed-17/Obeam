import { Module } from '@nestjs/common';
import { AmlService } from './aml.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AmlService],
  exports: [AmlService],
})
export class AmlModule {}
