import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Audit Service — Comprehensive logging for all transactions and admin actions.
 * 
 * Logs:
 * - Transfer creation, confirmation, settlement, cancellation
 * - Admin actions (mark processing, mark settled, mark failed)
 * - User actions (login, signup, password changes)
 * - System events (FX rate updates, settlement processing)
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event.
   */
  async log(params: {
    actorUserId?: string;
    businessId?: string;
    action: string;
    entityType: string;
    entityId: string;
    meta?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          businessId: params.businessId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          meta: params.meta || {},
        },
      });
      this.logger.debug(`Audit log: ${params.action} on ${params.entityType}:${params.entityId}`);
    } catch (error) {
      // Don't throw - audit logging should never break the main flow
      this.logger.error(`Failed to create audit log: ${error}`);
    }
  }

  /**
   * Log transfer events.
   */
  async logTransfer(params: {
    actorUserId?: string;
    businessId: string;
    transferId: string;
    action: 'CREATED' | 'CONFIRMED' | 'SETTLED' | 'CANCELLED' | 'FAILED' | 'MARKED_PROCESSING';
    meta?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      actorUserId: params.actorUserId,
      businessId: params.businessId,
      action: `TRANSFER_${params.action}`,
      entityType: 'TRANSFER',
      entityId: params.transferId,
      meta: params.meta,
    });
  }

  /**
   * Log admin actions.
   */
  async logAdminAction(params: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    meta?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      actorUserId: params.actorUserId,
      action: `ADMIN_${params.action}`,
      entityType: params.entityType,
      entityId: params.entityId,
      meta: params.meta,
    });
  }

  /**
   * Log user authentication events.
   */
  async logAuth(params: {
    userId?: string;
    businessId?: string;
    action: 'LOGIN' | 'LOGOUT' | 'SIGNUP' | 'PASSWORD_CHANGE';
    meta?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      actorUserId: params.userId,
      businessId: params.businessId,
      action: `AUTH_${params.action}`,
      entityType: 'USER',
      entityId: params.userId || 'unknown',
      meta: params.meta,
    });
  }

  /**
   * Log system events (FX updates, settlement processing, etc.).
   */
  async logSystemEvent(params: {
    action: string;
    entityType: string;
    entityId: string;
    meta?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      action: `SYSTEM_${params.action}`,
      entityType: params.entityType,
      entityId: params.entityId,
      meta: params.meta,
    });
  }

  /**
   * Get audit logs for a business (for compliance/reporting).
   */
  async getBusinessLogs(businessId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actorUser: {
          select: { id: true, email: true },
        },
      },
    });
  }

  /**
   * Get audit logs for a specific entity.
   */
  async getEntityLogs(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: {
          select: { id: true, email: true },
        },
      },
    });
  }
}
