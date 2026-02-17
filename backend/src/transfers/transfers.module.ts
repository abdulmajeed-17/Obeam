import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { LedgerModule } from '../ledger/ledger.module';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [PrismaModule, LedgerModule],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
