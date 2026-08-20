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
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 p-2 text-slate-700 transition-colors hover:bg-slate-200"
        aria-label="Ouvrir l'assistant Richard"
        title="Richard — Assistant SINFONI"
      >
        <Bot size={16} strokeWidth={1.75} />
      </button>
      <RichardChatDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
