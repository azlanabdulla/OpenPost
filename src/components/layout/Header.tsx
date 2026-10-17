import React from 'react';
import { Sun, Moon, Shield, ExternalLink, Upload, Download, Settings, Info } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
  onOpenSettings?: () => void;
  onOpenAbout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  onToggleTheme,
  onOpenImport,
  onOpenExport,
  onOpenSettings,
  onOpenAbout,
}) => {
  return (
    <header className="h-12 bg-surface-base border-b border-surface-border px-4 flex items-center justify-between select-none">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="OpenPost Logo" className="w-6 h-6 object-contain" />
          <span className="font-bold tracking-tight text-sm text-slate-100 flex items-center gap-1.5">
            OpenPost
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
              v0.1.0
            </span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-surface-muted bg-surface-card/60 px-2.5 py-1 rounded-full border border-surface-border/60">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span>Local-first • No account • Zero telemetry</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5">
        {/* Import Button */}
        <button
          type="button"
          aria-label="Import requests or cURL"
          onClick={onOpenImport}
          className="text-xs text-surface-muted hover:text-slate-200 hover:bg-surface-card px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 border border-surface-border/40"
          title="Import from cURL or Postman"
        >
          <Upload className="w-3.5 h-3.5 text-brand-400" />
          <span className="hidden sm:inline">Import</span>
        </button>

        {/* Export Button */}
        <button
          type="button"
          aria-label="Export requests"
          onClick={onOpenExport}
          className="text-xs text-surface-muted hover:text-slate-200 hover:bg-surface-card px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 border border-surface-border/40"
          title="Export Requests (Exclude secrets)"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          aria-label="Open application settings"
          onClick={onOpenSettings}
          className="p-1.5 text-surface-muted hover:text-slate-200 hover:bg-surface-card rounded-md transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* About Button */}
        <button
          type="button"
          aria-label="About OpenPost"
          onClick={onOpenAbout}
          className="p-1.5 text-surface-muted hover:text-slate-200 hover:bg-surface-card rounded-md transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
          title="About OpenPost"
        >
          <Info className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleTheme}
          className="p-1.5 text-surface-muted hover:text-slate-200 hover:bg-surface-card rounded-md transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* GitHub Link */}
        <a
          href="https://github.com/openpost/openpost"
          target="_blank"
          rel="noreferrer"
          aria-label="OpenPost GitHub repository"
          className="text-xs text-surface-muted hover:text-brand-300 hover:bg-surface-card p-1.5 rounded-md flex items-center gap-1 transition focus-visible:ring-2 focus-visible:ring-brand-500"
          title="OpenPost GitHub Repository"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

    </header>
  );
};
