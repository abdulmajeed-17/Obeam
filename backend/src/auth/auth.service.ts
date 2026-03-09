import { Injectable, ConflictException, UnauthorizedException, Logger, Inject, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { InternalTransfersService } from '../internal-transfers/internal-transfers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletsService } from '../wallets/wallets.service';
import { getCurrencyForCountry } from '../shared/currencies';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly wallets: WalletsService,
    @Optional() @Inject(InternalTransfersService) private readonly internalTransfers?: InternalTransfersService,
    @Optional() @Inject(NotificationsService) private readonly notifications?: NotificationsService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const country = (dto.country?.trim() || 'NG').toUpperCase();

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

      return { user, business };
    });

    // Create default wallet for the selected country's currency
    const defaultCurrency = getCurrencyForCountry(country);
    if (defaultCurrency) {
      await this.wallets.ensureWallet(result.business.id, defaultCurrency);
    }

    const accessToken = this.jwt.sign({
      sub: result.user.id,
      email: result.user.email,
      businessId: result.business.id,
    });

    let claimedFunds: { currency: string; amount: number; from: string }[] = [];
    if (this.internalTransfers) {
      try {
        claimedFunds = await this.internalTransfers.claimPending(dto.email, result.business.id);
        if (claimedFunds.length > 0) {
          this.logger.log(`New signup ${dto.email} claimed ${claimedFunds.length} pending transfer(s)`);
        }
      } catch (err) {
        this.logger.error(`Failed to claim pending transfers for ${dto.email}`, err);
      }
    }

    if (this.notifications) {
      this.notifications.sendWelcomeEmail({ to: dto.email, businessName: result.business.name }).catch((err) => {
        this.logger.warn(`Failed to send welcome email to ${dto.email}`);
      });
    }

    return {
      access_token: accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        businessId: result.business.id,
        businessName: result.business.name,
      },
      claimedFunds: claimedFunds.length > 0 ? claimedFunds : undefined,
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
