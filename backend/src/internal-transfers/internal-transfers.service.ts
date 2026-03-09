import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CurrencyCode, AccountType } from '@prisma/client';
import { isValidCurrency, getCurrencyMeta } from '../shared/currencies';
import { WalletsService } from '../wallets/wallets.service';
import { NotificationsService } from '../notifications/notifications.service';

const SPREAD_BPS = 100; // 1% FX spread — Obeam's revenue

@Injectable()
export class InternalTransfersService {
  private readonly logger = new Logger(InternalTransfersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly notifications: NotificationsService,
  ) {}

  async send(params: {
    senderBusinessId: string;
    senderUserId: string;
    recipientEmail: string;
    currency: string;
    amount: number;
    receiveCurrency?: string;
    memo?: string;
  }) {
    const { senderBusinessId, senderUserId, recipientEmail, currency, amount, memo } = params;

    const sendCurrency = currency.toUpperCase();
    if (!isValidCurrency(sendCurrency)) {
      throw new BadRequestException(`Invalid currency: ${currency}`);
    }
    if (amount <= 0) throw new BadRequestException('Amount must be positive.');

    const amountMinor = BigInt(Math.round(amount * 100));

    const senderUser = await this.prisma.user.findUnique({ where: { id: senderUserId } });
    if (!senderUser) throw new BadRequestException('Sender not found.');
    if (senderUser.email.toLowerCase() === recipientEmail.toLowerCase()) {
      throw new BadRequestException("You can't send money to yourself.");
    }

    const senderWallet = await this.prisma.account.findFirst({
      where: { businessId: senderBusinessId, currency: sendCurrency as CurrencyCode, type: AccountType.CUSTOMER_WALLET },
    });
    if (!senderWallet) throw new BadRequestException(`No ${sendCurrency} wallet found. Create one first.`);

    const balance = await this.wallets.getBalanceForAccount(senderWallet.id);
    if (balance < amountMinor) {
      throw new BadRequestException(`Insufficient ${sendCurrency} balance. Have ${Number(balance) / 100}, need ${amount}.`);
    }

    let receiveCcy = params.receiveCurrency?.toUpperCase();
    if (receiveCcy && !isValidCurrency(receiveCcy)) {
      throw new BadRequestException(`Invalid receive currency: ${receiveCcy}`);
    }

    const recipientUser = await this.prisma.user.findUnique({
      where: { email: recipientEmail.toLowerCase() },
      include: { business: true },
    });

    if (!receiveCcy && recipientUser) {
      const recipientHomeCurrency = await this.detectHomeCurrency(recipientUser.businessId);
      receiveCcy = recipientHomeCurrency || sendCurrency;
    }
    if (!receiveCcy) receiveCcy = sendCurrency;

    const isCrossCurrency = sendCurrency !== receiveCcy;

    let receiveAmountMinor = amountMinor;
    let rateUsed = '1';
    let feeAmount = 0n;
    let fxBreakdown: { fromAmount: number; toAmount: number; rate: string; fee: number; fromCurrency: string; toCurrency: string } | undefined;

    if (isCrossCurrency) {
      const fxResult = await this.getConvertedAmount(sendCurrency as CurrencyCode, receiveCcy as CurrencyCode, amountMinor);
      receiveAmountMinor = fxResult.toAmount;
      rateUsed = fxResult.rate;
      feeAmount = fxResult.feeAmount;
      fxBreakdown = {
        fromAmount: Number(amountMinor) / 100,
        toAmount: Number(receiveAmountMinor) / 100,
        rate: rateUsed,
        fee: Number(feeAmount) / 100,
        fromCurrency: sendCurrency,
        toCurrency: receiveCcy,
      };
    }

    if (recipientUser) {
      return this.executeInternalTransfer({
        senderBusinessId,
        senderUserId,
        senderWalletId: senderWallet.id,
        recipientBusinessId: recipientUser.businessId,
        recipientBusinessName: recipientUser.business.name,
        sendCurrency: sendCurrency as CurrencyCode,
        receiveCurrency: receiveCcy as CurrencyCode,
        sendAmountMinor: amountMinor,
        receiveAmountMinor,
        rateUsed,
        feeAmount,
        memo,
        fxBreakdown,
      });
    }

    return this.createPendingClaim({
      senderBusinessId,
      senderUserId,
      senderWalletId: senderWallet.id,
      recipientEmail: recipientEmail.toLowerCase(),
      sendCurrency: sendCurrency as CurrencyCode,
      receiveCurrency: receiveCcy as CurrencyCode,
      sendAmountMinor: amountMinor,
      receiveAmountMinor,
      rateUsed,
      feeAmount,
      memo,
      fxBreakdown,
    });
  }

