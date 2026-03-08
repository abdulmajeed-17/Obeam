import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../prisma.service';
import { createMockPrisma, MockPrisma } from '../test/prisma.mock';

describe('LedgerService', () => {
  let service: LedgerService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<LedgerService>(LedgerService);
  });

  describe('ensureTreasury', () => {
    it('returns existing treasury account if found', async () => {
      const existing = { id: 'treasury-1', currency: 'NGN', type: 'TREASURY', isPlatform: true };
      prisma.account.findFirst.mockResolvedValue(existing);

      const result = await service.ensureTreasury('NGN');
      expect(result).toEqual(existing);
      expect(prisma.account.create).not.toHaveBeenCalled();
    });

    it('creates treasury account if not found', async () => {
      const created = { id: 'new-treasury', currency: 'KES', type: 'TREASURY', isPlatform: true };
      prisma.account.findFirst.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue(created);

      const result = await service.ensureTreasury('KES');
      expect(result).toEqual(created);
      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currency: 'KES', type: 'TREASURY', isPlatform: true }),
        }),
      );
    });
  });

  describe('ensureClearing', () => {
    it('returns existing clearing account if found', async () => {
      const existing = { id: 'clearing-1', currency: 'GHS', type: 'CLEARING', isPlatform: true };
      prisma.account.findFirst.mockResolvedValue(existing);

      const result = await service.ensureClearing('GHS');
      expect(result).toEqual(existing);
    });

    it('creates clearing account if not found', async () => {
      const created = { id: 'new-clearing', currency: 'ZAR', type: 'CLEARING', isPlatform: true };
      prisma.account.findFirst.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue(created);

      const result = await service.ensureClearing('ZAR');
      expect(result.type).toBe('CLEARING');
    });
  });

  describe('topUp', () => {
    it('credits wallet and debits treasury for positive amount', async () => {
      const treasury = { id: 'treasury-ngn' };
      const wallet = { id: 'wallet-ngn' };

      prisma.account.findFirst
        .mockResolvedValueOnce(treasury) // ensureTreasury
        .mockResolvedValueOnce(wallet);  // wallet lookup

      const journalEntry = { id: 'entry-1' };
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          journalEntry: { create: jest.fn().mockResolvedValue(journalEntry) },
          posting: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
        };
        return fn(tx);
      });

      const result = await service.topUp({
        currency: 'NGN',
        amount: 500000n,
        businessId: 'biz-1',
        userId: 'user-1',
      });

      expect(result.amount).toBe('500000');
      expect(result.currency).toBe('NGN');
      expect(result.entryId).toBe('entry-1');
    });

    it('throws BadRequestException for zero amount', async () => {
      await expect(
        service.topUp({ currency: 'NGN', amount: 0n, businessId: 'biz-1', userId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for negative amount', async () => {
      await expect(
        service.topUp({ currency: 'NGN', amount: -100n, businessId: 'biz-1', userId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if no wallet found for currency', async () => {
      prisma.account.findFirst
        .mockResolvedValueOnce({ id: 'treasury' }) // treasury found
        .mockResolvedValueOnce(null); // wallet not found

      await expect(
        service.topUp({ currency: 'XOF', amount: 1000n, businessId: 'biz-1', userId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('convert', () => {
    it('debits source wallet and credits target wallet', async () => {
      const fromWallet = { id: 'wallet-ngn' };
      const toWallet = { id: 'wallet-ghs' };

      prisma.account.findFirst
        .mockResolvedValueOnce(fromWallet)
        .mockResolvedValueOnce(toWallet);

      const journalEntry = { id: 'convert-entry-1' };
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          journalEntry: { create: jest.fn().mockResolvedValue(journalEntry) },
          posting: { createMany: jest.fn() },
        };
        return fn(tx);
      });

      const result = await service.convert({
        businessId: 'biz-1',
        userId: 'user-1',
        fromCurrency: 'NGN',
        toCurrency: 'GHS',
        fromAmount: 100000n,
        toAmount: 1000n,
      });

      expect(result.fromCurrency).toBe('NGN');
      expect(result.toCurrency).toBe('GHS');
      expect(result.fromAmount).toBe('100000');
      expect(result.toAmount).toBe('1000');
    });

    it('rejects same-currency conversion', async () => {
      await expect(
        service.convert({
          businessId: 'biz-1', userId: 'user-1',
          fromCurrency: 'NGN', toCurrency: 'NGN',
          fromAmount: 100n, toAmount: 100n,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects zero fromAmount', async () => {
      await expect(
        service.convert({
          businessId: 'biz-1', userId: 'user-1',
          fromCurrency: 'NGN', toCurrency: 'GHS',
          fromAmount: 0n, toAmount: 100n,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if source wallet not found', async () => {
      prisma.account.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.convert({
          businessId: 'biz-1', userId: 'user-1',
          fromCurrency: 'NGN', toCurrency: 'GHS',
          fromAmount: 100n, toAmount: 50n,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reserveForTransfer', () => {
    it('creates debit on customer wallet and credit on clearing', async () => {
      const clearing = { id: 'clearing-ngn' };
      const wallet = { id: 'wallet-ngn' };

      prisma.account.findFirst
        .mockResolvedValueOnce(clearing)
        .mockResolvedValueOnce(wallet);

      const journalEntry = { id: 'reserve-entry' };
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          journalEntry: { create: jest.fn().mockResolvedValue(journalEntry) },
          posting: { createMany: jest.fn() },
        };
        return fn(tx);
      });

      const result = await service.reserveForTransfer({
        transferId: 'txn-1',
        businessId: 'biz-1',
        fromCurrency: 'NGN',
        fromAmount: 50000n,
        userId: 'user-1',
      });

      expect(result.entryId).toBe('reserve-entry');
    });

    it('rejects non-positive amount', async () => {
      await expect(
        service.reserveForTransfer({
          transferId: 'txn-1', businessId: 'biz-1',
          fromCurrency: 'NGN', fromAmount: 0n, userId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('settleTransfer', () => {
    it('throws NotFoundException for non-existent transfer', async () => {
      prisma.transfer.findUnique.mockResolvedValue(null);
      await expect(service.settleTransfer('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('rejects settlement of DRAFT transfer', async () => {
      prisma.transfer.findUnique.mockResolvedValue({
        id: 'txn-1', status: 'DRAFT', fromCurrency: 'NGN', toCurrency: 'GHS',
        fromAmount: 100n, toAmount: 1n,
      });

      await expect(service.settleTransfer('txn-1')).rejects.toThrow(BadRequestException);
    });

    it('settles PROCESSING transfer and updates status to SETTLED', async () => {
      prisma.transfer.findUnique.mockResolvedValue({
        id: 'txn-1', status: 'PROCESSING', fromCurrency: 'NGN', toCurrency: 'GHS',
        fromAmount: 100000n, toAmount: 1000n,
      });

      // ensureClearing/ensureTreasury mocks
      prisma.account.findFirst
        .mockResolvedValueOnce({ id: 'clearing-ngn' })
        .mockResolvedValueOnce({ id: 'treasury-ngn' })
        .mockResolvedValueOnce({ id: 'treasury-ghs' })
        .mockResolvedValueOnce({ id: 'clearing-ghs' });

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je-1' }) },
          posting: { createMany: jest.fn() },
        };
        return fn(tx);
      });

      prisma.transfer.update.mockResolvedValue({ id: 'txn-1', status: 'SETTLED' });

      const result = await service.settleTransfer('txn-1');
      expect(result.status).toBe('SETTLED');
      expect(prisma.transfer.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SETTLED' } }),
      );
    });
  });

  describe('reverseReserveForTransfer', () => {
    it('creates credit on customer wallet and debit on clearing (reversal)', async () => {
      prisma.account.findFirst
        .mockResolvedValueOnce({ id: 'clearing-ngn' })
        .mockResolvedValueOnce({ id: 'wallet-ngn' });

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          journalEntry: { create: jest.fn().mockResolvedValue({ id: 'reverse-entry' }) },
          posting: { createMany: jest.fn() },
        };
        return fn(tx);
      });

      const result = await service.reverseReserveForTransfer({
        transferId: 'txn-1', businessId: 'biz-1',
        fromCurrency: 'NGN', fromAmount: 50000n,
      });

      expect(result.ok).toBe(true);
    });
  });
});
