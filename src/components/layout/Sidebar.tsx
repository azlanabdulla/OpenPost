import React, { useState } from 'react';
import { FolderTree, History, Globe2, Plus, Search, ChevronRight, Upload } from 'lucide-react';
import { useRequestStore } from '../../stores/requestStore';
import { useHistoryStore } from '../../stores/historyStore';
import { HistoryPanel } from '../history/HistoryPanel';
import { VirtualList } from '../common/VirtualList';

type SidebarTab = 'collections' | 'history' | 'environments';

interface SidebarProps {
  onOpenImport?: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-500',
  POST: 'text-amber-500',
  PUT: 'text-blue-500',
  PATCH: 'text-purple-500',
  DELETE: 'text-red-500',
  HEAD: 'text-slate-400',
  OPTIONS: 'text-teal-500',
};

const SIDEBAR_COLLAPSED_KEY = 'openpost_sidebar_sample_expanded';

export const Sidebar: React.FC<SidebarProps> = ({ onOpenImport }) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('collections');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSampleExpanded, setIsSampleExpanded] = useState<boolean>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        return stored !== 'false';
      }
    } catch {
      // fallback
    }
    return true;
  });

  const { tabs, activeTabId, setActiveTab: setActiveWorkspaceTab, addTab } = useRequestStore();

  const filteredTabs = tabs.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.request.url.toLowerCase().includes(q);
  });

  const toggleCollection = () => {
    setIsSampleExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleKeyDownCollection = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCollection();
    }
  };

  return (
    <aside className="w-64 bg-surface-base border-r border-surface-border flex flex-col h-full select-none">
      {/* Sidebar Icon Navigation */}
      <div className="flex items-center border-b border-surface-border p-1 bg-surface-panel/30">
        <button
          type="button"
          onClick={() => setActiveTab('collections')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition ${
            activeTab === 'collections'
              ? 'bg-surface-card text-brand-primary shadow-sm'
              : 'text-surface-muted hover:text-surface-text'
          }`}
          title="Collections"
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Collections</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition ${
            activeTab === 'history'
              ? 'bg-surface-card text-brand-primary shadow-sm'
              : 'text-surface-muted hover:text-surface-text'
          }`}
          title="History"
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>

        <button
          type="button"
          aria-label="Environments tab"
          onClick={() => setActiveTab('environments')}
          className={`p-1.5 text-xs font-medium rounded-md transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 ${
            activeTab === 'environments'
              ? 'bg-surface-card text-brand-primary shadow-sm'
              : 'text-surface-muted hover:text-surface-text'
          }`}
          title="Environments"
        >
          <Globe2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className="p-2 border-b border-surface-border flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-surface-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            aria-label={`Search ${activeTab}`}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              useHistoryStore.getState().setSearchQuery(val);
            }}
            placeholder={`Search ${activeTab}...`}
            className="w-full bg-surface-panel text-surface-text placeholder:text-surface-muted text-xs pl-8 pr-2 py-1 rounded-md border border-surface-border focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>

        <button
          type="button"
          aria-label="Import requests into sidebar"
          onClick={onOpenImport}
          className="p-1 rounded hover:bg-surface-panel text-surface-muted hover:text-surface-text transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
          title="Import cURL or Postman"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Create new request in sidebar"
          onClick={() => addTab()}
          className="p-1 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-primary border border-brand-500/30 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
          title="New Request"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'collections' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-surface-muted px-2 py-1">
              <span>My Workspace</span>
              <span className="text-[10px] bg-surface-panel text-surface-text px-1.5 py-0.2 rounded font-mono border border-surface-border">{tabs.length}</span>
            </div>

            {/* Collapsible starter collection item */}
            <div className="rounded-md hover:bg-surface-panel/40 transition">
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isSampleExpanded}
                aria-label="Toggle Sample REST Collection"
                onClick={toggleCollection}
                onKeyDown={handleKeyDownCollection}
                className="flex items-center gap-1.5 p-1.5 text-xs font-medium text-surface-text cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <ChevronRight
                  className={`w-3.5 h-3.5 text-surface-muted transition-transform duration-150 ${
                    isSampleExpanded ? 'rotate-90' : ''
                  }`}
                />
                <FolderTree className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span className="truncate flex-1">Sample REST Collection</span>
                <span className="text-[10px] text-surface-muted font-mono">{filteredTabs.length}</span>
              </div>

              {/* Children when expanded */}
              {isSampleExpanded && (
                <div className="pl-4 pr-1 py-1">
                  {filteredTabs.length === 0 ? (
                    <div className="py-2 text-[11px] text-surface-muted text-center">
                      {searchQuery ? 'No matching requests' : 'No requests in collection'}
                    </div>
                  ) : filteredTabs.length > 30 ? (
                    <VirtualList
                      items={filteredTabs}
                      itemHeight={30}
                      maxHeight="calc(100vh - 240px)"
                      ariaLabel="Collection requests"
                      renderItem={(t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveWorkspaceTab(t.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition cursor-pointer ${
                            t.id === activeTabId
                              ? 'bg-surface-panel text-brand-primary font-medium'
                              : 'text-surface-muted hover:text-surface-text hover:bg-surface-panel/30'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold font-mono shrink-0 ${
                              METHOD_COLORS[t.request.method] || 'text-emerald-500'
                            }`}
                          >
                            {t.request.method}
                          </span>
                          <span className="truncate flex-1">{t.name}</span>
                        </button>
                      )}
                    />
                  ) : (
                    <div className="space-y-0.5">
                      {filteredTabs.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveWorkspaceTab(t.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-left transition cursor-pointer ${
                            t.id === activeTabId
                              ? 'bg-surface-panel text-brand-primary font-medium'
                              : 'text-surface-muted hover:text-surface-text hover:bg-surface-panel/30'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold font-mono shrink-0 ${
                              METHOD_COLORS[t.request.method] || 'text-emerald-500'
                            }`}
                          >
                            {t.request.method}
                          </span>
                          <span className="truncate flex-1">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && <HistoryPanel />}

        {activeTab === 'environments' && (
          <div className="flex flex-col items-center justify-center h-full text-center text-surface-muted py-8">
            <Globe2 className="w-8 h-8 text-surface-muted mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-surface-text">Local Environments</p>
            <p className="text-[11px] text-surface-muted mt-0.5">Manage Dev, Staging & Global variables</p>
          </div>
        )}
      </div>

      {/* Bottom Status (Local Engine Only - Single Settings lives in Header/Palette) */}
      <div className="p-2 border-t border-surface-border bg-surface-panel/20 flex items-center justify-between text-xs text-surface-muted">
        <span className="text-[11px] font-mono">OpenPost Local</span>
      </div>
    </aside>
  );
};
