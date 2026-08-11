import { useActivityLogs } from '../hooks/useProjects';
import { formatRelativeTime } from '../lib/utils';
import {
  FolderKanban,
  FileText,
  GitBranch,
  User,
  ArrowRight,
} from 'lucide-react';

const ICON_MAP = {
  project: <FolderKanban size={14} />,
  document: <FileText size={14} />,
  workflow: <GitBranch size={14} />,
  user: <User size={14} />,
};

export default function ActivityFeed() {
  const { logs, loading } = useActivityLogs();

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">Journal d’activité / Traçabilité</h3>
        <button className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
          Voir tout <ArrowRight size={12} />
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              {ICON_MAP[log.targetType]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800">
                <span className="font-semibold">{log.userName}</span>{' '}
                <span className="text-slate-500">{log.action}</span>{' '}
                <span className="font-medium">{log.targetLabel}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {log.userRole} · {formatRelativeTime(log.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
