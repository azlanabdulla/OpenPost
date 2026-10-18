import React from 'react';
import { useToastStore, ToastItem } from '../../stores/toastStore';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-9 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast: ToastItem) => {
        let borderClass = 'border-brand-500/30';
        let bgClass = 'bg-surface-card';
        let IconComponent = Info;
        let iconColor = 'text-cyan-400';

        if (toast.type === 'success') {
          borderClass = 'border-emerald-500/40';
          IconComponent = CheckCircle2;
          iconColor = 'text-emerald-400';
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-500/40';
          IconComponent = AlertCircle;
          iconColor = 'text-rose-400';
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-500/40';
          IconComponent = AlertTriangle;
          iconColor = 'text-amber-400';
        }

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl border ${borderClass} ${bgClass} shadow-xl shadow-black/10 dark:shadow-black/40 text-surface-text transition-all animate-in slide-in-from-bottom-2 duration-200 select-text`}
          >
            <IconComponent className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold leading-tight">{toast.title}</h4>
              {toast.message && (
                <p className="text-[11px] text-surface-muted mt-0.5 leading-snug break-words">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md text-surface-muted hover:text-surface-text hover:bg-surface-panel transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
