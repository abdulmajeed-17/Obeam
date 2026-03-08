import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyGuard],
  exports: [ApiKeysService, ApiKeyGuard],
})
export class ApiKeysModule {}
