import React, { useState } from 'react';
import { FolderTree, History, Globe2, Settings, Plus, Search, ChevronRight, Upload } from 'lucide-react';
import { useRequestStore } from '../../stores/requestStore';
import { useHistoryStore } from '../../stores/historyStore';
import { HistoryPanel } from '../history/HistoryPanel';

type SidebarTab = 'collections' | 'history' | 'environments';

interface SidebarProps {
  onOpenSettings?: () => void;
  onOpenImport?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, onOpenImport }) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('collections');
  const [searchQuery, setSearchQuery] = useState('');
  const { addTab } = useRequestStore();

  return (
    <aside className="w-64 bg-surface-base border-r border-surface-border flex flex-col h-full select-none">
      {/* Sidebar Icon Navigation */}
      <div className="flex items-center border-b border-surface-border p-1 bg-surface-panel/30">
        <button
          type="button"
          onClick={() => setActiveTab('collections')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition ${
            activeTab === 'collections'
              ? 'bg-surface-card text-brand-300 shadow-sm'
              : 'text-surface-muted hover:text-slate-200'
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
              ? 'bg-surface-card text-brand-300 shadow-sm'
              : 'text-surface-muted hover:text-slate-200'
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
              ? 'bg-surface-card text-brand-300 shadow-sm'
              : 'text-surface-muted hover:text-slate-200'
          }`}
          title="Environments"
        >
          <Globe2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search & Actions Bar */}
      <div className="p-2 border-b border-surface-border flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
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
            className="w-full bg-surface-panel text-slate-200 text-xs pl-8 pr-2 py-1 rounded-md border border-surface-border focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>

        <button
          type="button"
          aria-label="Import requests into sidebar"
          onClick={onOpenImport}
          className="p-1 rounded hover:bg-surface-panel text-slate-400 hover:text-slate-200 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
          title="Import cURL or Postman"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          aria-label="Create new request in sidebar"
          onClick={() => addTab()}
          className="p-1 rounded bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
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
              <span className="text-[10px] bg-surface-panel px-1.5 py-0.2 rounded font-mono">1</span>
            </div>

            {/* Default starter collection item */}
            <div className="group rounded-md hover:bg-surface-panel/50 p-1.5 transition">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200 cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate">Sample REST Collection</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && <HistoryPanel />}

        {activeTab === 'environments' && (
          <div className="flex flex-col items-center justify-center h-full text-center text-surface-muted py-8">
            <Globe2 className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-slate-400">Local Environments</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Manage Dev, Staging & Global variables</p>
          </div>
        )}
      </div>

      {/* Bottom Settings Link */}
      <div className="p-2 border-t border-surface-border bg-surface-panel/20 flex items-center justify-between text-xs text-surface-muted">
        <span className="text-[11px] font-mono">OpenPost Local</span>
        <button
          type="button"
          aria-label="Open application settings"
          onClick={onOpenSettings}
          className="p-1 rounded hover:bg-surface-panel text-slate-400 hover:text-slate-200 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500"
          title="App Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
