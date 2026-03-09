import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly fromEmail: string;
  private readonly resendApiKey: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.fromEmail = this.config.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';
    this.resendApiKey = this.config.get<string>('RESEND_API_KEY');

    if (this.resendApiKey) {
      this.logger.log('Resend API key configured — emails will be sent via Resend');
    } else {
      this.logger.warn('RESEND_API_KEY not set in Railway — welcome emails will NOT be sent. See docs/EMAIL-SETUP.md');
    }
  }

  async sendEmail(params: { to: string; subject: string; html: string; text?: string }): Promise<boolean> {
    if (!this.resendApiKey) {
      this.logger.warn(`[DRY RUN] Email to ${params.to} | Subject: ${params.subject}`);
      this.logger.debug(`[DRY RUN] Body: ${params.html.substring(0, 200)}...`);
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [params.to],
          subject: params.subject,
          html: params.html,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Resend API error ${response.status}: ${errorBody}`);
        return false;
      }

      const result = await response.json();
      this.logger.log(`Email sent via Resend to ${params.to} (id: ${(result as any).id})`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email via Resend: ${error}`);
      return false;
    }
  }

  async notifyTransferStatusChange(params: {
    businessId: string;
    transferId: string;
    status: string;
    previousStatus?: string;
    recipientEmail?: string;
  }): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: params.businessId },
      include: { users: { where: { role: 'OWNER' }, take: 1 } },
    });

    if (!business || !business.users[0]) return;

    const email = business.users[0].email;
    const subject = `Transfer ${params.status}: ${params.transferId}`;
    const html = this.getTransferStatusEmailHtml(params);

    await this.sendEmail({ to: email, subject, html });
  }

  async sendWelcomeEmail(params: { to: string; businessName: string }): Promise<void> {
    const { to, businessName } = params;
    const frontendUrl = this.config.get<string>('CORS_ORIGIN') || 'https://obeam.vercel.app';

    const subject = 'Welcome to Obeam — Your account is ready';
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#0A291B;color:white;padding:24px;text-align:center;border-radius:12px 12px 0 0}.content{padding:28px;background:#FFFBF5;border:1px solid #E8E0D0;border-top:none;border-radius:0 0 12px 12px}.cta{display:inline-block;background:#0A291B;color:white;padding:14px 28px;text-decoration:none;border-radius:10px;font-weight:bold;margin-top:16px}.footer{text-align:center;padding:20px;font-size:12px;color:#999}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;font-size:24px;">Obeam</h1></div><div class="content"><h2 style="margin-top:0;">Thanks for creating your account</h2><p>Hi${businessName ? ` ${businessName}` : ''},</p><p>Your Obeam account is ready. You can now:</p><ul><li>Add multi-currency wallets (NGN, GHS, KES, ZAR, and more)</li><li>Send money to anyone by email — instant if they're on Obeam</li><li>Convert between currencies at live rates</li><li>Withdraw to your bank account</li></ul><p><a href="${frontendUrl}" class="cta">Go to Dashboard</a></p><p style="margin-top:24px;color:#666;font-size:14px;">Questions? Reply to this email — we're here to help.</p></div><div class="footer"><p>Obeam — Cross-border payments for African businesses</p></div></div></body></html>`;

    await this.sendEmail({ to, subject, html });
  }

  async notifyMoneySent(params: {
    recipientEmail: string;
    senderName: string;
    amount: number;
    currency: string;
    isObeamUser: boolean;
  }): Promise<void> {
    const { recipientEmail, senderName, amount, currency, isObeamUser } = params;
    const frontendUrl = this.config.get<string>('CORS_ORIGIN') || 'https://obeam.vercel.app';

    const subject = isObeamUser
      ? `${senderName} sent you ${currency} ${amount.toLocaleString()} on Obeam`
      : `${senderName} sent you ${currency} ${amount.toLocaleString()} — sign up to claim`;

    const actionText = isObeamUser
      ? `<p>The funds are already in your Obeam wallet. <a href="${frontendUrl}" style="color:#C8952E;font-weight:bold;">Open Obeam</a> to see your balance. You can withdraw to your bank anytime.</p>`
      : `<p>Sign up for Obeam to claim your money — it takes 30 seconds. Once claimed, add a wallet and withdraw to your bank whenever you like.</p><p><a href="${frontendUrl}" style="display:inline-block;background:#0A291B;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Sign up & claim your ${currency} ${amount.toLocaleString()}</a></p>`;

    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#0A291B;color:white;padding:20px;text-align:center;border-radius:12px 12px 0 0}.content{padding:24px;background:#FFFBF5;border:1px solid #E8E0D0;border-top:none;border-radius:0 0 12px 12px}.amount{font-size:28px;font-weight:bold;color:#0A291B;margin:16px 0}.footer{text-align:center;padding:16px;font-size:12px;color:#999}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;font-size:22px;">Obeam</h1></div><div class="content"><h2 style="margin-top:0;">You received money!</h2><p><strong>${senderName}</strong> sent you:</p><div class="amount">${currency} ${amount.toLocaleString()}</div>${actionText}</div><div class="footer"><p>Obeam — Cross-border payments for African businesses</p></div></div></body></html>`;

    await this.sendEmail({ to: recipientEmail, subject, html });
  }

  private getTransferStatusEmailHtml(params: { transferId: string; status: string; previousStatus?: string }): string {
    const statusMessages: Record<string, string> = {
      CREATED: 'Your transfer has been created and is pending confirmation.',
      CONFIRMED: 'Your transfer has been confirmed and funds have been reserved.',
      PROCESSING: 'Your transfer is being processed.',
      SETTLED: 'Your transfer has been successfully settled.',
      FAILED: 'Your transfer has failed. Please contact support.',
      CANCELLED: 'Your transfer has been cancelled.',
    };

    const message = statusMessages[params.status] || 'Your transfer status has changed.';
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'https://obeam.com';

    return `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#0A291B;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.footer{text-align:center;padding:20px;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>Obeam</h1></div><div class="content"><h2>Transfer Status Update</h2><p>${message}</p><p><strong>Transfer ID:</strong> ${params.transferId}</p><p><strong>Status:</strong> ${params.status}</p><p><a href="${frontendUrl}/dashboard">View in Dashboard</a></p></div><div class="footer"><p>This is an automated message from Obeam.</p></div></div></body></html>`;
  }
}
