import { randomUUID } from 'crypto';
import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CurrencyCode } from '@prisma/client';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ensure platform Treasury account exists for currency; create if not. */
  async ensureTreasury(currency: CurrencyCode) {
    let account = await this.prisma.account.findFirst({
      where: {
        businessId: null,
        currency,
        type: 'TREASURY',
        isPlatform: true,
      },
    });
    if (!account) {
      account = await this.prisma.account.create({
        data: {
          businessId: null,
          currency,
          type: 'TREASURY',
          label: `Platform Treasury ${currency}`,
          isPlatform: true,
        },
      });
    }
    return account;
  }

  /** Ensure platform Clearing account exists for currency; create if not. */
  async ensureClearing(currency: CurrencyCode) {
    let account = await this.prisma.account.findFirst({
      where: {
        businessId: null,
        currency,
        type: 'CLEARING',
        isPlatform: true,
      },
    });
    if (!account) {
      account = await this.prisma.account.create({
        data: {
          businessId: null,
          currency,
          type: 'CLEARING',
          label: `Platform Clearing ${currency}`,
          isPlatform: true,
        },
      });
    }
    return account;
  }

  /** Reserve funds for a transfer: DEBIT Customer Wallet, CREDIT Clearing. */
  async reserveForTransfer(params: {
    transferId: string;
    businessId: string;
    fromCurrency: CurrencyCode;
    fromAmount: bigint;
    userId: string;
  }) {
    const { transferId, businessId, fromCurrency, fromAmount, userId } = params;
    if (fromAmount <= 0n) {
      throw new BadRequestException('Amount must be positive.');
    }

    const [clearing, wallet] = await Promise.all([
      this.ensureClearing(fromCurrency),
      this.prisma.account.findFirst({
        where: {
          businessId,
          currency: fromCurrency,
          type: 'CUSTOMER_WALLET',
        },
      }),
    ]);

    if (!wallet) {
      throw new BadRequestException(`No wallet found for ${fromCurrency}.`);
    }

    const entry = await this.prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryType: 'TRANSFER_CREATE',
          currency: fromCurrency,
          referenceType: 'TRANSFER',
          referenceId: transferId,
          memo: `Reserve for transfer ${transferId}`,
          createdBy: userId,
        },
      });

      await tx.posting.createMany({
        data: [
          { entryId: journalEntry.id, accountId: wallet.id, direction: 'DEBIT', amount: fromAmount },
          { entryId: journalEntry.id, accountId: clearing.id, direction: 'CREDIT', amount: fromAmount },
        ],
      });

      return journalEntry;
    });

    return { entryId: entry.id };
  }

  /** Top up a business wallet: DEBIT Treasury, CREDIT Customer Wallet. */
  async topUp(params: {
    currency: CurrencyCode;
    amount: bigint;
    businessId: string;
    userId: string;
  }) {
    const { currency, amount, businessId, userId } = params;
    if (amount <= 0n) {
      throw new BadRequestException('Amount must be positive.');
    }

    const [treasury, wallet] = await Promise.all([
      this.ensureTreasury(currency),
      this.prisma.account.findFirst({
        where: {
          businessId,
          currency,
          type: 'CUSTOMER_WALLET',
        },
      }),
    ]);

    if (!wallet) {
      throw new BadRequestException(`No wallet found for ${currency}.`);
    }

    const entry = await this.prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryType: 'WALLET_TOPUP',
          currency,
          referenceType: 'TOP_UP',
          referenceId: wallet.id,
          memo: `Wallet top-up ${currency}`,
          createdBy: userId,
        },
      });

      await tx.posting.createMany({
        data: [
          { entryId: journalEntry.id, accountId: treasury.id, direction: 'DEBIT', amount },
          { entryId: journalEntry.id, accountId: wallet.id, direction: 'CREDIT', amount },
        ],
      });

      return journalEntry;
    });

    return {
      entryId: entry.id,
      currency,
      amount: amount.toString(),
      memo: 'Wallet top-up',
    };
  }

  /** Convert between wallets: DEBIT fromCurrency wallet, CREDIT toCurrency wallet (FX_CONVERSION). */
  async convert(params: {
    businessId: string;
    userId: string;
    fromCurrency: CurrencyCode;
    toCurrency: CurrencyCode;
    fromAmount: bigint;
    toAmount: bigint;
  }) {
    const { businessId, userId, fromCurrency, toCurrency, fromAmount, toAmount } = params;
    if (fromAmount <= 0n || toAmount <= 0n) {
      throw new BadRequestException('Amounts must be positive.');
    }
    if (fromCurrency === toCurrency) {
      throw new BadRequestException('Currencies must differ.');
    }

    const [fromWallet, toWallet] = await Promise.all([
      this.prisma.account.findFirst({
        where: { businessId, currency: fromCurrency, type: 'CUSTOMER_WALLET' },
      }),
      this.prisma.account.findFirst({
        where: { businessId, currency: toCurrency, type: 'CUSTOMER_WALLET' },
      }),
    ]);

    if (!fromWallet) {
      throw new BadRequestException(`No wallet found for ${fromCurrency}.`);
    }
    if (!toWallet) {
      throw new BadRequestException(`No wallet found for ${toCurrency}.`);
    }

    const refId = randomUUID();
    const entry = await this.prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryType: 'FX_CONVERSION',
          currency: fromCurrency,
          referenceType: 'FX_CONVERT',
          referenceId: refId,
          memo: `Convert ${fromCurrency} → ${toCurrency}`,
          createdBy: userId,
        },
      });

      await tx.posting.createMany({
        data: [
          { entryId: journalEntry.id, accountId: fromWallet.id, direction: 'DEBIT', amount: fromAmount },
          { entryId: journalEntry.id, accountId: toWallet.id, direction: 'CREDIT', amount: toAmount },
        ],
      });

      return journalEntry;
    });

    return {
      entryId: entry.id,
      fromCurrency,
      toCurrency,
      fromAmount: fromAmount.toString(),
      toAmount: toAmount.toString(),
    };
  }

  /** Settle a transfer: move NGN Clearing → Treasury, Treasury GHS → Clearing (payout). Then caller sets status SETTLED. */
  async settleTransfer(transferId: string) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id: transferId },
    });
    if (!transfer) {
      throw new NotFoundException('Transfer not found.');
    }
    if (transfer.status !== 'PENDING_FUNDS' && transfer.status !== 'PROCESSING') {
      throw new BadRequestException(`Transfer must be PENDING_FUNDS or PROCESSING to settle. Current: ${transfer.status}.`);
    }

    const fromCurrency = transfer.fromCurrency as CurrencyCode;
    const toCurrency = transfer.toCurrency as CurrencyCode;
    const fromAmount = transfer.fromAmount;
    const toAmount = transfer.toAmount;

    const [clearingNgn, treasuryNgn, treasuryGhs, clearingGhs] = await Promise.all([
      this.ensureClearing(fromCurrency),
      this.ensureTreasury(fromCurrency),
      this.ensureTreasury(toCurrency),
      this.ensureClearing(toCurrency),
    ]);

    await this.prisma.$transaction(async (tx) => {
      const entryNgn = await tx.journalEntry.create({
        data: {
          entryType: 'TRANSFER_SETTLE',
          currency: fromCurrency,
          referenceType: 'TRANSFER',
          referenceId: transferId,
          memo: `Settle transfer ${transferId} (NGN)`,
          createdBy: null,
        },
      });
      await tx.posting.createMany({
        data: [
          { entryId: entryNgn.id, accountId: clearingNgn.id, direction: 'DEBIT', amount: fromAmount },
          { entryId: entryNgn.id, accountId: treasuryNgn.id, direction: 'CREDIT', amount: fromAmount },
        ],
      });

      const entryGhs = await tx.journalEntry.create({
        data: {
          entryType: 'TRANSFER_SETTLE',
          currency: toCurrency,
          referenceType: 'TRANSFER',
          referenceId: transferId,
          memo: `Settle transfer ${transferId} (GHS payout)`,
          createdBy: null,
        },
      });
      await tx.posting.createMany({
        data: [
          { entryId: entryGhs.id, accountId: treasuryGhs.id, direction: 'DEBIT', amount: toAmount },
          { entryId: entryGhs.id, accountId: clearingGhs.id, direction: 'CREDIT', amount: toAmount },
        ],
      });
    });

    await this.prisma.transfer.update({
      where: { id: transferId },
      data: { status: 'SETTLED' },
    });

    return { ok: true, status: 'SETTLED' };
  }

  /** Reverse a transfer reserve: CREDIT customer wallet, DEBIT clearing (for cancel). */
  async reverseReserveForTransfer(params: {
    transferId: string;
    businessId: string;
    fromCurrency: CurrencyCode;
    fromAmount: bigint;
  }) {
    const { transferId, businessId, fromCurrency, fromAmount } = params;
    if (fromAmount <= 0n) {
      throw new BadRequestException('Amount must be positive.');
    }

    const [clearing, wallet] = await Promise.all([
      this.ensureClearing(fromCurrency),
      this.prisma.account.findFirst({
        where: {
          businessId,
          currency: fromCurrency,
          type: 'CUSTOMER_WALLET',
        },
      }),
    ]);

    if (!wallet) {
      throw new BadRequestException(`No wallet found for ${fromCurrency}.`);
    }

    await this.prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryType: 'TRANSFER_CANCEL',
          currency: fromCurrency,
          referenceType: 'TRANSFER',
          referenceId: transferId,
          memo: `Reverse reserve for transfer ${transferId}`,
          createdBy: null,
        },
      });

      await tx.posting.createMany({
        data: [
          { entryId: journalEntry.id, accountId: clearing.id, direction: 'DEBIT', amount: fromAmount },
          { entryId: journalEntry.id, accountId: wallet.id, direction: 'CREDIT', amount: fromAmount },
        ],
      });
    });

    return { ok: true };
  }
}
