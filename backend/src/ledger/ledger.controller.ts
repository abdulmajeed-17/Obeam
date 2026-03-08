import { Body, Controller, Post, UseGuards, BadRequestException, HttpException, InternalServerErrorException, Logger } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser, RequestUser } from '../auth/get-user.decorator';
import { LedgerService } from './ledger.service';
import { FxService } from '../fx/fx.service';
import { CurrencyCode } from '@prisma/client';
import { isValidCurrency, CURRENCY_CODES } from '../shared/currencies';

class TopUpDto {
  @IsString()
  @MinLength(1)
  currency!: string;

  @IsString()
  @MinLength(1)
  amount!: string;
}

class ConvertDto {
  @IsString()
  @MinLength(1)
  fromCurrency!: string;

  @IsString()
  @MinLength(1)
  toCurrency!: string;

  @IsString()
  @MinLength(1)
  fromAmount!: string;
}

@Controller('ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  private readonly logger = new Logger(LedgerController.name);

  constructor(
    private readonly ledger: LedgerService,
    private readonly fx: FxService,
  ) {}

  @Post('top-up')
  async topUp(@GetUser() user: RequestUser, @Body() body: TopUpDto) {
    const currency = (body.currency?.toUpperCase() || '') as string;
    if (!isValidCurrency(currency)) {
      throw new BadRequestException(`Invalid currency. Supported: ${CURRENCY_CODES.join(', ')}`);
    }
    let amount: bigint;
    try {
      amount = BigInt(body.amount ?? '0');
    } catch {
      throw new BadRequestException('Invalid amount.');
    }
    return this.ledger.topUp({
      currency,
      amount,
      businessId: user.businessId,
      userId: user.id,
    });
  }

  @Post('convert')
  async convert(@GetUser() user: RequestUser, @Body() body: ConvertDto) {
    const fromCurrency = (body.fromCurrency?.toUpperCase() || '') as string;
    const toCurrency = (body.toCurrency?.toUpperCase() || '') as string;
    if (!isValidCurrency(fromCurrency)) {
      throw new BadRequestException(`Invalid fromCurrency. Supported: ${CURRENCY_CODES.join(', ')}`);
    }
    if (!isValidCurrency(toCurrency)) {
      throw new BadRequestException(`Invalid toCurrency. Supported: ${CURRENCY_CODES.join(', ')}`);
    }
    if (fromCurrency === toCurrency) {
      throw new BadRequestException('Currencies must differ.');
    }
    let fromAmount: bigint;
    try {
      fromAmount = BigInt(body.fromAmount ?? '0');
    } catch {
      throw new BadRequestException('Invalid fromAmount.');
    }
    if (fromAmount <= 0n) {
      throw new BadRequestException('fromAmount must be positive.');
    }

    try {
      const { rate } = await this.fx.getLatestRate(fromCurrency as CurrencyCode, toCurrency as CurrencyCode);
      const rateNum = parseFloat(String(rate));
      if (!Number.isFinite(rateNum) || rateNum <= 0) {
        throw new BadRequestException('Invalid FX rate.');
      }
      const toAmount = BigInt(Math.round(Number(fromAmount) * rateNum));

      return this.ledger.convert({
        businessId: user.businessId,
        userId: user.id,
        fromCurrency: fromCurrency as CurrencyCode,
        toCurrency: toCurrency as CurrencyCode,
        fromAmount,
        toAmount,
      });
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Convert failed', err instanceof Error ? err.stack : String(err));
      throw new InternalServerErrorException('Conversion failed. Please try again or top up your wallet.');
    }
  }
}
