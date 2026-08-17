import { useState } from 'react';
import { Bot } from 'lucide-react';
import RichardChatDrawer from '../chat/RichardChatDrawer';

export default function HeaderChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        aria-label="Ouvrir l'assistant Richard"
      >
        <Bot size={16} />
      </button>
      <RichardChatDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
