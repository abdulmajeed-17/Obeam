import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RequestUser } from '../auth/get-user.decorator';
import { UpdateBusinessMeDto } from './dto/update-business-me.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: RequestUser) {
    const business = await this.prisma.business.findUnique({
      where: { id: user.businessId },
      select: {
        id: true,
        name: true,
        country: true,
        status: true,
        createdAt: true,
      },
    });
    if (!business) {
      throw new ForbiddenException('Business not found');
    }
    return business;
  }

  async updateMe(user: RequestUser, dto: UpdateBusinessMeDto) {
    await this.ensureOwnership(user.businessId);
    const business = await this.prisma.business.update({
      where: { id: user.businessId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.country !== undefined && { country: dto.country }),
      },
      select: {
        id: true,
        name: true,
        country: true,
        status: true,
        createdAt: true,
      },
    });
    return business;
  }

  private async ensureOwnership(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      throw new ForbiddenException('Business not found');
    }
  }
}
