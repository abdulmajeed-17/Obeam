import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FxService } from './fx.service';
import { PrismaService } from '../prisma.service';
import { createMockPrisma, MockPrisma } from '../test/prisma.mock';

describe('FxService', () => {
  let service: FxService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<FxService>(FxService);
  });

  describe('getLatestRate', () => {
    it('returns the most recent rate for a currency pair', async () => {
      const now = new Date();
      prisma.fxRate.findFirst.mockResolvedValue({
        id: 'rate-1', base: 'NGN', quote: 'GHS', rate: 0.01, asOf: now,
      });

      const result = await service.getLatestRate('NGN', 'GHS');
      expect(Number(result.rate)).toBe(0.01);
      expect(result.asOf).toEqual(now);
    });

    it('throws NotFoundException when no rate exists', async () => {
      prisma.fxRate.findFirst.mockResolvedValue(null);
      await expect(service.getLatestRate('NGN', 'KES')).rejects.toThrow(NotFoundException);
    });

    it('works for all supported currency pairs', async () => {
      const currencies = ['NGN', 'GHS', 'KES', 'ZAR', 'XOF', 'USD', 'GBP'] as const;
      for (const base of currencies) {
        for (const quote of currencies) {
          if (base === quote) continue;
          prisma.fxRate.findFirst.mockResolvedValue({
            id: `rate-${base}-${quote}`, base, quote, rate: 1.5, asOf: new Date(),
          });
          const result = await service.getLatestRate(base, quote);
          expect(result.rate).toBeTruthy();
        }
      }
    });
  });

  describe('createQuote', () => {
    it('returns a valid quote with correct calculations', async () => {
      prisma.fxRate.findFirst.mockResolvedValue({
        id: 'rate-1', base: 'NGN', quote: 'GHS', rate: 0.01, asOf: new Date(),
      });

      const result = await service.createQuote({
        fromCurrency: 'NGN', toCurrency: 'GHS', fromAmount: 100000n,
      });

      expect(result.fromCurrency).toBe('NGN');
      expect(result.toCurrency).toBe('GHS');
      expect(result.fromAmount).toBe('100000');
      expect(result.toAmount).toBe('1000'); // 100000 * 0.01 = 1000
      expect(result.rateUsed).toBe('0.01');
      expect(result.quoteId).toBeTruthy();
      expect(result.expiresAt).toBeTruthy();
    });

    it('rejects zero amount', async () => {
      await expect(
        service.createQuote({ fromCurrency: 'NGN', toCurrency: 'GHS', fromAmount: 0n }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects negative amount', async () => {
      await expect(
        service.createQuote({ fromCurrency: 'NGN', toCurrency: 'GHS', fromAmount: -100n }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects same currency', async () => {
      await expect(
        service.createQuote({ fromCurrency: 'NGN', toCurrency: 'NGN', fromAmount: 100n }),
      ).rejects.toThrow(BadRequestException);
    });

    it('quotes expire in 5 minutes', async () => {
      prisma.fxRate.findFirst.mockResolvedValue({
        id: 'rate-1', base: 'USD', quote: 'NGN', rate: 1550, asOf: new Date(),
      });

      const before = Date.now();
      const result = await service.createQuote({
        fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 100n,
      });
      const expiresAt = new Date(result.expiresAt).getTime();
      const expectedExpiry = before + 5 * 60 * 1000;

      // Should expire within 1 second of expected
      expect(Math.abs(expiresAt - expectedExpiry)).toBeLessThan(1000);
    });

    it('calculates cross-currency quotes correctly (USD → NGN)', async () => {
      prisma.fxRate.findFirst.mockResolvedValue({
        id: 'rate-usd-ngn', base: 'USD', quote: 'NGN', rate: 1550, asOf: new Date(),
      });

      const result = await service.createQuote({
        fromCurrency: 'USD', toCurrency: 'NGN', fromAmount: 100n, // $1.00 in cents
      });

      // 100 cents * 1550 = 155000 kobo
      expect(result.toAmount).toBe('155000');
    });

    it('calculates KES → ZAR quote correctly', async () => {
      // 1 KES = 0.121 ZAR (approx 18.5/153)
      prisma.fxRate.findFirst.mockResolvedValue({
        id: 'rate-kes-zar', base: 'KES', quote: 'ZAR', rate: 0.121, asOf: new Date(),
      });

      const result = await service.createQuote({
        fromCurrency: 'KES', toCurrency: 'ZAR', fromAmount: 10000n,
      });

      expect(result.toAmount).toBe('1210'); // 10000 * 0.121 = 1210
    });
  });
});
