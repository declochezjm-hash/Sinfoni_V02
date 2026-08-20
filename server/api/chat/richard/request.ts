import type { UIMessage } from 'ai';

export interface RichardChatRequestBody {
  messages: UIMessage[];
  userRole?: string;
  userName?: string;
  tenantId?: string;
  userId?: string;
  communeInseeCode?: string;
  sessionId?: string;
  sessionKey?: string;
  currentPath?: string;
  currentEntity?: { type: string; id: string } | null;
}

export function resolveRichardSessionId(body: RichardChatRequestBody, tenantId: string): string {
  const fromBody = body.sessionId?.trim() || body.sessionKey?.trim();
  if (fromBody) return fromBody;
  return `richard-${tenantId}`;
}
