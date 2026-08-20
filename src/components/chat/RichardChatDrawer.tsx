import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { UIMessage } from 'ai';
import { useRichardChat } from '../../hooks/useRichardChat';
import { useRole } from '../../hooks/useRole';
import { buildProfileGuideRequest } from '../../lib/ai/profileGuides';
import {
  getFriendlyChatErrorMessage,
  getRichardToolBadges,
  getUIMessageText,
  isRichardQueryingDatabase,
} from '../../lib/ai/chatUtils';
import { cn } from '../../lib/cn';
import RichardMarkdown from './RichardMarkdown';
import RichardChatFab from './RichardChatFab';
import RichardChatSidebar from './RichardChatSidebar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface RichardChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_REPLIES = [
  { prompt: 'Planning de la journée' },
  { prompt: 'Urgences maintenance' },
  { prompt: 'Affaires type électricité' },
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
  const { user } = useRole();
  const {
    messages,
    sendMessage,
    status,
    error,
    currentEntity,
    currentSessionId,
    sessions,
    sessionsLoading,
    isFullScreen,
    isSidebarOpen,
    isMinimized,
    hasUnread,
    startNewChat,
    selectSession,
    toggleFullScreen,
    toggleSidebar,
    deleteCurrentChat,
    minimizeChat,
    restoreWindow,
    closeWindow,
  } = useRichardChat();
  const [input, setInput] = useState('');
  const [timestamps, setTimestamps] = useState<Record<string, Date>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const isQueryingDatabase = isRichardQueryingDatabase(messages);
  const panelOpen = open && !isMinimized;

  useEffect(() => {
    if (open) restoreWindow();
  }, [open, restoreWindow]);

  useEffect(() => {
    if (panelOpen) scrollToBottom();
  }, [panelOpen, messages, status, isQueryingDatabase, scrollToBottom]);

  useEffect(() => {
    if (!isFullScreen || !panelOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isFullScreen, panelOpen]);

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

  const handleNewChat = () => {
    startNewChat();
    setTimestamps({});
    setCopiedMessageId(null);
    setInput('');
  };

  const handleSelectSession = (sessionId: string) => {
    void selectSession(sessionId);
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

  const handleMinimize = () => {
    minimizeChat();
    onOpenChange(false);
  };

  const handleClose = () => {
    closeWindow();
    onOpenChange(false);
  };

  const handleRestoreFromFab = () => {
    restoreWindow();
    onOpenChange(true);
  };

  const handleOpenProfileGuide = () => {
    sendUserText(buildProfileGuideRequest(user.role));
  };

  const iconButtonClass =
    'h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30';

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
              ? 'rounded-br-md bg-slate-900 text-white'
              : 'group rounded-bl-md border border-slate-200/60 bg-slate-100/80 text-slate-800'
          }`}
        >
          {!isUser && (
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Richard
            </p>
          )}
          {toolBadges}
          {text &&
            (isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{text}</p>
            ) : (
              <RichardMarkdown text={text} />
            ))}
          {(timestamp || (!isUser && text)) && (
            <div className="mt-1 flex items-center justify-between gap-2">
              {timestamp ? (
                <p className="text-[10px] text-slate-400">
                  {formatMessageTime(timestamp)}
                </p>
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

  const conversation = (
    <>
      <button
        type="button"
        disabled={isBusy}
        onClick={handleOpenProfileGuide}
        className="flex shrink-0 items-center gap-2 border-b border-slate-200/80 bg-slate-100 px-4 py-2.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <BookOpen size={14} className="shrink-0 text-slate-500" />
        Guides & Fiches Métier
      </button>

      <div
        className={cn(
          'min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4',
          isFullScreen && 'mx-auto w-full max-w-3xl',
        )}
      >
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
            <Bot size={32} strokeWidth={1.75} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Bonjour, je suis Richard</p>
            <p className="mt-1 max-w-[280px] text-xs">
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
                  className="rounded-lg border border-slate-200/80 bg-slate-100 p-2.5 text-left text-xs text-slate-700 transition-all hover:bg-slate-200 disabled:opacity-50"
                >
                  {reply.prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(renderMessage)}

        {isQueryingDatabase && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200/60 bg-slate-100/80 px-3.5 py-2.5 text-sm text-slate-600">
              <Loader2 size={14} className="animate-spin text-slate-500" />
              <span>Consultation de la base de données SINFONI…</span>
            </div>
          </div>
        )}

        {isThinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200/60 bg-slate-100/80 px-3.5 py-2.5 text-sm text-slate-600">
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

      <div
        className={cn(
          'shrink-0 border-t border-slate-200 bg-white p-4',
          isFullScreen && 'flex justify-center',
        )}
      >
        <div className={cn(isFullScreen && 'w-full max-w-3xl')}>
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
              className="shrink-0 bg-slate-900 text-white hover:bg-slate-800"
            >
              <Send size={16} />
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne
          </p>
        </div>
      </div>
    </>
  );

  const header = (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        {isFullScreen && (
          <div className="flex h-10 shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={iconButtonClass}
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? 'Masquer les conversations' : 'Afficher les conversations'}
              title={isSidebarOpen ? 'Masquer les conversations' : 'Afficher les conversations'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose size={16} strokeWidth={1.75} />
              ) : (
                <PanelLeft size={16} strokeWidth={1.75} />
              )}
            </Button>
          </div>
        )}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
          aria-hidden="true"
        >
          <Bot size={20} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-slate-900">Richard — Assistant SINFONI</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-500">En ligne</span>
          </p>
          {currentEntity?.id && (
            <p className="mt-0.5 truncate text-[10px] font-normal text-slate-400" title={currentEntity.id}>
              Contexte : {currentEntity.id}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!isFullScreen && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={iconButtonClass}
            onClick={handleNewChat}
            aria-label="Nouveau chat"
            title="Nouveau chat"
          >
            <Plus size={15} />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButtonClass}
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
          className={iconButtonClass}
          onClick={() => void deleteCurrentChat()}
          aria-label="Supprimer la conversation"
          title="Supprimer la conversation"
        >
          <Trash2 size={15} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButtonClass}
          onClick={toggleFullScreen}
          aria-label={isFullScreen ? 'Réduire en tiroir' : 'Plein écran'}
          title={isFullScreen ? 'Réduire en tiroir' : 'Plein écran'}
        >
          {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButtonClass}
          onClick={handleMinimize}
          aria-label="Réduire"
          title="Réduire"
        >
          <Minus size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButtonClass}
          onClick={handleClose}
          aria-label="Fermer"
          title="Fermer"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isMinimized && <RichardChatFab hasUnread={hasUnread} onClick={handleRestoreFromFab} />}

      {panelOpen && (
        <div
          role="dialog"
          aria-modal={isFullScreen}
          aria-label="Richard — Assistant SINFONI"
          className={
            isFullScreen
              ? 'fixed inset-0 z-[2100] flex bg-slate-100'
              : 'fixed bottom-0 right-0 top-0 z-[2100] flex w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl'
          }
        >
          {isFullScreen ? (
            <>
              <div
                className={cn(
                  'h-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
                  isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0',
                )}
              >
                <RichardChatSidebar
                  sessions={sessions}
                  sessionsLoading={sessionsLoading}
                  currentSessionId={currentSessionId}
                  userName={user.name}
                  userRole={user.role}
                  userAvatar={user.avatar}
                  onNewChat={handleNewChat}
                  onSelectSession={handleSelectSession}
                  onDeleteCurrent={() => void deleteCurrentChat()}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col bg-white">
                {header}
                {conversation}
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              {header}
              {conversation}
            </div>
          )}
        </div>
      )}
    </>
  );
}
