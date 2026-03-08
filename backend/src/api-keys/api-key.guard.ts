import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../prisma.service';

/**
 * Guard that authenticates requests using API keys (X-API-Key header).
 * Falls through to JWT auth if no API key is present.
 * When an API key is valid, attaches a synthetic user object to the request.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeys: ApiKeysService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) return true; // No API key — let other guards handle auth

    const result = await this.apiKeys.validateKey(apiKey);
    if (!result) {
      throw new UnauthorizedException('Invalid API key');
    }

    const business = await this.prisma.business.findUnique({ where: { id: result.businessId } });
    if (!business) {
      throw new UnauthorizedException('Business not found for this API key');
    }

    // Attach a synthetic user object so @GetUser() works
    request.user = {
      id: 'api-key',
      email: `api@${business.name.toLowerCase().replace(/\s+/g, '')}.obeam`,
      businessId: business.id,
      business: { id: business.id, name: business.name, country: business.country, status: business.status },
    };

    return true;
  }
}
