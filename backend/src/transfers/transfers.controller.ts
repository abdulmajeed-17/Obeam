import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { TransfersService } from './transfers.service';

class CreateTransferDto {
  @IsString()
  @MinLength(1)
  counterpartyId!: string;

  @IsString()
  @MinLength(1)
  fromCurrency!: string;

  @IsString()
  @MinLength(1)
  toCurrency!: string;

  @IsString()
  @MinLength(1)
  fromAmount!: string;

  @IsString()
  @MinLength(1)
  toAmount!: string;

  @IsOptional()
  @IsString()
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

  @Post(':id/cancel')
  cancel(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.transfers.cancel(user, id);
  }
}
