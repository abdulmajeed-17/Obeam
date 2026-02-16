import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { CurrencyCode, AccountType } from '@prisma/client';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: dto.businessName,
          country: 'NG',
          status: 'PENDING',
        },
      });

      const user = await tx.user.create({
        data: {
          businessId: business.id,
          email: dto.email,
          passwordHash,
          role: 'OWNER',
        },
      });

      await tx.account.createMany({
        data: [
          {
            businessId: business.id,
            currency: CurrencyCode.NGN,
            type: AccountType.CUSTOMER_WALLET,
            label: 'Wallet NGN',
            isPlatform: false,
          },
          {
            businessId: business.id,
            currency: CurrencyCode.GHS,
            type: AccountType.CUSTOMER_WALLET,
            label: 'Wallet GHS',
            isPlatform: false,
          },
        ],
      });

      return { user, business };
    });

    const accessToken = this.jwt.sign({
      sub: result.user.id,
      email: result.user.email,
      businessId: result.business.id,
    });

    return {
      access_token: accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        businessId: result.business.id,
        businessName: result.business.name,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { business: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      businessId: user.businessId,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        businessId: user.businessId,
        businessName: user.business.name,
      },
    };
  }
}
