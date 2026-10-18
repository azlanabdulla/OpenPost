import React, { useState, useEffect } from 'react';
import { RequestSettings } from '../../types/http';
import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

interface SettingsEditorProps {
  settings?: Partial<RequestSettings>;
  onChange: (settings: Partial<RequestSettings>) => void;
}

const DEFAULT_TIMEOUT_MS = 30000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 600000;

export const SettingsEditor: React.FC<SettingsEditorProps> = ({ settings = {}, onChange }) => {
  const [timeoutInput, setTimeoutInput] = useState<string>(() =>
    settings.timeoutMs !== undefined ? String(settings.timeoutMs) : ''
  );
  const [timeoutError, setTimeoutError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.timeoutMs !== undefined) {
      setTimeoutInput(String(settings.timeoutMs));
    }
  }, [settings.timeoutMs]);

  const verifySsl = settings.verifySsl ?? true;
  const followRedirects = settings.followRedirects ?? true;

  const handleTimeoutChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '');
    setTimeoutInput(digitsOnly);

    if (digitsOnly === '') {
      setTimeoutError(null);
      onChange({ ...settings, timeoutMs: DEFAULT_TIMEOUT_MS });
      return;
    }

    const num = parseInt(digitsOnly, 10);
    if (num < MIN_TIMEOUT_MS || num > MAX_TIMEOUT_MS) {
      setTimeoutError(`Timeout must be between ${MIN_TIMEOUT_MS} ms and 600,000 ms (10 min).`);
    } else {
      setTimeoutError(null);
      onChange({ ...settings, timeoutMs: num });
    }
  };

  const parsedTimeout = timeoutInput ? parseInt(timeoutInput, 10) : DEFAULT_TIMEOUT_MS;
  const displaySeconds = (!isNaN(parsedTimeout) && parsedTimeout > 0)
    ? (parsedTimeout / 1000).toFixed(1)
    : '30.0';

  return (
    <div className="flex flex-col h-full p-4 max-w-xl space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-surface-text uppercase tracking-wider mb-1">
          Request Configuration
        </h4>
        <p className="text-[11px] text-surface-muted">
          Per-request network, SSL, and timeout controls
        </p>
      </div>

      {/* Timeout */}
      <div className="space-y-1.5">
        <label htmlFor="per-request-timeout-input" className="block text-xs font-medium text-surface-text">
          Request Timeout (milliseconds)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="per-request-timeout-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={String(DEFAULT_TIMEOUT_MS)}
            value={timeoutInput}
            onChange={(e) => handleTimeoutChange(e.target.value)}
            className={`w-48 bg-surface-panel text-surface-text placeholder:text-surface-muted font-mono text-xs py-2 px-3 rounded-lg border transition ${
              timeoutError
                ? 'border-rose-500 focus:border-rose-500'
                : 'border-surface-border focus:border-brand-500'
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
          />
          {!timeoutError && (
            <span className="text-xs text-surface-muted font-mono">({displaySeconds}s)</span>
          )}
        </div>
        {timeoutError && (
          <div className="flex items-center gap-1.5 text-xs text-rose-500 pt-0.5" role="alert">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
            <span>{timeoutError}</span>
          </div>
        )}
      </div>

      {/* SSL Verification */}
      <div className="pt-2 border-t border-surface-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {verifySsl ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <div>
              <span className="text-xs font-medium text-surface-text">SSL Certificate Verification</span>
              <p className="text-[11px] text-surface-muted">
                Validate SSL/TLS certificates when executing HTTPS requests
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Toggle SSL certificate verification"
            onClick={() => onChange({ ...settings, verifySsl: !verifySsl })}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              verifySsl ? 'bg-brand-500' : 'bg-surface-panel border border-surface-border'
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
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
            <span>
              <strong>Warning:</strong> SSL certificate verification is disabled for this request. Insecure certificates will be accepted.
            </span>
          </div>
        )}
      </div>

      {/* Follow Redirects */}
      <div className="pt-2 border-t border-surface-border flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-surface-text">Follow HTTP Redirects</span>
          <p className="text-[11px] text-surface-muted">
            Automatically follow 3xx redirect responses
          </p>
        </div>
        <button
          type="button"
          aria-label="Toggle follow HTTP redirects"
          onClick={() => onChange({ ...settings, followRedirects: !followRedirects })}
          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
            followRedirects ? 'bg-brand-500' : 'bg-surface-panel border border-surface-border'
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
