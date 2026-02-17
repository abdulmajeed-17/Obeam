import { Body, Controller, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { LedgerService } from './ledger.service';
import { CurrencyCode } from '@prisma/client';

class TopUpDto {
  currency!: string;
  amount!: string; // minor units (e.g. kobo, pesewas)
}

@Controller('ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Post('top-up')
  async topUp(@GetUser() user: RequestUser, @Body() body: TopUpDto) {
    const currency = (body.currency?.toUpperCase() || '') as CurrencyCode;
    if (currency !== 'NGN' && currency !== 'GHS') {
      throw new BadRequestException('Invalid currency. Use NGN or GHS.');
    }
    let amount: bigint;
    try {
      amount = BigInt(body.amount ?? '0');
    } catch {
      throw new BadRequestException('Invalid amount.');
    }
    return this.ledger.topUp({
      currency,
      amount,
      businessId: user.businessId,
      userId: user.id,
    });
  }
}
