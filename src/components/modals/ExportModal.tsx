import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Download, Copy, Check, ShieldCheck, FileCode, Layers } from 'lucide-react';
import { useRequestStore } from '../../stores/requestStore';
import { useToastStore } from '../../stores/toastStore';
import {
  ExportFormat,
  buildOpenPostExport,
  buildPostmanExport,
  getExportFilename,
} from '../../utils/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { tabs, activeTabId } = useRequestStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [format, setFormat] = useState<ExportFormat>('openpost');
  const [excludeSecrets, setExcludeSecrets] = useState(true);
  const [exportScope, setExportScope] = useState<'activeTab' | 'allTabs'>('allTabs');
  const [copied, setCopied] = useState(false);
  const { addToast } = useToastStore();

  const getExportData = () => {
    const rawTabs = exportScope === 'activeTab' && activeTab ? [activeTab] : tabs;
    const tabItems = rawTabs.map((t) => ({
      id: t.id,
      name: t.name,
      request: t.request,
    }));

    if (format === 'postman') {
      const collectionName = exportScope === 'activeTab' ? activeTab?.name : 'OpenPost Workspace Collection';
      return buildPostmanExport(tabItems, excludeSecrets, collectionName);
    }
    return buildOpenPostExport(tabItems, excludeSecrets);
  };

  const filename = getExportFilename(
    format,
    exportScope,
    exportScope === 'activeTab' ? activeTab?.name : 'openpost'
  );

  const handleDownload = () => {
    const data = getExportData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    const count = exportScope === 'activeTab' ? 1 : tabs.length;
    addToast({
      type: 'success',
      title: 'Export Downloaded',
      message: `Exported ${count} request(s) to ${filename} (secrets ${excludeSecrets ? 'excluded' : 'included'}).`,
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
      message: `${format === 'postman' ? 'Postman v2.1' : 'OpenPost'} JSON copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Requests"
      description="Export your workspace requests to JSON for sharing or git version control"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-surface-muted hover:text-surface-text text-xs transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy JSON</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-surface-muted hover:text-surface-text text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {format === 'postman' ? '.postman_collection.json' : '.openpost.json'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="py-2 space-y-4 text-xs text-surface-text">
        {/* Format Selection (OpenPost Native vs Postman v2.1) */}
        <div>
          <label className="block text-[11px] text-surface-muted mb-1.5 font-medium">Export Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat('openpost')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                format === 'openpost'
                  ? 'border-brand-500 bg-brand-500/10 text-surface-text'
                  : 'border-surface-border bg-surface-panel/40 text-surface-muted hover:text-surface-text'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <FileCode className={`w-3.5 h-3.5 ${format === 'openpost' ? 'text-brand-primary' : 'text-surface-muted'}`} />
                <span className="font-semibold text-xs">OpenPost Native</span>
              </div>
              <p className="text-[10px] text-surface-muted mt-1">
                Full-fidelity JSON with settings (.openpost.json)
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFormat('postman')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                format === 'postman'
                  ? 'border-brand-500 bg-brand-500/10 text-surface-text'
                  : 'border-surface-border bg-surface-panel/40 text-surface-muted hover:text-surface-text'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Layers className={`w-3.5 h-3.5 ${format === 'postman' ? 'text-amber-500' : 'text-surface-muted'}`} />
                <span className="font-semibold text-xs">Postman v2.1</span>
              </div>
              <p className="text-[10px] text-surface-muted mt-1">
                Compatible with Postman & tools (.postman_collection.json)
              </p>
            </button>
          </div>
        </div>

        {/* Scope Selection */}
        <div>
          <label className="block text-[11px] text-surface-muted mb-1.5 font-medium">Export Scope</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExportScope('allTabs')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                exportScope === 'allTabs'
                  ? 'border-brand-500 bg-brand-500/10 text-surface-text'
                  : 'border-surface-border bg-surface-panel/40 text-surface-muted hover:text-surface-text'
              }`}
            >
              <p className="font-semibold text-xs">All Open Tabs</p>
              <p className="text-[10px] text-surface-muted">{tabs.length} total request tab(s)</p>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('activeTab')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                exportScope === 'activeTab'
                  ? 'border-brand-500 bg-brand-500/10 text-surface-text'
                  : 'border-surface-border bg-surface-panel/40 text-surface-muted hover:text-surface-text'
              }`}
            >
              <p className="font-semibold text-xs">Current Active Request</p>
              <p className="text-[10px] text-surface-muted truncate">{activeTab?.name || 'Untitled'}</p>
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
              className="mt-0.5 rounded border-surface-border bg-surface-base text-brand-primary focus:ring-brand-500 cursor-pointer"
            />
            <div>
              <span className="font-semibold text-surface-text flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Exclude sensitive credentials (Recommended)
              </span>
              <p className="text-[11px] text-surface-muted mt-0.5">
                Redacts bearer tokens, basic passwords, and secret API keys before writing to disk, protecting your repositories from accidental credential leaks.
              </p>
            </div>
          </label>
        </div>

        {/* Filename Preview Info */}
        <div className="p-2.5 rounded bg-surface-panel/30 border border-surface-border flex items-center justify-between text-[11px] font-mono">
          <span className="text-surface-muted">File:</span>
          <span className="text-surface-text font-semibold truncate max-w-[280px]">{filename}</span>
        </div>
      </div>
    </Modal>
  );
};
