import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SupportModal } from '../src/components/modals/SupportModal';
import { CANONICAL_LINKS } from '../src/config/links';
import { openExternalUrl } from '../src/utils/openLink';

// Mock the Tauri opener plugin
vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
}));

import { openUrl as mockOpenUrl } from '@tauri-apps/plugin-opener';

describe('SupportModal Component', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    windowOpenSpy.mockRestore();
  });

  it('renders the Support modal with canonical actions and does not make any network requests', () => {
    const handleClose = vi.fn();

    render(<SupportModal isOpen={true} onClose={handleClose} />);

    // Check title and key copy
    expect(screen.getByText('Support OpenPost')).toBeDefined();
    expect(screen.getByText('Thank you for using OpenPost!')).toBeDefined();
    expect(screen.getByText(/OpenPost is free and open-source software/i)).toBeDefined();

    // Check sponsor and star buttons
    expect(screen.getByText('Sponsor on GitHub')).toBeDefined();
    expect(screen.getByText(/Star on GitHub/i)).toBeDefined();
    expect(screen.getByText('Maybe later')).toBeDefined();

    // ZERO telemetry guarantee: no fetch calls triggered upon modal open
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('triggers safe openExternalUrl when clicking Sponsor button', async () => {
    const handleClose = vi.fn();
    render(<SupportModal isOpen={true} onClose={handleClose} />);

    const sponsorButton = screen.getByText('Sponsor on GitHub').closest('button');
    expect(sponsorButton).not.toBeNull();

    if (sponsorButton) {
      fireEvent.click(sponsorButton);
    }

    // In non-Tauri browser preview, it calls window.open with the allowlisted URL
    expect(windowOpenSpy).toHaveBeenCalledWith(CANONICAL_LINKS.SPONSORS, '_blank', 'noopener,noreferrer');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('triggers safe openExternalUrl when clicking Star on GitHub button', async () => {
    const handleClose = vi.fn();
    render(<SupportModal isOpen={true} onClose={handleClose} />);

    const starButton = screen.getByText(/Star on GitHub/i).closest('button');
    expect(starButton).not.toBeNull();

    if (starButton) {
      fireEvent.click(starButton);
    }

    expect(windowOpenSpy).toHaveBeenCalledWith(CANONICAL_LINKS.REPO, '_blank', 'noopener,noreferrer');
  });

  it('closes when clicking "Maybe later"', () => {
    const handleClose = vi.fn();
    render(<SupportModal isOpen={true} onClose={handleClose} />);

    const maybeLater = screen.getByText('Maybe later');
    fireEvent.click(maybeLater);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press without network calls', () => {
    const handleClose = vi.fn();
    render(<SupportModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('openExternalUrl Security Guard', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  it('allows exact canonical URLs and opens them via browser window.open in browser preview', async () => {
    const success = await openExternalUrl(CANONICAL_LINKS.REPO);
    expect(success).toBe(true);
    expect(windowOpenSpy).toHaveBeenCalledWith(CANONICAL_LINKS.REPO, '_blank', 'noopener,noreferrer');
  });

  it('strictly rejects look-alikes, domain spoofing, and disallowed schemes', async () => {
    const badTargets = [
      'https://github.com.evil.com/azlanabdulla/OpenPost',
      'https://github.com/azlanabdulla/OpenPost/evil-payload',
      'https://github.com/azlanabdulla/OpenPost-fake',
      'http://github.com/azlanabdulla/OpenPost',
      'javascript:void(0)',
      'file:///C:/secrets.txt',
      'data:text/html,hello',
    ];

    for (const bad of badTargets) {
      const res = await openExternalUrl(bad);
      expect(res).toBe(false);
      expect(windowOpenSpy).not.toHaveBeenCalledWith(bad, expect.anything(), expect.anything());
    }
  });

  it('routes through Tauri plugin-opener when in Tauri environment', async () => {
    // Simulate Tauri environment
    (window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> }).__TAURI_INTERNALS__ = {};

    try {
      const success = await openExternalUrl(CANONICAL_LINKS.SPONSORS);
      expect(success).toBe(true);
      expect(mockOpenUrl).toHaveBeenCalledWith(CANONICAL_LINKS.SPONSORS);
    } finally {
      delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    }
  });
});
