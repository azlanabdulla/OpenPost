import React, { useEffect, useRef } from 'react';
import { HttpMethod } from '../../types/http';
import { Send, Square, ChevronDown } from 'lucide-react';

interface UrlBarProps {
  method: HttpMethod;
  url: string;
  isLoading: boolean;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onCancel: () => void;
}

const HTTP_METHODS: Array<{ method: HttpMethod; color: string; label: string }> = [
  { method: 'GET', color: 'text-emerald-400 font-bold', label: 'GET' },
  { method: 'POST', color: 'text-amber-400 font-bold', label: 'POST' },
  { method: 'PUT', color: 'text-blue-400 font-bold', label: 'PUT' },
  { method: 'PATCH', color: 'text-purple-400 font-bold', label: 'PATCH' },
  { method: 'DELETE', color: 'text-rose-400 font-bold', label: 'DEL' },
  { method: 'HEAD', color: 'text-slate-400 font-bold', label: 'HEAD' },
  { method: 'OPTIONS', color: 'text-cyan-400 font-bold', label: 'OPT' },
];

export const UrlBar: React.FC<UrlBarProps> = ({
  method,
  url,
  isLoading,
  onMethodChange,
  onUrlChange,
  onSend,
  onCancel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const isUrlEmpty = !url.trim();
  const hasMissingProtocol = !isUrlEmpty && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('{{');
  const hasVariables = /\{\{.+?\}\}/.test(url);

  // Global Ctrl/Cmd + Enter to trigger Send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isLoading) {
          onCancel();
        } else if (!isUrlEmpty) {
          onSend();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, isUrlEmpty, onSend, onCancel]);

  const activeMethodConfig = HTTP_METHODS.find((m) => m.method === method) || HTTP_METHODS[0];

  const handleAutoPrefixHttps = () => {
    onUrlChange(`https://${url.trim()}`);
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-surface-card border-b border-surface-border">
      {/* Method Selector */}
      <div className="relative group">
        <select
          value={method}
          aria-label="HTTP Method"
          onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
          className={`appearance-none bg-surface-panel hover:bg-surface-hover text-xs font-mono font-bold py-2.5 pl-3.5 pr-8 rounded-lg border border-surface-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${activeMethodConfig.color}`}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m.method} value={m.method} className="bg-surface-card text-slate-100 font-mono">
              {m.method}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-surface-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-slate-200 transition-colors" />
      </div>

      {/* URL Input */}
      <div className="flex-1 relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={url}
          aria-label="Request URL"
          placeholder="https://api.example.com/v1/resource or {{baseUrl}}/endpoint"
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !isUrlEmpty) {
              onSend();
            }
          }}
          className={`w-full bg-surface-panel hover:bg-surface-hover/80 focus:bg-surface-panel text-slate-100 font-mono text-sm py-2 px-3.5 rounded-lg border transition-all placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            isUrlEmpty
              ? 'border-surface-border'
              : hasMissingProtocol
              ? 'border-amber-500/50 pr-24'
              : 'border-surface-border'
          }`}
        />

        {/* Missing protocol suggestion pill */}
        {hasMissingProtocol && (
          <button
            type="button"
            onClick={handleAutoPrefixHttps}
            className="absolute right-2 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-mono border border-amber-500/40 transition cursor-pointer"
            title="Click to prepend https://"
          >
            +https://
          </button>
        )}

        {hasVariables && !hasMissingProtocol && (
          <span
            className="absolute right-2 px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-mono border border-cyan-500/30"
            title="Request URL contains variable placeholders"
          >
            {'{var}'}
          </span>
        )}
      </div>

      {/* Action Button: Send or Cancel */}
      {isLoading ? (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel in-flight request"
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all animate-pulse cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400"
          title="Cancel in-flight request"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Cancel</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={isUrlEmpty}
          aria-label="Send Request"
          className={`flex items-center gap-2 px-5 py-2 text-white rounded-lg text-xs font-semibold shadow-md transition-all group focus-visible:ring-2 focus-visible:ring-brand-400 ${
            isUrlEmpty
              ? 'bg-slate-700/60 text-slate-400 cursor-not-allowed opacity-60'
              : 'bg-brand-600 hover:bg-brand-500 active:scale-[0.98] shadow-brand-500/10 cursor-pointer'
          }`}
          title={isUrlEmpty ? 'Please enter a URL to send a request (OP-URL-002)' : 'Send Request (Ctrl + Enter)'}
        >
          <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          <span>Send</span>
          <span className="hidden md:inline-block text-[10px] text-cyan-200/80 bg-brand-700/60 px-1.5 py-0.5 rounded ml-1 font-mono">
            ⌘↵
          </span>
        </button>
      )}
    </div>
  );
};
