import { Agent, type SDKAgent } from '@cursor/sdk';
import type { SDKCustomTool } from '@cursor/sdk';

interface RichardSession {
  agent: SDKAgent;
  initialized: boolean;
  apiKey: string;
  sessionId: string;
  tenantId?: string;
  userId?: string;
}

const sessions = new Map<string, RichardSession>();

const SESSION_TTL_MS = 30 * 60 * 1000;
const sessionExpiry = new Map<string, number>();

function touchSession(sessionKey: string): void {
  sessionExpiry.set(sessionKey, Date.now() + SESSION_TTL_MS);
}

async function disposeAgent(agent: SDKAgent): Promise<void> {
  try {
    await agent[Symbol.asyncDispose]();
  } catch {
    // Ignore dispose errors during cleanup.
  }
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [key, expiresAt] of sessionExpiry) {
    if (expiresAt > now) continue;
    const session = sessions.get(key);
    if (session) {
      void disposeAgent(session.agent);
      sessions.delete(key);
    }
    sessionExpiry.delete(key);
  }
}

export async function getOrCreateRichardSession(options: {
  sessionKey: string;
  apiKey: string;
  modelId: string;
  customTools: Record<string, SDKCustomTool>;
  tenantId?: string;
  userId?: string;
}): Promise<RichardSession> {
  cleanupExpiredSessions();
  touchSession(options.sessionKey);

  const existing = sessions.get(options.sessionKey);
  if (existing) {
    if (existing.apiKey === options.apiKey) {
      existing.tenantId = options.tenantId ?? existing.tenantId;
      existing.userId = options.userId ?? existing.userId;
      return existing;
    }
    sessions.delete(options.sessionKey);
    void disposeAgent(existing.agent);
  }

  const agent = await Agent.create({
    apiKey: options.apiKey,
    model: { id: options.modelId },
    disallowedTools: ['shell', 'edit', 'delete', 'task', 'webSearch'],
    local: {
      cwd: process.cwd(),
      customTools: options.customTools,
    },
  });

  const session: RichardSession = {
    agent,
    initialized: false,
    apiKey: options.apiKey,
    sessionId: options.sessionKey,
    tenantId: options.tenantId,
    userId: options.userId,
  };
  sessions.set(options.sessionKey, session);
  return session;
}

export function disposeRichardSession(sessionKey: string): void {
  const session = sessions.get(sessionKey);
  if (session) {
    void disposeAgent(session.agent);
    sessions.delete(sessionKey);
  }
  sessionExpiry.delete(sessionKey);
}

export function markRichardSessionInitialized(sessionKey: string): void {
  const session = sessions.get(sessionKey);
  if (session) {
    session.initialized = true;
  }
}

export function isRichardSessionInitialized(sessionKey: string): boolean {
  return sessions.get(sessionKey)?.initialized ?? false;
}
