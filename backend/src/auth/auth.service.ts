import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { AccountType, CurrencyCode } from '@prisma/client';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { getCurrencyMeta } from '../shared/currencies';

const SALT_ROUNDS = 10;

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR',
  SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF',
  US: 'USD', GB: 'GBP',
};

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
    const country = dto.country ?? 'NG';
    const homeCurrency = COUNTRY_TO_CURRENCY[country] ?? 'NGN';

    const result = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: dto.businessName,
          country,
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

      await tx.account.create({
        data: {
          businessId: business.id,
          currency: homeCurrency,
          type: AccountType.CUSTOMER_WALLET,
          label: `Wallet ${getCurrencyMeta(homeCurrency).name}`,
          isPlatform: false,
        },
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
