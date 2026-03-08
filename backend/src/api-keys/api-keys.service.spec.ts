import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../prisma.service';
import { createMockPrisma, MockPrisma } from '../test/prisma.mock';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ApiKeysService>(ApiKeysService);
  });

  describe('createKey', () => {
    it('returns a key with ob_live_ prefix for production keys', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const result = await service.createKey({
        businessId: 'biz-1',
        label: 'Production API Key',
      });

      expect(result.key).toMatch(/^ob_live_[a-f0-9]{64}$/);
      expect(result.label).toBe('Production API Key');
      expect(result.keyId).toBe('audit-1');
    });

    it('returns a key with ob_test_ prefix for test keys', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-2' });

      const result = await service.createKey({
        businessId: 'biz-1',
        label: 'Test Key',
        isTest: true,
      });

      expect(result.key).toMatch(/^ob_test_[a-f0-9]{64}$/);
    });

    it('stores the hash, not the raw key', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-3' });

      const result = await service.createKey({ businessId: 'biz-1', label: 'Key' });

      const createCall = prisma.auditLog.create.mock.calls[0][0];
      // The entityId should be a SHA-256 hash, not the raw key
      expect(createCall.data.entityId).not.toContain('ob_live_');
      expect(createCall.data.entityId).toHaveLength(64); // SHA-256 hex length
    });
  });

  describe('validateKey', () => {
    it('returns null for invalid prefix', async () => {
      const result = await service.validateKey('invalid-key');
      expect(result).toBeNull();
    });

    it('returns businessId for valid key', async () => {
      // First create a key to get its hash
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
      const { key } = await service.createKey({ businessId: 'biz-1', label: 'test' });

      // Set up mock for validation
      prisma.auditLog.findFirst
        .mockResolvedValueOnce({ id: 'audit-1', businessId: 'biz-1', action: 'API_KEY_CREATED' }) // key found
        .mockResolvedValueOnce(null); // not revoked

      const result = await service.validateKey(key);
      expect(result).toEqual({ businessId: 'biz-1', isTest: false });
    });

    it('returns null for revoked key', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
      const { key } = await service.createKey({ businessId: 'biz-1', label: 'test' });

      prisma.auditLog.findFirst
        .mockResolvedValueOnce({ id: 'audit-1', businessId: 'biz-1' }) // key found
        .mockResolvedValueOnce({ id: 'revoke-1' }); // revoked!

      const result = await service.validateKey(key);
      expect(result).toBeNull();
    });

    it('identifies test keys correctly', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
      const { key } = await service.createKey({ businessId: 'biz-1', label: 'test', isTest: true });

      prisma.auditLog.findFirst
        .mockResolvedValueOnce({ id: 'audit-1', businessId: 'biz-1' })
        .mockResolvedValueOnce(null);

      const result = await service.validateKey(key);
      expect(result?.isTest).toBe(true);
    });
  });

  describe('listKeys', () => {
    it('returns active keys only (excludes revoked)', async () => {
      prisma.auditLog.findMany
        .mockResolvedValueOnce([
          { id: 'a1', entityId: 'hash1', meta: { label: 'Key 1', keyPreview: 'ob_live_...abc123', createdAt: '2025-01-01' }, createdAt: new Date() },
          { id: 'a2', entityId: 'hash2', meta: { label: 'Key 2', keyPreview: 'ob_live_...def456', createdAt: '2025-01-02' }, createdAt: new Date() },
        ])
        .mockResolvedValueOnce([
          { entityId: 'hash2' }, // hash2 is revoked
        ]);

      const result = await service.listKeys('biz-1');

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Key 1');
    });
  });

  describe('revokeKey', () => {
    it('revokes an existing key', async () => {
      prisma.auditLog.findFirst.mockResolvedValue({ id: 'a1', businessId: 'biz-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'revoke-1' });

      const result = await service.revokeKey('biz-1', 'some-hash');
      expect(result.revoked).toBe(true);
    });

    it('returns false for non-existent key', async () => {
      prisma.auditLog.findFirst.mockResolvedValue(null);

      const result = await service.revokeKey('biz-1', 'bad-hash');
      expect(result.revoked).toBe(false);
    });
  });
});
