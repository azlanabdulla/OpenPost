import React from 'react';
import { Sun, Moon, Monitor, Shield, ExternalLink, Upload, Download, Settings, Info, Command, Heart } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import { CANONICAL_LINKS } from '../../config/links';
import { openExternalUrl } from '../../utils/openLink';

interface HeaderProps {
  onOpenImport?: () => void;
  onOpenExport?: () => void;
  onOpenSettings?: () => void;
  onOpenAbout?: () => void;
  onOpenSupport?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenImport,
  onOpenExport,
  onOpenSettings,
  onOpenAbout,
  onOpenSupport,
  onOpenCommandPalette,
}) => {
  const { mode, resolvedTheme, toggleMode } = useThemeStore();

  const getThemeInfo = () => {
    switch (mode) {
      case 'system':
        return {
          icon: <Monitor className="w-4 h-4 text-brand-primary" />,
          label: `Theme: System (${resolvedTheme}) — Click to switch to Light`,
          nextMode: 'light',
        };
      case 'light':
        return {
          icon: <Sun className="w-4 h-4 text-amber-500" />,
          label: 'Theme: Light — Click to switch to Dark',
          nextMode: 'dark',
        };
      case 'dark':
        return {
          icon: <Moon className="w-4 h-4 text-indigo-300" />,
          label: 'Theme: Dark — Click to switch to System',
          nextMode: 'system',
        };
    }
  };

  const themeInfo = getThemeInfo();

  return (
    <header className="h-12 bg-surface-base border-b border-surface-border px-4 flex items-center justify-between select-none">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="OpenPost Logo" className="w-6 h-6 object-contain" />
          <span className="font-bold tracking-tight text-sm text-surface-text flex items-center gap-1.5">
            OpenPost
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 border border-brand-500/20">
              v0.1.0
            </span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-surface-muted bg-surface-card px-2.5 py-1 rounded-full border border-surface-border/60">
          <Shield className="w-3 h-3 text-emerald-500" />
          <span>Local-first • No account • Zero telemetry</span>
        </div>
      </div>

      {/* Center Command Palette shortcut button */}
      <div className="hidden lg:flex items-center">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1 text-xs text-surface-muted bg-surface-card hover:bg-surface-hover hover:text-surface-text rounded-md border border-surface-border/60 transition cursor-pointer"
          title="Open Command Palette (Ctrl+K or Cmd+K)"
          aria-label="Open Command Palette"
        >
          <Command className="w-3.5 h-3.5" />
          <span>Quick actions & commands</span>
          <kbd className="text-[10px] bg-surface-panel px-1.5 py-0.5 rounded border border-surface-border text-surface-muted font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5">
        {/* Import Button */}
        <button
          type="button"
          aria-label="Import requests or cURL"
          onClick={onOpenImport}
          className="text-xs text-surface-muted hover:text-surface-text hover:bg-surface-card px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 border border-surface-border/40"
          title="Import from cURL or Postman"
        >
          <Upload className="w-3.5 h-3.5 text-brand-500" />
          <span className="hidden sm:inline">Import</span>
        </button>

        {/* Export Button */}
        <button
          type="button"
          aria-label="Export requests"
          onClick={onOpenExport}
          className="text-xs text-surface-muted hover:text-surface-text hover:bg-surface-card px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 border border-surface-border/40"
          title="Export Requests (Exclude secrets)"
        >
          <Download className="w-3.5 h-3.5 text-cyan-500" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          aria-label="Open application settings"
          onClick={onOpenSettings}
          className="p-1.5 text-surface-muted hover:text-surface-text hover:bg-surface-card rounded-md transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Support OpenPost Button */}
        <button
          type="button"
          aria-label="Support OpenPost"
          onClick={onOpenSupport}
          className="p-1.5 text-surface-muted hover:text-rose-500 hover:bg-surface-card rounded-md transition cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
          title="Support OpenPost"
        >
          <Heart className="w-4 h-4" />
        </button>

        {/* About Button */}
        <button
          type="button"
          aria-label="About OpenPost"
          onClick={onOpenAbout}
          className="p-1.5 text-surface-muted hover:text-surface-text hover:bg-surface-card rounded-md transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
          title="About OpenPost"
        >
          <Info className="w-4 h-4" />
        </button>

        {/* Theme Toggle Button (Supports System / Light / Dark) */}
        <button
          type="button"
          aria-label={themeInfo.label}
          title={themeInfo.label}
          onClick={toggleMode}
          className="p-1.5 text-surface-muted hover:text-surface-text hover:bg-surface-card rounded-md transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 relative group"
        >
          {themeInfo.icon}
          {/* Visual indicator for current active mode */}
          <span className="sr-only">{themeInfo.label}</span>
        </button>

        {/* GitHub Link */}
        <a
          href={CANONICAL_LINKS.REPO}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.preventDefault();
            openExternalUrl(CANONICAL_LINKS.REPO);
          }}
          aria-label="OpenPost GitHub repository"
          className="text-xs text-surface-muted hover:text-brand-500 hover:bg-surface-card p-1.5 rounded-md flex items-center gap-1 transition focus-visible:ring-2 focus-visible:ring-brand-500"
          title="OpenPost GitHub Repository"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </header>
  );
};
