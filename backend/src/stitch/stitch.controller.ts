import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StitchService } from './stitch.service';

@Controller('stitch')
@UseGuards(JwtAuthGuard)
export class StitchController {
  constructor(private readonly stitch: StitchService) {}

  @Get('status')
  status() {
    return { configured: this.stitch.isConfigured() };
  }

  @Post('payment-request')
  async createPaymentRequest(
    @Body() body: {
      amountZarCents: string;
      reference: string;
      beneficiaryName: string;
      beneficiaryBankId: string;
      beneficiaryAccountNumber: string;
      payerReference?: string;
    },
  ) {
    return this.stitch.createPaymentRequest({
      amountZarCents: parseInt(body.amountZarCents ?? '0', 10),
      reference: body.reference ?? '',
      beneficiaryName: body.beneficiaryName ?? '',
      beneficiaryBankId: body.beneficiaryBankId ?? '',
      beneficiaryAccountNumber: body.beneficiaryAccountNumber ?? '',
      payerReference: body.payerReference,
    });
  }

  @Post('disbursement')
  async disbursement(
    @Body() body: {
      amountZarCents: string;
      reference: string;
      recipientName: string;
      recipientBankId: string;
      recipientAccountNumber: string;
      recipientAccountType?: string;
    },
  ) {
    return this.stitch.disbursement({
      amountZarCents: parseInt(body.amountZarCents ?? '0', 10),
      reference: body.reference ?? '',
      recipientName: body.recipientName ?? '',
      recipientBankId: body.recipientBankId ?? '',
      recipientAccountNumber: body.recipientAccountNumber ?? '',
      recipientAccountType: body.recipientAccountType,
    });
  }
}
