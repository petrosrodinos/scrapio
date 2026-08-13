import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

@Injectable()
export class WebhookSecretCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(secret: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt(secretEncrypted: string): string {
    const key = this.getEncryptionKey();
    const [ivBase64, authTagBase64, encryptedBase64] = secretEncrypted.split(':');

    if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
      throw new Error('Invalid encrypted webhook secret format');
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  private getEncryptionKey(): Buffer {
    const secret =
      this.configService.get<string>('INTEGRATION_ENCRYPTION_KEY') ??
      this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('INTEGRATION_ENCRYPTION_KEY or JWT_SECRET is required');
    }

    return createHash('sha256').update(secret).digest();
  }
}
