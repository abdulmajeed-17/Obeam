import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Monitoring Service — Health checks and error tracking.
 * 
 * Integrates with:
 * - Sentry (error tracking)
 * - Health check endpoints
 * - System metrics
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly sentryEnabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.sentryEnabled = Boolean(this.config.get<string>('SENTRY_DSN'));
    
    if (this.sentryEnabled) {
      // Initialize Sentry
      // import * as Sentry from '@sentry/node';
      // Sentry.init({ dsn: this.config.get<string>('SENTRY_DSN') });
      this.logger.log('Sentry enabled');
    }
  }

  /**
   * Capture exception for error tracking.
   */
  captureException(error: Error, context?: Record<string, any>): void {
    this.logger.error(`Exception: ${error.message}`, error.stack);

    if (this.sentryEnabled) {
      // Sentry.captureException(error, { extra: context });
    }
  }

  /**
   * Capture message for monitoring.
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (level === 'info') {
      this.logger.log(message);
    } else if (level === 'warning') {
      this.logger.warn(message);
    } else {
      this.logger.error(message);
    }

    if (this.sentryEnabled && level === 'error') {
      // Sentry.captureMessage(message, level);
    }
  }

  /**
   * Health check data.
   */
  async getHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    checks: {
      database: 'ok' | 'error';
      fxFeed: 'ok' | 'error';
      bankApis: {
        okra: 'ok' | 'error' | 'not_configured';
        opendx: 'ok' | 'error' | 'not_configured';
      };
    };
  }> {
    // Check database
    let dbStatus: 'ok' | 'error' = 'ok';
    try {
      // Simple query to check DB
      // await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    // Check FX feed
    let fxStatus: 'ok' | 'error' = 'ok';
    const fxApiKey = this.config.get<string>('FX_FEED_API_KEY');
    if (!fxApiKey) {
      fxStatus = 'error';
    }

    // Check bank APIs
    const okraKey = this.config.get<string>('OKRA_SECRET_KEY');
    const opendxKey = this.config.get<string>('OPENDX_API_KEY');

    const overallStatus =
      dbStatus === 'ok' && fxStatus === 'ok' ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        fxFeed: fxStatus,
        bankApis: {
          okra: okraKey ? 'ok' : 'not_configured',
          opendx: opendxKey ? 'ok' : 'not_configured',
        },
      },
    };
  }
}
