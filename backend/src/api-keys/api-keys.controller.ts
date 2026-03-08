import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post()
  async create(@GetUser() user: RequestUser, @Body() body: { label: string; isTest?: boolean }) {
    return this.apiKeys.createKey({
      businessId: user.businessId,
      label: body.label ?? 'Default',
      isTest: body.isTest,
    });
  }

  @Get()
  async list(@GetUser() user: RequestUser) {
    return this.apiKeys.listKeys(user.businessId);
  }

  @Delete(':keyHash')
  async revoke(@GetUser() user: RequestUser, @Param('keyHash') keyHash: string) {
    return this.apiKeys.revokeKey(user.businessId, keyHash);
  }
}
