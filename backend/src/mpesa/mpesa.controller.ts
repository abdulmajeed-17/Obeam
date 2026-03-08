import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MpesaService } from './mpesa.service';

@Controller('mpesa')
@UseGuards(JwtAuthGuard)
export class MpesaController {
  constructor(private readonly mpesa: MpesaService) {}

  @Get('status')
  status() {
    return { configured: this.mpesa.isConfigured() };
  }

  @Post('stk-push')
  async stkPush(
    @Body() body: {
      phoneNumber: string;
      amountKes: string;
      reference: string;
      description?: string;
      callbackUrl: string;
    },
  ) {
    return this.mpesa.stkPush({
      phoneNumber: body.phoneNumber,
      amountKes: parseFloat(body.amountKes ?? '0'),
      reference: body.reference ?? '',
      description: body.description,
      callbackUrl: body.callbackUrl ?? '',
    });
  }

  @Post('b2c-payout')
  async b2cPayout(
    @Body() body: {
      phoneNumber: string;
      amountKes: string;
      reference: string;
      remarks?: string;
      resultUrl: string;
      timeoutUrl: string;
    },
  ) {
    return this.mpesa.b2cPayout({
      phoneNumber: body.phoneNumber,
      amountKes: parseFloat(body.amountKes ?? '0'),
      reference: body.reference ?? '',
      remarks: body.remarks,
      resultUrl: body.resultUrl ?? '',
      timeoutUrl: body.timeoutUrl ?? '',
    });
  }

  @Get('query')
  async query(@Query('checkoutRequestId') checkoutRequestId: string) {
    if (!checkoutRequestId) return { error: 'checkoutRequestId required' };
    return this.mpesa.queryStatus(checkoutRequestId);
  }
}
