import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Download, Copy, Check, ShieldCheck } from 'lucide-react';
import { useRequestStore } from '../../stores/requestStore';
import { sanitizeRequestForStorage } from '../../utils/sanitizer';
import { useToastStore } from '../../stores/toastStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { tabs, activeTabId } = useRequestStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [excludeSecrets, setExcludeSecrets] = useState(true);
  const [exportScope, setExportScope] = useState<'activeTab' | 'allTabs'>('activeTab');
  const [copied, setCopied] = useState(false);
  const { addToast } = useToastStore();

  const getExportData = () => {
    const rawTabs = exportScope === 'activeTab' && activeTab ? [activeTab] : tabs;
    const exportedTabs = rawTabs.map((t) => {
      const req = excludeSecrets ? sanitizeRequestForStorage(t.request) : t.request;
      return {
        id: t.id,
        name: t.name,
        request: req,
      };
    });

    return {
      openpostFormat: '1.0.0',
      exportedAt: new Date().toISOString(),
      secretsExcluded: excludeSecrets,
      requests: exportedTabs,
    };
  };

  const handleDownload = () => {
    const data = getExportData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openpost-export-${exportScope}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Export Downloaded',
      message: `Export saved (${data.requests.length} request(s), secrets ${excludeSecrets ? 'excluded' : 'included'}).`,
    });
    onClose();
  };

  const handleCopy = () => {
    const data = getExportData();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    addToast({
      type: 'success',
      title: 'Export Copied',
      message: 'Export JSON copied to clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Requests"
      description="Export your requests to JSON for sharing or git version control"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-slate-300 text-xs transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy JSON</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-slate-300 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="py-2 space-y-4 text-xs text-slate-200">
        <div>
          <label className="block text-[11px] text-slate-400 mb-1.5">Export Scope</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExportScope('activeTab')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                exportScope === 'activeTab'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                  : 'border-surface-border bg-surface-panel/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <p className="font-semibold text-xs">Current Request</p>
              <p className="text-[10px] text-slate-400 truncate">{activeTab?.name || 'Untitled'}</p>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('allTabs')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                exportScope === 'allTabs'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                  : 'border-surface-border bg-surface-panel/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <p className="font-semibold text-xs">All Open Tabs</p>
              <p className="text-[10px] text-slate-400">{tabs.length} total tab(s)</p>
            </button>
          </div>
        </div>

        {/* Security Toggle: Exclude Secrets (Default TRUE) */}
        <div className="p-3 rounded-lg bg-surface-panel/50 border border-surface-border space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              id="export-exclude-secrets"
              checked={excludeSecrets}
              onChange={(e) => setExcludeSecrets(e.target.checked)}
              className="mt-0.5 rounded border-surface-border bg-surface-base text-brand-500 focus:ring-brand-500 cursor-pointer"
            />
            <div>
              <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Exclude secrets and passwords (Recommended)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Redacts bearer tokens, basic auth passwords, and sensitive API keys to prevent accidental leaks when sharing files or committing to git repositories.
              </p>
            </div>
          </label>
        </div>
      </div>
    </Modal>
  );
};
