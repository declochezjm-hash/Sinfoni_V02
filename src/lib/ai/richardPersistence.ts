import type { UIMessage } from 'ai';
import { supabase } from '../supabase';
import { getUIMessageText } from './chatUtils';

export interface RichardChatSessionSummary {
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  preview?: string;
}

export interface RichardSessionScope {
  organizationId: string;
  userId: string;
}

const LOCAL_PREFIX = 'sinfoni.richard.sessions.v1';

interface LocalStoredSession {
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
}

interface LocalBundle {
  sessions: LocalStoredSession[];
}

function localStorageKey(scope: RichardSessionScope): string {
  return `${LOCAL_PREFIX}:${scope.organizationId}:${scope.userId}`;
}

function isUiMessage(value: unknown): value is UIMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as UIMessage;
  return (
    typeof message.id === 'string' &&
    typeof message.role === 'string' &&
    Array.isArray(message.parts)
  );
}

export function createRichardSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function titleFromMessages(messages: UIMessage[]): string {
  const firstUser = messages.find((message) => message.role === 'user');
  const text = firstUser ? getUIMessageText(firstUser).replace(/\s+/g, ' ').trim() : '';
  if (!text) return 'Nouveau chat';
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

function readLocalBundle(scope: RichardSessionScope): LocalBundle {
  if (typeof window === 'undefined') return { sessions: [] };
  try {
    const raw = window.localStorage.getItem(localStorageKey(scope));
    if (!raw) return { sessions: [] };
    const parsed = JSON.parse(raw) as LocalBundle;
    if (!Array.isArray(parsed.sessions)) return { sessions: [] };
    return {
      sessions: parsed.sessions.filter(
        (session) =>
          typeof session.sessionId === 'string' && Array.isArray(session.messages),
      ),
    };
  } catch {
    return { sessions: [] };
  }
}

function writeLocalBundle(scope: RichardSessionScope, bundle: LocalBundle): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(localStorageKey(scope), JSON.stringify(bundle));
  } catch {
    // Quota / mode privé : la persistance distante reste le repli.
  }
}

function toSummary(session: LocalStoredSession): RichardChatSessionSummary {
  const lastUserOrAssistant = [...session.messages]
    .reverse()
    .find((message) => message.role === 'user' || message.role === 'assistant');
  const preview = lastUserOrAssistant
    ? getUIMessageText(lastUserOrAssistant).replace(/\s+/g, ' ').trim()
    : undefined;

  return {
    sessionId: session.sessionId,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    preview: preview ? (preview.length > 72 ? `${preview.slice(0, 72)}…` : preview) : undefined,
  };
}

export function saveRichardSessionLocal(
  scope: RichardSessionScope,
  sessionId: string,
  messages: UIMessage[],
): RichardChatSessionSummary {
  const now = new Date().toISOString();
  const bundle = readLocalBundle(scope);
  const existing = bundle.sessions.find((session) => session.sessionId === sessionId);
  const stored: LocalStoredSession = {
    sessionId,
    title: titleFromMessages(messages) || existing?.title || 'Nouveau chat',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    messages,
  };
  const nextSessions = [
    stored,
    ...bundle.sessions.filter((session) => session.sessionId !== sessionId),
  ];
  writeLocalBundle(scope, { sessions: nextSessions });
  return toSummary(stored);
}

export function listRichardSessionsLocal(scope: RichardSessionScope): RichardChatSessionSummary[] {
  return readLocalBundle(scope)
    .sessions.filter((session) => session.messages.length > 0)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map(toSummary);
}

export function loadRichardSessionLocal(
  scope: RichardSessionScope,
  sessionId: string,
): UIMessage[] {
  const session = readLocalBundle(scope).sessions.find((item) => item.sessionId === sessionId);
  return (session?.messages ?? []).filter(isUiMessage);
}

export function deleteRichardSessionLocal(scope: RichardSessionScope, sessionId: string): void {
  const bundle = readLocalBundle(scope);
  writeLocalBundle(scope, {
    sessions: bundle.sessions.filter((session) => session.sessionId !== sessionId),
  });
}

function isMissingRelationError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes("n'existe pas") ||
    message.includes('could not find the table')
  );
}

