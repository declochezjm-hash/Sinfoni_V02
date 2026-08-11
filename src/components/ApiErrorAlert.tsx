import { AlertTriangle } from 'lucide-react';

interface ApiErrorAlertProps {
  title: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ApiErrorAlert({
  title,
  message,
  onRetry,
  className = '',
}: ApiErrorAlertProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 ${className}`}
      role="alert"
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed opacity-90">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-800 transition hover:bg-red-100"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}
