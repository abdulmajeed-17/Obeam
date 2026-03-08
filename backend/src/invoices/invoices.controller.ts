import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { InvoicesService } from './invoices.service';

class CreateInvoiceDto {
  @IsString()
  @MinLength(1)
  counterpartyId!: string;

  @IsString()
  @MinLength(1)
  @IsIn(['NGN', 'GHS', 'KES', 'ZAR', 'XOF', 'USD', 'GBP'])
  currency!: string;

  @IsString()
  @MinLength(1)
  amount!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

class MarkPaidDto {
  @IsOptional()
  @IsString()
  transferId?: string;
}

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@GetUser() user: RequestUser, @Body() body: CreateInvoiceDto) {
    return this.invoices.create(user, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@GetUser() user: RequestUser) {
    return this.invoices.list(user);
  }

  @Get('pay/:invoiceNumber')
  getPublicInvoice(@Param('invoiceNumber') invoiceNumber: string) {
    return this.invoices.getPublicInvoice(invoiceNumber);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.invoices.getById(user, id);
  }

  @Post(':id/send')
  @UseGuards(JwtAuthGuard)
  send(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.invoices.send(user, id);
  }

  @Post(':id/mark-paid')
  @UseGuards(JwtAuthGuard)
  markPaid(
    @GetUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: MarkPaidDto,
  ) {
    return this.invoices.markPaid(user, id, body.transferId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@GetUser() user: RequestUser, @Param('id') id: string) {
    return this.invoices.cancel(user, id);
  }
}
