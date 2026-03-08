import { Query, Body, Controller, Get, Post, UseGuards, BadRequestException, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FxService } from './fx.service';
import { FxFeedService } from './fx-feed.service';
import { CurrencyCode } from '@prisma/client';
import { isValidCurrency, CURRENCY_CODES } from '../shared/currencies';

class QuoteDto {
  @IsString()
  fromCurrency!: string;

  @IsString()
  toCurrency!: string;

  @IsString()
  @MinLength(1, { message: 'fromAmount is required' })
  fromAmount!: string;
}

@Controller('fx')
export class FxController {
  constructor(
    private readonly fx: FxService,
    private readonly fxFeed: FxFeedService,
    private readonly config: ConfigService,
  ) {}

  @Get('currencies')
  getCurrencies() {
    return { currencies: CURRENCY_CODES };
  }

  @Get('sync')
  async syncRates(@Headers('x-fx-sync-secret') secret: string) {
    const expected = this.config.get<string>('FX_SYNC_SECRET');
    if (expected != null && expected !== '' && secret !== expected) {
      throw new UnauthorizedException('Invalid or missing X-Fx-Sync-Secret');
    }
    return this.fxFeed.syncFromExchangeRateApi();
  }

  @Get('rate')
  @UseGuards(JwtAuthGuard)
  async getRate(
    @Query('base') base: string,
    @Query('quote') quote: string,
  ) {
    const baseCode = (base?.toUpperCase() || '') as string;
    const quoteCode = (quote?.toUpperCase() || '') as string;
    if (!isValidCurrency(baseCode)) {
      throw new BadRequestException(`Invalid base currency. Supported: ${CURRENCY_CODES.join(', ')}`);
    }
    if (!isValidCurrency(quoteCode)) {
      throw new BadRequestException(`Invalid quote currency. Supported: ${CURRENCY_CODES.join(', ')}`);
    }
    const { rate, asOf } = await this.fx.getLatestRate(baseCode, quoteCode);
    return { base: baseCode, quote: quoteCode, rate: rate.toString(), asOf };
  }

  @Post('quote')
  @UseGuards(JwtAuthGuard)
  async quote(@Body() body: QuoteDto) {
    const fromCurrency = (body.fromCurrency?.toUpperCase() || '') as string;
    const toCurrency = (body.toCurrency?.toUpperCase() || '') as string;
    if (!isValidCurrency(fromCurrency)) {
      throw new BadRequestException(`Invalid fromCurrency. Supported: ${CURRENCY_CODES.join(', ')}`);
    }
    if (!isValidCurrency(toCurrency)) {
      throw new BadRequestException(`Invalid toCurrency. Supported: ${CURRENCY_CODES.join(', ')}`);
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
