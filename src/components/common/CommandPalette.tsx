import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Plus,
  X,
  History,
  Upload,
  Download,
  Settings,
  Info,
  Search,
  Command,
  Heart,
} from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import { useRequestStore } from '../../stores/requestStore';

interface CommandItem {
  id: string;
  title: string;
  category: 'Theme' | 'Request' | 'History' | 'General';
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
  onOpenSettings?: () => void;
  onOpenAbout?: () => void;
  onOpenSupport?: () => void;
  onOpenHistory?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenImport,
  onOpenExport,
  onOpenSettings,
  onOpenAbout,
  onOpenSupport,
  onOpenHistory,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { mode, resolvedTheme, setMode, toggleMode } = useThemeStore();
  const { addTab, requestCloseTab, activeTabId } = useRequestStore();

  const commands: CommandItem[] = [
    {
      id: 'theme-toggle',
      title: `Cycle Theme (Currently: ${mode === 'system' ? `System (${resolvedTheme})` : mode})`,
      category: 'Theme',
      icon: mode === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : mode === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Monitor className="w-4 h-4 text-brand-primary" />,
      action: () => {
        toggleMode();
        onClose();
      },
    },
    {
      id: 'theme-system',
      title: 'Set Theme to System Default',
      category: 'Theme',
      icon: <Monitor className="w-4 h-4 text-brand-primary" />,
      action: () => {
        setMode('system');
        onClose();
      },
    },
    {
      id: 'theme-light',
      title: 'Set Theme to Light Mode',
      category: 'Theme',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      action: () => {
        setMode('light');
        onClose();
      },
    },
    {
      id: 'theme-dark',
      title: 'Set Theme to Dark Mode',
      category: 'Theme',
      icon: <Moon className="w-4 h-4 text-indigo-400" />,
      action: () => {
        setMode('dark');
        onClose();
      },
    },
    {
      id: 'request-new',
      title: 'New Request Tab',
      category: 'Request',
      icon: <Plus className="w-4 h-4 text-emerald-500" />,
      shortcut: 'Ctrl+T',
      action: () => {
        addTab();
        onClose();
      },
    },
    {
      id: 'request-close',
      title: 'Close Active Tab',
      category: 'Request',
      icon: <X className="w-4 h-4 text-rose-500" />,
      shortcut: 'Ctrl+W',
      action: () => {
        if (activeTabId) requestCloseTab(activeTabId);
        onClose();
      },
    },
    {
      id: 'history-open',
      title: 'View Request History',
      category: 'History',
      icon: <History className="w-4 h-4 text-cyan-500" />,
      action: () => {
        if (onOpenHistory) onOpenHistory();
        onClose();
      },
    },
    {
      id: 'import-open',
      title: 'Import Requests / cURL',
      category: 'General',
      icon: <Upload className="w-4 h-4 text-brand-primary" />,
      action: () => {
        if (onOpenImport) onOpenImport();
        onClose();
      },
    },
    {
      id: 'export-open',
      title: 'Export Requests (Sanitized)',
      category: 'General',
      icon: <Download className="w-4 h-4 text-cyan-500" />,
      action: () => {
        if (onOpenExport) onOpenExport();
        onClose();
      },
    },
    {
      id: 'settings-open',
      title: 'Open Settings',
      category: 'General',
      icon: <Settings className="w-4 h-4 text-surface-muted" />,
      action: () => {
        if (onOpenSettings) onOpenSettings();
        onClose();
      },
    },
    {
      id: 'about-open',
      title: 'About OpenPost',
      category: 'General',
      icon: <Info className="w-4 h-4 text-surface-muted" />,
      action: () => {
        if (onOpenAbout) onOpenAbout();
        onClose();
      },
    },
    {
      id: 'support-open',
      title: 'Support OpenPost',
      category: 'General',
      icon: <Heart className="w-4 h-4 text-rose-500" />,
      action: () => {
        if (onOpenSupport) onOpenSupport();
        onClose();
      },
    },
  ];

  const filtered = commands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-surface-border bg-surface-base">
          <Search className="w-4 h-4 text-surface-muted mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search (e.g. 'theme', 'new', 'import')..."
            className="w-full py-3.5 bg-transparent text-sm text-surface-text placeholder:text-surface-muted focus:outline-none"
          />
          <kbd className="text-[10px] bg-surface-panel px-1.5 py-0.5 rounded border border-surface-border text-surface-muted font-mono shrink-0">
            Esc
          </kbd>
        </div>

        {/* Command List */}
        <div
          id="command-list"
          ref={listRef}
          role="listbox"
          className="max-h-80 overflow-y-auto p-2 space-y-1 no-scrollbar"
        >
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-surface-muted">
              No matching commands found for "{query}".
            </div>
          ) : (
            filtered.map((cmd, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition cursor-pointer select-none ${
                    isSelected
                      ? 'bg-brand-500 text-white'
                      : 'hover:bg-surface-hover text-surface-text'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isSelected ? 'text-white' : 'text-surface-muted'}>
                      {cmd.icon}
                    </span>
                    <span className="font-medium">{cmd.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-panel text-surface-muted border border-surface-border'
                      }`}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-surface-panel text-surface-muted border border-surface-border'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-surface-base border-t border-surface-border/60 flex items-center justify-between text-[11px] text-surface-muted">
          <span>Navigate with ↑ and ↓, press Enter to execute</span>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" /> Command Palette
          </span>
        </div>
      </div>
    </div>
  );
};
