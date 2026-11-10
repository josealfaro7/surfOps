import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Diálogo modal accesible (reemplaza window.confirm / window.prompt).
 * - role="dialog" + aria-modal, título enlazado
 * - Escape cierra, clic fuera cierra, el foco entra al diálogo y vuelve al cerrar
 * - Botones de 44 px de alto
 */
export function Dialog({ open, title, children, onClose, footer, labelledBy = 'dialog-title' }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector('[data-autofocus]') || panel?.querySelector('input, select, button');
    first?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === 'Tab' && panel) {
        // Mantener el foco dentro del diálogo
        const focusables = [...panel.querySelectorAll('button, input, select, textarea, a[href]')].filter(
          (el) => !el.disabled
        );
        if (focusables.length === 0) return;
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
      style={{ overscrollBehavior: 'contain' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="w-full sm:max-w-md bg-white rounded-t-xl sm:rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 id={labelledBy} className="text-xl font-bold text-blue-950">
          {title}
        </h2>
        <div className="text-base text-slate-700 space-y-3">{children}</div>
        {footer && <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">{footer}</div>}
      </div>
    </div>
  );
}

export function DialogButton({ tone = 'neutral', className = '', ...props }) {
  const tones = {
    neutral: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50',
    primary: 'bg-blue-950 text-white hover:bg-blue-900',
    danger: 'bg-rose-700 text-white hover:bg-rose-800',
  };
  return (
    <button
      type="button"
      className={`h-11 px-5 text-base font-semibold transition-colors cursor-pointer disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    />
  );
}

const ConfirmContext = createContext(null);

/**
 * Proveedor de confirmaciones: const confirm = useConfirm();
 *   if (await confirm({ title, message, confirmLabel, tone: 'danger' })) { ... }
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setState(opts);
      }),
    []
  );

  const close = useCallback((value) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={Boolean(state)}
        title={state?.title || '¿Confirmar?'}
        onClose={() => close(false)}
        labelledBy="confirm-title"
        footer={
          <>
            <DialogButton onClick={() => close(false)}>{state?.cancelLabel || 'Cancelar'}</DialogButton>
            <DialogButton tone={state?.tone === 'danger' ? 'danger' : 'primary'} data-autofocus onClick={() => close(true)}>
              {state?.confirmLabel || 'Confirmar'}
            </DialogButton>
          </>
        }
      >
        {state?.message && <p>{state.message}</p>}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ctx;
}
