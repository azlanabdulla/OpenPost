import { isAllowlistedUrl } from '../config/links';
import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * Safely opens an external URL in the user's default web browser.
 *
 * Security guarantees:
 * 1. Strict allowlist: only exact canonical URLs defined in src/config/links.ts are allowed.
 *    Any look-alikes, non-https schemes, relative URLs, or unapproved domains are rejected.
 * 2. In Tauri desktop mode: routes through the Tauri 2 opener plugin with scoped capabilities.
 * 3. In browser-preview mode: falls back to window.open with 'noopener,noreferrer'.
 * 4. Zero telemetry: no network requests or tracking calls are made prior to opening the link.
 */
export async function openExternalUrl(rawUrl: string): Promise<boolean> {
  if (!isAllowlistedUrl(rawUrl)) {
    console.warn(`[OpenPost Security] Blocked attempt to open non-allowlisted URL: "${rawUrl}"`);
    return false;
  }

  // Detect whether we are running in the Tauri native desktop context
  const isTauri = typeof window !== 'undefined' && (
    '__TAURI_INTERNALS__' in window ||
    '__TAURI__' in window
  );

  if (isTauri) {
    try {
      await openUrl(rawUrl);
      return true;
    } catch (err) {
      console.error('[OpenPost Opener] Failed to open URL via Tauri opener plugin:', err);
      // Fallback if opener plugin was blocked or failed
      if (typeof window !== 'undefined' && window.open) {
        window.open(rawUrl, '_blank', 'noopener,noreferrer');
        return true;
      }
      return false;
    }
  }

  // Browser-preview fallback
  if (typeof window !== 'undefined' && window.open) {
    window.open(rawUrl, '_blank', 'noopener,noreferrer');
    return true;
  }

  return false;
}
