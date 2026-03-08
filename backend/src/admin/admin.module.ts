import { Module } from '@nestjs/common';
import { TransfersModule } from '../transfers/transfers.module';
import { LedgerModule } from '../ledger/ledger.module';
import { SettlementModule } from '../settlement/settlement.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [TransfersModule, LedgerModule, SettlementModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
