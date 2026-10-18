import React from 'react';
import { KeyValueParam } from '../../types/http';
import { generateId } from '../../utils/url';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';

interface KeyValueTableProps {
  items: KeyValueParam[];
  onChange: (items: KeyValueParam[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  showDescription?: boolean;
}

export const KeyValueTable: React.FC<KeyValueTableProps> = ({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  showDescription = true,
}) => {
  const handleToggle = (id: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleUpdate = (id: string, field: keyof KeyValueParam, value: string) => {
    const nextItems = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );

    // Auto append empty row if modifying the last row and key is not empty
    const lastItem = nextItems[nextItems.length - 1];
    if (lastItem && lastItem.id === id && value.trim().length > 0 && field === 'key') {
      nextItems.push({
        id: generateId(),
        key: '',
        value: '',
        enabled: true,
        description: '',
      });
    }

    onChange(nextItems);
  };

  const handleDelete = (id: string) => {
    if (items.length <= 1) {
      onChange([{ id: generateId(), key: '', value: '', enabled: true, description: '' }]);
      return;
    }
    onChange(items.filter((item) => item.id !== id));
  };

  const handleAddRow = () => {
    onChange([
      ...items,
      { id: generateId(), key: '', value: '', enabled: true, description: '' },
    ]);
  };

  return (
    <div className="w-full flex flex-col h-full bg-surface-card border border-surface-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface-panel/80 text-surface-muted uppercase tracking-wider text-[11px] border-b border-surface-border">
              <th className="py-2.5 px-3 w-10 text-center"></th>
              <th className="py-2.5 px-3 font-medium border-r border-surface-border/50">{keyPlaceholder}</th>
              <th className="py-2.5 px-3 font-medium border-r border-surface-border/50">{valuePlaceholder}</th>
              {showDescription && (
                <th className="py-2.5 px-3 font-medium border-r border-surface-border/50">Description</th>
              )}
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/40 font-mono">
            {items.map((row) => (
              <tr
                key={row.id}
                className={`group hover:bg-surface-hover/50 transition-colors ${
                  !row.enabled ? 'opacity-40' : ''
                }`}
              >
                <td className="py-1 px-3 text-center">
                  <button
                    type="button"
                    aria-label={row.enabled ? `Disable ${row.key || 'parameter'}` : `Enable ${row.key || 'parameter'}`}
                    onClick={() => handleToggle(row.id)}
                    className="text-surface-muted hover:text-brand-400 focus:outline-none transition-colors cursor-pointer"
                    title={row.enabled ? 'Disable parameter' : 'Enable parameter'}
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
                    aria-label={`${keyPlaceholder} name`}
                    placeholder={keyPlaceholder}
                    onChange={(e) => handleUpdate(row.id, 'key', e.target.value)}
                    className="w-full bg-transparent px-2 py-1 text-surface-text placeholder:text-surface-muted focus:outline-none focus:bg-surface-panel/50 rounded font-mono"
                  />
                </td>
                <td className="py-1 px-2 border-r border-surface-border/30">
                  <input
                    type="text"
                    value={row.value}
                    aria-label={`${valuePlaceholder} value`}
                    placeholder={valuePlaceholder}
                    onChange={(e) => handleUpdate(row.id, 'value', e.target.value)}
                    className="w-full bg-transparent px-2 py-1 text-surface-text placeholder:text-surface-muted focus:outline-none focus:bg-surface-panel/50 rounded font-mono"
                  />
                </td>
                {showDescription && (
                  <td className="py-1 px-2 border-r border-surface-border/30 font-sans">
                    <input
                      type="text"
                      value={row.description || ''}
                      aria-label="Parameter description"
                      placeholder="Optional description"
                      onChange={(e) => handleUpdate(row.id, 'description', e.target.value)}
                      className="w-full bg-transparent px-2 py-1 text-surface-text text-xs placeholder:text-surface-muted focus:outline-none focus:bg-surface-panel/50 rounded"
                    />
                  </td>
                )}
                <td className="py-1 px-2 text-center">
                  <button
                    type="button"
                    aria-label={`Delete row ${row.key || ''}`}
                    onClick={() => handleDelete(row.id)}
                    className="opacity-0 group-hover:opacity-100 text-surface-muted hover:text-rose-500 focus:outline-none p-1 rounded transition cursor-pointer"
                    title="Delete row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 border-t border-surface-border bg-surface-panel/30 flex justify-between items-center text-xs">
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-1.5 text-xs text-brand-primary hover:text-brand-hover font-medium px-2 py-1 rounded hover:bg-brand-500/10 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Row
        </button>
        <span className="text-[11px] text-surface-muted font-mono">
          {items.filter((i) => i.enabled && i.key.trim()).length} active / {items.length} total
        </span>
      </div>
    </div>
  );
};
