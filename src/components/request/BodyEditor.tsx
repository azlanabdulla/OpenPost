import React, { useState } from 'react';
import { BodyType, KeyValueParam, MultipartField, RequestBody } from '../../types/http';
import { CodeMirrorEditor } from '../../editor/CodeMirrorEditor';
import { KeyValueTable } from '../common/KeyValueTable';
import { generateId } from '../../utils/url';
import { validateJsonString, JsonValidationResult } from '../../utils/jsonValidator';
import { Wand2, Plus, Trash2, CheckSquare, Square, Upload, AlertCircle } from 'lucide-react';

interface BodyEditorProps {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
}

const BODY_TYPES: Array<{ type: BodyType; label: string }> = [
  { type: 'none', label: 'none' },
  { type: 'json', label: 'JSON' },
  { type: 'text', label: 'Raw Text' },
  { type: 'form-urlencoded', label: 'x-www-form-urlencoded' },
  { type: 'multipart', label: 'multipart / form-data' },
];

export const BodyEditor: React.FC<BodyEditorProps> = ({ body, onChange }) => {
  const [validationResult, setValidationResult] = useState<JsonValidationResult>(() =>
    validateJsonString(body.rawJson || '')
  );

  const handleTypeChange = (type: BodyType) => {
    onChange({ ...body, type });
  };

  const handleJsonChange = (rawJson: string) => {
    onChange({ ...body, rawJson });
    setValidationResult(validateJsonString(rawJson));
  };

  const handleFormatJson = () => {
    try {
      if (!body.rawJson?.trim()) return;
      const parsed = JSON.parse(body.rawJson);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange({ ...body, rawJson: formatted });
      setValidationResult({ isValid: true });
    } catch {
      setValidationResult(validateJsonString(body.rawJson || ''));
    }
  };

  // Multipart helper handlers
  const multipartFields: MultipartField[] = body.multipart || [];

  const updateMultipart = (fields: MultipartField[]) => {
    onChange({ ...body, multipart: fields });
  };

  const addMultipartRow = () => {
    updateMultipart([
      ...multipartFields,
      { id: generateId(), key: '', type: 'text', value: '', enabled: true, description: '' },
    ]);
  };

  const updateMultipartField = (id: string, updates: Partial<MultipartField>) => {
    updateMultipart(
      multipartFields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const deleteMultipartField = (id: string) => {
    updateMultipart(multipartFields.filter((f) => f.id !== id));
  };

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      {/* Sub-type radio pills */}
      <div className="flex items-center justify-between border-b border-surface-border pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {BODY_TYPES.map((bt) => (
            <button
              key={bt.type}
              type="button"
              onClick={() => handleTypeChange(bt.type)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                body.type === bt.type
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/50 shadow-sm'
                  : 'text-surface-muted hover:text-slate-200 hover:bg-surface-panel border border-transparent'
              }`}
            >
              {bt.label}
            </button>
          ))}
        </div>

        {body.type === 'json' && (
          <div className="flex items-center gap-2">
            {!validationResult.isValid && (
              <span className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded font-mono">
                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>
                  OP-BODY-001: Invalid JSON
                  {validationResult.line !== undefined &&
                    ` (Line ${validationResult.line}${
                      validationResult.column !== undefined ? `, Col ${validationResult.column}` : ''
                    })`}
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={handleFormatJson}
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 bg-surface-panel hover:bg-surface-hover border border-surface-border px-2.5 py-1 rounded transition cursor-pointer"
              title="Prettify JSON"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Prettify
            </button>
          </div>
        )}
      </div>

      {/* Body Content Area */}
      <div className="flex-1 min-h-[220px]">
        {body.type === 'none' && (
          <div className="flex flex-col items-center justify-center h-full text-center text-surface-muted py-12 border border-dashed border-surface-border rounded-lg bg-surface-panel/20">
            <p className="text-sm font-medium text-slate-400">This request does not have a body</p>
            <p className="text-xs text-slate-500 mt-1">Select JSON, Text, or Form-Data above to send payload data</p>
          </div>
        )}

        {body.type === 'json' && (
          <CodeMirrorEditor
            value={body.rawJson || ''}
            language="json"
            onChange={handleJsonChange}
          />
        )}

        {body.type === 'text' && (
          <CodeMirrorEditor
            value={body.rawText || ''}
            language="text"
            onChange={(rawText) => onChange({ ...body, rawText })}
          />
        )}

        {body.type === 'form-urlencoded' && (
          <KeyValueTable
            items={body.formUrlencoded || []}
            onChange={(formUrlencoded: KeyValueParam[]) => onChange({ ...body, formUrlencoded })}
            keyPlaceholder="Form Key"
            valuePlaceholder="Form Value"
          />
        )}

        {body.type === 'multipart' && (
          <div className="w-full flex flex-col h-full bg-surface-card border border-surface-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-panel/80 text-surface-muted uppercase tracking-wider text-[11px] border-b border-surface-border">
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                    <th className="py-2.5 px-3 font-medium border-r border-surface-border/50">Field Key</th>
                    <th className="py-2.5 px-3 w-24 font-medium border-r border-surface-border/50">Type</th>
                    <th className="py-2.5 px-3 font-medium border-r border-surface-border/50">Value / File</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/40 font-mono">
                  {multipartFields.map((row) => (
                    <tr
                      key={row.id}
                      className={`group hover:bg-surface-hover/50 transition-colors ${
                        !row.enabled ? 'opacity-40' : ''
                      }`}
                    >
                      <td className="py-1 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => updateMultipartField(row.id, { enabled: !row.enabled })}
                          className="text-surface-muted hover:text-brand-400 focus:outline-none"
                        >
                          {row.enabled ? (
                            <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="py-1 px-2 border-r border-surface-border/30">
                        <input
                          type="text"
                          value={row.key}
                          placeholder="Key"
                          onChange={(e) => updateMultipartField(row.id, { key: e.target.value })}
                          className="w-full bg-transparent px-2 py-1 text-slate-200 placeholder-slate-600 focus:outline-none rounded"
                        />
                      </td>
                      <td className="py-1 px-2 border-r border-surface-border/30">
                        <select
                          value={row.type}
                          onChange={(e) =>
                            updateMultipartField(row.id, {
                              type: e.target.value as 'text' | 'file',
                              value: '',
                            })
                          }
                          className="bg-surface-panel text-slate-300 text-xs px-2 py-1 rounded border border-surface-border"
                        >
                          <option value="text">Text</option>
                          <option value="file">File</option>
                        </select>
                      </td>
                      <td className="py-1 px-2 border-r border-surface-border/30">
                        {row.type === 'file' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={row.value}
                              placeholder="Local file path"
                              onChange={(e) => updateMultipartField(row.id, { value: e.target.value })}
                              className="flex-1 bg-transparent px-2 py-1 text-slate-300 placeholder-slate-600 focus:outline-none rounded"
                            />
                            <label className="cursor-pointer flex items-center gap-1 px-2 py-1 bg-surface-panel hover:bg-surface-hover border border-surface-border text-slate-300 rounded text-xs">
                              <Upload className="w-3 h-3 text-brand-400" />
                              Browse
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // In web or tauri mode, store the name or path
                                    updateMultipartField(row.id, { value: file.name });
                                  }
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={row.value}
                            placeholder="Value"
                            onChange={(e) => updateMultipartField(row.id, { value: e.target.value })}
                            className="w-full bg-transparent px-2 py-1 text-slate-200 placeholder-slate-600 focus:outline-none rounded"
                          />
                        )}
                      </td>
                      <td className="py-1 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => deleteMultipartField(row.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t border-surface-border bg-surface-panel/30">
              <button
                type="button"
                onClick={addMultipartRow}
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium px-2 py-1 rounded hover:bg-brand-500/10 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Multipart Field
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
