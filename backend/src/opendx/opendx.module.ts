import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { OpenDXController } from './opendx.controller';
import { OpenDXService } from './opendx.service';

@Module({
  imports: [PrismaModule],
  controllers: [OpenDXController],
  providers: [OpenDXService],
  exports: [OpenDXService],
})
export class OpenDXModule {}
