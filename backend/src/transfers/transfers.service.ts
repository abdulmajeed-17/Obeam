import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { RequestUser } from '../auth/get-user.decorator';
import { CurrencyCode, TransferStatus } from '@prisma/client';
import { isValidCurrency, CURRENCY_CODES } from '../shared/currencies';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async create(
    user: RequestUser,
    body: {
      counterpartyId: string;
      fromCurrency: string;
      toCurrency: string;
      fromAmount: string;
      toAmount: string;
      feeAmount?: string;
    },
  ) {
    const fromCurrency = (body.fromCurrency?.toUpperCase() || '') as string;
    const toCurrency = (body.toCurrency?.toUpperCase() || '') as string;
    if (!isValidCurrency(fromCurrency)) {
      throw new BadRequestException(`Invalid fromCurrency. Supported: ${CURRENCY_CODES.join(', ')}`);
    }
    if (!isValidCurrency(toCurrency)) {
      throw new BadRequestException(`Invalid toCurrency. Supported: ${CURRENCY_CODES.join(', ')}`);
    }
    let fromAmount: bigint;
    let toAmount: bigint;
    let feeAmount = 0n;
    try {
      fromAmount = BigInt(body.fromAmount ?? '0');
      toAmount = BigInt(body.toAmount ?? '0');
      if (body.feeAmount != null) feeAmount = BigInt(body.feeAmount);
    } catch {
      throw new BadRequestException('Invalid amount.');
    }
    if (fromAmount <= 0n || toAmount <= 0n) {
      throw new BadRequestException('Amounts must be positive.');
    }

    const counterparty = await this.prisma.counterparty.findFirst({
      where: { id: body.counterpartyId, businessId: user.businessId },
    });
    if (!counterparty) {
      throw new BadRequestException('Counterparty not found or not yours.');
    }

    const transfer = await this.prisma.transfer.create({
      data: {
        businessId: user.businessId,
        counterpartyId: counterparty.id,
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount,
        feeAmount,
        status: 'DRAFT',
        createdBy: user.id,
      },
    });

    return this.toResponse(transfer);
  }

  async confirm(user: RequestUser, transferId: string) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id: transferId },
    });
    if (!transfer) {
      throw new NotFoundException('Transfer not found.');
    }
    if (transfer.businessId !== user.businessId) {
      throw new ForbiddenException('Not your transfer.');
    }
    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT transfers can be confirmed.');
    }

    await this.ledger.reserveForTransfer({
      transferId: transfer.id,
      businessId: user.businessId,
      fromCurrency: transfer.fromCurrency,
      fromAmount: transfer.fromAmount,
      userId: user.id,
    });

    await this.prisma.transfer.update({
      where: { id: transferId },
      data: { status: 'PENDING_FUNDS' },
    });

    const updated = await this.prisma.transfer.findUniqueOrThrow({
      where: { id: transferId },
    });
    return this.toResponse(updated);
  }

  async list(user: RequestUser) {
    const transfers = await this.prisma.transfer.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: 'desc' },
      include: {
        counterparty: { select: { name: true, country: true } },
      },
    });
    return { transfers: transfers.map((t) => this.toResponse(t)) };
  }

  async getById(user: RequestUser, transferId: string) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        counterparty: { select: { id: true, name: true, country: true, payoutType: true, payoutRef: true } },
      },
    });
    if (!transfer) {
      throw new NotFoundException('Transfer not found.');
    }
    if (transfer.businessId !== user.businessId) {
      throw new ForbiddenException('Not your transfer.');
    }
    return this.toResponse(transfer);
  }

  /** Cancel a transfer. DRAFT: just update status. PENDING_FUNDS: reverse reserve then CANCELLED. */
  async cancel(user: RequestUser, transferId: string) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id: transferId },
    });
    if (!transfer) {
      throw new NotFoundException('Transfer not found.');
    }
    if (transfer.businessId !== user.businessId) {
      throw new ForbiddenException('Not your transfer.');
    }
    if (transfer.status !== 'DRAFT' && transfer.status !== 'PENDING_FUNDS') {
      throw new BadRequestException(`Only DRAFT or PENDING_FUNDS transfers can be cancelled. Current: ${transfer.status}.`);
    }

    if (transfer.status === 'PENDING_FUNDS') {
      await this.ledger.reverseReserveForTransfer({
        transferId: transfer.id,
        businessId: transfer.businessId,
        fromCurrency: transfer.fromCurrency as CurrencyCode,
        fromAmount: transfer.fromAmount,
      });
    }

    await this.prisma.transfer.update({
      where: { id: transferId },
      data: { status: 'CANCELLED' },
    });

    const updated = await this.prisma.transfer.findUniqueOrThrow({
      where: { id: transferId },
      include: { counterparty: { select: { name: true, country: true } } },
    });
    return this.toResponse(updated);
  }

  /** Admin: list all transfers, optional status filter. */
  async listAllForAdmin(status?: string) {
    const where = status && status.length > 0 ? { status: status as TransferStatus } : {};
    const transfers = await this.prisma.transfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        counterparty: { select: { name: true, country: true } },
        business: { select: { name: true } },
      },
    });
    return {
      transfers: transfers.map((t) => ({
        ...this.toResponse(t),
        businessName: (t as { business?: { name: string } }).business?.name,
      })),
    };
  }

  /** Admin: set transfer status to PROCESSING (only from PENDING_FUNDS). */
  async markProcessing(transferId: string) {
    const transfer = await this.prisma.transfer.findUnique({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException('Transfer not found.');
    if (transfer.status !== 'PENDING_FUNDS') {
      throw new BadRequestException(`Only PENDING_FUNDS can be marked PROCESSING. Current: ${transfer.status}.`);
    }
    await this.prisma.transfer.update({
      where: { id: transferId },
      data: { status: 'PROCESSING' },
    });
    const updated = await this.prisma.transfer.findUniqueOrThrow({
      where: { id: transferId },
      include: { counterparty: { select: { name: true, country: true } } },
    });
    return this.toResponse(updated);
  }

  /** Admin: set transfer status to FAILED. */
  async markFailed(transferId: string) {
    const transfer = await this.prisma.transfer.findUnique({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException('Transfer not found.');
    if (transfer.status === 'SETTLED' || transfer.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot mark SETTLED or CANCELLED as FAILED.`);
    }
    await this.prisma.transfer.update({
      where: { id: transferId },
      data: { status: 'FAILED' },
    });
    const updated = await this.prisma.transfer.findUniqueOrThrow({
      where: { id: transferId },
      include: { counterparty: { select: { name: true, country: true } } },
    });
    return this.toResponse(updated);
  }

  private toResponse(transfer: {
    id: string;
    businessId: string;
    counterpartyId: string;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: bigint;
    toAmount: bigint;
    feeAmount: bigint;
    status: string;
    fxTradeId: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    counterparty?: { name: string; country: string } | { id: string; name: string; country: string; payoutType: string; payoutRef: string };
  }) {
    return {
      id: transfer.id,
      counterpartyId: transfer.counterpartyId,
      fromCurrency: transfer.fromCurrency,
      toCurrency: transfer.toCurrency,
      fromAmount: transfer.fromAmount.toString(),
      toAmount: transfer.toAmount.toString(),
      feeAmount: transfer.feeAmount.toString(),
      status: transfer.status,
      fxTradeId: transfer.fxTradeId,
      createdBy: transfer.createdBy,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
      ...(transfer.counterparty && { counterparty: transfer.counterparty }),
    };
  }
}
