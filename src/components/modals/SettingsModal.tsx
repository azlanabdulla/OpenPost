import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Clock, HardDrive } from 'lucide-react';
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
  const { addToast } = useToastStore();

  useEffect(() => {
    if (isOpen) {
      setSettings(loadAppSettings());
    }
  }, [isOpen]);

  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
      description="Configure network defaults, storage preferences, and interface theme"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-slate-300 text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition cursor-pointer"
          >
            Save Changes
          </button>
        </>
      }
    >
      <div className="py-2 space-y-4 text-xs text-slate-200 max-h-[60vh] overflow-y-auto pr-1">
        {/* Network Defaults */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            Network & Request Defaults
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Default Request Timeout (ms)
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={settings.defaultTimeoutMs}
                onChange={(e) =>
                  setSettings({ ...settings, defaultTimeoutMs: Number(e.target.value) || 30000 })
                }
                className="w-full bg-surface-panel text-slate-200 px-2.5 py-1.5 rounded-md border border-surface-border focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Large Response Warning (MB)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.largeResponseThresholdMb}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    largeResponseThresholdMb: Number(e.target.value) || 5,
                  })
                }
                className="w-full bg-surface-panel text-slate-200 px-2.5 py-1.5 rounded-md border border-surface-border focus:border-brand-500 focus:outline-none"
              />
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
                className="rounded border-surface-border bg-surface-panel text-brand-500 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-300">
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
                className="rounded border-surface-border bg-surface-panel text-brand-500 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-300">
                Follow HTTP redirects automatically
              </span>
            </label>
          </div>
        </div>

        {/* Storage & Local Data */}
        <div className="space-y-3 pt-2 border-t border-surface-border">
          <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 text-xs">
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            Storage & Local-First Privacy
          </h4>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Local Collections Directory
            </label>
            <input
              type="text"
              readOnly
              value={settings.workspacePath}
              className="w-full bg-surface-panel/50 text-slate-400 px-2.5 py-1.5 rounded-md border border-surface-border font-mono text-[11px] cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              All collections, environments, and folders are stored here in human-readable JSON files.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-300 font-medium">Session Drafts</p>
              <p className="text-[10px] text-slate-500">
                Clear all unsaved tab drafts from local storage
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDrafts}
              className="px-2.5 py-1 rounded bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs transition cursor-pointer"
            >
              Reset Drafts
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
