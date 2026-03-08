import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { CurrencyCode } from '@prisma/client';
import { CURRENCY_CODES } from '../shared/currencies';

const EXCHANGERATE_API_BASE = 'https://v6.exchangerate-api.com/v6';
const SOURCE = 'EXCHANGERATE_API';

const FALLBACK_USD_RATES: Record<string, number> = {
  NGN: 1550, GHS: 15.5, KES: 153, ZAR: 18.5, XOF: 610, USD: 1, GBP: 0.79,
};

@Injectable()
export class FxFeedService implements OnModuleInit {
  private readonly logger = new Logger(FxFeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const count = await this.prisma.fxRate.count();
    if (count < CURRENCY_CODES.length * (CURRENCY_CODES.length - 1)) {
      this.logger.log('FX rates missing — seeding fallback rates for all currency pairs...');
      await this.seedFallbackRates();
    }
  }

  private async seedFallbackRates(): Promise<void> {
    const now = new Date();
    const inserts: { base: CurrencyCode; quote: CurrencyCode; rate: number; source: string; asOf: Date }[] = [];
    for (const base of CURRENCY_CODES) {
      for (const quote of CURRENCY_CODES) {
        if (base === quote) continue;
        const bUsd = FALLBACK_USD_RATES[base] ?? 1;
        const qUsd = FALLBACK_USD_RATES[quote] ?? 1;
        inserts.push({ base, quote, rate: parseFloat((qUsd / bUsd).toFixed(8)), source: 'FALLBACK', asOf: now });
      }
    }
    await this.prisma.fxRate.createMany({ data: inserts });
    this.logger.log(`Seeded ${inserts.length} fallback FX rates.`);
  }

  @Cron('0 */4 * * *') // Every 4 hours (6 calls/day × 7 bases = 42 API calls/day = ~1260/mo, within free tier)
  async handleCronSync(): Promise<void> {
    await this.syncFromExchangeRateApi();
  }

  /**
   * Fetch rates for ALL supported currency pairs using the /latest/{base} endpoint.
   * One call per base currency returns all quote rates, so 7 calls = 42 pairs.
   */
  async syncFromExchangeRateApi(): Promise<{ pairsUpdated: number; error?: string }> {
    const apiKey = this.config.get<string>('FX_FEED_API_KEY');
    if (!apiKey) {
      return { pairsUpdated: 0, error: 'FX_FEED_API_KEY not set. Get a key at https://www.exchangerate-api.com/' };
    }

    let updated = 0;
    const now = new Date();

    for (const base of CURRENCY_CODES) {
      const url = `${EXCHANGERATE_API_BASE}/${apiKey}/latest/${base}`;
      try {
        const res = await fetch(url);
        const data = (await res.json()) as {
          result?: string;
          conversion_rates?: Record<string, number>;
          'error-type'?: string;
        };

        if (data.result !== 'success' || !data.conversion_rates) {
          this.logger.warn(`FX sync failed for base ${base}: ${data['error-type'] || 'unknown error'}`);
          continue;
        }

        const inserts: { base: CurrencyCode; quote: CurrencyCode; rate: number; source: string; asOf: Date }[] = [];

        for (const quote of CURRENCY_CODES) {
          if (quote === base) continue;
          const rate = data.conversion_rates[quote];
          if (typeof rate === 'number' && rate > 0) {
            inserts.push({ base, quote, rate, source: SOURCE, asOf: now });
          }
        }

        if (inserts.length > 0) {
          await this.prisma.fxRate.createMany({ data: inserts });
          updated += inserts.length;
        }
      } catch (err) {
        this.logger.error(`FX sync network error for base ${base}: ${err}`);
      }
    }

    this.logger.log(`FX sync complete: ${updated} pairs updated`);
    return { pairsUpdated: updated };
  }
}
