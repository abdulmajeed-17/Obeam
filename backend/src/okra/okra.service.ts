import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Okra (Nigeria) — real bank connectivity: link account, balance, debit/payments.
 * Set OKRA_SECRET_KEY and OKRA_BASE_URL in .env. Docs: https://docs.okra.ng
 */
@Injectable()
export class OkraService {
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.get<string>('OKRA_SECRET_KEY') ?? '';
    this.baseUrl = this.config.get<string>('OKRA_BASE_URL') ?? 'https://api.okra.ng';
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  /**
   * Generate auth/link URL so customer can connect their Nigerian bank.
   */
  async createAuthLink(callbackUrl: string, customerId?: string): Promise<{ linkUrl: string; recordId?: string }> {
    if (!this.secretKey) {
      return { linkUrl: '', recordId: undefined };
    }
    const linkUrl = `${this.baseUrl}/auth/link?callback=${encodeURIComponent(callbackUrl)}`;
    return { linkUrl, recordId: undefined };
  }

  /**
   * Get balance for a linked account (record_id from Okra after link).
   */
  async getBalance(recordId: string): Promise<{ balance: number; currency: string } | null> {
    if (!this.secretKey) return null;
    try {
      const res = await fetch(`${this.baseUrl}/products/balance/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({ record_id: recordId }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { balance?: number; currency?: string };
      return { balance: data.balance ?? 0, currency: data.currency ?? 'NGN' };
    } catch {
      return null;
    }
  }

  /**
   * Initiate debit from customer Nigerian bank. TODO: map to Okra payments API per docs.
   */
  async charge(params: {
    recordId: string;
    amountMinor: bigint;
    narration: string;
    reference: string;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (!this.secretKey) {
      return { success: false, error: 'Okra not configured.' };
    }
    try {
      const res = await fetch(`${this.baseUrl}/products/payments/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({
          record_id: params.recordId,
          amount: Number(params.amountMinor) / 100,
          narration: params.narration,
          reference: params.reference,
        }),
      });
      const data = (await res.json()) as { success?: boolean; transaction_id?: string; message?: string };
      return {
        success: data.success === true,
        transactionId: data.transaction_id,
        error: data.message,
      };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
}
