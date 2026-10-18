import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Clock, HardDrive, AlertCircle } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';

export interface AppSettings {
  defaultTimeoutMs: number;
  verifySslDefault: boolean;
  followRedirectsDefault: boolean;
  largeResponseThresholdMb: number;
  theme: 'dark' | 'light';
  workspacePath: string;
}

const SETTINGS_KEY = 'openpost_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultTimeoutMs: 30000,
  verifySslDefault: true,
  followRedirectsDefault: true,
  largeResponseThresholdMb: 5,
  theme: 'dark',
  workspacePath: '~/.openpost/workspace',
};

const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 600000;
const MIN_LARGE_RESPONSE_MB = 1;
const MAX_LARGE_RESPONSE_MB = 500;

export function loadAppSettings(): AppSettings {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // fallback
  }
  return DEFAULT_SETTINGS;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(loadAppSettings);
  const [timeoutInput, setTimeoutInput] = useState<string>('30000');
  const [largeResponseInput, setLargeResponseInput] = useState<string>('5');
  const [timeoutError, setTimeoutError] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const { addToast } = useToastStore();

  useEffect(() => {
    if (isOpen) {
      const loaded = loadAppSettings();
      setSettings(loaded);
      setTimeoutInput(String(loaded.defaultTimeoutMs || 30000));
      setLargeResponseInput(String(loaded.largeResponseThresholdMb || 5));
      setTimeoutError(null);
      setSizeError(null);
    }
  }, [isOpen]);

  const handleTimeoutChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '');
    setTimeoutInput(digitsOnly);

    if (digitsOnly.length > 0) {
      const num = parseInt(digitsOnly, 10);
      if (num < MIN_TIMEOUT_MS || num > MAX_TIMEOUT_MS) {
        setTimeoutError(`Timeout must be between ${MIN_TIMEOUT_MS} ms and 600,000 ms (10 min).`);
      } else {
        setTimeoutError(null);
      }
    } else {
      setTimeoutError(null);
    }
  };

  const handleLargeResponseChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '');
    setLargeResponseInput(digitsOnly);

    if (digitsOnly.length > 0) {
      const num = parseInt(digitsOnly, 10);
      if (num < MIN_LARGE_RESPONSE_MB || num > MAX_LARGE_RESPONSE_MB) {
        setSizeError(`Warning threshold must be between ${MIN_LARGE_RESPONSE_MB} MB and ${MAX_LARGE_RESPONSE_MB} MB.`);
      } else {
        setSizeError(null);
      }
    } else {
      setSizeError(null);
    }
  };

  const handleSave = () => {
    // Check validation
    if (timeoutError || sizeError) {
      return;
    }

    const finalTimeout = timeoutInput.trim()
      ? parseInt(timeoutInput, 10)
      : DEFAULT_SETTINGS.defaultTimeoutMs;

    const finalSize = largeResponseInput.trim()
      ? parseInt(largeResponseInput, 10)
      : DEFAULT_SETTINGS.largeResponseThresholdMb;

    // Boundary fallback if somehow invalid
    const sanitizedTimeout =
      finalTimeout >= MIN_TIMEOUT_MS && finalTimeout <= MAX_TIMEOUT_MS
        ? finalTimeout
        : DEFAULT_SETTINGS.defaultTimeoutMs;

    const sanitizedSize =
      finalSize >= MIN_LARGE_RESPONSE_MB && finalSize <= MAX_LARGE_RESPONSE_MB
        ? finalSize
        : DEFAULT_SETTINGS.largeResponseThresholdMb;

    const newSettings: AppSettings = {
      ...settings,
      defaultTimeoutMs: sanitizedTimeout,
      largeResponseThresholdMb: sanitizedSize,
    };

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Application preferences updated successfully.',
      });
    } catch {
      // Storage error
    }
    onClose();
  };

  const handleResetDrafts = () => {
    try {
      localStorage.removeItem('openpost_draft_tabs_v1');
      addToast({
        type: 'info',
        title: 'Drafts Cleared',
        message: 'Saved request drafts in local storage have been reset.',
      });
    } catch {
      // ignore
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Application Settings"
      description="Configure network defaults, storage preferences, and interface limits"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-surface-muted hover:text-surface-text text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={Boolean(timeoutError || sizeError)}
            onClick={handleSave}
            className={`px-4 py-1.5 rounded-lg text-white font-medium text-xs shadow-sm transition ${
              timeoutError || sizeError
                ? 'bg-surface-panel text-surface-muted border border-surface-border opacity-50 cursor-not-allowed'
                : 'bg-brand-500 hover:bg-brand-600 cursor-pointer'
            }`}
          >
            Save Changes
          </button>
        </>
      }
    >
      <div className="py-2 space-y-4 text-xs text-surface-text max-h-[60vh] overflow-y-auto pr-1">
        {/* Network Defaults */}
        <div className="space-y-3">
          <h4 className="font-semibold text-surface-text flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-brand-primary" />
            Network & Request Defaults
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="default-timeout-input"
                className="block text-[11px] text-surface-muted mb-1"
              >
                Default Request Timeout (ms)
              </label>
              <input
                id="default-timeout-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="30000"
                value={timeoutInput}
                onChange={(e) => handleTimeoutChange(e.target.value)}
                className={`w-full bg-surface-panel text-surface-text placeholder:text-surface-muted px-2.5 py-1.5 rounded-md border text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  timeoutError ? 'border-rose-500 focus:border-rose-500' : 'border-surface-border focus:border-brand-500'
                }`}
              />
              {timeoutError ? (
                <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{timeoutError}</span>
                </p>
              ) : (
                <p className="text-[10px] text-surface-muted mt-1">
                  Leave empty to use default (30,000 ms).
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="large-response-input"
                className="block text-[11px] text-surface-muted mb-1"
              >
                Large Response Warning (MB)
              </label>
              <input
                id="large-response-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="5"
                value={largeResponseInput}
                onChange={(e) => handleLargeResponseChange(e.target.value)}
                className={`w-full bg-surface-panel text-surface-text placeholder:text-surface-muted px-2.5 py-1.5 rounded-md border text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  sizeError ? 'border-rose-500 focus:border-rose-500' : 'border-surface-border focus:border-brand-500'
                }`}
              />
              {sizeError ? (
                <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{sizeError}</span>
                </p>
              ) : (
                <p className="text-[10px] text-surface-muted mt-1">
                  Leave empty to use default (5 MB).
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.verifySslDefault}
                onChange={(e) =>
                  setSettings({ ...settings, verifySslDefault: e.target.checked })
                }
                className="rounded border-surface-border bg-surface-panel text-brand-primary focus:ring-brand-500"
              />
              <span className="text-xs text-surface-text">
                Verify SSL/TLS certificates by default
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.followRedirectsDefault}
                onChange={(e) =>
                  setSettings({ ...settings, followRedirectsDefault: e.target.checked })
                }
                className="rounded border-surface-border bg-surface-panel text-brand-primary focus:ring-brand-500"
              />
              <span className="text-xs text-surface-text">
                Follow HTTP redirects automatically
              </span>
            </label>
          </div>
        </div>

        {/* Storage & Local Data */}
        <div className="space-y-3 pt-2 border-t border-surface-border">
          <h4 className="font-semibold text-surface-text flex items-center gap-1.5 text-xs">
            <HardDrive className="w-3.5 h-3.5 text-amber-500" />
            Storage & Local-First Privacy
          </h4>

          <div>
            <label
              htmlFor="workspace-path-input"
              className="block text-[11px] text-surface-muted mb-1"
            >
              Local Collections Directory
            </label>
            <input
              id="workspace-path-input"
              type="text"
              readOnly
              value={settings.workspacePath}
              className="w-full bg-surface-panel text-surface-text px-2.5 py-1.5 rounded-md border border-surface-border font-mono text-[11px] cursor-text select-all"
            />
            <p className="text-[10px] text-surface-muted mt-1">
              All collections, environments, and folders are stored here in human-readable JSON files.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-text font-medium">Session Drafts</p>
              <p className="text-[10px] text-surface-muted">
                Clear all unsaved tab drafts from local storage
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDrafts}
              className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs transition cursor-pointer"
            >
              Reset Drafts
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
