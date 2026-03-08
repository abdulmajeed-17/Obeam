import { Module } from '@nestjs/common';
import { KybService } from './kyb.service';
import { KybController } from './kyb.controller';
import { PrismaModule } from '../prisma.module';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [PrismaModule, EncryptionModule],
  providers: [KybService],
  controllers: [KybController],
  exports: [KybService],
})
export class KybModule {}
