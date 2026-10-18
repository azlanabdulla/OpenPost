import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ShieldCheck, HardDrive, Zap, FolderGit2, Check } from 'lucide-react';

const DISMISSED_KEY = 'openpost_welcome_dismissed_v1';

export const WelcomeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (!dismissed) {
        setIsOpen(true);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage access errors
    }
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Welcome to OpenPost"
      description="The Free, Open-Source, Desktop-First API Client"
      footer={
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition cursor-pointer"
        >
          Get Started
        </button>
      }
    >
      <div className="py-2 space-y-3.5 text-xs text-surface-text">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg bg-surface-panel/40 border border-surface-border flex items-start gap-2.5">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-surface-text">100% Local-First</p>
              <p className="text-[11px] text-surface-muted mt-0.5">
                No cloud account, no login required, zero telemetry, and zero tracking. OpenPost makes no network calls except the requests you send. The sponsor and GitHub links open in your browser only when you click them.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-panel/40 border border-surface-border flex items-start gap-2.5">
            <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-500 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-surface-text">No Artificial Limits</p>
              <p className="text-[11px] text-surface-muted mt-0.5">
                Unlimited collections, requests, and environments. No paywalls.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-panel/40 border border-surface-border flex items-start gap-2.5">
            <div className="p-1.5 rounded-md bg-brand-500/10 text-brand-primary shrink-0">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-surface-text">Git-Friendly JSON</p>
              <p className="text-[11px] text-surface-muted mt-0.5">
                Saved in human-readable files that you can version-control with git.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-panel/40 border border-surface-border flex items-start gap-2.5">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500 shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-surface-text">Desktop Security</p>
              <p className="text-[11px] text-surface-muted mt-0.5">
                High-performance Rust network engine bypassing CORS restrictions.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-surface-panel p-2.5 border border-surface-border font-mono text-[11px] text-surface-muted flex items-center justify-between">
          <span>Storage: Local Workspace (~/.openpost)</span>
          <span className="flex items-center gap-1 text-emerald-500 text-[10px]">
            <Check className="w-3 h-3" /> Ready
          </span>
        </div>
      </div>
    </Modal>
  );
};
