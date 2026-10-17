import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  initTheme: () => void;
}

const STORAGE_KEY = 'openpost_theme_mode';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolvedTheme: 'dark',

  initTheme: () => {
    let savedMode: ThemeMode = 'system';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        savedMode = stored;
      }
    } catch {
      // localStorage may fail in restricted sandboxes
    }

    const resolved = savedMode === 'system' ? getSystemTheme() : savedMode;
    applyThemeToDOM(resolved);
    set({ mode: savedMode, resolvedTheme: resolved });

    // Listen for live system theme changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (get().mode === 'system') {
          const newResolved = e.matches ? 'dark' : 'light';
          applyThemeToDOM(newResolved);
          set({ resolvedTheme: newResolved });
        }
      };
      mediaQuery.addEventListener('change', listener);
    }
  },

  setMode: (newMode: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // Ignore storage errors
    }

    const resolved = newMode === 'system' ? getSystemTheme() : newMode;
    applyThemeToDOM(resolved);
    set({ mode: newMode, resolvedTheme: resolved });
  },

  toggleMode: () => {
    const current = get().mode;
    const next: ThemeMode = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
    get().setMode(next);
  },
}));
