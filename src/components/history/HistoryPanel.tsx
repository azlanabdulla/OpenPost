import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { useHistoryStore } from '../../stores/historyStore';
import { Modal } from '../common/Modal';

export const HistoryPanel: React.FC = () => {
  const {
    entries,
    searchQuery,
    isLoading,
    loadHistory,
    deleteEntry,
    clearHistory,
    restoreEntryToTab,
  } = useHistoryStore();

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  useEffect(() => {
    if (entries.length === 0) {
      loadHistory();
    }
  }, [entries.length, loadHistory]);

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      e.url.toLowerCase().includes(q) ||
      e.method.toLowerCase().includes(q) ||
      (e.responseStatus && String(e.responseStatus).includes(q))
    );
  });

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'POST':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'PUT':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'PATCH':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'DELETE':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-surface-muted bg-surface-panel border-surface-border';
    }
  };

  const getStatusBadge = (status?: number) => {
    if (!status) return null;
    let color = 'text-surface-muted bg-surface-panel border-surface-border';
    if (status >= 200 && status < 300) {
      color = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (status >= 300 && status < 400) {
      color = 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
    } else if (status >= 400 && status < 500) {
      color = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    } else if (status >= 500) {
      color = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    }
    return (
      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${color}`}>
        {status}
      </span>
    );
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Top action row */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-surface-border bg-surface-panel/20 text-xs text-surface-muted">
        <span className="text-[11px] font-mono flex items-center gap-1">
          <History className="w-3.5 h-3.5 text-brand-primary" />
          <span>{filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}</span>
          <span className="text-[10px] text-surface-muted/60">(limit: 100)</span>
        </span>

        {entries.length > 0 && (
          <button
            type="button"
            aria-label="Clear all request history"
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-surface-muted hover:text-rose-500 hover:bg-rose-500/10 rounded transition cursor-pointer"
            title="Clear all request history"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 no-scrollbar">
        {isLoading && entries.length === 0 ? (
          <div className="py-8 text-center text-xs text-surface-muted">
            <Clock className="w-5 h-5 mx-auto mb-2 text-surface-muted animate-spin" />
            Loading SQLite history...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-surface-muted py-12 px-4">
            <History className="w-8 h-8 text-surface-muted/50 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-surface-text">
              {searchQuery ? 'No matching requests' : 'No request history yet'}
            </p>
            <p className="text-[11px] text-surface-muted mt-1">
              {searchQuery
                ? `No requests match "${searchQuery}"`
                : 'Send a request and it will automatically be recorded here (max 100 entries).'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              role="button"
              tabIndex={0}
              onClick={() => restoreEntryToTab(entry, false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') restoreEntryToTab(entry, false);
              }}
              title={`Click to restore ${entry.method} ${entry.url}`}
              className="group flex items-center justify-between h-8 px-2 rounded-md hover:bg-surface-hover border border-transparent hover:border-surface-border text-xs transition cursor-pointer select-none"
            >
              {/* Method and URL */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getMethodColor(
                    entry.method
                  )}`}
                >
                  {entry.method}
                </span>
                <span className="font-mono text-xs text-surface-text truncate">
                  {entry.url}
                </span>
              </div>

              {/* Status, Duration, and Actions */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {getStatusBadge(entry.responseStatus)}

                {entry.responseDurationMs !== undefined && (
                  <span className="text-[10px] font-mono text-surface-muted">
                    {entry.responseDurationMs}ms
                  </span>
                )}

                <span className="text-[10px] font-mono text-surface-muted/70 hidden sm:inline">
                  {formatTimestamp(entry.timestamp)}
                </span>

                {/* Hover actions */}
                <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                  <button
                    type="button"
                    aria-label="Restore in new tab"
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreEntryToTab(entry, true);
                    }}
                    className="p-1 text-surface-muted hover:text-brand-primary rounded hover:bg-surface-panel transition"
                    title="Open in new tab"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    aria-label="Delete history entry"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEntry(entry.id);
                    }}
                    className="p-1 text-surface-muted hover:text-rose-500 rounded hover:bg-surface-panel transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal for Clear History */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear Request History?"
        description="Are you sure you want to permanently delete all request history?"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setIsClearModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-hover text-surface-text text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                clearHistory();
                setIsClearModalOpen(false);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All History</span>
            </button>
          </div>
        }
      >
        <div className="py-2 text-xs text-surface-muted space-y-2">
          <p>
            This action will clear all stored rows from your local SQLite database{' '}
            <code className="text-surface-text font-mono bg-surface-panel px-1 py-0.5 rounded">history.db</code>.
          </p>
          <p className="text-[11px] text-surface-muted">
            This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
};
