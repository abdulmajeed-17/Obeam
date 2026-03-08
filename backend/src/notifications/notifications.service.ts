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
    this.fromEmail = this.config.get<string>('EMAIL_FROM') || 'Obeam <noreply@obeam.com>';
    this.resendApiKey = this.config.get<string>('RESEND_API_KEY');

    if (this.resendApiKey) {
      this.logger.log('Resend API key configured — emails will be sent via Resend');
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console only');
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
