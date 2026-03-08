import { Module } from '@nestjs/common';
import { InternalTransfersService } from './internal-transfers.service';
import { InternalTransfersController } from './internal-transfers.controller';
import { PrismaModule } from '../prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, WalletsModule, NotificationsModule],
  controllers: [InternalTransfersController],
  providers: [InternalTransfersService],
  exports: [InternalTransfersService],
})
export class InternalTransfersModule {}
