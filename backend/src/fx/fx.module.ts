import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { FxController } from './fx.controller';
import { FxService } from './fx.service';

@Module({
  imports: [PrismaModule],
  controllers: [FxController],
  providers: [FxService],
})
export class FxModule {}
