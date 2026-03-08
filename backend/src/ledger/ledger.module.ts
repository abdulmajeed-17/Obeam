import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { FxModule } from '../fx/fx.module';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';

@Module({
  imports: [PrismaModule, FxModule],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
