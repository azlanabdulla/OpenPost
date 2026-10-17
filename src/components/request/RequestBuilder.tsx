import React, { useState } from 'react';
import { HttpRequest } from '../../types/http';
import { ParamsEditor } from './ParamsEditor';
import { HeadersEditor } from './HeadersEditor';
import { BodyEditor } from './BodyEditor';
import { AuthEditor } from './AuthEditor';
import { SettingsEditor } from './SettingsEditor';
import { Sliders, KeyRound, FileCode, ListFilter, ShieldAlert } from 'lucide-react';
import { useRequestStore } from '../../stores/requestStore';

interface RequestBuilderProps {
  request: HttpRequest;
}

type TabType = 'params' | 'headers' | 'body' | 'auth' | 'settings';

export const RequestBuilder: React.FC<RequestBuilderProps> = ({ request }) => {
  const [activeTab, setActiveTab] = useState<TabType>('params');
  const { setParams, setHeaders, setBody, setAuth, setSettings } = useRequestStore();

  const activeParamsCount = request.params.filter((p) => p.enabled && p.key.trim().length > 0).length;
  const activeHeadersCount = request.headers.filter((h) => h.enabled && h.key.trim().length > 0).length;
  const hasAuth = request.auth.type !== 'none';
  const hasBody = request.body.type !== 'none';
  const hasSslDisabled = request.settings?.verifySsl === false;

  return (
    <div className="flex flex-col h-full bg-surface-card overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-3 border-b border-surface-border bg-surface-panel/40">
        <button
          type="button"
          onClick={() => setActiveTab('params')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'params'
              ? 'border-brand-500 text-brand-400 bg-surface-card/60'
              : 'border-transparent text-surface-muted hover:text-slate-200 hover:bg-surface-panel/50'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Params</span>
          {activeParamsCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('headers')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'headers'
              ? 'border-brand-500 text-brand-400 bg-surface-card/60'
              : 'border-transparent text-surface-muted hover:text-slate-200 hover:bg-surface-panel/50'
          }`}
        >
          <span>Headers</span>
          {activeHeadersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-panel text-slate-300 font-mono">
              {activeHeadersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('body')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'body'
              ? 'border-brand-500 text-brand-400 bg-surface-card/60'
              : 'border-transparent text-surface-muted hover:text-slate-200 hover:bg-surface-panel/50'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Body</span>
          {hasBody && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-brand-500/20 text-brand-300 uppercase font-mono">
              {request.body.type}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auth')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'auth'
              ? 'border-brand-500 text-brand-400 bg-surface-card/60'
              : 'border-transparent text-surface-muted hover:text-slate-200 hover:bg-surface-panel/50'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Auth</span>
          {hasAuth && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-brand-500 text-brand-400 bg-surface-card/60'
              : 'border-transparent text-surface-muted hover:text-slate-200 hover:bg-surface-panel/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Settings</span>
          {hasSslDisabled && (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 ml-0.5" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'params' && (
          <ParamsEditor params={request.params} onChange={setParams} />
        )}
        {activeTab === 'headers' && (
          <HeadersEditor headers={request.headers} onChange={setHeaders} />
        )}
        {activeTab === 'body' && (
          <BodyEditor body={request.body} onChange={setBody} />
        )}
        {activeTab === 'auth' && (
          <AuthEditor auth={request.auth} onChange={setAuth} />
        )}
        {activeTab === 'settings' && (
          <SettingsEditor settings={request.settings} onChange={setSettings} />
        )}
      </div>
    </div>
  );
};
