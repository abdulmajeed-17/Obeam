import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = request.headers['x-admin-secret'];
    const expected = this.config.get<string>('ADMIN_SECRET');
    if (!expected || expected.length === 0) {
      throw new UnauthorizedException('Admin not configured (ADMIN_SECRET missing).');
    }
    if (secret !== expected) {
      throw new UnauthorizedException('Invalid admin secret.');
    }
    return true;
  }
}
