import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Github, Shield, Copy, Check, Heart } from 'lucide-react';
import { createSanitizedDiagnostics } from '../../utils/sanitizer';
import { useToastStore } from '../../stores/toastStore';
import { CANONICAL_LINKS } from '../../config/links';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);
  const { addToast } = useToastStore();

  const handleCopyDiagnostics = () => {
    const report = createSanitizedDiagnostics(new Error('Manual diagnostic dump'));
    navigator.clipboard.writeText(report);
    setCopiedDiagnostics(true);
    addToast({
      type: 'success',
      title: 'Diagnostics Copied',
      message: 'Sanitized system diagnostics copied to clipboard (secrets stripped).',
    });
    setTimeout(() => setCopiedDiagnostics(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About OpenPost"
      description="The Free, Open-Source Postman Alternative"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-surface-muted flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" /> for developers
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-border text-surface-text text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="py-2 space-y-4 text-xs text-surface-text">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-panel/40 border border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center font-bold text-white text-base shadow-md">
            OP
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-text flex items-center gap-2">
              OpenPost Desktop
              <span className="text-[10px] bg-brand-500/20 text-brand-primary px-1.5 py-0.5 rounded font-mono">
                v0.1.0
              </span>
            </h3>
            <p className="text-[11px] text-surface-muted">
              MIT Licensed • Local-First Architecture • Zero Telemetry
            </p>
          </div>
        </div>

        <div className="space-y-2 text-surface-text">
          <p>
            OpenPost is built as a transparent, high-performance API client without user accounts, cloud dependencies, or usage limits. Your requests, environments, and secrets stay strictly on your local computer. OpenPost makes no network calls except the requests you send. The sponsor and GitHub links open in your browser only when you click them.
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-surface-panel border border-surface-border space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-surface-text text-xs">Security & Diagnostics</span>
            <button
              type="button"
              onClick={handleCopyDiagnostics}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-base hover:bg-surface-hover text-surface-text text-[11px] transition cursor-pointer"
            >
              {copiedDiagnostics ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Diagnostics</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-surface-muted">
            Export sanitized environment information for bug reports. All headers, tokens, and authorization parameters are automatically redacted.
          </p>
        </div>

        <div className="pt-1 flex items-center gap-4 text-surface-muted">
          <a
            href={CANONICAL_LINKS.REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-surface-text transition"
          >
            <Github className="w-4 h-4" />
            <span>GitHub Repository</span>
          </a>
          <span>•</span>
          <a
            href={CANONICAL_LINKS.LICENSE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-surface-text transition"
          >
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>MIT License</span>
          </a>
        </div>
      </div>
    </Modal>
  );
};
