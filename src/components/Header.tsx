import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleSwitcher from './RoleSwitcher';
import { useProjectAlerts } from '../hooks/useProjectAlerts';
import type { AlertType } from '../utils/alertEngine';
import { Bell, Search, X, AlertTriangle, Clock, FileCheck } from 'lucide-react';

const TYPE_ICONS: Record<AlertType, React.ReactNode> = {
  budget: <AlertTriangle size={14} className="text-red-500" />,
  retard: <Clock size={14} className="text-orange-500" />,
  facturation: <FileCheck size={14} className="text-blue-500" />,
};

const TYPE_COLORS: Record<AlertType, string> = {
  budget: 'border-l-red-400',
  retard: 'border-l-orange-400',
  facturation: 'border-l-blue-400',
};

const TYPE_LABELS: Record<AlertType, string> = {
  budget: 'Budget',
  retard: 'Planning',
  facturation: 'Facturation',
};

export default function Header() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { alerts, count, loading } = useProjectAlerts();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleAlertClick = (projectId: string) => {
    setOpen(false);
    navigate(`/affaires/${projectId}`);
  };

  return (
    <header className="sticky top-0 z-[1100] flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une affaire, un document..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            aria-label="Centre de notifications"
          >
            <Bell size={16} />
            {count > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 z-[1200] w-96 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Alertes</h3>
                  {count > 0 && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {count} alerte{count > 1 ? 's' : ''} active{count > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {loading ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Bell size={24} className="mb-2" />
                    <p className="text-sm">Aucune alerte active</p>
                  </div>
                ) : (
                  alerts.map((alert, index) => (
                    <button
                      key={`${alert.id}-${alert.type}-${index}`}
                      type="button"
                      onClick={() => handleAlertClick(alert.id)}
                      className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 border-l-4 ${TYPE_COLORS[alert.type]}`}
                    >
                      <div className="mt-0.5 shrink-0">{TYPE_ICONS[alert.type]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {alert.title}
                          </p>
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            {TYPE_LABELS[alert.type]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alert.message}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <RoleSwitcher />
      </div>
    </header>
  );
}
