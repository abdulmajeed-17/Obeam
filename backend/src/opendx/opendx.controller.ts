import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OpenDXService } from './opendx.service';

@Controller('opendx')
@UseGuards(JwtAuthGuard)
export class OpenDXController {
  constructor(private readonly opendx: OpenDXService) {}

  @Get('status')
  status() {
    return { configured: this.opendx.isConfigured() };
  }

  /** Payout GHS to recipient Ghana account. Called after transfer is confirmed and GHS is settled. */
  @Post('payout')
  async payout(
    @Body()
    body: {
      toAccountId: string;
      amountGhsMinor: string;
      reference: string;
      narration?: string;
    },
  ) {
    const amountGhsMinor = BigInt(body.amountGhsMinor ?? '0');
    return this.opendx.payout({
      toAccountId: body.toAccountId,
      amountGhsMinor,
      reference: body.reference ?? '',
      narration: body.narration,
    });
  }
}
