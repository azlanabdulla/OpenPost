import React, { useState, useEffect, useCallback } from 'react';
import { useRequestStore } from './stores/requestStore';
import { useToastStore } from './stores/toastStore';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TabBar } from './components/layout/TabBar';
import { StatusBar } from './components/layout/StatusBar';
import { UrlBar } from './components/request/UrlBar';
import { RequestBuilder } from './components/request/RequestBuilder';
import { ResponseViewer } from './components/response/ResponseViewer';
import { SplitPane } from './components/common/SplitPane';
import { ToastContainer } from './components/common/ToastContainer';
import { executeHttpRequest, HttpExecutionError } from './utils/httpExecutor';
import { normalizeAndValidateUrl } from './utils/url';
import { scanRequestForUndefinedVariables } from './utils/variableResolver';
import { Modal } from './components/common/Modal';
import { WelcomeModal } from './components/modals/WelcomeModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { AboutModal } from './components/modals/AboutModal';
import { ExportModal } from './components/modals/ExportModal';
import { ImportModal } from './components/modals/ImportModal';
import { HttpRequest } from './types/http';

export const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [statusText, setStatusText] = useState('Ready');

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [undefinedVarsModal, setUndefinedVarsModal] = useState<{
    request: HttpRequest;
    undefinedVars: string[];
  } | null>(null);

  const {
    tabs,
    activeTabId,
    setMethod,
    setUrl,
    setSettings,
    setIsLoading,
    setResponse,
    setError,
    cancelRequest,
    addTab,
    requestCloseTab,
  } = useRequestStore();

  const { addToast } = useToastStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Theme synchronization
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Global unhandled promise rejection & runtime error listener
  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', e.reason);
      addToast({
        type: 'error',
        title: 'Unexpected Background Error',
        message: e.reason?.message || 'An asynchronous operation failed.',
      });
    };

    const handleError = (e: ErrorEvent) => {
      console.error('Global Error Event:', e.error);
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, [addToast]);

  // Global Keyboard shortcuts: Ctrl/Cmd+T (New tab), Ctrl/Cmd+W (Close tab)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        addTab();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        requestCloseTab(activeTab.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addTab, requestCloseTab, activeTab?.id]);

  // Send execution after validation & confirmation
  const executeSend = useCallback(
    async (effectiveRequest: HttpRequest) => {
      const abortController = new AbortController();
      setIsLoading(activeTab.id, true, abortController);
      setStatusText(`Connecting to ${effectiveRequest.url}...`);

      try {
        const response = await executeHttpRequest(effectiveRequest, abortController.signal);
        setResponse(activeTab.id, response);
        setStatusText(`Completed with ${response.statusCode} in ${response.durationMs}ms`);
      } catch (err: unknown) {
        const errorObj = err as HttpExecutionError;
        setError(activeTab.id, errorObj);
        setStatusText(errorObj.isCancelled ? 'Request cancelled' : 'Request failed');
      }
    },
    [activeTab?.id, setIsLoading, setResponse, setError]
  );

  // Execute request
  const handleSend = useCallback(async () => {
    if (!activeTab || activeTab.isLoading) return;

    // Validate URL
    const urlValidation = normalizeAndValidateUrl(activeTab.request.url);
    if (!urlValidation.isValid) {
      addToast({
        type: 'warning',
        title: urlValidation.errorCode || 'Invalid URL',
        message: urlValidation.errorMessage || 'Please specify a valid URL endpoint.',
      });
      return;
    }

    // Auto-prefix https:// if missing
    let effectiveRequest = activeTab.request;
    if (urlValidation.autoPrefixed && urlValidation.normalizedUrl !== activeTab.request.url) {
      setUrl(urlValidation.normalizedUrl);
      effectiveRequest = { ...activeTab.request, url: urlValidation.normalizedUrl };
      addToast({
        type: 'info',
        title: 'Protocol Auto-Suggested',
        message: `Auto-prepended https:// to ${urlValidation.normalizedUrl}`,
        durationMs: 3000,
      });
    }

    // Scan for undefined template variables {{variable}}
    const missingVars = scanRequestForUndefinedVariables(effectiveRequest, {});
    if (missingVars.length > 0) {
      setUndefinedVarsModal({
        request: effectiveRequest,
        undefinedVars: missingVars,
      });
      return;
    }

    await executeSend(effectiveRequest);
  }, [activeTab, setUrl, addToast, executeSend]);

  const handleCancel = useCallback(() => {
    if (activeTab) {
      cancelRequest(activeTab.id);
      setStatusText('Request cancelled');
    }
  }, [activeTab, cancelRequest]);

  // One-click action to disable SSL and retry immediately
  const handleDisableSslAndRetry = useCallback(() => {
    if (!activeTab) return;
    setSettings({ verifySsl: false });
    addToast({
      type: 'warning',
      title: 'SSL Verification Disabled',
      message: 'Certificate verification has been turned off for this request.',
    });
    // Trigger retry with updated settings
    setTimeout(() => {
      handleSend();
    }, 50);
  }, [activeTab, setSettings, addToast, handleSend]);

  if (!activeTab) return null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-base text-slate-100 font-sans">
      {/* 1. App Top Header */}
      <Header
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
        />

        {/* Center / Right Content Panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-surface-card">
          {/* Request Tab Bar */}
          <TabBar />

          {/* URL bar with Send button */}
          <UrlBar
            method={activeTab.request.method}
            url={activeTab.request.url}
            isLoading={activeTab.isLoading}
            onMethodChange={setMethod}
            onUrlChange={setUrl}
            onSend={handleSend}
            onCancel={handleCancel}
          />

          {/* Resizable Split Pane: Request Builder (Top) & Response Viewer (Bottom) */}
          <div className="flex-1 overflow-hidden">
            <SplitPane
              top={<RequestBuilder request={activeTab.request} />}
              bottom={
                <ResponseViewer
                  response={activeTab.response}
                  isLoading={activeTab.isLoading}
                  error={activeTab.error}
                  onRetry={handleSend}
                  onDisableSslAndRetry={handleDisableSslAndRetry}
                />
              }
              initialRatio={0.52}
            />
          </div>
        </main>
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar statusMessage={statusText} />

      {/* 4. Global Toast Container */}
      <ToastContainer />

      {/* 5. Modals System */}
      <WelcomeModal />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

      {/* Undefined Variables Modal (OP-VAR-001) */}
      <Modal
        isOpen={undefinedVarsModal !== null}
        onClose={() => setUndefinedVarsModal(null)}
        title="Undefined Variables (OP-VAR-001)"
        description="The following template variables were not found in your active environment:"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setUndefinedVarsModal(null)}
              className="px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-slate-300 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const req = undefinedVarsModal!.request;
                setUndefinedVarsModal(null);
                executeSend(req);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-sm transition cursor-pointer"
            >
              Send Anyway
            </button>
          </div>
        }
      >
        <div className="py-2 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {undefinedVarsModal?.undefinedVars.map((v) => (
              <span
                key={v}
                className="px-2 py-0.5 rounded font-mono text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                {`{{${v}}}`}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Sending this request will transmit unresolved literal braces to the target host.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default App;
