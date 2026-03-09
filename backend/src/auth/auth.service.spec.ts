import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { createMockPrisma, MockPrisma } from '../test/prisma.mock';

jest.mock('bcrypt');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    jwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: WalletsService, useValue: { ensureWallet: jest.fn().mockResolvedValue({ id: 'wallet-1' }) } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    const dto = { email: 'test@example.com', password: 'securePass123', businessName: 'Test Corp', country: 'NG' };

    it('creates user and business with default wallet for country and returns JWT', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcryptMock.hash as jest.Mock).mockResolvedValue('hashed-password');

      const mockBusiness = { id: 'biz-1', name: 'Test Corp', country: 'NG', status: 'PENDING' };
      const mockUser = { id: 'user-1', email: 'test@example.com', businessId: 'biz-1' };

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          business: { create: jest.fn().mockResolvedValue(mockBusiness) },
          user: { create: jest.fn().mockResolvedValue(mockUser) },
        };
        return fn(tx);
      });

      const result = await service.signup(dto);

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.businessName).toBe('Test Corp');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', email: 'test@example.com', businessId: 'biz-1' }),
      );
    });

    it('throws ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: dto.email });
      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });

    it('creates default wallet for country when no country provided (defaults to NG)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcryptMock.hash as jest.Mock).mockResolvedValue('hashed-password');

      const mockBusiness = { id: 'biz-1', name: 'Test Corp', country: 'NG', status: 'PENDING' };
      const mockUser = { id: 'user-1', email: 'test@example.com', businessId: 'biz-1' };

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          business: { create: jest.fn().mockResolvedValue(mockBusiness) },
          user: { create: jest.fn().mockResolvedValue(mockUser) },
        };
        return fn(tx);
      });

      const walletsService = { ensureWallet: jest.fn().mockResolvedValue({ id: 'wallet-1' }) };
      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: jwtService },
          { provide: WalletsService, useValue: walletsService },
        ],
      }).compile();
      const service = module.get<AuthService>(AuthService);

      await service.signup({ ...dto, country: undefined });

      expect(walletsService.ensureWallet).toHaveBeenCalledWith('biz-1', 'NGN');
    });
  });

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'securePass123' };

    it('returns JWT for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        passwordHash: 'hashed',
        businessId: 'biz-1',
        business: { id: 'biz-1', name: 'Test Corp' },
      });
      (bcryptMock.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe(dto.email);
    });

    it('throws UnauthorizedException for non-existent email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1', email: dto.email, passwordHash: 'hashed',
        businessId: 'biz-1', business: { name: 'Test' },
      });
      (bcryptMock.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
