import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Terminal, FileJson, AlertTriangle, Layers, ArrowRight } from 'lucide-react';
import { useRequestStore } from '../../stores/requestStore';
import { useToastStore } from '../../stores/toastStore';
import { parseCurlCommand } from '../../utils/curlParser';
import { convertPostmanCollection, PostmanConvertResult } from '../../utils/postmanConverter';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportType = 'curl' | 'postman';

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const [importType, setImportType] = useState<ImportType>('curl');
  const [inputContent, setInputContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<PostmanConvertResult | null>(null);

  const { addTab } = useRequestStore();
  const { addToast } = useToastStore();

  const handleReset = () => {
    setInputContent('');
    setErrorMessage(null);
    setImportSummary(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputContent(content);
      setErrorMessage(null);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read selected file.');
    };
    reader.readAsText(file);
  };

  const handleProcessImport = () => {
    setErrorMessage(null);

    if (!inputContent.trim()) {
      setErrorMessage('Please paste input content or choose a file to import.');
      return;
    }

    if (importType === 'curl') {
      try {
        const { request, unsupportedFlags } = parseCurlCommand(inputContent);
        addTab({ ...request, name: request.name || 'Imported cURL' });

        if (unsupportedFlags.length > 0) {
          addToast({
            type: 'info',
            title: 'cURL Flags Skipped',
            message: `Unsupported flags ignored: ${unsupportedFlags.join(', ')}`,
            durationMs: 4000,
          });
        }

        addToast({
          type: 'success',
          title: 'cURL Imported',
          message: `${request.method} request imported successfully into a new tab.`,
        });

        handleClose();
      } catch (err: any) {
        setErrorMessage(`Failed to parse cURL command: ${err?.message || 'Syntax error'}`);
      }
    } else {
      // Postman or OpenPost JSON
      const result = convertPostmanCollection(inputContent);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      if (result.requests.length === 0) {
        setErrorMessage('No requests were found in the provided collection.');
        return;
      }

      // Show summary screen
      setImportSummary(result);
    }
  };

  const handleConfirmSummaryImport = () => {
    if (!importSummary) return;

    for (const req of importSummary.requests) {
      addTab(req);
    }

    addToast({
      type: 'success',
      title: 'Collection Imported',
      message: `Imported ${importSummary.requests.length} request(s) from "${importSummary.collectionName}".`,
    });

    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Requests"
      description="Import from cURL command line or Postman Collection v2.1 JSON"
      footer={
        importSummary ? (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setImportSummary(null)}
              className="px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-slate-300 text-xs transition cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmSummaryImport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition cursor-pointer"
            >
              <span>Add {importSummary.requests.length} Request(s) to Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-slate-300 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProcessImport}
              className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition cursor-pointer"
            >
              Import
            </button>
          </>
        )
      }
    >
      {importSummary ? (
        /* Import Summary View (OP-R2-014 requirement) */
        <div className="py-2 space-y-4 text-xs text-slate-200">
          <div className="p-3 rounded-lg bg-surface-panel/40 border border-surface-border space-y-2">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-brand-400" />
              {importSummary.collectionName}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
              <div className="bg-slate-900/40 p-2 rounded border border-surface-border">
                <span className="text-slate-400 block">Total Requests</span>
                <span className="text-base font-semibold text-brand-300 font-mono">
                  {importSummary.requests.length}
                </span>
              </div>
              <div className="bg-slate-900/40 p-2 rounded border border-surface-border">
                <span className="text-slate-400 block">Folders Detected</span>
                <span className="text-base font-semibold text-slate-200 font-mono">
                  {importSummary.summary.foldersCount}
                </span>
              </div>
            </div>
          </div>

          {importSummary.summary.skippedFeatures.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <h5 className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                Skipped Unsupported Features ({importSummary.summary.skippedFeatures.length})
              </h5>
              <p className="text-[11px] text-slate-400">
                OpenPost operates strictly local-first with transparent execution:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300 font-mono pl-1">
                {importSummary.summary.skippedFeatures.map((feat, idx) => (
                  <li key={idx}>{feat}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        /* Input Selection View */
        <div className="py-2 space-y-3.5 text-xs text-slate-200">
          {/* Tabs */}
          <div className="flex border-b border-surface-border">
            <button
              type="button"
              onClick={() => {
                setImportType('curl');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 transition cursor-pointer ${
                importType === 'curl'
                  ? 'border-brand-500 text-brand-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>cURL Command</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportType('postman');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 transition cursor-pointer ${
                importType === 'postman'
                  ? 'border-brand-500 text-brand-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Postman / OpenPost JSON</span>
            </button>
          </div>

          {/* Error Message banner */}
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {importType === 'curl' ? (
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Paste raw cURL string
              </label>
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="curl -X POST https://api.example.com/v1/orders -H 'Content-Type: application/json' -d '{...}'"
                rows={6}
                className="w-full bg-surface-panel text-slate-200 p-2.5 rounded-md border border-surface-border font-mono text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Upload Collection File (.json)
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-400 file:mr-2.5 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-surface-panel file:text-slate-200 hover:file:bg-surface-border file:cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Or paste raw JSON content
                </label>
                <textarea
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="Paste collection JSON here..."
                  rows={5}
                  className="w-full bg-surface-panel text-slate-200 p-2.5 rounded-md border border-surface-border font-mono text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
