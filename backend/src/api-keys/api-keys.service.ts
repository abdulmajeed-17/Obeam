import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { createHash, randomBytes } from 'crypto';

const KEY_PREFIX = 'ob_live_';
const TEST_PREFIX = 'ob_test_';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new API key for a business.
   * Returns the full key ONCE — we only store the hash.
   */
  async createKey(params: {
    businessId: string;
    label: string;
    isTest?: boolean;
  }): Promise<{ key: string; keyId: string; label: string }> {
    const prefix = params.isTest ? TEST_PREFIX : KEY_PREFIX;
    const rawKey = randomBytes(32).toString('hex');
    const fullKey = `${prefix}${rawKey}`;
    const keyHash = this.hashKey(fullKey);
    const keyPreview = `${prefix}...${rawKey.slice(-6)}`;

    const record = await this.prisma.auditLog.create({
      data: {
        action: 'API_KEY_CREATED',
        entityType: 'API_KEY',
        entityId: keyHash,
        businessId: params.businessId,
        meta: {
          label: params.label,
          keyPreview,
          isTest: params.isTest ?? false,
          createdAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`API key created for business ${params.businessId}: ${keyPreview}`);

    return { key: fullKey, keyId: record.id, label: params.label };
  }

  /**
   * Validate an API key and return the associated business.
   * Used by the ApiKeyGuard.
   */
  async validateKey(apiKey: string): Promise<{ businessId: string; isTest: boolean } | null> {
    if (!apiKey.startsWith(KEY_PREFIX) && !apiKey.startsWith(TEST_PREFIX)) {
      return null;
    }

    const keyHash = this.hashKey(apiKey);
    const isTest = apiKey.startsWith(TEST_PREFIX);

    const record = await this.prisma.auditLog.findFirst({
      where: {
        action: 'API_KEY_CREATED',
        entityType: 'API_KEY',
        entityId: keyHash,
      },
    });

    if (!record || !record.businessId) return null;

    // Check if revoked
    const revoked = await this.prisma.auditLog.findFirst({
      where: {
        action: 'API_KEY_REVOKED',
        entityType: 'API_KEY',
        entityId: keyHash,
      },
    });

    if (revoked) return null;

    return { businessId: record.businessId, isTest };
  }

  /**
   * List all active API keys for a business (only previews, never the full key).
   */
  async listKeys(businessId: string): Promise<{ keyId: string; label: string; keyPreview: string; createdAt: string }[]> {
    const created = await this.prisma.auditLog.findMany({
      where: { action: 'API_KEY_CREATED', entityType: 'API_KEY', businessId },
      orderBy: { createdAt: 'desc' },
    });

    const revokedHashes = new Set(
      (await this.prisma.auditLog.findMany({
        where: { action: 'API_KEY_REVOKED', entityType: 'API_KEY', businessId },
        select: { entityId: true },
      })).map((r) => r.entityId),
    );

    return created
      .filter((k) => !revokedHashes.has(k.entityId))
      .map((k) => {
        const meta = k.meta as { label?: string; keyPreview?: string; createdAt?: string };
        return {
          keyId: k.id,
          label: meta.label ?? '',
          keyPreview: meta.keyPreview ?? '',
          createdAt: meta.createdAt ?? k.createdAt.toISOString(),
        };
      });
  }

  /**
   * Revoke an API key.
   */
  async revokeKey(businessId: string, keyHash: string): Promise<{ revoked: boolean }> {
    const existing = await this.prisma.auditLog.findFirst({
      where: { action: 'API_KEY_CREATED', entityType: 'API_KEY', entityId: keyHash, businessId },
    });

    if (!existing) return { revoked: false };

    await this.prisma.auditLog.create({
      data: {
        action: 'API_KEY_REVOKED',
        entityType: 'API_KEY',
        entityId: keyHash,
        businessId,
        meta: { revokedAt: new Date().toISOString() },
      },
    });

    return { revoked: true };
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
