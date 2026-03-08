import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';

/**
 * Interswitch (Nigeria) — bank transfers and collections via Interswitch's payment gateway.
 * Set INTERSWITCH_CLIENT_ID, INTERSWITCH_SECRET_KEY in .env.
 * Docs: https://sandbox.interswitchng.com/docbase/docs
 */
@Injectable()
export class InterswitchService {
  private readonly logger = new Logger(InterswitchService.name);
  private readonly clientId: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly terminalId: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('INTERSWITCH_CLIENT_ID') ?? '';
    this.secretKey = this.config.get<string>('INTERSWITCH_SECRET_KEY') ?? '';
    this.terminalId = this.config.get<string>('INTERSWITCH_TERMINAL_ID') ?? '3OBM0001';
    // Sandbox by default; production: https://saturn.interswitchng.com
    this.baseUrl = this.config.get<string>('INTERSWITCH_BASE_URL') ?? 'https://qa.interswitchng.com';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.secretKey);
  }

  private generateSignature(httpMethod: string, resourceUrl: string, timestamp: string, nonce: string): string {
    const signatureInput = `${httpMethod}&${encodeURIComponent(resourceUrl)}&${timestamp}&${nonce}&${this.clientId}&${this.secretKey}`;
    return createHash('sha256').update(signatureInput).digest('base64');
  }

  private getHeaders(method: string, resourceUrl: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 32);
    const signature = this.generateSignature(method, resourceUrl, timestamp, nonce);

    return {
      'Content-Type': 'application/json',
      Authorization: `InterswitchAuth ${Buffer.from(`${this.clientId}:${this.secretKey}`).toString('base64')}`,
      Timestamp: timestamp,
      Nonce: nonce,
      SignatureMethod: 'SHA256',
      Signature: signature,
      TerminalID: this.terminalId,
    };
  }

  /**
   * Name enquiry — verify Nigerian bank account before sending money.
   */
  async nameEnquiry(params: {
    bankCode: string;
    accountNumber: string;
  }): Promise<{ success: boolean; accountName?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Interswitch not configured. Set INTERSWITCH_CLIENT_ID and INTERSWITCH_SECRET_KEY.' };
    }

    const url = `${this.baseUrl}/api/v2/nameenquiry`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders('POST', url),
        body: JSON.stringify({
          bankCode: params.bankCode,
          accountId: params.accountNumber,
        }),
      });

      const data = (await res.json()) as { accountName?: string; responseCode?: string; responseMessage?: string };
      if (data.accountName) {
        return { success: true, accountName: data.accountName };
      }
      return { success: false, error: data.responseMessage || 'Name enquiry failed' };
    } catch (err) {
      return { success: false, error: `Interswitch name enquiry error: ${err}` };
    }
  }

  /**
   * Funds transfer — send NGN to a Nigerian bank account.
   */
  async fundsTransfer(params: {
    destinationBankCode: string;
    destinationAccountNumber: string;
    amountNgnMinor: number;
    reference: string;
    narration?: string;
    beneficiaryName?: string;
  }): Promise<{ success: boolean; transactionRef?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Interswitch not configured.' };
    }

    const url = `${this.baseUrl}/api/v2/quickteller/payments/transfers`;
    const transferCode = '999'; // Default NIBSS NIP transfer code

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders('POST', url),
        body: JSON.stringify({
          mac: '', // MAC address of initiating device (optional for sandbox)
          beneficiary: {
            lastname: params.beneficiaryName ?? 'Beneficiary',
            othernames: '',
          },
          initiatingEntityCode: this.terminalId,
          initiation: {
            amount: params.amountNgnMinor,
            currencyCode: '566', // NGN ISO 4217 numeric code
            paymentMethodCode: transferCode,
            channel: '7', // Internet banking
          },
          sender: {
            email: 'ops@obeam.co',
            lastname: 'Obeam',
            othernames: 'Platform',
            phone: '+2340000000000',
          },
          termination: {
            amount: params.amountNgnMinor,
            countryCode: 'NG',
            currencyCode: '566',
            entityCode: params.destinationBankCode,
            payableCode: params.destinationAccountNumber,
            accountReceivable: {
              accountNumber: params.destinationAccountNumber,
              accountType: '10', // Savings/Current
            },
          },
          transferCode,
        }),
      });

      const data = (await res.json()) as {
        responseCode?: string;
        transactionRef?: string;
        responseMessage?: string;
      };

      const isSuccess = data.responseCode === '90000' || data.responseCode === '00';
      return {
        success: isSuccess,
        transactionRef: data.transactionRef,
        error: isSuccess ? undefined : (data.responseMessage || 'Transfer failed'),
      };
    } catch (err) {
      return { success: false, error: `Interswitch transfer error: ${err}` };
    }
  }

  /**
   * Get list of Nigerian banks supported by Interswitch.
   */
  async getBanks(): Promise<{ success: boolean; banks?: { code: string; name: string }[]; error?: string }> {
    if (!this.isConfigured()) {
      // Return common Nigerian banks as fallback
      return {
        success: true,
        banks: [
          { code: '044', name: 'Access Bank' },
          { code: '023', name: 'Citibank Nigeria' },
          { code: '063', name: 'Diamond Bank' },
          { code: '050', name: 'Ecobank Nigeria' },
          { code: '084', name: 'Enterprise Bank' },
          { code: '070', name: 'Fidelity Bank' },
          { code: '011', name: 'First Bank' },
          { code: '214', name: 'First City Monument Bank' },
          { code: '058', name: 'GTBank' },
          { code: '030', name: 'Heritage Bank' },
          { code: '301', name: 'Jaiz Bank' },
          { code: '082', name: 'Keystone Bank' },
          { code: '076', name: 'Polaris Bank' },
          { code: '221', name: 'Stanbic IBTC' },
          { code: '068', name: 'Standard Chartered' },
          { code: '232', name: 'Sterling Bank' },
          { code: '100', name: 'Suntrust Bank' },
          { code: '032', name: 'Union Bank' },
          { code: '033', name: 'United Bank for Africa' },
          { code: '215', name: 'Unity Bank' },
          { code: '035', name: 'Wema Bank' },
          { code: '057', name: 'Zenith Bank' },
        ],
      };
    }

    const url = `${this.baseUrl}/api/v2/quickteller/categorys/categorys/bills/biller`;
    try {
      const res = await fetch(url, { method: 'GET', headers: this.getHeaders('GET', url) });
      const data = (await res.json()) as { banks?: { cbnCode: string; bankName: string }[] };
      return {
        success: true,
        banks: (data.banks ?? []).map((b) => ({ code: b.cbnCode, name: b.bankName })),
      };
    } catch (err) {
      return { success: false, error: `Interswitch banks list error: ${err}` };
    }
  }
}
