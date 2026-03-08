import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { PrismaService } from '../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { OkraService } from '../okra/okra.service';
import { OpenDXService } from '../opendx/opendx.service';
import { MpesaService } from '../mpesa/mpesa.service';
import { StitchService } from '../stitch/stitch.service';
import { InterswitchService } from '../interswitch/interswitch.service';
import { createMockPrisma, MockPrisma } from '../test/prisma.mock';

describe('SettlementService', () => {
  let service: SettlementService;
  let prisma: MockPrisma;
  let ledger: { settleTransfer: jest.Mock };
  let okra: { isConfigured: jest.Mock; charge: jest.Mock };
  let opendx: { isConfigured: jest.Mock; payout: jest.Mock };
  let mpesa: { isConfigured: jest.Mock; b2cPayout: jest.Mock };
  let stitch: { isConfigured: jest.Mock; disbursement: jest.Mock };
  let interswitch: { isConfigured: jest.Mock; fundsTransfer: jest.Mock };

  const baseTransfer = {
    id: 'txn-1',
    businessId: 'biz-1',
    counterpartyId: 'cp-1',
    fromCurrency: 'NGN',
    toCurrency: 'GHS',
    fromAmount: 100000n,
    toAmount: 1000n,
    feeAmount: 0n,
    status: 'PROCESSING',
    counterparty: { id: 'cp-1', name: 'Test Co', country: 'GH', payoutRef: 'GH-ACCT-123' },
    business: { id: 'biz-1', name: 'Sender Corp' },
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    ledger = { settleTransfer: jest.fn().mockResolvedValue({ ok: true, status: 'SETTLED' }) };
    okra = { isConfigured: jest.fn().mockReturnValue(false), charge: jest.fn() };
    opendx = { isConfigured: jest.fn().mockReturnValue(false), payout: jest.fn() };
    mpesa = { isConfigured: jest.fn().mockReturnValue(false), b2cPayout: jest.fn() };
    stitch = { isConfigured: jest.fn().mockReturnValue(false), disbursement: jest.fn() };
    interswitch = { isConfigured: jest.fn().mockReturnValue(false), fundsTransfer: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        { provide: PrismaService, useValue: prisma },
        { provide: LedgerService, useValue: ledger },
        { provide: OkraService, useValue: okra },
        { provide: OpenDXService, useValue: opendx },
        { provide: MpesaService, useValue: mpesa },
        { provide: StitchService, useValue: stitch },
        { provide: InterswitchService, useValue: interswitch },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
  });

  describe('settleTransferAutomatically', () => {
    it('throws NotFoundException for non-existent transfer', async () => {
      prisma.transfer.findUnique.mockResolvedValue(null);
      await expect(service.settleTransferAutomatically('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('rejects settlement of DRAFT transfer', async () => {
      prisma.transfer.findUnique.mockResolvedValue({ ...baseTransfer, status: 'DRAFT' });
      await expect(service.settleTransferAutomatically('txn-1')).rejects.toThrow(BadRequestException);
    });

    it('settles GHS transfer via OpenDX when configured', async () => {
      opendx.isConfigured.mockReturnValue(true);
      opendx.payout.mockResolvedValue({ success: true, transactionId: 'opendx-txn-1' });
      prisma.transfer.findUnique.mockResolvedValue(baseTransfer);
      prisma.transfer.findUniqueOrThrow.mockResolvedValue({ ...baseTransfer, status: 'SETTLED' });

      const result = await service.settleTransferAutomatically('txn-1');

      expect(result.success).toBe(true);
      expect(result.payout?.transactionId).toBe('opendx-txn-1');
      expect(ledger.settleTransfer).toHaveBeenCalledWith('txn-1');
    });

    it('falls back to ledger-only when OpenDX not configured', async () => {
      prisma.transfer.findUnique.mockResolvedValue(baseTransfer);
      prisma.transfer.findUniqueOrThrow.mockResolvedValue({ ...baseTransfer, status: 'SETTLED' });

      const result = await service.settleTransferAutomatically('txn-1');

      expect(result.success).toBe(true);
      expect(result.payout?.transactionId).toBe('ledger-only');
      expect(ledger.settleTransfer).toHaveBeenCalled();
    });

    it('settles KES transfer via M-Pesa when configured', async () => {
      mpesa.isConfigured.mockReturnValue(true);
      mpesa.b2cPayout.mockResolvedValue({ success: true, conversationId: 'mpesa-conv-1' });

      const kesTransfer = {
        ...baseTransfer, toCurrency: 'KES',
        counterparty: { ...baseTransfer.counterparty, payoutRef: '+254712345678' },
      };
      prisma.transfer.findUnique.mockResolvedValue(kesTransfer);
      prisma.transfer.findUniqueOrThrow.mockResolvedValue({ ...kesTransfer, status: 'SETTLED' });

      const result = await service.settleTransferAutomatically('txn-1');

      expect(result.success).toBe(true);
      expect(mpesa.b2cPayout).toHaveBeenCalled();
    });

    it('settles ZAR transfer via Stitch when configured', async () => {
      stitch.isConfigured.mockReturnValue(true);
      stitch.disbursement.mockResolvedValue({ success: true, disbursementId: 'stitch-1' });

      const zarTransfer = {
        ...baseTransfer, toCurrency: 'ZAR',
        counterparty: { ...baseTransfer.counterparty, payoutRef: 'ABSA-1234567890' },
      };
      prisma.transfer.findUnique.mockResolvedValue(zarTransfer);
      prisma.transfer.findUniqueOrThrow.mockResolvedValue({ ...zarTransfer, status: 'SETTLED' });

      const result = await service.settleTransferAutomatically('txn-1');

      expect(result.success).toBe(true);
      expect(stitch.disbursement).toHaveBeenCalled();
    });

    it('settles NGN transfer via Interswitch when configured', async () => {
      interswitch.isConfigured.mockReturnValue(true);
      interswitch.fundsTransfer.mockResolvedValue({ success: true, transactionRef: 'isw-ref-1' });

      const ngnTransfer = {
        ...baseTransfer, toCurrency: 'NGN',
        counterparty: { ...baseTransfer.counterparty, payoutRef: '057-1234567890' },
      };
      prisma.transfer.findUnique.mockResolvedValue(ngnTransfer);
      prisma.transfer.findUniqueOrThrow.mockResolvedValue({ ...ngnTransfer, status: 'SETTLED' });

      const result = await service.settleTransferAutomatically('txn-1');

      expect(result.success).toBe(true);
      expect(interswitch.fundsTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ destinationBankCode: '057' }),
      );
    });

    it('marks transfer as FAILED when payout fails', async () => {
      opendx.isConfigured.mockReturnValue(true);
      opendx.payout.mockResolvedValue({ success: false, error: 'Insufficient funds' });
      prisma.transfer.findUnique.mockResolvedValue(baseTransfer);
      prisma.transfer.update.mockResolvedValue({ ...baseTransfer, status: 'FAILED' });

      const result = await service.settleTransferAutomatically('txn-1');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(prisma.transfer.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FAILED' } }),
      );
      expect(ledger.settleTransfer).not.toHaveBeenCalled();
    });
  });

  describe('processPendingSettlements', () => {
    it('processes pending transfers in batch', async () => {
      prisma.transfer.findMany.mockResolvedValue([
        { ...baseTransfer, id: 'txn-1' },
        { ...baseTransfer, id: 'txn-2' },
      ]);

      // Each settleTransferAutomatically call
      prisma.transfer.findUnique
        .mockResolvedValueOnce(baseTransfer)
        .mockResolvedValueOnce({ ...baseTransfer, id: 'txn-2' });
      prisma.transfer.findUniqueOrThrow
        .mockResolvedValue({ ...baseTransfer, status: 'SETTLED' });

      const result = await service.processPendingSettlements();

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('handles empty queue gracefully', async () => {
      prisma.transfer.findMany.mockResolvedValue([]);

      const result = await service.processPendingSettlements();

      expect(result.processed).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
