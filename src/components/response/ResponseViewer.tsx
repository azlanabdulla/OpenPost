import React, { useState } from 'react';
import { HttpResponse } from '../../types/http';
import { HttpExecutionError, isHttpExecutionError } from '../../utils/httpExecutor';
import { CodeMirrorEditor } from '../../editor/CodeMirrorEditor';
import { HTTP_STATUS_HINTS } from '../../messages';
import { useToastStore } from '../../stores/toastStore';
import {
  Clock,
  Database,
  Copy,
  Check,
  AlertCircle,
  FileText,
  Code2,
  List,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Info,
  ShieldCheck,
  Cookie as CookieIcon,
  Globe,
} from 'lucide-react';

interface ResponseViewerProps {
  response: HttpResponse | null;
  isLoading: boolean;
  error: HttpExecutionError | string | null;
  onRetry?: () => void;
  onDisableSslAndRetry?: () => void;
}

type ResponseTab = 'body-pretty' | 'body-raw' | 'preview' | 'headers' | 'cookies';

const LARGE_RESPONSE_THRESHOLD = 5 * 1024 * 1024; // 5MB
const PREVIEW_TRUNCATION_LIMIT = 100 * 1024; // 100KB

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  isLoading,
  error,
  onRetry,
  onDisableSslAndRetry,
}) => {
  const [activeTab, setActiveTab] = useState<ResponseTab>('body-pretty');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showFullLargeResponse, setShowFullLargeResponse] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToastStore();

  const handleCopy = () => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
      setCopied(true);
      addToast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: 'Full response body copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToFile = () => {
    if (!response?.body) return;
    try {
      if (response.isBinary) {
        const binaryStr = typeof atob !== 'undefined' ? atob(response.body) : '';
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const mime = response.contentType || 'application/octet-stream';
        const ext = mime.includes('png')
          ? 'png'
          : mime.includes('jpeg') || mime.includes('jpg')
          ? 'jpg'
          : mime.includes('pdf')
          ? 'pdf'
          : mime.includes('webp')
          ? 'webp'
          : 'bin';
        const blob = new Blob([bytes], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `response-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addToast({
          type: 'success',
          title: 'Binary File Saved',
          message: `Saved binary file (${formatSize(response.bodySizeBytes)}).`,
        });
        return;
      }

      const isJson = response.headers['content-type']?.includes('json');
      const filename = `response-${Date.now()}.${isJson ? 'json' : 'txt'}`;
      const blob = new Blob([response.body], {
        type: response.headers['content-type'] || 'text/plain',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Response Saved',
        message: `Saved response as ${filename}`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'File Save Failed',
        message: 'Could not export response to local file.',
      });
    }
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (code >= 300 && code < 400) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (code >= 400 && code < 500) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-card p-6 text-center select-none">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-300">Sending request...</p>
        <p className="text-[11px] text-surface-muted mt-1">Connecting to server and streaming response</p>
      </div>
    );
  }

  // 2. Cancellation Neutral State
  if (error && isHttpExecutionError(error) && error.isCancelled) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-card p-6 text-center select-none">
        <div className="p-3 bg-slate-800 border border-slate-700 rounded-full mb-3 text-slate-400">
          <Info className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 mb-2">
          {error.code}
        </span>
        <h4 className="text-sm font-semibold text-slate-200 mb-1">{error.title}</h4>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          The in-flight request was stopped before the server responded.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Send Again
          </button>
        )}
      </div>
    );
  }

  // 3. Error State (Structured)
  if (error) {
    const errorObj = isHttpExecutionError(error)
      ? error
      : {
          code: 'OP-NET-999',
          title: 'Request Failed',
          message: String(error),
          technicalDetails: String(error),
          durationMs: 0,
        };

    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-card p-6 text-center overflow-y-auto">
        <div className="max-w-md w-full bg-[#151D2E] border border-rose-500/30 rounded-xl p-5 shadow-lg shadow-rose-950/20 text-left">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {errorObj.code}
                </span>
                <h4 className="text-xs font-bold text-slate-100 truncate">{errorObj.title}</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{errorObj.message}</p>
            </div>
          </div>

          {/* Special SSL Action Button */}
          {errorObj.isSslError && onDisableSslAndRetry && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-medium mb-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Self-signed or invalid SSL certificate</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                If connecting to a local development or internal service, you can disable SSL certificate verification for this request.
              </p>
              <button
                type="button"
                onClick={onDisableSslAndRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Disable SSL Verification & Retry
              </button>
            </div>
          )}

          {/* Collapsible Technical Details */}
          {errorObj.technicalDetails && (
            <div className="mt-3 pt-3 border-t border-surface-border/60">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="flex items-center justify-between w-full text-[11px] text-surface-muted hover:text-slate-300 cursor-pointer"
              >
                <span>Technical details</span>
                {showTechnicalDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {showTechnicalDetails && (
                <pre className="mt-2 p-2 bg-[#0B0F17] rounded border border-surface-border text-[11px] font-mono text-slate-400 whitespace-pre-wrap break-all select-text">
                  {errorObj.technicalDetails}
                </pre>
              )}
            </div>
          )}

          {/* Action Footer */}
          {onRetry && (
            <div className="mt-4 pt-3 border-t border-surface-border flex justify-end">
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-hover border border-surface-border text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Retry Request
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Empty State (no response yet)
  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-card p-6 text-center text-surface-muted select-none">
        <FileText className="w-10 h-10 text-slate-600 mb-3 stroke-[1.5]" />
        <p className="text-sm font-medium text-slate-400">No Response Yet</p>
        <p className="text-xs text-slate-500 mt-1">
          Click <strong className="text-slate-300">Send</strong> or press{' '}
          <code className="bg-surface-panel px-1.5 py-0.5 rounded text-cyan-400">Ctrl+Enter</code> to execute the request
        </p>
      </div>
    );
  }

  // 5. Response Display & Large Payload Handling
  const isLargePayload = response.bodySizeBytes > LARGE_RESPONSE_THRESHOLD;
  const shouldTruncate = isLargePayload && !showFullLargeResponse;

  let displayBody = response.body;
  let isJson = false;

  if (shouldTruncate) {
    displayBody = response.body.slice(0, PREVIEW_TRUNCATION_LIMIT);
  } else {
    try {
      const parsed = JSON.parse(response.body);
      displayBody = JSON.stringify(parsed, null, 2);
      isJson = true;
    } catch {
      isJson = false;
    }
  }

  const statusHint = HTTP_STATUS_HINTS[response.statusCode];

  return (
    <div className="flex flex-col h-full bg-surface-card overflow-hidden">
      {/* Response Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border bg-surface-panel/40 flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <span
            className={`px-2 py-0.5 rounded font-mono font-bold border ${getStatusColor(
              response.statusCode
            )}`}
          >
            {response.statusCode} {response.statusText}
          </span>

          {/* Time & Size */}
          <span className="flex items-center gap-1 text-surface-muted">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-slate-300">{response.durationMs} ms</span>
          </span>

          <span className="flex items-center gap-1 text-surface-muted">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-slate-300">{formatSize(response.bodySizeBytes)}</span>
          </span>
        </div>

        {/* Action Buttons: Copy & Save */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy response body"
            className="flex items-center gap-1 text-[11px] text-surface-muted hover:text-slate-200 bg-surface-panel hover:bg-surface-hover border border-surface-border px-2.5 py-1 rounded transition cursor-pointer"
            title="Copy Response Body"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToFile}
            aria-label="Save response to file"
            className="flex items-center gap-1 text-[11px] text-surface-muted hover:text-slate-200 bg-surface-panel hover:bg-surface-hover border border-surface-border px-2.5 py-1 rounded transition cursor-pointer"
            title="Save Response to File"
          >
            <Download className="w-3 h-3" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Contextual Status Hint for 4xx/5xx */}
      {statusHint && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
          <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span className="truncate">
            <strong>{statusHint.title}:</strong> {statusHint.hint}
          </span>
        </div>
      )}

      {/* Large Payload Warning Card */}
      {isLargePayload && (
        <div className="px-3 py-2 bg-brand-500/10 border-b border-brand-500/20 flex items-center justify-between gap-2 text-xs text-brand-300">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>OP-RES-001:</strong> Large payload ({formatSize(response.bodySizeBytes)}).{' '}
              {shouldTruncate ? 'Preview truncated to first 100KB for editor speed.' : 'Showing full response.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowFullLargeResponse(!showFullLargeResponse)}
            className="px-2.5 py-0.5 rounded bg-brand-600/30 hover:bg-brand-600/50 border border-brand-500/40 text-brand-200 text-[11px] transition cursor-pointer"
          >
            {shouldTruncate ? 'Show Full Response' : 'Truncate Preview'}
          </button>
        </div>
      )}

      {/* Binary Response View (when response is binary) */}
      {response.isBinary && (
        <div className="p-4 m-2 rounded-lg bg-surface-panel/40 border border-surface-border text-center space-y-3">
          {response.contentType?.toLowerCase().startsWith('image/') ? (
            <div className="flex flex-col items-center">
              <div className="max-h-72 max-w-full overflow-hidden rounded-lg border border-surface-border bg-slate-950 p-2 shadow-inner">
                <img
                  src={`data:${response.contentType};base64,${response.body}`}
                  alt="Response preview"
                  className="max-h-64 object-contain mx-auto"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                {response.contentType} • {formatSize(response.bodySizeBytes)}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 mb-2">
                <Database className="w-8 h-8" />
              </div>
              <p className="text-xs font-semibold text-slate-200">
                Binary Payload ({response.contentType || 'application/octet-stream'})
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Size: {formatSize(response.bodySizeBytes)}. Raw binary data cannot be displayed as plain text.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={handleSaveToFile}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Binary File</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      {!response.isBinary && (
        <div className="flex items-center gap-1 px-3 border-b border-surface-border bg-surface-panel/20 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('body-pretty')}
            className={`flex items-center gap-1 px-3 py-1.5 font-medium border-b-2 transition ${
              activeTab === 'body-pretty'
                ? 'border-brand-500 text-brand-400 bg-surface-card'
                : 'border-transparent text-surface-muted hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Pretty</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('body-raw')}
            className={`flex items-center gap-1 px-3 py-1.5 font-medium border-b-2 transition ${
              activeTab === 'body-raw'
                ? 'border-brand-500 text-brand-400 bg-surface-card'
                : 'border-transparent text-surface-muted hover:text-slate-200'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Raw</span>
          </button>
          {response.contentType?.toLowerCase().includes('text/html') && (
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-3 py-1.5 font-medium border-b-2 transition ${
                activeTab === 'preview'
                  ? 'border-brand-500 text-brand-400 bg-surface-card'
                  : 'border-transparent text-surface-muted hover:text-slate-200'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Preview</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('headers')}
            className={`flex items-center gap-1 px-3 py-1.5 font-medium border-b-2 transition ${
              activeTab === 'headers'
                ? 'border-brand-500 text-brand-400 bg-surface-card'
                : 'border-transparent text-surface-muted hover:text-slate-200'
            }`}
          >
            <List className="w-3 h-3" />
            <span>Headers ({Object.keys(response.headers).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-1 px-3 py-1.5 font-medium border-b-2 transition ${
              activeTab === 'cookies'
                ? 'border-brand-500 text-brand-400 bg-surface-card'
                : 'border-transparent text-surface-muted hover:text-slate-200'
            }`}
          >
            <CookieIcon className="w-3 h-3" />
            <span>Cookies ({response.cookies?.length || 0})</span>
          </button>
        </div>
      )}

      {/* Tab Panels */}
      {!response.isBinary && (
        <div className="flex-1 overflow-auto p-2">
          {activeTab === 'body-pretty' && (
            <CodeMirrorEditor
              value={displayBody}
              language={isJson ? 'json' : 'text'}
              readOnly={true}
            />
          )}

          {activeTab === 'body-raw' && (
            <CodeMirrorEditor
              value={displayBody}
              language="text"
              readOnly={true}
            />
          )}

          {activeTab === 'preview' && (
            <div className="w-full h-full min-h-[300px] bg-white rounded-lg overflow-hidden border border-surface-border">
              <iframe
                title="HTML Response Preview"
                sandbox=""
                srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline';">${response.body}`}
                className="w-full h-full min-h-[300px] border-0"
              />
            </div>
          )}

          {activeTab === 'headers' && (
            <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-surface-panel/80 text-surface-muted text-[11px] border-b border-surface-border">
                    <th className="py-2 px-3 text-left w-1/3">Header Name</th>
                    <th className="py-2 px-3 text-left">Header Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/40">
                  {Object.entries(response.headers).map(([key, val]) => (
                    <tr key={key} className="hover:bg-surface-hover/40 transition">
                      <td className="py-1.5 px-3 text-brand-300 font-semibold">{key}</td>
                      <td className="py-1.5 px-3 text-slate-300 break-all">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
              {response.cookies && response.cookies.length > 0 ? (
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="bg-surface-panel/80 text-surface-muted text-[11px] border-b border-surface-border">
                      <th className="py-2 px-3 text-left">Cookie Name</th>
                      <th className="py-2 px-3 text-left">Value</th>
                      <th className="py-2 px-3 text-left">Domain</th>
                      <th className="py-2 px-3 text-left">Path</th>
                      <th className="py-2 px-3 text-left">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/40">
                    {response.cookies.map((c, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/40 transition">
                        <td className="py-1.5 px-3 text-cyan-300 font-semibold">{c.name}</td>
                        <td className="py-1.5 px-3 text-slate-300 break-all">{c.value}</td>
                        <td className="py-1.5 px-3 text-slate-400">{c.domain || '—'}</td>
                        <td className="py-1.5 px-3 text-slate-400">{c.path || '/'}</td>
                        <td className="py-1.5 px-3 text-slate-400 flex items-center gap-1">
                          {c.httpOnly && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                              HttpOnly
                            </span>
                          )}
                          {c.secure && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                              Secure
                            </span>
                          )}
                          {!c.httpOnly && !c.secure && '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-surface-muted">
                  No cookies returned in the response headers.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
