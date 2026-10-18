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
    if (parsed.protocol !== 'https:') {
      return false;
    }
    // Must strictly match one of the canonical URLs without extra params or path traversal
    return ALLOWLISTED_EXTERNAL_URLS.includes(parsed.href);
  } catch {
    return false;
  }
}
