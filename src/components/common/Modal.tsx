import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    // Capture element focused before modal opened
    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on open: ONLY run when opening and focus is NOT already inside modal
    const frameId = requestAnimationFrame(() => {
      if (modalRef.current) {
        const active = document.activeElement;
        // Never steal focus from an element already focused inside the modal
        if (!modalRef.current.contains(active)) {
          const autoFocusEl = modalRef.current.querySelector<HTMLElement>('[autofocus]');
          if (autoFocusEl) {
            autoFocusEl.focus();
          } else {
            const firstInput = modalRef.current.querySelector<HTMLElement>(
              'textarea:not([disabled]), input:not([disabled]), select:not([disabled])'
            );
            if (firstInput) {
              firstInput.focus();
            } else {
              const firstFocusable = modalRef.current.querySelector<HTMLElement>(
                'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
              );
              firstFocusable?.focus();
            }
          }
        }
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function' &&
        document.body.contains(previousActiveElement.current)
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]); // Strict: runs ONLY on open/close transition, never on parent re-renders

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden select-text text-surface-text`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-border/70">
          <div>
            <h3 id="modal-title" className="text-sm font-semibold text-surface-text">
              {title}
            </h3>
            {description && (
              <p id="modal-description" className="text-xs text-surface-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-surface-muted hover:text-surface-text hover:bg-surface-panel transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 text-xs text-surface-text">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 p-3 bg-surface-panel/40 border-t border-surface-border/70">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
