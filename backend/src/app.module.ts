import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { WalletsModule } from './wallets/wallets.module';
import { LedgerModule } from './ledger/ledger.module';
import { FxModule } from './fx/fx.module';
import { TransfersModule } from './transfers/transfers.module';
import { CounterpartiesModule } from './counterparties/counterparties.module';
import { OkraModule } from './okra/okra.module';
import { OpenDXModule } from './opendx/opendx.module';
import { MpesaModule } from './mpesa/mpesa.module';
import { StitchModule } from './stitch/stitch.module';
import { InterswitchModule } from './interswitch/interswitch.module';
import { AdminModule } from './admin/admin.module';
import { SettlementModule } from './settlement/settlement.module';
import { AuditModule } from './audit/audit.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { KybModule } from './kyb/kyb.module';
import { EncryptionModule } from './encryption/encryption.module';
import { AmlModule } from './aml/aml.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    BusinessModule,
    WalletsModule,
    LedgerModule,
    FxModule,
    TransfersModule,
    CounterpartiesModule,
    OkraModule,
    OpenDXModule,
    MpesaModule,
    StitchModule,
    InterswitchModule,
    AdminModule,
    SettlementModule,
    AuditModule,
    WebhooksModule,
    KybModule,
    EncryptionModule,
    AmlModule,
    NotificationsModule,
    MonitoringModule,
    InvoicesModule,
    ApiKeysModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