  private async executeInternalTransfer(params: {
    senderBusinessId: string;
    senderUserId: string;
    senderWalletId: string;
    recipientBusinessId: string;
    recipientBusinessName: string;
    sendCurrency: CurrencyCode;
    receiveCurrency: CurrencyCode;
    sendAmountMinor: bigint;
    receiveAmountMinor: bigint;
    rateUsed: string;
    feeAmount: bigint;
    memo?: string;
    fxBreakdown?: any;
  }) {
    const {
      senderBusinessId, senderUserId, senderWalletId,
      recipientBusinessId, recipientBusinessName,
      sendCurrency, receiveCurrency, sendAmountMinor, receiveAmountMinor,
      rateUsed, feeAmount, memo, fxBreakdown,
    } = params;

    const isCrossCurrency = sendCurrency !== receiveCurrency;
    const recipientWallet = await this.wallets.ensureWallet(recipientBusinessId, receiveCurrency);

    await this.prisma.$transaction(async (tx) => {
      if (isCrossCurrency) {
        const senderTreasury = await this.ensurePlatformAccount(sendCurrency, 'TREASURY');
        const recipientTreasury = await this.ensurePlatformAccount(receiveCurrency, 'TREASURY');

        const debitEntry = await tx.journalEntry.create({
          data: {
            entryType: 'INTERNAL_TRANSFER', currency: sendCurrency,
            referenceType: 'INTERNAL_TRANSFER_FX', referenceId: recipientWallet.id,
            memo: memo || `Send ${sendCurrency} → ${receiveCurrency} to ${recipientBusinessName}`,
            createdBy: senderUserId,
          },
        });
        await tx.posting.createMany({
          data: [
            { entryId: debitEntry.id, accountId: senderWalletId, direction: 'DEBIT', amount: sendAmountMinor },
            { entryId: debitEntry.id, accountId: senderTreasury.id, direction: 'CREDIT', amount: sendAmountMinor },
          ],
        });

        const creditEntry = await tx.journalEntry.create({
          data: {
            entryType: 'INTERNAL_TRANSFER', currency: receiveCurrency,
            referenceType: 'INTERNAL_TRANSFER_FX', referenceId: recipientWallet.id,
            memo: memo || `Receive from ${sendCurrency} conversion`,
            createdBy: senderUserId,
          },
        });
        await tx.posting.createMany({
          data: [
            { entryId: creditEntry.id, accountId: recipientTreasury.id, direction: 'DEBIT', amount: receiveAmountMinor },
            { entryId: creditEntry.id, accountId: recipientWallet.id, direction: 'CREDIT', amount: receiveAmountMinor },
          ],
        });

        if (feeAmount > 0n) {
          const fxRevenue = await this.ensurePlatformAccount(sendCurrency, 'FX_REVENUE');
          const feeEntry = await tx.journalEntry.create({
            data: {
              entryType: 'FEE_CHARGE', currency: sendCurrency,
              referenceType: 'FX_SPREAD', referenceId: recipientWallet.id,
              memo: `FX spread revenue: ${sendCurrency} → ${receiveCurrency}`,
              createdBy: senderUserId,
            },
          });
          await tx.posting.createMany({
            data: [
              { entryId: feeEntry.id, accountId: senderTreasury.id, direction: 'DEBIT', amount: feeAmount },
              { entryId: feeEntry.id, accountId: fxRevenue.id, direction: 'CREDIT', amount: feeAmount },
            ],
          });
        }
      } else {
        const journalEntry = await tx.journalEntry.create({
          data: {
            entryType: 'INTERNAL_TRANSFER', currency: sendCurrency,
            referenceType: 'INTERNAL_TRANSFER', referenceId: recipientWallet.id,
            memo: memo || `Send to ${recipientBusinessName}`,
            createdBy: senderUserId,
          },
        });
        await tx.posting.createMany({
          data: [
            { entryId: journalEntry.id, accountId: senderWalletId, direction: 'DEBIT', amount: sendAmountMinor },
            { entryId: journalEntry.id, accountId: recipientWallet.id, direction: 'CREDIT', amount: sendAmountMinor },
          ],
        });
      }
    });

    this.logger.log(`Internal transfer: ${sendCurrency} ${Number(sendAmountMinor) / 100} → ${receiveCurrency} ${Number(receiveAmountMinor) / 100} | ${senderBusinessId} → ${recipientBusinessId}`);

    const senderBiz = await this.prisma.business.findUnique({ where: { id: senderBusinessId } });
    const recipientOwner = await this.prisma.user.findFirst({ where: { businessId: recipientBusinessId, role: 'OWNER' } });
    if (recipientOwner) {
      this.notifications.notifyMoneySent({
        recipientEmail: recipientOwner.email,
        senderName: senderBiz?.name || 'An Obeam user',
        amount: Number(receiveAmountMinor) / 100,
        currency: receiveCurrency,
        isObeamUser: true,
      }).catch(() => {});
    }

    const sendMeta = getCurrencyMeta(sendCurrency);
    const recvMeta = getCurrencyMeta(receiveCurrency);
    const message = isCrossCurrency
      ? `Sent ${sendMeta.symbol}${(Number(sendAmountMinor) / 100).toLocaleString()} ${sendCurrency} → ${recipientBusinessName} received ${recvMeta.symbol}${(Number(receiveAmountMinor) / 100).toLocaleString()} ${receiveCurrency} (rate: ${rateUsed}).`
      : `Sent ${sendMeta.symbol}${(Number(sendAmountMinor) / 100).toLocaleString()} to ${recipientBusinessName}. They'll see it in their wallet instantly.`;

    return { type: 'instant', sendCurrency, receiveCurrency, sendAmount: Number(sendAmountMinor) / 100, receiveAmount: Number(receiveAmountMinor) / 100, recipientName: recipientBusinessName, rate: rateUsed, fee: Number(feeAmount) / 100, fxBreakdown, message };
  }

