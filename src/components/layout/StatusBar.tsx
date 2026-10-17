import React from 'react';
import { ShieldCheck, HardDrive, Keyboard } from 'lucide-react';

interface StatusBarProps {
  statusMessage?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ statusMessage = 'Ready' }) => {
  return (
    <footer className="h-6 bg-surface-base border-t border-surface-border px-3 flex items-center justify-between text-[11px] text-surface-muted select-none">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{statusMessage}</span>
        </span>

        <span className="hidden sm:flex items-center gap-1 text-slate-500">
          <HardDrive className="w-3 h-3 text-cyan-400" />
          <span>Local Storage: Ready</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-slate-500">
          <Keyboard className="w-3 h-3" />
          <span>
            <strong className="text-slate-400 font-mono">Ctrl+Enter</strong> Send
          </span>
          <span>•</span>
          <span>
            <strong className="text-slate-400 font-mono">Ctrl+T</strong> Tab
          </span>
        </div>

        <span className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Zero Telemetry</span>
        </span>
      </div>
    </footer>
  );
};
