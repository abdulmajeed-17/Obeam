import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OkraService } from './okra.service';

@Controller('okra')
@UseGuards(JwtAuthGuard)
export class OkraController {
  constructor(private readonly okra: OkraService) {}

  @Get('status')
  status() {
    return { configured: this.okra.isConfigured() };
  }

  /** Get link URL for customer to connect Nigerian bank. Frontend redirects user here. */
  @Post('link')
  async createLink(@Body() body: { callbackUrl: string; customerId?: string }) {
    const callbackUrl = body.callbackUrl ?? '';
    return this.okra.createAuthLink(callbackUrl, body.customerId);
  }

  /** Get balance for a linked Okra record (record_id stored after customer links bank). */
  @Get('balance')
  async getBalance(@Query('recordId') recordId: string) {
    if (!recordId) return { balance: null, error: 'recordId required' };
    const balance = await this.okra.getBalance(recordId);
    return { balance };
  }

  /** Initiate debit from customer's Nigerian bank. Called when confirming a transfer (NGN side). */
  @Post('charge')
  async charge(
    @Body()
    body: {
      recordId: string;
      amountMinor: string;
      narration: string;
      reference: string;
    },
  ) {
    const amountMinor = BigInt(body.amountMinor ?? '0');
    return this.okra.charge({
      recordId: body.recordId,
      amountMinor,
      narration: body.narration ?? 'Obeam transfer',
      reference: body.reference ?? '',
    });
  }
}
