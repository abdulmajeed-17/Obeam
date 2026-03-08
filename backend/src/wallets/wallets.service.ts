import { Injectable, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CurrencyCode, AccountType } from '@prisma/client';
import { RequestUser } from '../auth/get-user.decorator';
import { isValidCurrency, getCurrencyMeta } from '../shared/currencies';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    const accounts = await this.prisma.account.findMany({
      where: {
        businessId: user.businessId,
        type: 'CUSTOMER_WALLET',
      },
      select: {
        id: true,
        currency: true,
        label: true,
        createdAt: true,
      },
      orderBy: { currency: 'asc' },
    });

    const balances = await Promise.all(
      accounts.map(async (acc) => {
        const balance = await this.getBalanceForAccount(acc.id);
        return { ...acc, balance: balance.toString() };
      }),
    );

    return { wallets: balances };
  }

  async createWallet(user: RequestUser, currency: string) {
    const code = this.parseCurrency(currency);

    const existing = await this.prisma.account.findFirst({
      where: { businessId: user.businessId, currency: code, type: AccountType.CUSTOMER_WALLET },
    });
    if (existing) {
      throw new ConflictException(`${code} wallet already exists.`);
    }

    const meta = getCurrencyMeta(code);
    const account = await this.prisma.account.create({
      data: {
        businessId: user.businessId,
        currency: code,
        type: AccountType.CUSTOMER_WALLET,
        label: `Wallet ${meta.name}`,
        isPlatform: false,
      },
    });

    return { id: account.id, currency: code, label: account.label, balance: '0' };
  }

  async ensureWallet(businessId: string, currency: CurrencyCode) {
    const existing = await this.prisma.account.findFirst({
      where: { businessId, currency, type: AccountType.CUSTOMER_WALLET },
    });
    if (existing) return existing;

    const meta = getCurrencyMeta(currency);
    return this.prisma.account.create({
      data: {
        businessId,
        currency,
        type: AccountType.CUSTOMER_WALLET,
        label: `Wallet ${meta.name}`,
        isPlatform: false,
      },
    });
  }

  async getBalance(user: RequestUser, currency: string) {
    const code = this.parseCurrency(currency);
    const account = await this.findWalletAccount(user.businessId, code);
    const balance = await this.getBalanceForAccount(account.id);
    return {
      currency: code,
      balance: balance.toString(),
    };
  }

  async getLedger(
    user: RequestUser,
    currency: string,
    page = 1,
    limit = 20,
  ) {
    const code = this.parseCurrency(currency);
    const account = await this.findWalletAccount(user.businessId, code);
    const skip = Math.max(0, (page - 1) * limit);
    const take = Math.min(50, Math.max(1, limit));

    const [postings, total] = await Promise.all([
      this.prisma.posting.findMany({
        where: { accountId: account.id },
        include: {
          entry: {
            select: {
              id: true,
              entryType: true,
              currency: true,
              memo: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.posting.count({ where: { accountId: account.id } }),
    ]);

    const items = postings.map((p) => ({
      id: p.id,
      direction: p.direction,
      amount: p.amount.toString(),
      entryType: p.entry.entryType,
      memo: p.entry.memo,
      createdAt: p.entry.createdAt,
    }));

    return {
      currency: code,
      items,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  private parseCurrency(currency: string): CurrencyCode {
    const upper = currency.toUpperCase();
    if (!isValidCurrency(upper)) {
      throw new BadRequestException(`Invalid currency: ${upper}. Supported: NGN, GHS, KES, ZAR, XOF, USD, GBP.`);
    }
    return upper as CurrencyCode;
  }

  private async findWalletAccount(businessId: string, currency: CurrencyCode) {
    const account = await this.prisma.account.findFirst({
      where: {
        businessId,
        currency,
        type: 'CUSTOMER_WALLET',
      },
    });
    if (!account) {
      throw new ForbiddenException(`No wallet found for currency ${currency}`);
    }
    return account;
  }

  async getBalanceForAccount(accountId: string): Promise<bigint> {
    const result = await this.prisma.posting.groupBy({
      by: ['direction'],
      where: { accountId },
      _sum: { amount: true },
    });

    let debits = BigInt(0);
    let credits = BigInt(0);
    for (const row of result) {
      const sum = row._sum.amount ?? BigInt(0);
      if (row.direction === 'DEBIT') debits += sum;
      else credits += sum;
    }

    return credits - debits;
  }
}
