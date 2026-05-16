import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock env before importing encryption — env.ts validates at module load time
vi.mock('@/lib/env', () => ({
  env: {
    // Valid 64-hex-char test key (32 bytes of 0xAB)
    ENCRYPTION_KEY: 'ab'.repeat(32),
    ENABLE_LIVE_EXCHANGE_FETCH: 'false',
    NODE_ENV: 'test',
    MONGODB_DB_NAME: 'apr-hunter-test',
  },
  isLiveFetchEnabled: false,
}));

// Import AFTER the mock is in place
const { encrypt, decrypt } = await import('@/lib/crypto/encryption');

describe('encrypt / decrypt round-trip', () => {
  it('decrypts back to the original plaintext', () => {
    const plaintext = 'super-secret-api-key-12345';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('handles empty string', () => {
    expect(decrypt(encrypt(''))).toBe('');
  });

  it('handles unicode and special characters', () => {
    const value = 'pàssphräse!@#$%^&*()_+🔑';
    expect(decrypt(encrypt(value))).toBe(value);
  });
});

describe('encrypt()', () => {
  it('produces a colon-separated iv:authTag:ciphertext string', () => {
    const result = encrypt('hello');
    const parts = result.split(':');
    expect(parts).toHaveLength(3);
    // IV: 12 bytes → 24 hex chars; authTag: 16 bytes → 32 hex chars
    expect(parts[0]).toHaveLength(24);
    expect(parts[1]).toHaveLength(32);
  });

  it('produces different ciphertext on each call (random IV)', () => {
    const a = encrypt('same input');
    const b = encrypt('same input');
    expect(a).not.toBe(b);
  });
});

describe('decrypt()', () => {
  it('throws on a malformed ciphertext (wrong number of parts)', () => {
    expect(() => decrypt('notvalid')).toThrow('Invalid ciphertext format');
  });

  it('throws when the auth tag has been tampered with', () => {
    const ciphertext = encrypt('original value');
    const [iv, , data] = ciphertext.split(':');
    const tampered = `${iv}:${'ff'.repeat(16)}:${data}`;
    expect(() => decrypt(tampered)).toThrow();
  });
});
