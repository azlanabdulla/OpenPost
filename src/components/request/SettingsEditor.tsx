import React from 'react';
import { RequestSettings } from '../../types/http';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface SettingsEditorProps {
  settings?: Partial<RequestSettings>;
  onChange: (settings: Partial<RequestSettings>) => void;
}

export const SettingsEditor: React.FC<SettingsEditorProps> = ({ settings = {}, onChange }) => {
  const timeoutMs = settings.timeoutMs ?? 30000;
  const verifySsl = settings.verifySsl ?? true;
  const followRedirects = settings.followRedirects ?? true;

  return (
    <div className="flex flex-col h-full p-4 max-w-xl space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
          Request Configuration
        </h4>
        <p className="text-[11px] text-surface-muted">
          Per-request network, SSL, and timeout controls
        </p>
      </div>

      {/* Timeout */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-300">
          Request Timeout (milliseconds)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={100}
            step={500}
            max={300000}
            value={timeoutMs}
            onChange={(e) => onChange({ timeoutMs: Number(e.target.value) || 30000 })}
            className="w-48 bg-surface-panel text-slate-200 font-mono text-xs py-2 px-3 rounded-lg border border-surface-border focus:border-brand-500 focus:outline-none"
          />
          <span className="text-xs text-surface-muted">({(timeoutMs / 1000).toFixed(1)}s)</span>
        </div>
      </div>

      {/* SSL Verification */}
      <div className="pt-2 border-t border-surface-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {verifySsl ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <div>
              <span className="text-xs font-medium text-slate-200">SSL Certificate Verification</span>
              <p className="text-[11px] text-surface-muted">
                Validate SSL/TLS certificates when executing HTTPS requests
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ verifySsl: !verifySsl })}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              verifySsl ? 'bg-brand-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                verifySsl ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {!verifySsl && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>
              <strong>Warning:</strong> SSL certificate verification is disabled for this request. Insecure certificates will be accepted.
            </span>
          </div>
        )}
      </div>

      {/* Follow Redirects */}
      <div className="pt-2 border-t border-surface-border flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-slate-200">Follow HTTP Redirects</span>
          <p className="text-[11px] text-surface-muted">
            Automatically follow 3xx redirect responses
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ followRedirects: !followRedirects })}
          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
            followRedirects ? 'bg-brand-600' : 'bg-slate-700'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              followRedirects ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
