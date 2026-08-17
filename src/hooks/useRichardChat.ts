import { useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRole } from './useRole';

const RICHARD_CHAT_API = '/api/chat/richard';

export function useRichardChat() {
  const { user } = useRole();

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
        }),
      }),
    [user.role, user.name, user.organizationId, user.id, user.communeInseeCode],
  );

  const chat = useChat({
    transport,
  });

  return chat;
}
