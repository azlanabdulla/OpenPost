import React from 'react';
import { Modal } from '../common/Modal';
import { Heart, Github, Star, ExternalLink } from 'lucide-react';
import { CANONICAL_LINKS } from '../../config/links';
import { openExternalUrl } from '../../utils/openLink';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const handleOpenLink = (url: string) => {
    openExternalUrl(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Support OpenPost"
      description="Keep OpenPost 100% Free, Independent & Open-Source"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-surface-muted">
            Zero telemetry • No tracking
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-border text-surface-text text-xs transition cursor-pointer font-medium focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Maybe later
          </button>
        </div>
      }
    >
      <div className="py-2 space-y-4 text-xs text-surface-text">
        {/* Banner with Heart Icon */}
        <div className="p-3.5 rounded-lg bg-surface-panel/50 border border-surface-border flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 shrink-0 mt-0.5">
            <Heart className="w-5 h-5 fill-rose-500" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-surface-text text-sm">
              Thank you for using OpenPost!
            </p>
            <p className="text-[11px] text-surface-muted leading-relaxed">
              OpenPost is free and open-source software and will always remain so. There are no cloud accounts, no subscriptions, no artificial request limits, and no paywalls.
            </p>
          </div>
        </div>

        {/* Informative Explanation */}
        <p className="text-surface-muted text-xs leading-relaxed">
          OpenPost is maintained independently. Sponsoring is completely voluntary and directly supports continuous maintenance, bug fixes, and code-signing certificates for Windows and macOS desktop installers.
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Primary Sponsor on GitHub Button */}
          <button
            type="button"
            onClick={() => handleOpenLink(CANONICAL_LINKS.SPONSORS)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-rose-500/10 hover:from-rose-500/20 to-brand-500/10 hover:to-brand-500/20 border border-rose-500/30 hover:border-rose-500/50 text-surface-text transition group cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <div className="flex items-center gap-2.5">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="font-semibold block text-surface-text">Sponsor on GitHub</span>
                <span className="text-[10px] text-surface-muted block">Support maintenance and desktop release certificates</span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-surface-muted group-hover:text-surface-text transition shrink-0" />
          </button>

          {/* Star on GitHub Button */}
          <button
            type="button"
            onClick={() => handleOpenLink(CANONICAL_LINKS.REPO)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-surface-panel/40 hover:bg-surface-panel border border-surface-border text-surface-text transition group cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="flex items-center gap-2.5">
              <Github className="w-4 h-4 text-surface-text" />
              <div className="text-left">
                <span className="font-medium block text-surface-text flex items-center gap-1.5">
                  Star on GitHub
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 inline" />
                </span>
                <span className="text-[10px] text-surface-muted block">Star the repo to help other developers discover OpenPost</span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-surface-muted group-hover:text-surface-text transition shrink-0" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