export async function saveRichardSessionRemote(
  scope: RichardSessionScope,
  sessionId: string,
  messages: UIMessage[],
): Promise<void> {
  const now = new Date().toISOString();
  const title = titleFromMessages(messages);

  const sessionRes = await supabase.from('richard_sessions').upsert(
    {
      id: sessionId,
      organization_id: scope.organizationId,
      user_id: scope.userId,
      title,
      updated_at: now,
    },
    { onConflict: 'id' },
  );

  if (sessionRes.error) {
    if (isMissingRelationError(sessionRes.error)) return;
    throw sessionRes.error;
  }

  if (messages.length === 0) return;

  const rows = messages.map((message) => ({
    organization_id: scope.organizationId,
    user_id: scope.userId,
    session_id: sessionId,
    message_id: message.id,
    role: message.role,
    payload: message,
  }));

  const messagesRes = await supabase
    .from('richard_messages')
    .upsert(rows, { onConflict: 'session_id,message_id' });

  if (messagesRes.error && !isMissingRelationError(messagesRes.error)) {
    throw messagesRes.error;
  }
}

export async function listRichardSessionsRemote(
  scope: RichardSessionScope,
): Promise<RichardChatSessionSummary[] | null> {
  const { data, error } = await supabase
    .from('richard_sessions')
    .select('id, title, created_at, updated_at')
    .eq('organization_id', scope.organizationId)
    .eq('user_id', scope.userId)
    .order('updated_at', { ascending: false })
    .limit(80);

  if (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }

  return (data ?? []).map((row) => ({
    sessionId: String(row.id),
    title: String(row.title || 'Nouveau chat'),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function loadRichardSessionRemote(
  scope: RichardSessionScope,
  sessionId: string,
): Promise<UIMessage[] | null> {
  const { data, error } = await supabase
    .from('richard_messages')
    .select('payload, created_at')
    .eq('organization_id', scope.organizationId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }

  return (data ?? [])
    .map((row) => row.payload)
    .filter(isUiMessage);
}

export async function deleteRichardSessionRemote(
  scope: RichardSessionScope,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from('richard_sessions')
    .delete()
    .eq('organization_id', scope.organizationId)
    .eq('id', sessionId);

  if (error && !isMissingRelationError(error)) {
    throw error;
  }
}

export async function saveRichardSession(
  scope: RichardSessionScope,
  sessionId: string,
  messages: UIMessage[],
): Promise<void> {
  saveRichardSessionLocal(scope, sessionId, messages);
  try {
    await saveRichardSessionRemote(scope, sessionId, messages);
  } catch (error) {
    console.warn('[Richard] persistance Supabase impossible', error);
  }
}

export async function listRichardSessions(
  scope: RichardSessionScope,
): Promise<RichardChatSessionSummary[]> {
  const local = listRichardSessionsLocal(scope);
  try {
    const remote = await listRichardSessionsRemote(scope);
    if (!remote) return local;

    const byId = new Map<string, RichardChatSessionSummary>();
    for (const session of local) byId.set(session.sessionId, session);
    for (const session of remote) {
      const existing = byId.get(session.sessionId);
      byId.set(
        session.sessionId,
        existing ? { ...session, preview: existing.preview ?? session.preview } : session,
      );
    }
    return [...byId.values()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  } catch (error) {
    console.warn('[Richard] lecture des sessions distante impossible', error);
    return local;
  }
}

export async function loadRichardSessionMessages(
  scope: RichardSessionScope,
  sessionId: string,
): Promise<UIMessage[]> {
  try {
    const remote = await loadRichardSessionRemote(scope, sessionId);
    if (remote && remote.length > 0) return remote;
  } catch (error) {
    console.warn('[Richard] lecture des messages distante impossible', error);
  }
  return loadRichardSessionLocal(scope, sessionId);
}

export async function deleteRichardSession(
  scope: RichardSessionScope,
  sessionId: string,
): Promise<void> {
  deleteRichardSessionLocal(scope, sessionId);
  try {
    await deleteRichardSessionRemote(scope, sessionId);
  } catch (error) {
    console.warn('[Richard] suppression distante impossible', error);
  }

  try {
    await fetch(`/api/chat/richard?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  } catch {
    // Dispose Cursor best-effort : la conversation UI est déjà isolée.
  }
}
