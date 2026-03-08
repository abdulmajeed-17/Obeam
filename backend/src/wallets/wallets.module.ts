import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
