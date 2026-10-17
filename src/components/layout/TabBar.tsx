import React from 'react';
import { useRequestStore, TabItem } from '../../stores/requestStore';
import { useToastStore } from '../../stores/toastStore';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { HttpMethod } from '../../types/http';
import { Modal } from '../common/Modal';

const METHOD_COLOR_MAP: Record<HttpMethod, string> = {
  GET: 'text-emerald-400',
  POST: 'text-amber-400',
  PUT: 'text-blue-400',
  PATCH: 'text-purple-400',
  DELETE: 'text-rose-400',
  HEAD: 'text-slate-400',
  OPTIONS: 'text-cyan-400',
};

export const TabBar: React.FC = () => {
  const {
    tabs,
    activeTabId,
    pendingCloseTabId,
    setActiveTab,
    requestCloseTab,
    confirmCloseTab,
    cancelCloseTab,
    addTab,
  } = useRequestStore();

  const pendingTab = tabs.find((t) => t.id === pendingCloseTabId);

  const handleSaveAndCloseTab = () => {
    if (pendingCloseTabId) {
      useRequestStore.setState((state) => ({
        tabs: state.tabs.map((t) => (t.id === pendingCloseTabId ? { ...t, isDirty: false } : t)),
      }));
      confirmCloseTab();
      useToastStore.getState().addToast({
        type: 'success',
        title: 'Request Saved',
        message: `Changes saved for "${pendingTab?.name || 'Request'}".`,
      });
    }
  };

  return (
    <>
      <div className="flex items-center bg-surface-base border-b border-surface-border px-2 overflow-x-auto select-none no-scrollbar">
        <div className="flex items-center gap-1 py-1">
          {tabs.map((tab: TabItem) => {
            const isActive = tab.id === activeTabId;
            const methodColor = METHOD_COLOR_MAP[tab.request.method] || 'text-slate-400';

            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab(tab.id);
                  }
                }}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-medium cursor-pointer border-t-2 transition-all max-w-[200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  isActive
                    ? 'bg-surface-card text-slate-100 border-brand-500 shadow-sm'
                    : 'bg-surface-panel/40 text-surface-muted hover:text-slate-300 hover:bg-surface-panel/70 border-transparent'
                }`}
              >
                {/* Method badge */}
                <span className={`text-[10px] font-mono font-bold ${methodColor}`}>
                  {tab.request.method}
                </span>

                {/* Title & Dirty indicator */}
                <span className="truncate flex-1 text-xs">
                  {tab.name || tab.request.url || 'Untitled Request'}
                </span>

                {tab.isDirty && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:hidden"
                    title="Unsaved changes"
                  />
                )}

                {/* Close Button */}
                <button
                  type="button"
                  aria-label={`Close tab ${tab.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    requestCloseTab(tab.id);
                  }}
                  className={`p-0.5 rounded hover:bg-surface-border text-slate-400 hover:text-slate-200 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    tab.isDirty ? 'hidden group-hover:block' : ''
                  }`}
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Add Tab Button */}
          <button
            type="button"
            aria-label="Create new request tab"
            onClick={() => addTab()}
            className="p-1.5 rounded text-surface-muted hover:text-slate-200 hover:bg-surface-panel transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
            title="New Request Tab (Ctrl+T)"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Closing Dirty Tab */}
      <Modal
        isOpen={pendingCloseTabId !== null}
        onClose={cancelCloseTab}
        title="Unsaved Changes"
        description="This tab has modified parameters or payload that have not been saved."
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={cancelCloseTab}
              className="px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-panel text-slate-300 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmCloseTab}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-medium text-xs shadow-sm transition cursor-pointer"
              >
                Don't Save
              </button>
              <button
                type="button"
                onClick={handleSaveAndCloseTab}
                className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        }
      >
        <div className="flex items-start gap-3 py-2">
          <div className="p-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <p>
              Are you sure you want to close{' '}
              <strong className="text-slate-100">{pendingTab?.name || 'this request'}</strong>?
            </p>
            <p className="text-surface-muted">
              Any unsaved changes made to the URL, parameters, headers, or body will be discarded.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};
