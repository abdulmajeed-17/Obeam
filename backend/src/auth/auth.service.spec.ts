import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    const dto = { email: 'test@example.com', password: 'securePass123', businessName: 'Test Corp' };

    it('creates user, business, wallets and returns JWT', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcryptMock.hash as jest.Mock).mockResolvedValue('hashed-password');

      const mockBusiness = { id: 'biz-1', name: 'Test Corp', country: 'NG', status: 'PENDING' };
      const mockUser = { id: 'user-1', email: 'test@example.com', businessId: 'biz-1' };

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          business: { create: jest.fn().mockResolvedValue(mockBusiness) },
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          account: { createMany: jest.fn().mockResolvedValue({ count: 7 }) },
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

    it('creates wallets for all 7 supported currencies', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcryptMock.hash as jest.Mock).mockResolvedValue('hashed');

      let createManyData: any[] = [];
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          business: { create: jest.fn().mockResolvedValue({ id: 'biz-1', name: 'X', country: 'NG', status: 'PENDING' }) },
          user: { create: jest.fn().mockResolvedValue({ id: 'user-1', email: dto.email, businessId: 'biz-1' }) },
          account: {
            createMany: jest.fn().mockImplementation(({ data }) => {
              createManyData = data;
              return { count: data.length };
            }),
          },
        };
        return fn(tx);
      });

      await service.signup(dto);

      expect(createManyData).toHaveLength(7);
      const currencies = createManyData.map((d: any) => d.currency);
      expect(currencies).toContain('NGN');
      expect(currencies).toContain('GHS');
      expect(currencies).toContain('KES');
      expect(currencies).toContain('ZAR');
      expect(currencies).toContain('XOF');
      expect(currencies).toContain('USD');
      expect(currencies).toContain('GBP');
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
