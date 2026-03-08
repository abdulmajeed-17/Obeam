import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { SettlementService } from './settlement.service';

@Controller('settlement')
@UseGuards(AdminGuard)
export class SettlementController {
  constructor(private readonly settlement: SettlementService) {}

  /**
   * Manually trigger automated settlement for a transfer.
   * Admin endpoint - calls bank APIs and updates ledger.
   */
  @Post('transfers/:id/settle')
  async settleTransfer(@Param('id') id: string) {
    return this.settlement.settleTransferAutomatically(id);
  }

  /**
   * Process all pending settlements (cron endpoint).
   * Admin endpoint - processes all PROCESSING transfers.
   */
  @Post('process-pending')
  async processPending() {
    return this.settlement.processPendingSettlements();
  }
}
