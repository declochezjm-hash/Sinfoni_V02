import { Loader2, Plus, Trash2 } from 'lucide-react';
import type { RichardChatSessionSummary } from '../../lib/ai/richardPersistence';
import { Button } from '../ui/button';
import { cn } from '../../lib/cn';

interface RichardChatSidebarProps {
  sessions: RichardChatSessionSummary[];
  sessionsLoading: boolean;
  currentSessionId: string;
  userName: string;
  userRole: string;
  userAvatar?: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteCurrent: () => void;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function RichardChatSidebar({
  sessions,
  sessionsLoading,
  currentSessionId,
  userName,
  userRole,
  userAvatar,
  onNewChat,
  onSelectSession,
  onDeleteCurrent,
}: RichardChatSidebarProps) {
  return (
    <aside className="flex h-full w-64 min-w-64 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-3">
        <Button
          type="button"
          variant="outline"
          onClick={onNewChat}
          className="w-full justify-start gap-2 border-slate-200/80 bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <Plus size={16} strokeWidth={1.75} />
          Nouveau chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Récents
        </p>
        {sessionsLoading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-2 text-xs text-slate-500">Aucune conversation pour le moment.</p>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((session) => {
              const active = session.sessionId === currentSessionId;
              return (
                <li key={session.sessionId}>
                  <button
                    type="button"
                    onClick={() => onSelectSession(session.sessionId)}
                    className={cn(
                      'group flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors',
                      active
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                    )}
                    title={session.title}
                  >
                    <span className="truncate text-sm font-medium">{session.title}</span>
                    <span className="mt-0.5 text-[10px] text-slate-500">
                      {formatRelativeTime(session.updatedAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-2 rounded-lg bg-slate-900 p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200">
            {userAvatar || userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{userName}</p>
            <p className="truncate text-[10px] text-slate-400">{userRole}</p>
          </div>
          <button
            type="button"
            onClick={onDeleteCurrent}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Supprimer la conversation courante"
            title="Supprimer la conversation courante"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
