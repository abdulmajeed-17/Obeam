import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CurrencyCode, AccountType } from '@prisma/client';
import { isValidCurrency, getCurrencyMeta } from '../shared/currencies';
import { WalletsService } from '../wallets/wallets.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InternalTransfersService {
  private readonly logger = new Logger(InternalTransfersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Send money to another user by email.
   * - If recipient has an Obeam account → instant wallet-to-wallet transfer.
   * - If not → create a PendingClaim (money debited from sender, held until recipient signs up).
   */
  async send(params: {
    senderBusinessId: string;
    senderUserId: string;
    recipientEmail: string;
    currency: string;
    amount: number;
    memo?: string;
  }) {
    const { senderBusinessId, senderUserId, recipientEmail, currency, amount, memo } = params;

    const upper = currency.toUpperCase();
    if (!isValidCurrency(upper)) {
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
      where: { businessId: senderBusinessId, currency: upper as CurrencyCode, type: AccountType.CUSTOMER_WALLET },
    });
    if (!senderWallet) throw new BadRequestException(`No ${upper} wallet found. Create one first.`);

    const balance = await this.wallets.getBalanceForAccount(senderWallet.id);
    if (balance < amountMinor) {
      throw new BadRequestException(`Insufficient ${upper} balance. Have ${Number(balance) / 100}, need ${amount}.`);
    }

    const recipientUser = await this.prisma.user.findUnique({
      where: { email: recipientEmail.toLowerCase() },
      include: { business: true },
    });

    if (recipientUser) {
      return this.executeInternalTransfer({
        senderBusinessId,
        senderUserId,
        senderWalletId: senderWallet.id,
        recipientBusinessId: recipientUser.businessId,
        recipientBusinessName: recipientUser.business.name,
        currency: upper as CurrencyCode,
        amountMinor,
        memo,
      });
    }

    return this.createPendingClaim({
      senderBusinessId,
      senderUserId,
      senderWalletId: senderWallet.id,
      recipientEmail: recipientEmail.toLowerCase(),
      currency: upper as CurrencyCode,
      amountMinor,
      memo,
    });
  }

  /** Instant wallet-to-wallet transfer between two Obeam accounts. */
  private async executeInternalTransfer(params: {
    senderBusinessId: string;
    senderUserId: string;
    senderWalletId: string;
    recipientBusinessId: string;
    recipientBusinessName: string;
    currency: CurrencyCode;
    amountMinor: bigint;
    memo?: string;
  }) {
    const { senderBusinessId, senderUserId, senderWalletId, recipientBusinessId, recipientBusinessName, currency, amountMinor, memo } = params;

    const recipientWallet = await this.wallets.ensureWallet(recipientBusinessId, currency);

    const entry = await this.prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryType: 'INTERNAL_TRANSFER',
          currency,
          referenceType: 'INTERNAL_TRANSFER',
          referenceId: recipientWallet.id,
          memo: memo || `Send to ${recipientBusinessName}`,
          createdBy: senderUserId,
        },
      });

      await tx.posting.createMany({
        data: [
          { entryId: journalEntry.id, accountId: senderWalletId, direction: 'DEBIT', amount: amountMinor },
          { entryId: journalEntry.id, accountId: recipientWallet.id, direction: 'CREDIT', amount: amountMinor },
        ],
      });

      return journalEntry;
    });

    this.logger.log(`Internal transfer: ${currency} ${Number(amountMinor) / 100} | ${senderBusinessId} → ${recipientBusinessId}`);

    const senderBiz = await this.prisma.business.findUnique({ where: { id: senderBusinessId } });
    const recipientUser = await this.prisma.user.findFirst({ where: { businessId: recipientBusinessId, role: 'OWNER' } });
    if (recipientUser) {
      this.notifications.notifyMoneySent({
        recipientEmail: recipientUser.email,
        senderName: senderBiz?.name || 'An Obeam user',
        amount: Number(amountMinor) / 100,
        currency,
        isObeamUser: true,
      }).catch(() => {});
    }

    return {
      type: 'instant',
      entryId: entry.id,
      currency,
      amount: Number(amountMinor) / 100,
      recipientName: recipientBusinessName,
      message: `Sent ${getCurrencyMeta(currency).symbol}${(Number(amountMinor) / 100).toLocaleString()} to ${recipientBusinessName}. They'll see it in their wallet instantly.`,
    };
  }

  /** Create a pending claim — debit sender, hold until recipient signs up. */
  private async createPendingClaim(params: {
    senderBusinessId: string;
    senderUserId: string;
    senderWalletId: string;
    recipientEmail: string;
    currency: CurrencyCode;
    amountMinor: bigint;
    memo?: string;
  }) {
    const { senderBusinessId, senderUserId, senderWalletId, recipientEmail, currency, amountMinor, memo } = params;

    const clearing = await this.ensureClearing(currency);

    const result = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.pendingClaim.create({
        data: {
          senderBusinessId,
          senderUserId,
          recipientEmail,
          currency,
          amount: amountMinor,
          memo: memo || `Payment to ${recipientEmail}`,
        },
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryType: 'INTERNAL_TRANSFER',
          currency,
          referenceType: 'PENDING_CLAIM',
          referenceId: claim.id,
          memo: `Pending: send to ${recipientEmail}`,
          createdBy: senderUserId,
        },
      });

      await tx.posting.createMany({
        data: [
          { entryId: journalEntry.id, accountId: senderWalletId, direction: 'DEBIT', amount: amountMinor },
          { entryId: journalEntry.id, accountId: clearing.id, direction: 'CREDIT', amount: amountMinor },
        ],
      });

      return { claim, journalEntry };
    });

    this.logger.log(`Pending claim created: ${currency} ${Number(amountMinor) / 100} → ${recipientEmail} (claim ${result.claim.id})`);

    const senderBiz = await this.prisma.business.findUnique({ where: { id: senderBusinessId } });
    this.notifications.notifyMoneySent({
      recipientEmail,
      senderName: senderBiz?.name || 'An Obeam user',
      amount: Number(amountMinor) / 100,
      currency,
      isObeamUser: false,
    }).catch(() => {});

    return {
      type: 'pending',
      claimId: result.claim.id,
      currency,
      amount: Number(amountMinor) / 100,
      recipientEmail,
      message: `${recipientEmail} doesn't have an Obeam account yet. ${getCurrencyMeta(currency).symbol}${(Number(amountMinor) / 100).toLocaleString()} has been reserved. They'll receive it when they sign up.`,
    };
  }

  /** Called during signup — check if there are pending claims for this email and credit them. */
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
            entryType: 'INTERNAL_TRANSFER',
            currency: claim.currency,
            referenceType: 'CLAIM_FULFILLED',
            referenceId: claim.id,
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
      results.push({
        currency: claim.currency,
        amount: Number(claim.amount) / 100,
        from: sender?.name || 'Unknown',
      });

      this.logger.log(`Claim ${claim.id} fulfilled: ${claim.currency} ${Number(claim.amount) / 100} → ${email}`);
    }

    return results;
  }

  /** List pending claims sent by a business. */
  async listPendingSent(businessId: string) {
    return this.prisma.pendingClaim.findMany({
      where: { senderBusinessId: businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** List claims received by email. */
  async listReceived(email: string) {
    return this.prisma.pendingClaim.findMany({
      where: { recipientEmail: email.toLowerCase(), claimed: true },
      orderBy: { claimedAt: 'desc' },
    });
  }

  private async ensureClearing(currency: CurrencyCode) {
    let account = await this.prisma.account.findFirst({
      where: { businessId: null, currency, type: 'CLEARING', isPlatform: true },
    });
    if (!account) {
      account = await this.prisma.account.create({
        data: { currency, type: 'CLEARING', label: `Platform Clearing ${currency}`, isPlatform: true },
      });
    }
    return account;
  }
}
