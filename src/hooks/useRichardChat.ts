import { useMemo, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRole } from './useRole';

const RICHARD_CHAT_API = '/api/chat/richard';

function createRichardSessionKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `richard-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useRichardChat() {
  const { user } = useRole();
  const sessionKeyRef = useRef(createRichardSessionKey());

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: RICHARD_CHAT_API,
        body: () => ({
          userRole: user.role,
          userName: user.name,
          tenantId: user.organizationId,
          userId: user.id,
          communeInseeCode: user.communeInseeCode,
          sessionKey: sessionKeyRef.current,
        }),
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
  };
}
