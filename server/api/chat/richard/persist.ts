import type { UIMessage } from 'ai';
import { getReadOnlySupabaseClient } from '../../../db/readOnlyClient.ts';

export interface PersistRichardConversationInput {
  sessionId: string;
  tenantId: string;
  userId?: string;
  messages: UIMessage[];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isMissingRelationError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('could not find the table')
  );
}

function titleFromMessages(messages: UIMessage[]): string {
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    return text.length > 48 ? `${text.slice(0, 48)}…` : text;
  }
  return 'Nouveau chat';
}

/**
 * Enregistre sessionId + messages dans public.richard_messages (et richard_sessions).
 * Best-effort : n'interrompt jamais le stream si la table n'existe pas encore.
 */
export async function persistRichardConversation(
  input: PersistRichardConversationInput,
): Promise<void> {
  if (!UUID_RE.test(input.sessionId) || !UUID_RE.test(input.tenantId)) return;
  if (!input.messages?.length) return;

  const client = getReadOnlySupabaseClient();
  const now = new Date().toISOString();
  const userId = input.userId && UUID_RE.test(input.userId) ? input.userId : null;

  const sessionRes = await client.from('richard_sessions').upsert(
    {
      id: input.sessionId,
      organization_id: input.tenantId,
      user_id: userId,
      title: titleFromMessages(input.messages),
      updated_at: now,
    },
    { onConflict: 'id' },
  );

  if (sessionRes.error) {
    if (!isMissingRelationError(sessionRes.error)) {
      console.warn('[Richard] persist session', sessionRes.error.message);
    }
    return;
  }

  const rows = input.messages.map((message) => ({
    organization_id: input.tenantId,
    user_id: userId,
    session_id: input.sessionId,
    message_id: message.id,
    role: message.role,
    payload: message,
  }));

  const messagesRes = await client
    .from('richard_messages')
    .upsert(rows, { onConflict: 'session_id,message_id' });

  if (messagesRes.error && !isMissingRelationError(messagesRes.error)) {
    console.warn('[Richard] persist messages', messagesRes.error.message);
  }
}

export async function deletePersistedRichardSession(sessionId: string): Promise<void> {
  if (!UUID_RE.test(sessionId)) return;

  try {
    const client = getReadOnlySupabaseClient();
    const { error } = await client.from('richard_sessions').delete().eq('id', sessionId);
    if (error && !isMissingRelationError(error)) {
      console.warn('[Richard] delete session', error.message);
    }
  } catch (error) {
    console.warn('[Richard] delete session', error);
  }
}
