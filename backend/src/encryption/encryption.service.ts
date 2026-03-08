import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  private readonly isDevMode: boolean;

  constructor(private readonly config: ConfigService) {
    const keyString = this.config.get<string>('ENCRYPTION_KEY');
    const nodeEnv = this.config.get<string>('NODE_ENV') || 'development';
    this.isDevMode = nodeEnv === 'development';

    if (!keyString) {
      if (this.isDevMode) {
        // Use a default dev key (NOT for production)
        this.logger.warn('ENCRYPTION_KEY not set - using default dev key. DO NOT use in production!');
        this.key = crypto.createHash('sha256').update('obeam-dev-encryption-key-change-in-production').digest();
      } else {
        throw new Error('ENCRYPTION_KEY must be set in production');
      }
    } else {
      this.key = crypto.createHash('sha256').update(keyString).digest();
    }
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted data');
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
