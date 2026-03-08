import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * OpenDX (Ghana) — real bank connectivity: payout/credit to Ghana bank or mobile money.
 * Set OPENDX_API_KEY and OPENDX_BASE_URL in .env. Docs: https://opendxgh.com
 */
@Injectable()
export class OpenDXService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENDX_API_KEY') ?? '';
    this.baseUrl = this.config.get<string>('OPENDX_BASE_URL') ?? 'https://api.opendxgh.com';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Payout GHS to recipient Ghana account (bank or mobile money).
   * TODO: map to OpenDX payout API per their docs — account id, amount, reference.
   */
  async payout(params: {
    toAccountId: string;
    amountGhsMinor: bigint;
    reference: string;
    narration?: string;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'OpenDX not configured.' };
    }
    try {
      const res = await fetch(`${this.baseUrl}/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          account_id: params.toAccountId,
          amount: Number(params.amountGhsMinor) / 100,
          currency: 'GHS',
          reference: params.reference,
          narration: params.narration ?? 'Obeam payout',
        }),
      });
      const data = (await res.json()) as { success?: boolean; transaction_id?: string; message?: string };
      return {
        success: data.success === true || res.ok,
        transactionId: data.transaction_id,
        error: data.message,
      };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
}
