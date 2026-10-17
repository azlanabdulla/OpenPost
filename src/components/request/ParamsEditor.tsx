import React from 'react';
import { KeyValueParam } from '../../types/http';
import { KeyValueTable } from '../common/KeyValueTable';

interface ParamsEditorProps {
  params: KeyValueParam[];
  onChange: (params: KeyValueParam[]) => void;
}

export const ParamsEditor: React.FC<ParamsEditorProps> = ({ params, onChange }) => {
  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <div className="flex justify-between items-center text-xs text-surface-muted px-1">
        <span className="font-medium text-slate-300">Query Parameters</span>
        <span className="text-[11px] text-slate-500">
          Parameters stay in sync with the URL query string
        </span>
      </div>
      <div className="flex-1 min-h-[220px]">
        <KeyValueTable
          items={params}
          onChange={onChange}
          keyPlaceholder="Parameter name"
          valuePlaceholder="Value"
          showDescription={true}
        />
      </div>
    </div>
  );
};
