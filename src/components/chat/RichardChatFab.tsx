import { Bot } from 'lucide-react';

interface RichardChatFabProps {
  hasUnread: boolean;
  onClick: () => void;
}

export default function RichardChatFab({ hasUnread, onClick }: RichardChatFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative fixed bottom-6 right-6 z-[2100] flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:bg-slate-100"
      aria-label="Ouvrir Richard"
      title="Ouvrir Richard"
    >
      <Bot size={20} strokeWidth={1.75} />
      {hasUnread && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-slate-900 ring-2 ring-white" />
      )}
    </button>
  );
}
