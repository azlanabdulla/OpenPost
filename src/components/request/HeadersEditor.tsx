import React from 'react';
import { KeyValueParam } from '../../types/http';
import { KeyValueTable } from '../common/KeyValueTable';
import { generateId } from '../../utils/url';
import { Sparkles } from 'lucide-react';

interface HeadersEditorProps {
  headers: KeyValueParam[];
  onChange: (headers: KeyValueParam[]) => void;
}

const COMMON_HEADERS = [
  { key: 'Accept', value: 'application/json' },
  { key: 'Content-Type', value: 'application/json' },
  { key: 'User-Agent', value: 'OpenPost/0.1.0' },
  { key: 'Cache-Control', value: 'no-cache' },
];

export const HeadersEditor: React.FC<HeadersEditorProps> = ({ headers, onChange }) => {
  const addCommonHeader = (key: string, value: string) => {
    // If already exists, enable it
    const existingIndex = headers.findIndex((h) => h.key.toLowerCase() === key.toLowerCase());
    if (existingIndex !== -1) {
      const updated = [...headers];
      updated[existingIndex] = { ...updated[existingIndex], value, enabled: true };
      onChange(updated);
      return;
    }

    // Otherwise insert before trailing empty row if exists
    const nextHeaders = [...headers];
    const last = nextHeaders[nextHeaders.length - 1];
    if (last && !last.key.trim()) {
      nextHeaders.splice(nextHeaders.length - 1, 0, {
        id: generateId(),
        key,
        value,
        enabled: true,
        description: '',
      });
    } else {
      nextHeaders.push({
        id: generateId(),
        key,
        value,
        enabled: true,
        description: '',
      });
    }
    onChange(nextHeaders);
  };

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <div className="flex justify-between items-center text-xs text-surface-muted px-1 flex-wrap gap-2">
        <span className="font-medium text-slate-300">Request Headers</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Presets:
          </span>
          {COMMON_HEADERS.map((ch) => (
            <button
              key={ch.key}
              type="button"
              onClick={() => addCommonHeader(ch.key, ch.value)}
              className="text-[11px] px-2 py-0.5 rounded bg-surface-panel hover:bg-surface-hover border border-surface-border text-slate-300 hover:text-brand-300 transition"
            >
              +{ch.key}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-[220px]">
        <KeyValueTable
          items={headers}
          onChange={onChange}
          keyPlaceholder="Header name"
          valuePlaceholder="Header value"
          showDescription={true}
        />
      </div>
    </div>
  );
};
