/**
 * Canonical links for OpenPost.
 * Single source of truth across the application.
 */
export const CANONICAL_LINKS = {
  REPO: 'https://github.com/azlanabdulla/OpenPost',
  ISSUES: 'https://github.com/azlanabdulla/OpenPost/issues',
  NEW_ISSUE: 'https://github.com/azlanabdulla/OpenPost/issues/new',
  RELEASES: 'https://github.com/azlanabdulla/OpenPost/releases',
  SPONSORS: 'https://github.com/sponsors/azlanabdulla',
  LICENSE: 'https://github.com/azlanabdulla/OpenPost/blob/main/LICENSE',
  SECURITY: 'https://github.com/azlanabdulla/OpenPost/security',
} as const;

/**
 * Strict allowlist of URLs permitted to be opened in the external browser.
 * Only exact matches to these canonical URLs are allowed.
 */
export const ALLOWLISTED_EXTERNAL_URLS: readonly string[] = Object.freeze([
  CANONICAL_LINKS.REPO,
  CANONICAL_LINKS.ISSUES,
  CANONICAL_LINKS.NEW_ISSUE,
  CANONICAL_LINKS.RELEASES,
  CANONICAL_LINKS.SPONSORS,
  CANONICAL_LINKS.LICENSE,
  CANONICAL_LINKS.SECURITY,
]);

/**
 * Validates whether a given URL is in the strict external allowlist.
 * Rejects non-https schemes, relative paths, javascript:, file:, and untrusted domains.
 */
export function isAllowlistedUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
      return false;
    }

    // 1. Allow the canonical new issue endpoint with any query parameters (e.g. pre-filled diagnostics)
    if (parsed.pathname === '/azlanabdulla/OpenPost/issues/new') {
      return true;
    }

    // 2. For all other canonical URLs, require exact match (no extra query params, path traversal, or hash)
    const baseCanonical = `${parsed.origin}${parsed.pathname}`;
    if (!ALLOWLISTED_EXTERNAL_URLS.includes(baseCanonical)) {
      return false;
    }

    // Disallow arbitrary query strings or hash on other canonical links
    return !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}
