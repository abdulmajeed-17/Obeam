import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { WalletsService } from './wallets.service';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get()
  list(@GetUser() user: RequestUser) {
    return this.wallets.list(user);
  }

  @Get(':currency/balance')
  getBalance(@GetUser() user: RequestUser, @Param('currency') currency: string) {
    return this.wallets.getBalance(user, currency);
  }

  @Get(':currency/ledger')
  getLedger(
    @GetUser() user: RequestUser,
    @Param('currency') currency: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.wallets.getLedger(user, currency, page, limit);
  }
}
