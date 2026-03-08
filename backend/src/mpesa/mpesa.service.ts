import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * M-Pesa (Kenya) — Safaricom M-Pesa API for KES mobile money transfers.
 * Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY, and MPESA_SHORTCODE in .env.
 * Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 */
@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly passkey: string;
  private readonly shortcode: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {
    this.consumerKey = this.config.get<string>('MPESA_CONSUMER_KEY') ?? '';
    this.consumerSecret = this.config.get<string>('MPESA_CONSUMER_SECRET') ?? '';
    this.passkey = this.config.get<string>('MPESA_PASSKEY') ?? '';
    this.shortcode = this.config.get<string>('MPESA_SHORTCODE') ?? '';
    // Use sandbox URL by default; production: https://api.safaricom.co.ke
    this.baseUrl = this.config.get<string>('MPESA_BASE_URL') ?? 'https://sandbox.safaricom.co.ke';
  }

  isConfigured(): boolean {
    return Boolean(this.consumerKey && this.consumerSecret);
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const res = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: { Authorization: `Basic ${auth}` },
      });
      const data = (await res.json()) as { access_token?: string; expires_in?: string };
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiresAt = Date.now() + (parseInt(data.expires_in ?? '3599', 10) - 60) * 1000;
        return this.accessToken;
      }
      return null;
    } catch (err) {
      this.logger.error(`M-Pesa auth failed: ${err}`);
      return null;
    }
  }

  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  /**
   * STK Push — prompts customer to authorize payment from their M-Pesa wallet.
   * This is how you collect KES from a Kenyan customer.
   */
  async stkPush(params: {
    phoneNumber: string;
    amountKes: number;
    reference: string;
    description?: string;
    callbackUrl: string;
  }): Promise<{ success: boolean; checkoutRequestId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'M-Pesa not configured. Set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET.' };
    }

    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'Failed to get M-Pesa access token.' };

    const { password, timestamp } = this.generatePassword();

    try {
      const res = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: params.amountKes,
          PartyA: params.phoneNumber,
          PartyB: this.shortcode,
          PhoneNumber: params.phoneNumber,
          CallBackURL: params.callbackUrl,
          AccountReference: params.reference,
          TransactionDesc: params.description ?? 'Obeam payment',
        }),
      });

      const data = (await res.json()) as {
        ResponseCode?: string;
        CheckoutRequestID?: string;
        ResponseDescription?: string;
        errorMessage?: string;
      };

      if (data.ResponseCode === '0') {
        return { success: true, checkoutRequestId: data.CheckoutRequestID };
      }
      return { success: false, error: data.ResponseDescription || data.errorMessage || 'STK push failed' };
    } catch (err) {
      return { success: false, error: `M-Pesa STK push error: ${err}` };
    }
  }

  /**
   * B2C — send money to customer's M-Pesa (payout).
   * This is how you send KES to a Kenyan recipient.
   */
  async b2cPayout(params: {
    phoneNumber: string;
    amountKes: number;
    reference: string;
    remarks?: string;
    resultUrl: string;
    timeoutUrl: string;
  }): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'M-Pesa not configured.' };
    }

    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'Failed to get M-Pesa access token.' };

    const securityCredential = this.config.get<string>('MPESA_SECURITY_CREDENTIAL') ?? '';

    try {
      const res = await fetch(`${this.baseUrl}/mpesa/b2c/v3/paymentrequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          OriginatorConversationID: params.reference,
          InitiatorName: 'Obeam',
          SecurityCredential: securityCredential,
          CommandID: 'BusinessPayment',
          Amount: params.amountKes,
          PartyA: this.shortcode,
          PartyB: params.phoneNumber,
          Remarks: params.remarks ?? 'Obeam payout',
          QueueTimeOutURL: params.timeoutUrl,
          ResultURL: params.resultUrl,
          Occasion: params.reference,
        }),
      });

      const data = (await res.json()) as {
        ResponseCode?: string;
        ConversationID?: string;
        ResponseDescription?: string;
        errorMessage?: string;
      };

      if (data.ResponseCode === '0') {
        return { success: true, conversationId: data.ConversationID };
      }
      return { success: false, error: data.ResponseDescription || data.errorMessage || 'B2C payout failed' };
    } catch (err) {
      return { success: false, error: `M-Pesa B2C error: ${err}` };
    }
  }

  /**
   * Check transaction status by CheckoutRequestID (for STK push follow-up).
   */
  async queryStatus(checkoutRequestId: string): Promise<{ resultCode: string; resultDesc: string } | null> {
    if (!this.isConfigured()) return null;

    const token = await this.getAccessToken();
    if (!token) return null;

    const { password, timestamp } = this.generatePassword();

    try {
      const res = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
      });

      const data = (await res.json()) as { ResultCode?: string; ResultDesc?: string };
      return { resultCode: data.ResultCode ?? '', resultDesc: data.ResultDesc ?? '' };
    } catch {
      return null;
    }
  }
}
