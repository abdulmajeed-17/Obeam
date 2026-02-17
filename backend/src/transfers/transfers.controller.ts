import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { TransfersService } from './transfers.service';

class CreateTransferDto {
  counterpartyId!: string;
  fromCurrency!: string;
  toCurrency!: string;
  fromAmount!: string;
  toAmount!: string;
  feeAmount?: string;
}

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Post()
  create(@GetUser() user: RequestUser, @Body() body: CreateTransferDto) {
    return this.transfers.create(user, body);
  }

  @Post(':id/confirm')
  confirm(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.transfers.confirm(user, id);
  }

  @Get()
  list(@GetUser() user: RequestUser) {
    return this.transfers.list(user);
  }

  @Get(':id')
  getById(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.transfers.getById(user, id);
  }
}
