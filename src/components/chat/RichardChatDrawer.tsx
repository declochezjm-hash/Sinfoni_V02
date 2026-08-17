import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, CheckCircle2, Database, Loader2, RotateCcw, Send, X } from 'lucide-react';
import type { UIMessage } from 'ai';
import { useRichardChat } from '../../hooks/useRichardChat';
import {
  getFriendlyChatErrorMessage,
  getRichardToolBadges,
  getUIMessageText,
  isRichardQueryingDatabase,
} from '../../lib/ai/chatUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';

interface RichardChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function RichardChatDrawer({ open, onOpenChange }: RichardChatDrawerProps) {
  const { messages, sendMessage, status, setMessages, error } = useRichardChat();
  const [input, setInput] = useState('');
  const [timestamps, setTimestamps] = useState<Record<string, Date>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const isQueryingDatabase = isRichardQueryingDatabase(messages);

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [open, messages, status, isQueryingDatabase, scrollToBottom]);

  useEffect(() => {
    setTimestamps((prev) => {
      let hasNew = false;
      const updated = { ...prev };
      for (const message of messages) {
        if (!updated[message.id]) {
          updated[message.id] = new Date();
          hasNew = true;
        }
      }
      return hasNew ? updated : prev;
    });
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const hasStreamingAssistantText =
    status === 'streaming' &&
    lastMessage?.role === 'assistant' &&
    getUIMessageText(lastMessage).length > 0;

  const isThinking =
    !isQueryingDatabase &&
    (status === 'submitted' || (status === 'streaming' && !hasStreamingAssistantText));
  const isBusy = status === 'submitted' || status === 'streaming';

  const handleReset = () => {
    setMessages([]);
    setTimestamps({});
    setInput('');
  };

  const sendUserMessage = () => {
    const text = input.trim();
    if (!text || isBusy) return;

    sendMessage({ text });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage();
    }
  };

  const renderToolBadges = (message: UIMessage) => {
    const badges = getRichardToolBadges(message);
    if (badges.length === 0) return null;

    return (
      <div className="mb-2 flex flex-col gap-1">
        {badges.map((badge) => (
          <Badge
            key={badge.partKey}
            variant="outline"
            className={
              badge.status === 'success'
                ? 'gap-1 border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-800'
                : 'gap-1 border-amber-200 bg-amber-50 text-[10px] font-medium text-amber-900'
            }
          >
            {badge.status === 'success' ? (
              <CheckCircle2 size={11} className="shrink-0" />
            ) : (
              <AlertCircle size={11} className="shrink-0" />
            )}
            <Database size={11} className="shrink-0 opacity-60" />
            <span>{badge.label}</span>
          </Badge>
        ))}
      </div>
    );
  };

  const renderMessage = (message: UIMessage) => {
    const text = getUIMessageText(message);
    const isUser = message.role === 'user';
    const timestamp = timestamps[message.id];
    const toolBadges = !isUser ? renderToolBadges(message) : null;

    if (!text && message.role === 'assistant' && isBusy && !toolBadges) {
      return null;
    }

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
            isUser
              ? 'bg-slate-900 text-white rounded-br-md'
              : 'bg-slate-100 text-slate-800 rounded-bl-md'
          }`}
        >
          {!isUser && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Richard
            </p>
          )}
          {toolBadges}
          {text && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{text}</p>
          )}
          {timestamp && (
            <p className="mt-1 text-[10px] text-slate-400">{formatMessageTime(timestamp)}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showClose={false} className="flex flex-col p-0">
        <SheetHeader className="shrink-0 border-b border-slate-200 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Bot size={20} />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-sm font-bold text-slate-900">
                  Richard — Assistant SINFONI
                </SheetTitle>
                <SheetDescription className="mt-1 flex items-center gap-1.5 text-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-emerald-600 font-medium">En ligne</span>
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                onClick={handleReset}
                aria-label="Réinitialiser la discussion"
                title="Réinitialiser la discussion"
              >
                <RotateCcw size={15} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
                onClick={() => onOpenChange(false)}
                aria-label="Fermer"
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Bot size={32} className="mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Bonjour, je suis Richard</p>
              <p className="mt-1 text-xs max-w-[280px]">
                Posez une question sur vos affaires, le patrimoine énergétique ou l'utilisation de
                SINFONI.
              </p>
            </div>
          )}

          {messages.map(renderMessage)}

          {isQueryingDatabase && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                <Loader2 size={14} className="animate-spin text-slate-500" />
                <span>Consultation de la base de données SINFONI…</span>
              </div>
            </div>
          )}

          {isThinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2.5 text-sm text-slate-600">
                <Loader2 size={14} className="animate-spin text-slate-500" />
                <span>Richard réfléchit…</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {getFriendlyChatErrorMessage(error)}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white p-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez votre message…"
              rows={2}
              disabled={isBusy}
              className="min-h-[44px] resize-none text-sm"
            />
            <Button
              type="button"
              size="icon"
              onClick={sendUserMessage}
              disabled={!input.trim() || isBusy}
              aria-label="Envoyer"
              className="shrink-0"
            >
              <Send size={16} />
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
