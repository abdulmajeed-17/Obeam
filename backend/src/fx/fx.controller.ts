import { Query, Body, Controller, Get, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FxService } from './fx.service';
import { CurrencyCode } from '@prisma/client';

class QuoteDto {
  fromCurrency!: string;
  toCurrency!: string;
  fromAmount!: string; // minor units
}

@Controller('fx')
@UseGuards(JwtAuthGuard)
export class FxController {
  constructor(private readonly fx: FxService) {}

  @Get('rate')
  async getRate(
    @Query('base') base: string,
    @Query('quote') quote: string,
  ) {
    const baseCode = (base?.toUpperCase() || '') as CurrencyCode;
    const quoteCode = (quote?.toUpperCase() || '') as CurrencyCode;
    if (baseCode !== 'NGN' && baseCode !== 'GHS') {
      throw new BadRequestException('Invalid base. Use NGN or GHS.');
    }
    if (quoteCode !== 'NGN' && quoteCode !== 'GHS') {
      throw new BadRequestException('Invalid quote. Use NGN or GHS.');
    }
    const { rate, asOf } = await this.fx.getLatestRate(baseCode, quoteCode);
    return { base: baseCode, quote: quoteCode, rate: rate.toString(), asOf };
  }

  @Post('quote')
  async quote(@Body() body: QuoteDto) {
    const fromCurrency = (body.fromCurrency?.toUpperCase() || '') as CurrencyCode;
    const toCurrency = (body.toCurrency?.toUpperCase() || '') as CurrencyCode;
    if (fromCurrency !== 'NGN' && fromCurrency !== 'GHS') {
      throw new BadRequestException('Invalid fromCurrency. Use NGN or GHS.');
    }
    if (toCurrency !== 'NGN' && toCurrency !== 'GHS') {
      throw new BadRequestException('Invalid toCurrency. Use NGN or GHS.');
    }
    let fromAmount: bigint;
    try {
      fromAmount = BigInt(body.fromAmount ?? '0');
    } catch {
      throw new BadRequestException('Invalid fromAmount.');
    }
    return this.fx.createQuote({ fromCurrency, toCurrency, fromAmount });
  }
}