  private async createPendingClaim(params: {
    senderBusinessId: string;
    senderUserId: string;
    senderWalletId: string;
    recipientEmail: string;
    sendCurrency: CurrencyCode;
    receiveCurrency: CurrencyCode;
    sendAmountMinor: bigint;
    receiveAmountMinor: bigint;
    rateUsed: string;
    feeAmount: bigint;
    memo?: string;
    fxBreakdown?: any;
  }) {
    const { senderBusinessId, senderUserId, senderWalletId, recipientEmail, sendCurrency, receiveCurrency, sendAmountMinor, receiveAmountMinor, rateUsed, feeAmount, memo, fxBreakdown } = params;

    const clearing = await this.ensureClearing(sendCurrency);

    const result = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.pendingClaim.create({
        data: {
          senderBusinessId, senderUserId, recipientEmail,
          currency: receiveCurrency,
          amount: receiveAmountMinor,
          memo: memo || `Payment to ${recipientEmail}`,
        },
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryType: 'INTERNAL_TRANSFER', currency: sendCurrency,
          referenceType: 'PENDING_CLAIM', referenceId: claim.id,
          memo: `Pending: send ${sendCurrency} → ${receiveCurrency} to ${recipientEmail}`,
          createdBy: senderUserId,
        },
      });

      await tx.posting.createMany({
        data: [
          { entryId: journalEntry.id, accountId: senderWalletId, direction: 'DEBIT', amount: sendAmountMinor },
          { entryId: journalEntry.id, accountId: clearing.id, direction: 'CREDIT', amount: sendAmountMinor },
        ],
      });

