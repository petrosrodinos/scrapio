import { createHash, randomBytes } from 'crypto';

export const API_KEY_PREFIX = 'spio_';
export const API_KEY_PREFIX_DISPLAY_LENGTH = 12;

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
}

export function hashApiKeyToken(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function isApiKeyFormat(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}
