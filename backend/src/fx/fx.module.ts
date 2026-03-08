import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { FxController } from './fx.controller';
import { FxService } from './fx.service';
import { FxFeedService } from './fx-feed.service';

@Module({
  imports: [PrismaModule],
  controllers: [FxController],
  providers: [FxService, FxFeedService],
  exports: [FxService],
})
export class FxModule {}
