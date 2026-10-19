import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Terminal, FileJson, AlertTriangle, Layers, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useRequestStore } from '../../stores/requestStore';
import { useToastStore } from '../../stores/toastStore';
import { parseCurlCommand, CurlParseResult, CURL_UNSUPPORTED_FLAG_DESCRIPTIONS } from '../../utils/curlParser';
import { convertPostmanCollection, PostmanConvertResult } from '../../utils/postmanConverter';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportType = 'curl' | 'postman';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const [importType, setImportType] = useState<ImportType>('curl');
  const [inputContent, setInputContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<PostmanConvertResult | null>(null);
  const [curlReport, setCurlReport] = useState<CurlParseResult | null>(null);

  const { addTab } = useRequestStore();
  const { addToast } = useToastStore();

  const handleReset = () => {
    setInputContent('');
    setErrorMessage(null);
    setImportSummary(null);
    setCurlReport(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `OP-IMP-005: File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 10 MB.`
      );
      return;
    }

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
        const result = parseCurlCommand(inputContent);
        if (result.unsupportedFlags.length > 0) {
          // Present dedicated cURL Unsupported-Flag Report
          setCurlReport(result);
        } else {
          // Direct import if clean
          addTab({ ...result.request, name: result.request.name || 'Imported cURL' });
          addToast({
            type: 'success',
            title: 'cURL Imported',
            message: `${result.request.method} request imported successfully into a new tab.`,
          });
          handleClose();
        }
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

  const handleConfirmCurlImport = () => {
    if (!curlReport) return;
    addTab({ ...curlReport.request, name: curlReport.request.name || 'Imported cURL' });
    addToast({
      type: 'success',
      title: 'cURL Imported',
      message: `${curlReport.request.method} request imported (unsupported flags omitted).`,
    });
    handleClose();
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
      title={
        curlReport
          ? 'cURL Unsupported-Flag Report'
          : importSummary
          ? 'Postman Collection Summary'
          : 'Import Requests'
      }
      description={
        curlReport
          ? 'Review unsupported or omitted cURL flags before importing into workspace'
          : importSummary
          ? 'Review requests, folders, and compatibility notes before importing'
          : 'Import from cURL command line or Postman Collection v2.1 JSON'
      }
      footer={
        curlReport ? (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setCurlReport(null)}
              className="px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-surface-text text-xs transition cursor-pointer"
            >
              Back / Edit cURL
            </button>
            <button
              type="button"
              onClick={handleConfirmCurlImport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition cursor-pointer"
            >
              <span>Import Request (Omit Flags)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : importSummary ? (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setImportSummary(null)}
              className="px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-surface-text text-xs transition cursor-pointer"
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
              className="px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-surface-text text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="import-process-btn"
              onClick={handleProcessImport}
              className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition cursor-pointer"
            >
              Process Import
            </button>
          </>
        )
      }
    >
      {curlReport ? (
        /* cURL Unsupported-Flag Report View */
        <div className="py-2 space-y-4 text-xs text-surface-text">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1.5">
            <h5 className="font-semibold text-amber-500 flex items-center gap-1.5 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              {curlReport.unsupportedFlags.length} Unsupported Flag(s) Detected
            </h5>
            <p className="text-[11px] text-surface-muted">
              The following command-line flags cannot be executed directly in OpenPost's desktop HTTP engine and will be omitted:
            </p>
          </div>

          <div className="border border-surface-border rounded-lg overflow-hidden divide-y divide-surface-border bg-surface-panel/30">
            {curlReport.unsupportedFlags.map((flag) => {
              const description =
                CURL_UNSUPPORTED_FLAG_DESCRIPTIONS[flag] ||
                'Flag is not supported in desktop HTTP requests and will be ignored.';
              return (
                <div key={flag} className="p-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="font-mono font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                    {flag}
                  </div>
                  <div className="text-[11px] text-surface-text flex-1">{description}</div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-surface-panel/40 border border-surface-border space-y-1.5">
            <div className="font-semibold text-surface-text flex items-center gap-1.5 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Request will be imported as:
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] pt-1">
              <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-primary font-bold">
                {curlReport.request.method}
              </span>
              <span className="text-surface-text truncate">{curlReport.request.url || 'No URL specified'}</span>
            </div>
            <div className="text-[10px] text-surface-muted pt-1">
              Headers: {curlReport.request.headers.length} | Body type: {curlReport.request.body.type} | SSL verification:{' '}
              {curlReport.request.settings?.verifySsl === false ? 'Disabled (-k)' : 'Enabled'}
            </div>
          </div>
        </div>
      ) : importSummary ? (
        /* Postman Collection Summary View */
        <div className="py-2 space-y-4 text-xs text-surface-text">
          <div className="p-3 rounded-lg bg-surface-panel/40 border border-surface-border space-y-2">
            <h4 className="font-semibold text-surface-text flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-brand-primary" />
              {importSummary.collectionName}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-surface-text pt-1">
              <div className="bg-surface-panel p-2 rounded border border-surface-border">
                <span className="text-surface-muted block">Total Requests</span>
                <span className="text-base font-semibold text-brand-primary font-mono">
                  {importSummary.requests.length}
                </span>
              </div>
              <div className="bg-surface-panel p-2 rounded border border-surface-border">
                <span className="text-surface-muted block">Folders Detected</span>
                <span className="text-base font-semibold text-surface-text font-mono">
                  {importSummary.summary.foldersCount}
                </span>
              </div>
            </div>
          </div>

          {/* Requests Preview List */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-surface-text flex items-center justify-between">
              <span>Collection Endpoints ({importSummary.requests.length})</span>
              <span className="text-[10px] text-surface-muted">Ready to import</span>
            </div>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-surface-border bg-surface-panel/20 divide-y divide-surface-border/50">
              {importSummary.requests.slice(0, 10).map((req, idx) => (
                <div key={idx} className="p-2 flex items-center gap-2 text-[11px]">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                      req.method === 'GET'
                        ? 'bg-blue-500/20 text-blue-500'
                        : req.method === 'POST'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : req.method === 'PUT'
                        ? 'bg-amber-500/20 text-amber-500'
                        : req.method === 'DELETE'
                        ? 'bg-rose-500/20 text-rose-500'
                        : 'bg-purple-500/20 text-purple-500'
                    }`}
                  >
                    {req.method}
                  </span>
                  <span className="font-medium text-surface-text truncate flex-1">{req.name}</span>
                  <span className="text-[10px] text-surface-muted font-mono truncate max-w-[180px]">
                    {req.url}
                  </span>
                </div>
              ))}
              {importSummary.requests.length > 10 && (
                <div className="p-1.5 text-center text-[10px] text-surface-muted bg-surface-panel/40">
                  + {importSummary.requests.length - 10} additional request(s)
                </div>
              )}
            </div>
          </div>

          {importSummary.summary.skippedFeatures.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <h5 className="font-semibold text-amber-500 flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Skipped Unsupported Features ({importSummary.summary.skippedFeatures.length})
              </h5>
              <p className="text-[11px] text-surface-muted">
                OpenPost operates strictly local-first with transparent execution:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-surface-text font-mono pl-1">
                {importSummary.summary.skippedFeatures.map((feat, idx) => (
                  <li key={idx}>{feat}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        /* Input Selection View */
        <div className="py-2 space-y-3.5 text-xs text-surface-text">
          {/* Tabs */}
          <div className="flex border-b border-surface-border">
            <button
              type="button"
              data-testid="import-tab-curl"
              onClick={() => {
                setImportType('curl');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 transition cursor-pointer ${
                importType === 'curl'
                  ? 'border-brand-500 text-brand-primary'
                  : 'border-transparent text-surface-muted hover:text-surface-text'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>cURL Command</span>
            </button>

            <button
              type="button"
              data-testid="import-tab-postman"
              onClick={() => {
                setImportType('postman');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 transition cursor-pointer ${
                importType === 'postman'
                  ? 'border-brand-500 text-brand-primary'
                  : 'border-transparent text-surface-muted hover:text-surface-text'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Postman / OpenPost JSON</span>
            </button>
          </div>

          {/* Error Message banner */}
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {importType === 'curl' ? (
            <div>
              <label className="block text-[11px] text-surface-muted mb-1">
                Paste raw cURL string
              </label>
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="curl -X POST https://api.example.com/v1/orders -H 'Content-Type: application/json' -d '{...}'"
                rows={6}
                className="w-full bg-surface-panel text-surface-text placeholder:text-surface-muted p-2.5 rounded-md border border-surface-border font-mono text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-surface-muted mb-1">
                  Upload Collection File (.json, max 10MB)
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-surface-muted file:mr-2.5 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-surface-panel file:text-surface-text hover:file:bg-surface-border file:cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] text-surface-muted mb-1">
                  Or paste raw JSON content
                </label>
                <textarea
                  data-testid="import-json-textarea"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="Paste collection JSON here..."
                  rows={5}
                  className="w-full bg-surface-panel text-surface-text placeholder:text-surface-muted p-2.5 rounded-md border border-surface-border font-mono text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
