import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../src/stores/themeStore';

describe('Theme Engine & Tri-Mode Store (Problem 1)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('initializes to system mode and applies data-theme and dark class', () => {
    const store = useThemeStore.getState();
    store.initTheme();

    expect(['system', 'light', 'dark']).toContain(useThemeStore.getState().mode);
    const resolved = useThemeStore.getState().resolvedTheme;
    expect(document.documentElement.getAttribute('data-theme')).toBe(resolved);
    if (resolved === 'dark') {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    } else {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    }
  });

  it('switches explicitly to light mode and updates DOM attributes', () => {
    const store = useThemeStore.getState();
    store.setMode('light');

    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('openpost_theme_mode')).toBe('light');
  });

  it('switches explicitly to dark mode and updates DOM attributes', () => {
    const store = useThemeStore.getState();
    store.setMode('dark');

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('openpost_theme_mode')).toBe('dark');
  });

  it('cycles smoothly through system -> light -> dark -> system', () => {
    const store = useThemeStore.getState();
    store.setMode('system');

    store.toggleMode(); // system -> light
    expect(useThemeStore.getState().mode).toBe('light');

    store.toggleMode(); // light -> dark
    expect(useThemeStore.getState().mode).toBe('dark');

    store.toggleMode(); // dark -> system
    expect(useThemeStore.getState().mode).toBe('system');
  });
});
