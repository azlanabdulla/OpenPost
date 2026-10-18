import { describe, it, expect, beforeEach } from 'vitest';
import { keychain } from '../src/utils/keychain';

describe('OS Keychain Service & Fallback (OP-R2-013 / OP-SEC-002)', () => {
  beforeEach(() => {
    keychain.setAvailableForTesting(false);
  });

  it('detects when OS keychain is unavailable and falls back to in-memory session storage', async () => {
    const isAvailable = await keychain.isAvailable();
    expect(isAvailable).toBe(false);

    // Storing a secret works seamlessly in-memory
    const stored = await keychain.storeSecret('auth_token_123', 'super-secret-jwt-value');
    expect(stored).toBe(true);

    // Retrieval returns the stored value
    const retrieved = await keychain.getSecret('auth_token_123');
    expect(retrieved).toBe('super-secret-jwt-value');

    // Deletion removes the secret
    await keychain.deleteSecret('auth_token_123');
    const afterDelete = await keychain.getSecret('auth_token_123');
    expect(afterDelete).toBeNull();
  });

  it('notifies listeners when availability changes', async () => {
    let capturedAvailability: boolean | null = null;
    const unsubscribe = keychain.onAvailabilityChange((available) => {
      capturedAvailability = available;
    });

    keychain.setAvailableForTesting(true);
    expect(capturedAvailability).toBe(true);

    keychain.setAvailableForTesting(false);
    expect(capturedAvailability).toBe(false);

    unsubscribe();
  });
});
