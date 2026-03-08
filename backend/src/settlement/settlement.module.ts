import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { SettlementController } from './settlement.controller';
import { PrismaModule } from '../prisma.module';
import { LedgerModule } from '../ledger/ledger.module';
import { OkraModule } from '../okra/okra.module';
import { OpenDXModule } from '../opendx/opendx.module';
import { MpesaModule } from '../mpesa/mpesa.module';
import { StitchModule } from '../stitch/stitch.module';
import { InterswitchModule } from '../interswitch/interswitch.module';

@Module({
  imports: [PrismaModule, LedgerModule, OkraModule, OpenDXModule, MpesaModule, StitchModule, InterswitchModule],
  providers: [SettlementService],
  controllers: [SettlementController],
  exports: [SettlementService],
})
export class SettlementModule {}
