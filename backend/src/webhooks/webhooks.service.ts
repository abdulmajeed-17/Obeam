import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';

export interface WebhookConfig {
  url: string;
  secret?: string;
  registeredAt: Date;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  // TODO: Migrate webhook config storage to a DB table (WebhookConfig model)
  private readonly webhookConfigs = new Map<string, WebhookConfig>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  registerWebhook(businessId: string, url: string, secret?: string): WebhookConfig {
    const cfg: WebhookConfig = {
      url,
      secret: secret || this.config.get<string>('WEBHOOK_SECRET') || 'default-secret',
      registeredAt: new Date(),
    };
    this.webhookConfigs.set(businessId, cfg);
    this.logger.log(`Webhook registered for business ${businessId}: ${url}`);
    return cfg;
  }

  getWebhookConfig(businessId: string): WebhookConfig | undefined {
    return this.webhookConfigs.get(businessId);
  }

  async sendTestWebhook(businessId: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const cfg = this.webhookConfigs.get(businessId);
    if (!cfg) {
      return { success: false, error: 'No webhook URL registered for this business' };
    }

    const payload = {
      event: 'webhook.test',
      business_id: businessId,
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook from Obeam.',
    };

    const ok = await this.sendWebhook(cfg.url, payload, businessId);
    return { success: ok };
  }

  async notifyTransferStatusChange(params: {
    businessId: string;
    transferId: string;
    status: string;
    previousStatus?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: params.businessId },
      select: { id: true, name: true },
    });

    if (!business) {
      this.logger.warn(`Business ${params.businessId} not found for webhook`);
      return;
    }

    const payload = {
      event: 'transfer.status_changed',
      transfer_id: params.transferId,
      business_id: params.businessId,
      status: params.status,
      previous_status: params.previousStatus,
      timestamp: new Date().toISOString(),
      metadata: params.metadata || {},
    };

    const cfg = this.webhookConfigs.get(params.businessId);
    if (!cfg) {
      this.logger.log(`No webhook URL configured for business ${params.businessId} — skipping delivery`);
      return;
    }

    await this.sendWebhook(cfg.url, payload, params.businessId);
  }

  /**
   * Send webhook HTTP request with retry logic.
   */
  private async sendWebhook(
    url: string,
    payload: Record<string, any>,
    businessId: string,
    retries = 3,
  ): Promise<boolean> {
    const cfg = this.webhookConfigs.get(businessId);
    const secret = cfg?.secret || this.config.get<string>('WEBHOOK_SECRET') || 'default-secret';
    const signature = this.generateSignature(JSON.stringify(payload), secret);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Obeam-Signature': signature,
            'X-Obeam-Event': payload.event,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (response.ok) {
          this.logger.log(`Webhook sent successfully to ${url} (attempt ${attempt})`);
          return true;
        }

        this.logger.warn(`Webhook failed: ${response.status} ${response.statusText} (attempt ${attempt})`);
      } catch (error) {
        this.logger.error(`Webhook error (attempt ${attempt}): ${error}`);
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }

    this.logger.error(`Webhook failed after ${retries} attempts: ${url}`);
    return false;
  }

  /**
   * Generate HMAC signature for webhook verification.
   */
  private generateSignature(payload: string, secret: string): string {
    // Use crypto for HMAC-SHA256
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify webhook signature (for incoming webhooks).
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const expected = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  }
}
