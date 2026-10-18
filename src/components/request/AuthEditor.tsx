import React, { useState, useEffect } from 'react';
import { AuthConfig, AuthType } from '../../types/http';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { keychain } from '../../utils/keychain';

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

const AUTH_TYPES: { type: AuthType; label: string; desc: string }[] = [
  { type: 'inherit', label: 'Inherit Auth', desc: 'Use parent collection or folder authentication' },
  { type: 'none', label: 'No Auth', desc: 'Default, public requests' },
  { type: 'bearer', label: 'Bearer Token', desc: 'JWT or API token in header' },
  { type: 'basic', label: 'Basic Auth', desc: 'Username and password credentials' },
  { type: 'apikey', label: 'API Key', desc: 'Custom header or query parameter' },
];

export const AuthEditor: React.FC<AuthEditorProps> = ({ auth, onChange }) => {
  const [showSecret, setShowSecret] = useState(false);
  const [keychainAvailable, setKeychainAvailable] = useState<boolean>(true);

  useEffect(() => {
    keychain.isAvailable().then(setKeychainAvailable);
    return keychain.onAvailabilityChange(setKeychainAvailable);
  }, []);

  const handleTypeChange = (type: AuthType) => {
    onChange({
      ...auth,
      type,
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-full p-3 gap-4">
      {/* Sidebar Auth Type Selection */}
      <div className="w-full md:w-56 flex flex-col gap-1 border-b md:border-b-0 md:border-r border-surface-border pb-3 md:pb-0 md:pr-3">
        <span className="text-[11px] font-semibold text-surface-muted uppercase tracking-wider mb-1 px-2">
          Auth Type
        </span>
        {AUTH_TYPES.map((at) => (
          <button
            key={at.type}
            type="button"
            onClick={() => handleTypeChange(at.type)}
            className={`flex flex-col text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
              auth.type === at.type
                ? 'bg-brand-500/10 text-brand-primary border border-brand-500/30 font-medium'
                : 'text-surface-text hover:bg-surface-panel border border-transparent'
            }`}
          >
            <span>{at.label}</span>
            <span className="text-[10px] text-surface-muted mt-0.5 leading-tight">{at.desc}</span>
          </button>
        ))}
      </div>

      {/* Auth Parameters Panel */}
      <div className="flex-1 min-h-[220px]">
        {!keychainAvailable && auth.type !== 'none' && auth.type !== 'inherit' && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-2 text-xs mb-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-snug">
              <strong className="block font-medium">OS Secure Keychain Unavailable (OP-SEC-002)</strong>
              Secrets will be stored in memory for this session only and will not persist across restarts.
            </div>
          </div>
        )}

        {auth.type === 'inherit' && (
          <div className="flex flex-col items-center justify-center h-full text-center text-surface-muted py-12">
            <Shield className="w-8 h-8 text-brand-primary mb-2" />
            <p className="text-sm font-medium text-surface-text">Inherit Authentication from Parent</p>
            <p className="text-xs text-surface-muted mt-1 max-w-sm">
              This request will automatically inherit credentials configured on its enclosing collection or folder during Send.
            </p>
          </div>
        )}

        {auth.type === 'none' && (
          <div className="flex flex-col items-center justify-center h-full text-center text-surface-muted py-12">
            <Shield className="w-8 h-8 text-surface-muted mb-2" />
            <p className="text-sm font-medium text-surface-text">No Authentication Configured</p>
            <p className="text-xs text-surface-muted mt-1">This request will not carry any credentials</p>
          </div>
        )}

        {auth.type === 'bearer' && (
          <div className="max-w-xl space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-surface-text mb-1.5 flex items-center justify-between">
                <span>Bearer Token</span>
                <span className="text-[11px] text-surface-muted">Supports variable substitution like {`{{token}}`}</span>
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={auth.bearer?.token || ''}
                  placeholder="Paste token or {{api_token}}"
                  onChange={(e) =>
                    onChange({
                      ...auth,
                      bearer: { token: e.target.value },
                    })
                  }
                  className="w-full bg-surface-panel text-surface-text placeholder:text-surface-muted font-mono text-xs py-2 pl-3 pr-10 rounded-lg border border-surface-border focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-muted hover:text-surface-text cursor-pointer p-1"
                  title={showSecret ? 'Hide token' : 'Show token'}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {auth.type === 'basic' && (
          <div className="max-w-xl space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-surface-text mb-1.5">Username</label>
              <input
                type="text"
                value={auth.basic?.username || ''}
                placeholder="Username or {{username}}"
                onChange={(e) =>
                  onChange({
                    ...auth,
                    basic: {
                      username: e.target.value,
                      password: auth.basic?.password || '',
                    },
                  })
                }
                className="w-full bg-surface-panel text-surface-text placeholder:text-surface-muted font-mono text-xs py-2 px-3 rounded-lg border border-surface-border focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-text mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={auth.basic?.password || ''}
                  placeholder="Password or {{password}}"
                  onChange={(e) =>
                    onChange({
                      ...auth,
                      basic: {
                        username: auth.basic?.username || '',
                        password: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-surface-panel text-surface-text placeholder:text-surface-muted font-mono text-xs py-2 pl-3 pr-10 rounded-lg border border-surface-border focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-muted hover:text-surface-text cursor-pointer p-1"
                  title={showSecret ? 'Hide password' : 'Show password'}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {auth.type === 'apikey' && (
          <div className="max-w-xl space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-text mb-1.5">Key</label>
                <input
                  type="text"
                  value={auth.apiKey?.key || ''}
                  placeholder="e.g. X-API-Key"
                  onChange={(e) =>
                    onChange({
                      ...auth,
                      apiKey: {
                        key: e.target.value,
                        value: auth.apiKey?.value || '',
                        addTo: auth.apiKey?.addTo || 'header',
                      },
                    })
                  }
                  className="w-full bg-surface-panel text-surface-text placeholder:text-surface-muted font-mono text-xs py-2 px-3 rounded-lg border border-surface-border focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-text mb-1.5">Add To</label>
                <select
                  value={auth.apiKey?.addTo || 'header'}
                  onChange={(e) =>
                    onChange({
                      ...auth,
                      apiKey: {
                        key: auth.apiKey?.key || '',
                        value: auth.apiKey?.value || '',
                        addTo: e.target.value as 'header' | 'query',
                      },
                    })
                  }
                  className="w-full bg-surface-panel text-surface-text text-xs py-2 px-3 rounded-lg border border-surface-border focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
                >
                  <option value="header">Header</option>
                  <option value="query">Query Params</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-text mb-1.5">Value</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={auth.apiKey?.value || ''}
                  placeholder="API Key value"
                  onChange={(e) =>
                    onChange({
                      ...auth,
                      apiKey: {
                        key: auth.apiKey?.key || '',
                        value: e.target.value,
                        addTo: auth.apiKey?.addTo || 'header',
                      },
                    })
                  }
                  className="w-full bg-surface-panel text-surface-text placeholder:text-surface-muted font-mono text-xs py-2 pl-3 pr-10 rounded-lg border border-surface-border focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-muted hover:text-surface-text cursor-pointer p-1"
                  title={showSecret ? 'Hide value' : 'Show value'}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
