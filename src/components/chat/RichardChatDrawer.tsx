import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Loader2,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
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

const QUICK_REPLIES = [
  { emoji: '📅', prompt: 'Planning de la journée' },
  { emoji: '🚨', prompt: 'Urgences maintenance' },
  { emoji: '📁', prompt: 'Affaires type électricité' },
] as const;

const COPY_FEEDBACK_MS = 1500;

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatExportTimestamp(date: Date): string {
  return date.toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function buildConversationExport(messages: UIMessage[], timestamps: Record<string, Date>): string {
  const generatedAt = formatExportTimestamp(new Date());
  const body = messages
    .map((message) => {
      const role = message.role === 'user' ? 'Vous' : 'Richard';
      const text = getUIMessageText(message).trim();
      if (!text) return null;
      const time = timestamps[message.id];
      const heading = time ? `**${role}** — ${formatExportTimestamp(time)}` : `**${role}**`;
      return `${heading}\n\n${text}`;
    })
    .filter((block): block is string => block != null)
    .join('\n\n---\n\n');

  return `# Conversation Richard — SINFONI\n\nExportée le ${generatedAt}\n\n${body}\n`;
}

export default function RichardChatDrawer({ open, onOpenChange }: RichardChatDrawerProps) {
  const { messages, sendMessage, status, error, resetConversation, currentEntity } =
    useRichardChat();
  const [input, setInput] = useState('');
  const [timestamps, setTimestamps] = useState<Record<string, Date>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleReset = () => {
    resetConversation();
    setTimestamps({});
    setCopiedMessageId(null);
    setInput('');
  };

  const sendUserText = (rawText: string) => {
    const text = rawText.trim();
    if (!text || isBusy) return;

    sendMessage({ text });
    setInput('');
  };

  const sendUserMessage = () => {
    sendUserText(input);
  };

  const copyAssistantMessage = async (messageId: string, text: string) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedMessageId(null);
      }, COPY_FEEDBACK_MS);
    } catch {
      // Copie silencieuse : pas de toast ni d'alerte.
    }
  };

  const exportConversation = () => {
    const markdown = buildConversationExport(messages, timestamps);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `richard-conversation-${dateStamp}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
              : 'group bg-slate-100 text-slate-800 rounded-bl-md'
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
          {(timestamp || (!isUser && text)) && (
            <div className="mt-1 flex items-center justify-between gap-2">
              {timestamp ? (
                <p className="text-[10px] text-slate-400">{formatMessageTime(timestamp)}</p>
              ) : (
                <span />
              )}
              {!isUser && text && (
                <button
                  type="button"
                  onClick={() => {
                    void copyAssistantMessage(message.id, text);
                  }}
                  className={`shrink-0 text-slate-400 transition-opacity hover:text-slate-600 ${
                    copiedMessageId === message.id
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  aria-label={
                    copiedMessageId === message.id ? 'Message copié' : 'Copier le message'
                  }
                  title={copiedMessageId === message.id ? 'Copié' : 'Copier'}
                >
                  {copiedMessageId === message.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
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
                {currentEntity?.id && (
                  <p className="mt-0.5 truncate text-[10px] font-normal text-slate-400" title={currentEntity.id}>
                    Contexte : {currentEntity.id}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                onClick={exportConversation}
                disabled={messages.length === 0}
                aria-label="Exporter la conversation"
                title="Exporter la conversation"
              >
                <Download size={15} />
              </Button>
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
              <div className="mt-6 flex w-full max-w-[280px] flex-col gap-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply.prompt}
                    type="button"
                    disabled={isBusy}
                    onClick={() => sendUserText(reply.prompt)}
                    className="border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs rounded-lg p-2.5 transition-all text-left disabled:opacity-50"
                  >
                    <span className="mr-1.5" aria-hidden="true">
                      {reply.emoji}
                    </span>
                    {reply.prompt}
                  </button>
                ))}
              </div>
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
