import type { IncomingMessage, ServerResponse } from 'node:http';
import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { buildRichardNavigationNote, sanitizeRichardPageContext } from '../../../../src/lib/ai/pageContext.ts';
import { buildRichardSystemPrompt } from '../../../../src/lib/ai/prompts/richardTemplate.ts';
import { type ReadOnlyDbContext, assertReadOnlyContext } from '../../../db/readOnlyClient.ts';
import { handleCursorRichard } from './cursorHandler.ts';
import { buildRichardDbContext } from './dbContext.ts';
import { createRichardTools } from './tools.ts';

export interface RichardChatRequestBody {
  messages: UIMessage[];
  userRole?: string;
  userName?: string;
  tenantId?: string;
  userId?: string;
  communeInseeCode?: string;
  sessionKey?: string;
  currentPath?: string;
  currentEntity?: { type: string; id: string } | null;
}

const RICHARD_TOOLS_INSTRUCTION = `
## Outils (usage interne — ne jamais en parler à l'utilisateur)
Appelle silencieusement un outil dès qu'on demande un planning, un statut d'affaire, un budget macro ou un agent. Ne décris jamais l'outil ni la BDD.
- getAgentAffaires : affaires d'un agent.
- getAffaireDetails : détail par UUID ou référence (ex. AF-2026-VOIRIE-005).
- getPPIMaintenanceOverview : PPI et tickets maintenance.
- getBudgetSummary : synthèse financière (total, engagé, reste, nb affaires). Filtres : communeInsee, filiere, exercice.
Si ok: false / AFFAIRE_NOT_FOUND : « ⚪ Aucune affaire correspondante dans votre périmètre. » + une relance. N'invente rien.`;

function buildDbContext(body: RichardChatRequestBody): ReadOnlyDbContext {
  const ctx = buildRichardDbContext(body);
  assertReadOnlyContext(ctx);
  return ctx;
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Uint8Array);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) {
    throw new Error('Corps de requête vide');
  }
  return JSON.parse(raw) as T;
}

function sendJsonError(res: ServerResponse, status: number, message: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

function mapRouteErrorToUserMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('tenant_id')) {
      return 'Session invalide pour la consultation des données. Reconnectez-vous.';
    }
    if (error.message.includes('Corps de requête')) {
      return 'Requête invalide.';
    }
  }
  return 'Richard est temporairement indisponible. Veuillez réessayer.';
}

async function handleOpenAiRichard(
  _req: IncomingMessage,
  res: ServerResponse,
  body: RichardChatRequestBody,
): Promise<void> {
  const dbContext = buildDbContext(body);
  const modelId = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const system = buildRichardSystemPrompt({
    userRole: body.userRole,
    userName: body.userName,
  });
  const { currentPath, currentEntity } = sanitizeRichardPageContext(body);
  const navigationNote = buildRichardNavigationNote(currentPath, currentEntity);

  const tools = createRichardTools(dbContext);

  const result = streamText({
    model: openai(modelId),
    system: `${system}${RICHARD_TOOLS_INSTRUCTION}${navigationNote ? `\n\n${navigationNote}` : ''}`,
    messages: await convertToModelMessages(body.messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  const stream = toUIMessageStream({ stream: result.stream });

  pipeUIMessageStreamToResponse({
    response: res,
    stream,
  });
}

/**
 * Handler POST /api/chat/richard — streaming UI messages.
 * Priorité : Cursor SDK (CURSOR_API_KEY) puis OpenAI (OPENAI_API_KEY).
 */
export async function POST(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const hasCursorKey = Boolean(process.env.CURSOR_API_KEY?.trim());
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (!hasCursorKey && !hasOpenAiKey) {
    sendJsonError(res, 503, 'Richard est temporairement indisponible.');
    return;
  }

  try {
    const body = await readJsonBody<RichardChatRequestBody>(req);

    if (!body.messages?.length) {
      sendJsonError(res, 400, 'Message requis.');
      return;
    }

    if (hasCursorKey) {
      await handleCursorRichard(req, res, body);
      return;
    }

    await handleOpenAiRichard(req, res, body);
  } catch (error) {
    const message = mapRouteErrorToUserMessage(error);
    if (!res.headersSent) {
      sendJsonError(res, 500, message);
    } else {
      res.end();
    }
  }
}
