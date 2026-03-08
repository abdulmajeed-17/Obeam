import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RequestUser } from '../auth/get-user.decorator';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { isValidCurrency, CURRENCY_CODES } from '../shared/currencies';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: RequestUser,
    body: {
      counterpartyId: string;
      currency: string;
      amount: string;
      description?: string;
      dueDate?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const currency = (body.currency?.toUpperCase() || '') as string;
    if (!isValidCurrency(currency)) {
      throw new BadRequestException(
        `Invalid currency. Supported: ${CURRENCY_CODES.join(', ')}`,
      );
    }

    let amount: bigint;
    try {
      amount = BigInt(body.amount ?? '0');
    } catch {
      throw new BadRequestException('Invalid amount.');
    }
    if (amount <= 0n) {
      throw new BadRequestException('Amount must be positive.');
    }

    const counterparty = await this.prisma.counterparty.findFirst({
      where: { id: body.counterpartyId, businessId: user.businessId },
    });
    if (!counterparty) {
      throw new BadRequestException('Counterparty not found or not yours.');
    }

    const invoiceNumber = this.generateInvoiceNumber();

    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (dueDate && isNaN(dueDate.getTime())) {
      throw new BadRequestException('Invalid dueDate format.');
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        businessId: user.businessId,
        counterpartyId: counterparty.id,
        invoiceNumber,
        currency,
        amount,
        description: body.description ?? null,
        dueDate,
        status: 'DRAFT',
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
      },
      include: {
        counterparty: { select: { id: true, name: true, country: true } },
      },
    });

    return this.toResponse(invoice);
  }

  async list(user: RequestUser) {
    const invoices = await this.prisma.invoice.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: 'desc' },
      include: {
        counterparty: { select: { name: true, country: true } },
      },
    });
    return { invoices: invoices.map((inv) => this.toResponse(inv)) };
  }

  async getById(user: RequestUser, id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        counterparty: {
          select: { id: true, name: true, country: true, payoutType: true, payoutRef: true },
        },
      },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    if (invoice.businessId !== user.businessId) {
      throw new ForbiddenException('Not your invoice.');
    }
    return this.toResponse(invoice);
  }

  async send(user: RequestUser, id: string) {
    const invoice = await this.findOwnedInvoice(user, id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(
        `Only DRAFT invoices can be sent. Current: ${invoice.status}.`,
      );
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' },
      include: {
        counterparty: { select: { name: true, country: true } },
      },
    });
    return this.toResponse(updated);
  }

  async markPaid(user: RequestUser, id: string, transferId?: string) {
    const invoice = await this.findOwnedInvoice(user, id);

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid.');
    }
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cannot pay a cancelled invoice.');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        ...(transferId ? { transferId } : {}),
      },
      include: {
        counterparty: { select: { name: true, country: true } },
      },
    });
    return this.toResponse(updated);
  }

  async cancel(user: RequestUser, id: string) {
    const invoice = await this.findOwnedInvoice(user, id);

    if (invoice.status !== 'DRAFT' && invoice.status !== 'SENT') {
      throw new BadRequestException(
        `Only DRAFT or SENT invoices can be cancelled. Current: ${invoice.status}.`,
      );
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        counterparty: { select: { name: true, country: true } },
      },
    });
    return this.toResponse(updated);
  }

  async getPublicInvoice(invoiceNumber: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        business: { select: { name: true, country: true } },
        counterparty: { select: { name: true, country: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    return {
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      amount: invoice.amount.toString(),
      description: invoice.description,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      business: invoice.business,
      counterparty: invoice.counterparty,
    };
  }

  private async findOwnedInvoice(user: RequestUser, id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    if (invoice.businessId !== user.businessId) {
      throw new ForbiddenException('Not your invoice.');
    }
    return invoice;
  }

  private generateInvoiceNumber(): string {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${date}-${rand}`;
  }

  private toResponse(invoice: {
    id: string;
    businessId: string;
    counterpartyId: string;
    invoiceNumber: string;
    currency: string;
    amount: bigint;
    description: string | null;
    dueDate: Date | null;
    status: InvoiceStatus;
    paidAt: Date | null;
    transferId: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    counterparty?: Record<string, unknown>;
    business?: Record<string, unknown>;
  }) {
    return {
      id: invoice.id,
      businessId: invoice.businessId,
      counterpartyId: invoice.counterpartyId,
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      amount: invoice.amount.toString(),
      description: invoice.description,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paidAt: invoice.paidAt,
      transferId: invoice.transferId,
      metadata: invoice.metadata,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      ...(invoice.counterparty && { counterparty: invoice.counterparty }),
      ...(invoice.business && { business: invoice.business }),
    };
  }
}
