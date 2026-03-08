import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InterswitchService } from './interswitch.service';

@Controller('interswitch')
@UseGuards(JwtAuthGuard)
export class InterswitchController {
  constructor(private readonly interswitch: InterswitchService) {}

  @Get('status')
  status() {
    return { configured: this.interswitch.isConfigured() };
  }

  @Get('banks')
  async getBanks() {
    return this.interswitch.getBanks();
  }

  @Post('name-enquiry')
  async nameEnquiry(@Body() body: { bankCode: string; accountNumber: string }) {
    return this.interswitch.nameEnquiry({
      bankCode: body.bankCode ?? '',
      accountNumber: body.accountNumber ?? '',
    });
  }

  @Post('transfer')
  async fundsTransfer(
    @Body() body: {
      destinationBankCode: string;
      destinationAccountNumber: string;
      amountNgnMinor: string;
      reference: string;
      narration?: string;
      beneficiaryName?: string;
    },
  ) {
    return this.interswitch.fundsTransfer({
      destinationBankCode: body.destinationBankCode ?? '',
      destinationAccountNumber: body.destinationAccountNumber ?? '',
      amountNgnMinor: parseInt(body.amountNgnMinor ?? '0', 10),
      reference: body.reference ?? '',
      narration: body.narration,
      beneficiaryName: body.beneficiaryName,
    });
  }
}
