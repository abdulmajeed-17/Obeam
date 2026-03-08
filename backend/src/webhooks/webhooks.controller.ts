import { Controller, Post, Get, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('register')
  async register(
    @GetUser() user: RequestUser,
    @Body() body: { url: string; secret?: string },
  ) {
    if (!body.url) {
      throw new BadRequestException('url is required');
    }

    try {
      new URL(body.url);
    } catch {
      throw new BadRequestException('url must be a valid URL');
    }

    const config = this.webhooks.registerWebhook(user.businessId, body.url, body.secret);
    return {
      message: 'Webhook registered successfully',
      url: config.url,
      registeredAt: config.registeredAt,
    };
  }

  @Post('test')
  async test(@GetUser() user: RequestUser) {
    const result = await this.webhooks.sendTestWebhook(user.businessId);
    if (!result.success) {
      throw new BadRequestException(result.error || 'Webhook test failed');
    }
    return { message: 'Test webhook sent successfully' };
  }

  @Get('config')
  async getConfig(@GetUser() user: RequestUser) {
    const config = this.webhooks.getWebhookConfig(user.businessId);
    if (!config) {
      return { configured: false };
    }
    return {
      configured: true,
      url: config.url,
      hasSecret: Boolean(config.secret),
      registeredAt: config.registeredAt,
    };
  }
}