      return { claim, journalEntry };
    });

    this.logger.log(`Pending claim: ${sendCurrency} ${Number(sendAmountMinor) / 100} → ${receiveCurrency} ${Number(receiveAmountMinor) / 100} → ${recipientEmail}`);

    const senderBiz = await this.prisma.business.findUnique({ where: { id: senderBusinessId } });
    this.notifications.notifyMoneySent({
      recipientEmail, senderName: senderBiz?.name || 'An Obeam user',
      amount: Number(receiveAmountMinor) / 100, currency: receiveCurrency, isObeamUser: false,
    }).catch(() => {});

    const recvMeta = getCurrencyMeta(receiveCurrency);
    return {
      type: 'pending', claimId: result.claim.id,
      sendCurrency, receiveCurrency,
      sendAmount: Number(sendAmountMinor) / 100,
      receiveAmount: Number(receiveAmountMinor) / 100,
      recipientEmail, rate: rateUsed, fee: Number(feeAmount) / 100, fxBreakdown,
      message: `${recipientEmail} doesn't have an Obeam account yet. ${recvMeta.symbol}${(Number(receiveAmountMinor) / 100).toLocaleString()} ${receiveCurrency} has been reserved. They'll receive it when they sign up.`,
    };
  }

  async claimPending(email: string, recipientBusinessId: string) {
    const claims = await this.prisma.pendingClaim.findMany({
      where: { recipientEmail: email.toLowerCase(), claimed: false },
    });
    if (claims.length === 0) return [];

    const results: { currency: string; amount: number; from: string }[] = [];

    for (const claim of claims) {
      const recipientWallet = await this.wallets.ensureWallet(recipientBusinessId, claim.currency);
      const clearing = await this.ensureClearing(claim.currency);

      await this.prisma.$transaction(async (tx) => {
        const journalEntry = await tx.journalEntry.create({
          data: {
            entryType: 'INTERNAL_TRANSFER', currency: claim.currency,
            referenceType: 'CLAIM_FULFILLED', referenceId: claim.id,
            memo: `Claim fulfilled: ${claim.memo}`,
          },
        });
        await tx.posting.createMany({
          data: [
            { entryId: journalEntry.id, accountId: clearing.id, direction: 'DEBIT', amount: claim.amount },
            { entryId: journalEntry.id, accountId: recipientWallet.id, direction: 'CREDIT', amount: claim.amount },
          ],
        });
        await tx.pendingClaim.update({
          where: { id: claim.id },
          data: { claimed: true, claimedByBusinessId: recipientBusinessId, claimedAt: new Date() },
        });
      });

      const sender = await this.prisma.business.findUnique({ where: { id: claim.senderBusinessId } });
      results.push({ currency: claim.currency, amount: Number(claim.amount) / 100, from: sender?.name || 'Unknown' });
      this.logger.log(`Claim ${claim.id} fulfilled: ${claim.currency} ${Number(claim.amount) / 100} → ${email}`);
    }

    return results;
  }

  async listPendingSent(businessId: string) {
    return this.prisma.pendingClaim.findMany({
      where: { senderBusinessId: businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getConvertedAmount(from: CurrencyCode, to: CurrencyCode, fromAmountMinor: bigint) {
    const rateRow = await this.prisma.fxRate.findFirst({
      where: { base: from, quote: to },
      orderBy: { asOf: 'desc' },
    });
    if (!rateRow) {
      throw new BadRequestException(`No FX rate available for ${from} → ${to}. Try again later.`);
    }

    const rawRate = Number(rateRow.rate);
    const spreadMultiplier = 1 - SPREAD_BPS / 10000;
    const effectiveRate = rawRate * spreadMultiplier;
    const toAmount = BigInt(Math.round(Number(fromAmountMinor) * effectiveRate));
    const feeAmount = BigInt(Math.round(Number(fromAmountMinor) * (SPREAD_BPS / 10000)));

    return { toAmount, rate: effectiveRate.toFixed(6), rawRate: rawRate.toString(), feeAmount };
  }

  private async detectHomeCurrency(businessId: string): Promise<string | null> {
    const wallet = await this.prisma.account.findFirst({
      where: { businessId, type: AccountType.CUSTOMER_WALLET },
      orderBy: { createdAt: 'asc' },
    });
    return wallet?.currency || null;
  }

  private async ensureClearing(currency: CurrencyCode) {
    return this.ensurePlatformAccount(currency, 'CLEARING');
  }

  private async ensurePlatformAccount(currency: CurrencyCode, type: string) {
    let account = await this.prisma.account.findFirst({
      where: { businessId: null, currency, type: type as any, isPlatform: true },
    });
    if (!account) {
      account = await this.prisma.account.create({
        data: { currency, type: type as any, label: `Platform ${type} ${currency}`, isPlatform: true },
      });
    }
    return account;
  }
}
