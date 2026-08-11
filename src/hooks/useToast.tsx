import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error';

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 0;
const TOAST_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = ++nextToastId;
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ toasts, pushToast, dismissToast }),
    [toasts, pushToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToasterViewport />
    </ToastContext.Provider>
  );
}

function ToasterViewport() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;

  const { toasts, dismissToast } = ctx;

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[3000] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.variant === 'success';
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              isSuccess
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
            role="status"
          >
            {isSuccess ? (
              <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs opacity-90">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
              aria-label="Fermer la notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');

  return {
    toast: {
      success: (title: string, opts?: { description?: string }) => {
        ctx.pushToast({ variant: 'success', title, description: opts?.description });
      },
      error: (title: string, opts?: { description?: string }) => {
        ctx.pushToast({ variant: 'error', title, description: opts?.description });
      },
    },
  };
}
