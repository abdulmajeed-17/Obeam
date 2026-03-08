import {
  Controller, Post, Get, Body, Query, Headers, Req,
  UseGuards, BadRequestException, Logger, RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { PaystackService } from './paystack.service';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { CurrencyCode } from '@prisma/client';
import { isValidCurrency } from '../shared/currencies';
import { ConfigService } from '@nestjs/config';

@Controller('paystack')
export class PaystackController {
  private readonly logger = new Logger(PaystackController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly paystack: PaystackService,
    private readonly ledger: LedgerService,
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = this.config.get<string>('CORS_ORIGIN') || 'https://obeam.vercel.app';
  }

  /** Initialize a deposit — returns Paystack checkout URL. */
  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  async initializeDeposit(
    @GetUser() user: RequestUser,
    @Body('amount') amount: number,
    @Body('currency') currency: string,
  ) {
    if (!this.paystack.isConfigured) {
      throw new BadRequestException('Paystack is not configured. Add PAYSTACK_SECRET_KEY.');
    }

    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be positive.');
    }

    const upper = currency?.toUpperCase();
    if (!upper || !isValidCurrency(upper)) {
      throw new BadRequestException(`Invalid currency: ${currency}`);
    }

    const paystackCurrencies = ['NGN', 'GHS', 'ZAR', 'KES', 'USD'];
    if (!paystackCurrencies.includes(upper)) {
      throw new BadRequestException(`Paystack does not support ${upper} deposits.`);
    }

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new BadRequestException('User not found');

    const amountMinor = Math.round(amount * 100);

    const result = await this.paystack.initializePayment({
      email: dbUser.email,
      amount: amountMinor,
      currency: upper,
      callbackUrl: `${this.frontendUrl}?deposit=success`,
      metadata: {
        businessId: user.businessId,
        userId: user.id,
        currency: upper,
        custom_fields: [
          { display_name: 'Business', variable_name: 'business', value: user.businessId },
        ],
      },
    });

    this.logger.log(`Deposit initialized: ${result.reference} | ${upper} ${amount} | business=${user.businessId}`);

    return {
      authorization_url: result.authorization_url,
      reference: result.reference,
      amount,
      currency: upper,
    };
  }

  /** Verify a deposit manually (backup if webhook is slow). */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verifyDeposit(
    @GetUser() user: RequestUser,
    @Query('reference') reference: string,
  ) {
    if (!reference) throw new BadRequestException('reference is required');

    const payment = await this.paystack.verifyPayment(reference);

    if (payment.status !== 'success') {
      return { status: payment.status, credited: false };
    }

    const credited = await this.creditWalletFromPayment(payment);
    return { status: 'success', credited, amount: payment.amount / 100, currency: payment.currency };
  }

  /** Webhook endpoint — Paystack calls this when payment completes. */
  @Post('webhook')
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);

    if (!this.paystack.validateWebhookSignature(rawBody, signature || '')) {
      this.logger.warn('Invalid webhook signature — ignoring');
      return { status: 'ignored' };
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    this.logger.log(`Webhook event: ${event.event}`);

    if (event.event === 'charge.success') {
      const data = event.data;
      await this.creditWalletFromPayment(data);
    }

    return { status: 'ok' };
  }

  /** List banks for withdrawal (NGN, GHS, ZAR, KES). */
  @Get('banks')
  @UseGuards(JwtAuthGuard)
  async listBanks(@Query('currency') currency: string) {
    if (!this.paystack.isConfigured) {
      throw new BadRequestException('Paystack is not configured.');
    }
    const upper = currency?.toUpperCase() || 'NGN';
    const banks = await this.paystack.listBanks(upper);
    return { banks: banks.map((b) => ({ name: b.name, code: b.code })) };
  }

  /** Resolve a bank account (verify account name before withdrawal). */
  @Get('resolve-account')
  @UseGuards(JwtAuthGuard)
  async resolveAccount(
    @Query('account_number') accountNumber: string,
    @Query('bank_code') bankCode: string,
  ) {
    if (!this.paystack.isConfigured) {
      throw new BadRequestException('Paystack is not configured.');
    }
    if (!accountNumber || !bankCode) {
      throw new BadRequestException('account_number and bank_code are required');
    }
    return this.paystack.resolveAccount(accountNumber, bankCode);
  }

  /** Withdraw funds from wallet to a real bank account. */
  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async withdraw(
    @GetUser() user: RequestUser,
    @Body('amount') amount: number,
    @Body('currency') currency: string,
    @Body('bankCode') bankCode: string,
    @Body('accountNumber') accountNumber: string,
    @Body('accountName') accountName: string,
  ) {
    if (!this.paystack.isConfigured) {
      throw new BadRequestException('Paystack is not configured.');
    }
    if (!amount || amount <= 0) throw new BadRequestException('Amount must be positive.');
    if (!bankCode || !accountNumber || !accountName) {
      throw new BadRequestException('bankCode, accountNumber, and accountName are required.');
    }

    const upper = currency?.toUpperCase();
    if (!upper || !isValidCurrency(upper)) {
      throw new BadRequestException(`Invalid currency: ${currency}`);
    }

    const amountMinor = BigInt(Math.round(amount * 100));
    const wallet = await this.prisma.account.findFirst({
      where: { businessId: user.businessId, currency: upper as CurrencyCode, type: 'CUSTOMER_WALLET' },
    });
    if (!wallet) throw new BadRequestException(`No ${upper} wallet found.`);

    const balance = await this.wallets.getBalanceForAccount(wallet.id);
    if (balance < amountMinor) {
      throw new BadRequestException(`Insufficient ${upper} balance. Have ${Number(balance) / 100}, need ${amount}.`);
    }

    const recipient = await this.paystack.createTransferRecipient({
      name: accountName,
      accountNumber,
      bankCode,
      currency: upper,
    });

    const transfer = await this.paystack.initiateTransfer({
      amount: Number(amountMinor),
      recipientCode: recipient.recipient_code,
      reason: `Obeam withdrawal by ${user.businessId}`,
    });

    await this.ledger.withdraw({
      currency: upper as CurrencyCode,
      amount: amountMinor,
      businessId: user.businessId,
      userId: user.id,
      reference: transfer.reference,
    });

    this.logger.log(`Withdrawal: ${transfer.reference} | ${upper} ${amount} → ${accountName} | business=${user.businessId}`);

    return {
      status: transfer.status,
      reference: transfer.reference,
      amount,
      currency: upper,
      recipientName: accountName,
    };
  }

  /** Credit wallet from a verified Paystack payment. */
  private async creditWalletFromPayment(payment: any): Promise<boolean> {
    const { reference, amount, currency, metadata } = payment;
    const businessId = metadata?.businessId;
    const userId = metadata?.userId;

    if (!businessId) {
      this.logger.warn(`Payment ${reference} has no businessId in metadata — skipping`);
      return false;
    }

    const already = await this.prisma.journalEntry.findFirst({
      where: { referenceId: reference, entryType: 'WALLET_TOPUP' },
    });
    if (already) {
      this.logger.log(`Payment ${reference} already credited — skipping duplicate`);
      return false;
    }

    const upper = currency?.toUpperCase() as CurrencyCode;

    await this.wallets.ensureWallet(businessId, upper);

    await this.ledger.topUp({
      currency: upper,
      amount: BigInt(amount),
      businessId,
      userId: userId || 'paystack-webhook',
    });

    this.logger.log(`Wallet credited: ${upper} ${amount / 100} for business ${businessId} (ref: ${reference})`);
    return true;
  }
}
