import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CurrencyCode } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

const QUOTE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class FxService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestRate(base: CurrencyCode, quote: CurrencyCode): Promise<{ rate: Decimal; asOf: Date }> {
    const row = await this.prisma.fxRate.findFirst({
      where: { base, quote },
      orderBy: { asOf: 'desc' },
    });
    if (!row) {
      throw new NotFoundException(`No FX rate found for ${base}/${quote}.`);
    }
    return { rate: row.rate, asOf: row.asOf };
  }

  async createQuote(params: {
    fromCurrency: CurrencyCode;
    toCurrency: CurrencyCode;
    fromAmount: bigint;
  }): Promise<{
    quoteId: string;
    fromCurrency: CurrencyCode;
    toCurrency: CurrencyCode;
    fromAmount: string;
    toAmount: string;
    rateUsed: string;
    expiresAt: string;
  }> {
    const { fromCurrency, toCurrency, fromAmount } = params;
    if (fromAmount <= 0n) {
      throw new BadRequestException('fromAmount must be positive.');
    }
    if (fromCurrency === toCurrency) {
      throw new BadRequestException('Currencies must differ.');
    }

    const { rate } = await this.getLatestRate(fromCurrency, toCurrency);
    const rateNum = Number(rate);
    // toAmount in minor units: fromAmount * rate, rounded
    const toAmountBig = BigInt(Math.round(Number(fromAmount) * rateNum));
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
    const quoteId = crypto.randomUUID();

    return {
      quoteId,
      fromCurrency,
      toCurrency,
      fromAmount: fromAmount.toString(),
      toAmount: toAmountBig.toString(),
      rateUsed: rate.toString(),
      expiresAt: expiresAt.toISOString(),
    };
  }
}
