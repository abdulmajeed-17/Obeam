import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
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
}
