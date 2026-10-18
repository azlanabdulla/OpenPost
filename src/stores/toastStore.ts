import { create } from 'zustand';
import { generateId } from '../utils/url';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStoreState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId();
    const duration = toast.durationMs ?? 4000;

    set((state) => {
      // Limit to 3 most recent toasts to prevent popup spam
      const updated = [...state.toasts.slice(-2), { ...toast, id, durationMs: duration }];
      return { toasts: updated };
    });

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
