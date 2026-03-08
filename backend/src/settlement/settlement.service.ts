import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { OkraService } from '../okra/okra.service';
import { OpenDXService } from '../opendx/opendx.service';
import { MpesaService } from '../mpesa/mpesa.service';
import { StitchService } from '../stitch/stitch.service';
import { InterswitchService } from '../interswitch/interswitch.service';
import { CurrencyCode } from '@prisma/client';

export interface BankResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly okra: OkraService,
    private readonly opendx: OpenDXService,
    private readonly mpesa: MpesaService,
    private readonly stitch: StitchService,
    private readonly interswitch: InterswitchService,
  ) {}

  /**
   * Route to the correct bank API for payout based on target currency.
   * Returns a standardized result.
   */
  private async executePayout(
    toCurrency: CurrencyCode,
    toAmount: bigint,
    payoutRef: string,
    counterpartyName: string,
    transferId: string,
  ): Promise<BankResult> {
    const reference = `OBEAM-${transferId}`;

    switch (toCurrency) {
      case 'GHS':
        if (!this.opendx.isConfigured()) {
          this.logger.warn(`OpenDX not configured — GHS payout for ${transferId} skipped (ledger-only)`);
          return { success: true, transactionId: 'ledger-only' };
        }
        return this.opendx.payout({
          toAccountId: payoutRef,
          amountGhsMinor: toAmount,
          reference,
          narration: `Payment to ${counterpartyName}`,
        });

      case 'NGN':
        if (this.interswitch.isConfigured()) {
          const result = await this.interswitch.fundsTransfer({
            destinationBankCode: payoutRef.split('-')[0] ?? '',
            destinationAccountNumber: payoutRef.replace(/^[^-]+-/, ''),
            amountNgnMinor: Number(toAmount),
            reference,
            narration: `Obeam payment to ${counterpartyName}`,
            beneficiaryName: counterpartyName,
          });
          return { success: result.success, transactionId: result.transactionRef, error: result.error };
        }
        if (this.okra.isConfigured()) {
          return this.okra.charge({
            recordId: payoutRef,
            amountMinor: toAmount,
            narration: `Obeam payment to ${counterpartyName}`,
            reference,
          });
        }
        this.logger.warn(`No NGN bank API configured — payout for ${transferId} skipped (ledger-only)`);
        return { success: true, transactionId: 'ledger-only' };

      case 'KES':
        if (!this.mpesa.isConfigured()) {
          this.logger.warn(`M-Pesa not configured — KES payout for ${transferId} skipped (ledger-only)`);
          return { success: true, transactionId: 'ledger-only' };
        }
        const kesResult = await this.mpesa.b2cPayout({
          phoneNumber: payoutRef,
          amountKes: Number(toAmount) / 100,
          reference,
          remarks: `Obeam payment to ${counterpartyName}`,
          resultUrl: `${process.env.API_BASE_URL ?? 'https://api.obeam.co'}/mpesa/callback/result`,
          timeoutUrl: `${process.env.API_BASE_URL ?? 'https://api.obeam.co'}/mpesa/callback/timeout`,
        });
        return { success: kesResult.success, transactionId: kesResult.conversationId, error: kesResult.error };

      case 'ZAR':
        if (!this.stitch.isConfigured()) {
          this.logger.warn(`Stitch not configured — ZAR payout for ${transferId} skipped (ledger-only)`);
          return { success: true, transactionId: 'ledger-only' };
        }
        const zarParts = payoutRef.split('-');
        const zarResult = await this.stitch.disbursement({
          amountZarCents: Number(toAmount),
          reference,
          recipientName: counterpartyName,
          recipientBankId: zarParts[0] ?? '',
          recipientAccountNumber: zarParts.slice(1).join('-'),
        });
        return { success: zarResult.success, transactionId: zarResult.disbursementId, error: zarResult.error };

      case 'XOF':
      case 'USD':
      case 'GBP':
        this.logger.warn(`No bank API for ${toCurrency} yet — payout for ${transferId} is ledger-only`);
        return { success: true, transactionId: 'ledger-only' };

      default:
        return { success: false, error: `Unsupported payout currency: ${toCurrency}` };
    }
  }

  async settleTransferAutomatically(transferId: string): Promise<{
    success: boolean;
    status: string;
    payout?: BankResult;
  }> {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id: transferId },
      include: { counterparty: true, business: true },
    });

    if (!transfer) throw new NotFoundException('Transfer not found.');

    if (transfer.status !== 'PENDING_FUNDS' && transfer.status !== 'PROCESSING') {
      throw new BadRequestException(
        `Transfer must be PENDING_FUNDS or PROCESSING to settle. Current: ${transfer.status}.`,
      );
    }

    const toCurrency = transfer.toCurrency as CurrencyCode;
    const payoutRef = transfer.counterparty?.payoutRef ?? '';
    const counterpartyName = transfer.counterparty?.name ?? 'Recipient';

    const payout = await this.executePayout(toCurrency, transfer.toAmount, payoutRef, counterpartyName, transferId);

    if (!payout.success) {
      this.logger.error(`Payout failed for transfer ${transferId}: ${payout.error}`);
      await this.prisma.transfer.update({ where: { id: transferId }, data: { status: 'FAILED' } });
      return { success: false, status: 'FAILED', payout };
    }

    await this.ledger.settleTransfer(transferId);

    const updated = await this.prisma.transfer.findUniqueOrThrow({ where: { id: transferId } });
    this.logger.log(`Transfer ${transferId} settled. Bank: ${payout.transactionId ?? 'n/a'}`);

    return { success: true, status: updated.status, payout };
  }

  async processPendingSettlements(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const pending = await this.prisma.transfer.findMany({
      where: { status: 'PROCESSING' },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    let succeeded = 0;
    let failed = 0;

    for (const transfer of pending) {
      try {
        const result = await this.settleTransferAutomatically(transfer.id);
        if (result.success) succeeded++;
        else failed++;
      } catch (error) {
        this.logger.error(`Failed to settle transfer ${transfer.id}: ${error}`);
        failed++;
        await this.prisma.transfer.update({ where: { id: transfer.id }, data: { status: 'FAILED' } }).catch(() => {});
      }
    }

    return { processed: pending.length, succeeded, failed };
  }
}
