import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { TransfersService } from '../transfers/transfers.service';
import { SettlementService } from '../settlement/settlement.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly transfers: TransfersService,
    private readonly settlement: SettlementService,
  ) {}

  @Get('transfers')
  listTransfers(@Query('status') status?: string) {
    return this.transfers.listAllForAdmin(status);
  }

  @Post('transfers/:id/mark-processing')
  markProcessing(@Param('id') id: string) {
    return this.transfers.markProcessing(id);
  }

  @Post('transfers/:id/mark-settled')
  markSettled(@Param('id') id: string) {
    // Use automated settlement (calls bank APIs + updates ledger)
    return this.settlement.settleTransferAutomatically(id);
  }

  @Post('transfers/:id/mark-failed')
  markFailed(@Param('id') id: string) {
    return this.transfers.markFailed(id);
  }
}
