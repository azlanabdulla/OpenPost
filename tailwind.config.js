/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f3ff',
          100: '#e0e6ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: 'var(--color-brand-primary)',
          600: 'var(--color-brand-hover)',
          primary: 'var(--color-brand-primary)',
          subtle: 'var(--color-brand-subtle)',
        },
        surface: {
          base: 'var(--color-surface-base)',
          card: 'var(--color-surface-card)',
          panel: 'var(--color-surface-panel)',
          border: 'var(--color-surface-border)',
          hover: 'var(--color-surface-hover)',
          muted: 'var(--color-surface-muted)',
          text: 'var(--color-text-main)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-muted': 'var(--color-text-muted)',
        },
        method: {
          get: 'var(--color-method-get)',
          post: 'var(--color-method-post)',
          put: 'var(--color-method-put)',
          patch: 'var(--color-method-patch)',
          delete: 'var(--color-method-delete)',
          head: 'var(--color-method-head)',
          options: 'var(--color-method-options)',
        }
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
