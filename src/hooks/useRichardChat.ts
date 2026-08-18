import { useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRole } from './useRole';
import {
  isLikelyUuid,
  parseRichardPageContext,
  type RichardPageContext,
} from '../lib/ai/pageContext';

const RICHARD_CHAT_API = '/api/chat/richard';

function createRichardSessionKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `richard-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
  const sessionKeyRef = useRef(createRichardSessionKey());

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
          return {
            userRole: user.role,
            userName: user.name,
            tenantId: user.organizationId,
            userId: user.id,
            communeInseeCode: user.communeInseeCode,
            sessionKey: sessionKeyRef.current,
            currentPath,
            currentEntity,
          };
        },
      }),
    [user.role, user.name, user.organizationId, user.id, user.communeInseeCode],
  );

  const chat = useChat({
    transport,
  });

  const resetConversation = () => {
    sessionKeyRef.current = createRichardSessionKey();
    chat.setMessages([]);
  };

  return {
    ...chat,
    resetConversation,
    currentPath: pageContext.currentPath,
    currentEntity: pageContext.currentEntity,
  };
}
