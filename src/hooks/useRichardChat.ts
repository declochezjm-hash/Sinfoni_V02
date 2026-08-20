import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useRole } from './useRole';
import {
  isLikelyUuid,
  parseRichardPageContext,
  type RichardPageContext,
} from '../lib/ai/pageContext';
import {
  createRichardSessionId,
  deleteRichardSession,
  listRichardSessions,
  loadRichardSessionMessages,
  saveRichardSession,
  type RichardChatSessionSummary,
  type RichardSessionScope,
} from '../lib/ai/richardPersistence';

const RICHARD_CHAT_API = '/api/chat/richard';
const RICHARD_SESSIONS_QUERY_KEY = 'richard-sessions';

function resolveAffaireEntityId(entityId: string, queryClient: QueryClient): string {
  if (!isLikelyUuid(entityId)) return entityId;

  const queries = queryClient.getQueriesData<Array<{ id: string; reference?: string }>>({
    queryKey: ['projects'],
  });
  for (const [, data] of queries) {
    if (!Array.isArray(data)) continue;
    const match = data.find((project) => project.id === entityId);
    if (match?.reference) return match.reference;
  }

  return entityId;
}

function resolvePageContext(pathname: string, queryClient: QueryClient): RichardPageContext {
  const parsed = parseRichardPageContext(pathname);
  if (parsed.currentEntity?.type !== 'affaire') return parsed;

  return {
    ...parsed,
    currentEntity: {
      ...parsed.currentEntity,
      id: resolveAffaireEntityId(parsed.currentEntity.id, queryClient),
    },
  };
}

export function useRichardChat() {
  const { user } = useRole();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState(createRichardSessionId);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const sessionIdRef = useRef(currentSessionId);
  sessionIdRef.current = currentSessionId;
  const isMinimizedRef = useRef(isMinimized);
  isMinimizedRef.current = isMinimized;

  const scope: RichardSessionScope = useMemo(
    () => ({
      organizationId: user.organizationId,
      userId: user.id,
    }),
    [user.organizationId, user.id],
  );
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const pageContext = useMemo(
    () => resolvePageContext(location.pathname, queryClient),
    [location.pathname, queryClient],
  );

  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: RICHARD_CHAT_API,
        body: () => {
          const { currentPath, currentEntity } = resolvePageContext(
            pathnameRef.current,
            queryClientRef.current,
          );
          const sessionId = sessionIdRef.current;
          return {
            userRole: user.role,
            userName: user.name,
            tenantId: user.organizationId,
            userId: user.id,
            communeInseeCode: user.communeInseeCode,
            sessionId,
            sessionKey: sessionId,
            currentPath,
            currentEntity,
          };
        },
      }),
    [user.role, user.name, user.organizationId, user.id, user.communeInseeCode],
  );

  const persistMessages = useCallback(async (messages: UIMessage[]) => {
    if (messages.length === 0) return;
    await saveRichardSession(scopeRef.current, sessionIdRef.current, messages);
    await queryClientRef.current.invalidateQueries({ queryKey: [RICHARD_SESSIONS_QUERY_KEY] });
  }, []);

  const persistRef = useRef(persistMessages);
  persistRef.current = persistMessages;

  const chat = useChat({
    transport,
    onFinish: ({ messages, isAbort, isError }) => {
      if (isMinimizedRef.current) setHasUnread(true);
      if (isAbort || isError) return;
      void persistRef.current(messages);
    },
  });

  const sessionsQuery = useQuery({
    queryKey: [RICHARD_SESSIONS_QUERY_KEY, scope.organizationId, scope.userId],
    queryFn: () => listRichardSessions(scope),
  });

  const lastPersistFingerprintRef = useRef('');

  useEffect(() => {
    if (chat.status === 'streaming') return;
    if (chat.messages.length === 0) return;
    const last = chat.messages[chat.messages.length - 1];
    const fingerprint = `${sessionIdRef.current}:${chat.messages.length}:${last?.id ?? ''}:${chat.status}`;
    if (lastPersistFingerprintRef.current === fingerprint) return;
    lastPersistFingerprintRef.current = fingerprint;
    const timer = window.setTimeout(() => {
      void persistRef.current(chat.messages);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [chat.messages, chat.status]);

  const startNewChat = useCallback(() => {
    chat.stop();
    chat.clearError();
    const nextId = createRichardSessionId();
    sessionIdRef.current = nextId;
    setCurrentSessionId(nextId);
    chat.setMessages([]);
    setHasUnread(false);
    lastPersistFingerprintRef.current = '';
  }, [chat]);

  const selectSession = useCallback(
    async (sessionId: string) => {
      if (!sessionId || sessionId === sessionIdRef.current) return;
      chat.stop();
      chat.clearError();
      sessionIdRef.current = sessionId;
      setCurrentSessionId(sessionId);
      const loaded = await loadRichardSessionMessages(scopeRef.current, sessionId);
      if (sessionIdRef.current !== sessionId) return;
      chat.setMessages(loaded);
      setHasUnread(false);
    },
    [chat],
  );

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
    setIsMinimized(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const minimizeChat = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const restoreWindow = useCallback(() => {
    setIsMinimized(false);
    setHasUnread(false);
  }, []);

  const closeWindow = useCallback(() => {
    setIsMinimized(false);
    setIsFullScreen(false);
    setHasUnread(false);
  }, []);

  const deleteCurrentChat = useCallback(async () => {
    const confirmed = window.confirm(
      'Supprimer définitivement cette conversation Richard ? Cette action est irréversible.',
    );
    if (!confirmed) return;

    const sessionId = sessionIdRef.current;
    chat.stop();
    await deleteRichardSession(scopeRef.current, sessionId);
    await queryClientRef.current.invalidateQueries({ queryKey: [RICHARD_SESSIONS_QUERY_KEY] });
    startNewChat();
  }, [chat, startNewChat]);

  const userIdRef = useRef(user.id);
  useEffect(() => {
    if (userIdRef.current === user.id) return;
    userIdRef.current = user.id;
    startNewChat();
  }, [user.id, startNewChat]);

  return {
    messages: chat.messages,
    sendMessage: chat.sendMessage,
    status: chat.status,
    error: chat.error,
    setMessages: chat.setMessages,
    currentSessionId,
    sessions: sessionsQuery.data ?? [],
    sessionsLoading: sessionsQuery.isLoading,
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
    currentPath: pageContext.currentPath,
    currentEntity: pageContext.currentEntity,
  };
}

export type { RichardChatSessionSummary };
