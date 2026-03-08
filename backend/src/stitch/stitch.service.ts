import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Stitch (South Africa) — bank transfers for ZAR via South Africa's instant payment rails.
 * Set STITCH_CLIENT_ID and STITCH_CLIENT_SECRET in .env.
 * Docs: https://stitch.money/docs
 */
@Injectable()
export class StitchService {
  private readonly logger = new Logger(StitchService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('STITCH_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('STITCH_CLIENT_SECRET') ?? '';
    this.baseUrl = this.config.get<string>('STITCH_BASE_URL') ?? 'https://api.stitch.money';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    try {
      const res = await fetch(`${this.baseUrl}/connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'client_paymentrequest',
        }),
      });
      const data = (await res.json()) as { access_token?: string; expires_in?: number };
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiresAt = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
        return this.accessToken;
      }
      return null;
    } catch (err) {
      this.logger.error(`Stitch auth failed: ${err}`);
      return null;
    }
  }

  /**
   * Create a payment request (collect ZAR from SA customer).
   * Uses Stitch's payment initiation API via their GraphQL endpoint.
   */
  async createPaymentRequest(params: {
    amountZarCents: number;
    reference: string;
    beneficiaryName: string;
    beneficiaryBankId: string;
    beneficiaryAccountNumber: string;
    payerReference?: string;
  }): Promise<{ success: boolean; paymentRequestId?: string; redirectUrl?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Stitch not configured. Set STITCH_CLIENT_ID and STITCH_CLIENT_SECRET.' };
    }

    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'Failed to get Stitch access token.' };

    const query = `
      mutation CreatePaymentRequest($amount: MoneyInput!, $payerReference: String!, $beneficiaryReference: String!, $beneficiary: BankBeneficiaryInput!) {
        clientPaymentInitiationRequestCreate(input: {
          amount: $amount
          payerReference: $payerReference
          beneficiaryReference: $beneficiaryReference
          beneficiary: $beneficiary
        }) {
          paymentInitiationRequest {
            id
            url
          }
        }
      }
    `;

    try {
      const res = await fetch(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          query,
          variables: {
            amount: { quantity: (params.amountZarCents / 100).toFixed(2), currency: 'ZAR' },
            payerReference: params.payerReference ?? params.reference,
            beneficiaryReference: params.reference,
            beneficiary: {
              bankAccount: {
                name: params.beneficiaryName,
                bankId: params.beneficiaryBankId,
                accountNumber: params.beneficiaryAccountNumber,
              },
            },
          },
        }),
      });

      const data = (await res.json()) as {
        data?: {
          clientPaymentInitiationRequestCreate?: {
            paymentInitiationRequest?: { id: string; url: string };
          };
        };
        errors?: { message: string }[];
      };

      const request = data.data?.clientPaymentInitiationRequestCreate?.paymentInitiationRequest;
      if (request) {
        return { success: true, paymentRequestId: request.id, redirectUrl: request.url };
      }
      return { success: false, error: data.errors?.[0]?.message || 'Payment request creation failed' };
    } catch (err) {
      return { success: false, error: `Stitch payment request error: ${err}` };
    }
  }

  /**
   * Initiate a disbursement (send ZAR to SA recipient's bank account).
   */
  async disbursement(params: {
    amountZarCents: number;
    reference: string;
    recipientName: string;
    recipientBankId: string;
    recipientAccountNumber: string;
    recipientAccountType?: string;
  }): Promise<{ success: boolean; disbursementId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Stitch not configured.' };
    }

    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'Failed to get Stitch access token.' };

    const query = `
      mutation CreateDisbursement($amount: MoneyInput!, $beneficiary: BankBeneficiaryInput!, $nonce: String!) {
        clientDisbursementCreate(input: {
          amount: $amount
          beneficiary: $beneficiary
          nonce: $nonce
        }) {
          disbursement {
            id
            status { ... on DisbursementCompleted { date } ... on DisbursementPending { __typename } ... on DisbursementError { reason } }
          }
        }
      }
    `;

    try {
      const res = await fetch(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          query,
          variables: {
            amount: { quantity: (params.amountZarCents / 100).toFixed(2), currency: 'ZAR' },
            beneficiary: {
              bankAccount: {
                name: params.recipientName,
                bankId: params.recipientBankId,
                accountNumber: params.recipientAccountNumber,
                accountType: params.recipientAccountType ?? 'current',
              },
            },
            nonce: params.reference,
          },
        }),
      });

      const data = (await res.json()) as {
        data?: { clientDisbursementCreate?: { disbursement?: { id: string } } };
        errors?: { message: string }[];
      };

      const disbursement = data.data?.clientDisbursementCreate?.disbursement;
      if (disbursement) {
        return { success: true, disbursementId: disbursement.id };
      }
      return { success: false, error: data.errors?.[0]?.message || 'Disbursement failed' };
    } catch (err) {
      return { success: false, error: `Stitch disbursement error: ${err}` };
    }
  }
}
