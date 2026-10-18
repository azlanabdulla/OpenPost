import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CANONICAL_LINKS, ALLOWLISTED_EXTERNAL_URLS, isAllowlistedUrl } from '../src/config/links';

describe('Canonical Links Configuration & URL Allowlist', () => {
  it('exports canonical links with exact expected URLs', () => {
    expect(CANONICAL_LINKS.REPO).toBe('https://github.com/azlanabdulla/OpenPost');
    expect(CANONICAL_LINKS.ISSUES).toBe('https://github.com/azlanabdulla/OpenPost/issues');
    expect(CANONICAL_LINKS.NEW_ISSUE).toBe('https://github.com/azlanabdulla/OpenPost/issues/new');
    expect(CANONICAL_LINKS.RELEASES).toBe('https://github.com/azlanabdulla/OpenPost/releases');
    expect(CANONICAL_LINKS.SPONSORS).toBe('https://github.com/sponsors/azlanabdulla');
    expect(CANONICAL_LINKS.LICENSE).toBe('https://github.com/azlanabdulla/OpenPost/blob/main/LICENSE');
  });

  it('validates canonical URLs in allowlist', () => {
    for (const url of ALLOWLISTED_EXTERNAL_URLS) {
      expect(isAllowlistedUrl(url)).toBe(true);
    }
  });

  it('rejects malicious, look-alike, downgraded, or untrusted URLs', () => {
    const invalidUrls = [
      'https://github.com.evil.com/azlanabdulla/OpenPost',
      'https://github.com/azlanabdulla/OpenPost-fake',
      'https://github.com/azlanabdulla/OtherRepo',
      'https://github.com/openpost/openpost',
      'http://github.com/azlanabdulla/OpenPost', // HTTP downgrade
      'javascript:alert("XSS")',
      'file:///C:/Windows/System32/calc.exe',
      'file:///etc/passwd',
      'https://openpost.app',
      'https://openpost.dev',
      'https://evil-phishing.com',
      '/relative/path',
      '',
      null as unknown as string,
      undefined as unknown as string,
    ];

    for (const badUrl of invalidUrls) {
      expect(isAllowlistedUrl(badUrl)).toBe(false);
    }
  });
});

describe('Repository Link Integrity Scanner', () => {
  const rootDir = path.resolve(__dirname, '..');

  function getFilesRecursively(dir: string, extensions: string[]): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'target' && entry.name !== '.git' && entry.name !== 'dist') {
          results.push(...getFilesRecursively(fullPath, extensions));
        }
      } else if (entry.isFile()) {
        if (extensions.some((ext) => entry.name.endsWith(ext))) {
          results.push(fullPath);
        }
      }
    }
    return results;
  }

  const filesToScan: string[] = [
    ...getFilesRecursively(path.join(rootDir, 'src'), ['.ts', '.tsx', '.js', '.json', '.css']),
    ...getFilesRecursively(path.join(rootDir, 'docs'), ['.md']),
    path.join(rootDir, 'README.md'),
    path.join(rootDir, 'CONTRIBUTING.md'),
    path.join(rootDir, 'SECURITY.md'),
    path.join(rootDir, 'CODE_OF_CONDUCT.md'),
    path.join(rootDir, 'package.json'),
    path.join(rootDir, 'src-tauri', 'Cargo.toml'),
    path.join(rootDir, 'src-tauri', 'tauri.conf.json'),
    path.join(rootDir, 'src-tauri', 'capabilities', 'default.json'),
  ].filter((f) => fs.existsSync(f));

  it('contains zero occurrences of placeholder github.com/openpost or unowned domains', () => {
    const violations: { file: string; line: number; content: string }[] = [];

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lower = line.toLowerCase();
        // 1. Placeholder repo check
        if (lower.includes('github.com/openpost') || lower.includes('openpost/openpost')) {
          violations.push({ file: path.relative(rootDir, file), line: index + 1, content: line.trim() });
        }
        // 2. Unowned domain check (ignore macOS bundle name and reverse-DNS app ID)
        if (
          (lower.includes('http://openpost.app') ||
            lower.includes('https://openpost.app') ||
            lower.includes('@openpost.app') ||
            lower.includes('openpost.dev'))
        ) {
          violations.push({ file: path.relative(rootDir, file), line: index + 1, content: line.trim() });
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('ensures any GitHub link for this project uses the canonical repository URL', () => {
    const githubLinkRegex = /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/g;
    const invalidProjectLinks: { file: string; link: string }[] = [];

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf-8');
      let match: RegExpExecArray | null;

      while ((match = githubLinkRegex.exec(content)) !== null) {
        const [fullUrl, owner, repo] = match;
        const normalizedOwner = owner.toLowerCase();
        const normalizedRepo = repo.toLowerCase();

        // Check if this appears to refer to this project
        if (normalizedRepo === 'openpost' || normalizedOwner === 'openpost') {
          const isCanonical =
            fullUrl.startsWith('https://github.com/azlanabdulla/OpenPost') ||
            fullUrl.startsWith('https://github.com/azlanabdulla/OpenPost.git') ||
            fullUrl.startsWith('https://github.com/sponsors/azlanabdulla');

          if (!isCanonical) {
            invalidProjectLinks.push({ file: path.relative(rootDir, file), link: fullUrl });
          }
        }
      }
    }

    expect(invalidProjectLinks).toEqual([]);
  });
});
