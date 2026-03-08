import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel: string;
  paid_at: string;
  customer: { email: string };
  metadata: Record<string, any>;
}

export interface PaystackBank {
  id: number;
  name: string;
  code: string;
  currency: string;
}

export interface PaystackRecipient {
  recipient_code: string;
  name: string;
  details: { account_number: string; bank_code: string; bank_name: string };
}

export interface PaystackTransferResponse {
  transfer_code: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('PAYSTACK_SECRET_KEY') || '';
    if (!this.secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY not set — Paystack features disabled');
    }
  }

  get isConfigured(): boolean {
    return !!this.secretKey;
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();
    if (!json.status) {
      this.logger.error(`Paystack ${method} ${path} failed: ${json.message}`);
      throw new BadRequestException(json.message || 'Paystack request failed');
    }
    return json.data as T;
  }

  /**
   * Initialize a payment — returns a checkout URL the user opens to pay.
   * Amount is in the currency's minor unit (kobo for NGN, pesewas for GHS).
   */
  async initializePayment(params: {
    email: string;
    amount: number;
    currency: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<PaystackInitResponse> {
    const { email, amount, currency, callbackUrl, metadata } = params;
    return this.request<PaystackInitResponse>('POST', '/transaction/initialize', {
      email,
      amount,
      currency,
      callback_url: callbackUrl,
      metadata,
    });
  }

  /** Verify a completed payment by reference. */
  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    return this.request<PaystackVerifyResponse>('GET', `/transaction/verify/${reference}`);
  }

  /** Validate a webhook signature from Paystack. */
  validateWebhookSignature(body: string, signature: string): boolean {
    const hash = createHmac('sha512', this.secretKey).update(body).digest('hex');
    return hash === signature;
  }

  /** List supported banks for a currency (NGN, GHS, ZAR, KES). */
  async listBanks(currency: string): Promise<PaystackBank[]> {
    return this.request<PaystackBank[]>('GET', `/bank?currency=${currency}&perPage=100`);
  }

  /** Create a transfer recipient (bank account to send money to). */
  async createTransferRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
    currency: string;
  }): Promise<PaystackRecipient> {
    const type = params.currency === 'ZAR' ? 'basa' :
                 params.currency === 'KES' ? 'mobile_money' :
                 'nuban';
    return this.request<PaystackRecipient>('POST', '/transferrecipient', {
      type,
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: params.currency,
    });
  }

  /** Initiate a transfer (payout) to a bank account. Amount in minor units. */
  async initiateTransfer(params: {
    amount: number;
    recipientCode: string;
    reason?: string;
    reference?: string;
  }): Promise<PaystackTransferResponse> {
    return this.request<PaystackTransferResponse>('POST', '/transfer', {
      source: 'balance',
      amount: params.amount,
      recipient: params.recipientCode,
      reason: params.reason || 'Obeam withdrawal',
      reference: params.reference,
    });
  }

  /** Resolve an account number to get the account name (for verification). */
  async resolveAccount(accountNumber: string, bankCode: string): Promise<{ account_name: string; account_number: string }> {
    return this.request('GET', `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
  }
}
