import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { PrismaService } from '../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { createMockPrisma, MockPrisma } from '../test/prisma.mock';

describe('TransfersService', () => {
  let service: TransfersService;
  let prisma: MockPrisma;
  let ledger: { reserveForTransfer: jest.Mock; reverseReserveForTransfer: jest.Mock };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    businessId: 'biz-1',
    business: { id: 'biz-1', name: 'Test', country: 'NG', status: 'ACTIVE' },
  };

  const baseTransfer = {
    id: 'txn-1',
    businessId: 'biz-1',
    counterpartyId: 'cp-1',
    fromCurrency: 'NGN',
    toCurrency: 'GHS',
    fromAmount: 100000n,
    toAmount: 1000n,
    feeAmount: 0n,
    status: 'DRAFT',
    fxTradeId: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    ledger = {
      reserveForTransfer: jest.fn().mockResolvedValue({ entryId: 'entry-1' }),
      reverseReserveForTransfer: jest.fn().mockResolvedValue({ ok: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersService,
        { provide: PrismaService, useValue: prisma },
        { provide: LedgerService, useValue: ledger },
      ],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
  });

  describe('create', () => {
    it('creates a DRAFT transfer with valid inputs', async () => {
      prisma.counterparty.findFirst.mockResolvedValue({ id: 'cp-1', businessId: 'biz-1' });
      prisma.transfer.create.mockResolvedValue({ ...baseTransfer });

      const result = await service.create(mockUser, {
        counterpartyId: 'cp-1',
        fromCurrency: 'NGN',
        toCurrency: 'KES',
        fromAmount: '100000',
        toAmount: '10000',
      });

      expect(result.status).toBe('DRAFT');
      expect(result.fromAmount).toBe('100000');
    });

    it('rejects invalid fromCurrency', async () => {
      await expect(
        service.create(mockUser, {
          counterpartyId: 'cp-1', fromCurrency: 'INVALID', toCurrency: 'GHS',
          fromAmount: '100', toAmount: '1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid toCurrency', async () => {
      await expect(
        service.create(mockUser, {
          counterpartyId: 'cp-1', fromCurrency: 'NGN', toCurrency: 'BTC',
          fromAmount: '100', toAmount: '1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects zero amount', async () => {
      prisma.counterparty.findFirst.mockResolvedValue({ id: 'cp-1', businessId: 'biz-1' });

      await expect(
        service.create(mockUser, {
          counterpartyId: 'cp-1', fromCurrency: 'NGN', toCurrency: 'GHS',
          fromAmount: '0', toAmount: '0',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects counterparty not owned by user', async () => {
      prisma.counterparty.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser, {
          counterpartyId: 'other-cp', fromCurrency: 'NGN', toCurrency: 'GHS',
          fromAmount: '100', toAmount: '1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('supports all 7 currencies', async () => {
      const currencies = ['NGN', 'GHS', 'KES', 'ZAR', 'XOF', 'USD', 'GBP'];
      prisma.counterparty.findFirst.mockResolvedValue({ id: 'cp-1', businessId: 'biz-1' });

      for (const from of currencies) {
        for (const to of currencies) {
          if (from === to) continue;
          prisma.transfer.create.mockResolvedValue({
            ...baseTransfer, fromCurrency: from, toCurrency: to,
          });
          const result = await service.create(mockUser, {
            counterpartyId: 'cp-1', fromCurrency: from, toCurrency: to,
            fromAmount: '1000', toAmount: '500',
          });
          expect(result.fromCurrency).toBe(from);
          expect(result.toCurrency).toBe(to);
        }
      }
    });
  });

  describe('confirm', () => {
    it('confirms a DRAFT transfer and reserves funds', async () => {
      prisma.transfer.findUnique.mockResolvedValue({ ...baseTransfer, status: 'DRAFT' });
      prisma.transfer.update.mockResolvedValue({ ...baseTransfer, status: 'PENDING_FUNDS' });
      prisma.transfer.findUniqueOrThrow.mockResolvedValue({ ...baseTransfer, status: 'PENDING_FUNDS' });

      const result = await service.confirm(mockUser, 'txn-1');

      expect(result.status).toBe('PENDING_FUNDS');
      expect(ledger.reserveForTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ transferId: 'txn-1', businessId: 'biz-1' }),
      );
    });

    it('rejects confirming a non-DRAFT transfer', async () => {
      prisma.transfer.findUnique.mockResolvedValue({ ...baseTransfer, status: 'PENDING_FUNDS' });

      await expect(service.confirm(mockUser, 'txn-1')).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException for other business transfer', async () => {
      prisma.transfer.findUnique.mockResolvedValue({ ...baseTransfer, businessId: 'other-biz' });

      await expect(service.confirm(mockUser, 'txn-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for non-existent transfer', async () => {
      prisma.transfer.findUnique.mockResolvedValue(null);

      await expect(service.confirm(mockUser, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancels a DRAFT transfer without reversing reserve', async () => {
      prisma.transfer.findUnique.mockResolvedValue({ ...baseTransfer, status: 'DRAFT' });
      prisma.transfer.update.mockResolvedValue({ ...baseTransfer, status: 'CANCELLED' });
      prisma.transfer.findUniqueOrThrow.mockResolvedValue({ ...baseTransfer, status: 'CANCELLED' });

      const result = await service.cancel(mockUser, 'txn-1');

      expect(result.status).toBe('CANCELLED');
      expect(ledger.reverseReserveForTransfer).not.toHaveBeenCalled();
    });

    it('cancels PENDING_FUNDS transfer and reverses reserve', async () => {
      prisma.transfer.findUnique.mockResolvedValue({ ...baseTransfer, status: 'PENDING_FUNDS' });
      prisma.transfer.update.mockResolvedValue({ ...baseTransfer, status: 'CANCELLED' });
      prisma.transfer.findUniqueOrThrow.mockResolvedValue({ ...baseTransfer, status: 'CANCELLED' });

      const result = await service.cancel(mockUser, 'txn-1');

      expect(result.status).toBe('CANCELLED');
      expect(ledger.reverseReserveForTransfer).toHaveBeenCalled();
    });

    it('rejects cancelling SETTLED transfer', async () => {
      prisma.transfer.findUnique.mockResolvedValue({ ...baseTransfer, status: 'SETTLED' });

      await expect(service.cancel(mockUser, 'txn-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('returns transfers for the business', async () => {
      prisma.transfer.findMany.mockResolvedValue([
        { ...baseTransfer, counterparty: { name: 'Accra Co', country: 'GH' } },
      ]);

      const result = await service.list(mockUser);

      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0].counterparty).toEqual({ name: 'Accra Co', country: 'GH' });
    });
  });

  describe('getById', () => {
    it('returns transfer details', async () => {
      prisma.transfer.findUnique.mockResolvedValue({
        ...baseTransfer,
        counterparty: { id: 'cp-1', name: 'Accra', country: 'GH', payoutType: 'BANK', payoutRef: 'REF' },
      });

      const result = await service.getById(mockUser, 'txn-1');
      expect(result.id).toBe('txn-1');
    });

    it('throws NotFoundException for non-existent transfer', async () => {
      prisma.transfer.findUnique.mockResolvedValue(null);
      await expect(service.getById(mockUser, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('admin operations', () => {
    it('markProcessing transitions PENDING_FUNDS to PROCESSING', async () => {
      prisma.transfer.findUnique.mockResolvedValue({ ...baseTransfer, status: 'PENDING_FUNDS' });
      prisma.transfer.update.mockResolvedValue({ ...baseTransfer, status: 'PROCESSING' });
      prisma.transfer.findUniqueOrThrow.mockResolvedValue({ ...baseTransfer, status: 'PROCESSING' });

      const result = await service.markProcessing('txn-1');
      expect(result.status).toBe('PROCESSING');
    });

    it('markFailed transitions transfer to FAILED', async () => {
      prisma.transfer.findUnique.mockResolvedValue({ ...baseTransfer, status: 'PROCESSING' });
      prisma.transfer.update.mockResolvedValue({ ...baseTransfer, status: 'FAILED' });
      prisma.transfer.findUniqueOrThrow.mockResolvedValue({ ...baseTransfer, status: 'FAILED' });

      const result = await service.markFailed('txn-1');
      expect(result.status).toBe('FAILED');
    });

    it('rejects marking SETTLED as FAILED', async () => {
      prisma.transfer.findUnique.mockResolvedValue({ ...baseTransfer, status: 'SETTLED' });
      await expect(service.markFailed('txn-1')).rejects.toThrow(BadRequestException);
    });
  });
});
