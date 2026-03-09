import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { InternalTransfersService } from './internal-transfers.service';

@Controller('send')
@UseGuards(JwtAuthGuard)
export class InternalTransfersController {
  constructor(private readonly transfers: InternalTransfersService) {}

  @Post()
  async send(
    @GetUser() user: RequestUser,
    @Body('recipientEmail') recipientEmail: string,
    @Body('currency') currency: string,
    @Body('amount') amount: number,
    @Body('receiveCurrency') receiveCurrency?: string,
    @Body('memo') memo?: string,
  ) {
    return this.transfers.send({
      senderBusinessId: user.businessId,
      senderUserId: user.id,
      recipientEmail,
      currency,
      amount,
      receiveCurrency,
      memo,
    });
  }

  @Get('pending')
  async listPending(@GetUser() user: RequestUser) {
    const claims = await this.transfers.listPendingSent(user.businessId);
    return { claims };
  }
}
