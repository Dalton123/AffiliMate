import { randomBytes, createHash } from 'crypto';

export function generateApiKey(): {
  key: string;
  hash: string;
  prefix: string;
} {
  // Generate 32 random bytes (256 bits)
  const bytes = randomBytes(32);
  const key = `am_live_${bytes.toString('base64url')}`;
  const prefix = key.slice(0, 16);
  const hash = createHash('sha256').update(key).digest('hex');

  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
