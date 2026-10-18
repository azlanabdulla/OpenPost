/**
 * OS Keychain & Secure Storage Service (OP-R2-013 / OP-SEC-002)
 *
 * Provides OS-level secure credential storage with seamless in-memory session fallback.
 * If the OS keychain daemon is unavailable, restricted, or denied, secrets are kept
 * exclusively in-memory for the active session and never written in plaintext to disk.
 */

class KeychainService {
  private inMemorySecrets: Map<string, string> = new Map();
  private keychainAvailable: boolean | null = null;
  private onAvailabilityChangeListeners: Set<(available: boolean) => void> = new Set();

  /**
   * Check if OS keychain is operational.
   */
  async isAvailable(): Promise<boolean> {
    if (this.keychainAvailable !== null) {
      return this.keychainAvailable;
    }

    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<boolean>('is_keychain_available');
        this.keychainAvailable = Boolean(res);
      } catch {
        // Keychain command failed or denied
        this.keychainAvailable = false;
      }
    } else {
      // Browser / mock environment has no OS keychain
      this.keychainAvailable = false;
    }

    this.notifyListeners(this.keychainAvailable);
    return this.keychainAvailable;
  }

  /**
   * Force set availability (useful for testing or fallback simulation).
   */
  setAvailableForTesting(available: boolean) {
    this.keychainAvailable = available;
    this.notifyListeners(available);
  }

  /**
   * Store a secret key-value pair.
   */
  async storeSecret(key: string, secret: string): Promise<boolean> {
    const available = await this.isAvailable();
    if (available && typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('store_keychain_secret', { key, secret });
        return true;
      } catch (err) {
        console.warn('OS keychain write failed, falling back to in-memory session store:', err);
        this.keychainAvailable = false;
        this.notifyListeners(false);
      }
    }

    // In-memory fallback
    this.inMemorySecrets.set(key, secret);
    return true;
  }

  /**
   * Retrieve a secret by key.
   */
  async getSecret(key: string): Promise<string | null> {
    const available = await this.isAvailable();
    if (available && typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const val = await invoke<string | null>('get_keychain_secret', { key });
        if (val) return val;
      } catch {
        // Fall back to memory
      }
    }

    return this.inMemorySecrets.get(key) || null;
  }

  /**
   * Delete a secret.
   */
  async deleteSecret(key: string): Promise<boolean> {
    this.inMemorySecrets.delete(key);
    if (await this.isAvailable()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_keychain_secret', { key });
      } catch {}
    }
    return true;
  }

  /**
   * Subscribe to availability updates.
   */
  onAvailabilityChange(listener: (available: boolean) => void): () => void {
    this.onAvailabilityChangeListeners.add(listener);
    if (this.keychainAvailable !== null) {
      listener(this.keychainAvailable);
    }
    return () => {
      this.onAvailabilityChangeListeners.delete(listener);
    };
  }

  private notifyListeners(available: boolean) {
    for (const listener of this.onAvailabilityChangeListeners) {
      listener(available);
    }
  }
}

export const keychain = new KeychainService();
