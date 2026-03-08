import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RequestUser } from '../auth/get-user.decorator';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';

@Injectable()
export class CounterpartiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: RequestUser, dto: CreateCounterpartyDto) {
    const name = (dto.name ?? '').trim();
    const country = (dto.country ?? '').trim().toUpperCase() || 'GH';
    const payoutType = (dto.payoutType ?? '').trim() || 'BANK';
    const payoutRef = (dto.payoutRef ?? '').trim();
    if (!name || !payoutRef) {
      throw new BadRequestException('name and payoutRef are required');
    }
    const counterparty = await this.prisma.counterparty.create({
      data: {
        businessId: user.businessId,
        name,
        country,
        payoutType,
        payoutRef,
      },
    });
    return this.toResponse(counterparty);
  }

  async list(user: RequestUser) {
    const list = await this.prisma.counterparty.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: 'desc' },
    });
    return { counterparties: list.map((c) => this.toResponse(c)) };
  }

  async getById(user: RequestUser, id: string) {
    const c = await this.prisma.counterparty.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!c) throw new NotFoundException('Counterparty not found.');
    return this.toResponse(c);
  }

  private toResponse(c: { id: string; name: string; country: string; payoutType: string; payoutRef: string; createdAt: Date }) {
    return {
      id: c.id,
      name: c.name,
      country: c.country,
      payoutType: c.payoutType,
      payoutRef: c.payoutRef,
      createdAt: c.createdAt,
    };
  }
}
