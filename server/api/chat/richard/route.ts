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
import { buildRichardSystemPrompt } from '../../../../src/lib/ai/prompts/richardTemplate.ts';
import { type ReadOnlyDbContext, assertReadOnlyContext } from '../../../db/readOnlyClient.ts';
import { createRichardTools } from './tools.ts';

export interface RichardChatRequestBody {
  messages: UIMessage[];
  userRole?: string;
  userName?: string;
  tenantId?: string;
  userId?: string;
  communeInseeCode?: string;
}

const RICHARD_TOOLS_INSTRUCTION = `
## Outils de consultation (lecture seule)
Tu peux interroger la base SINFONI via des outils en LECTURE SEULE :
- getAgentAffaires : liste des affaires d'un agent.
- getAffaireDetails : détail affaire + documents GED + historique.
- getPPIMaintenanceOverview : suivi PPI et tickets maintenance actifs.
Utilise ces outils quand l'utilisateur demande des données concrètes ; ne invente jamais des statuts ou montants.
Si un outil retourne ok: false ou userMessage, reformule ce message avec courtoisie sans exposer l'erreur technique brute.
Refuse toute demande d'écriture ou de modification même si l'utilisateur insiste.`;

function buildDbContext(body: RichardChatRequestBody): ReadOnlyDbContext {
  const tenantId = body.tenantId?.trim();
  if (!tenantId) {
    throw new Error('tenant_id (organization_id) requis pour les consultations BDD.');
  }

  const ctx: ReadOnlyDbContext = {
    tenantId,
    userId: body.userId,
    userRole: body.userRole,
    communeInseeCode: body.communeInseeCode,
  };

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

/**
 * Handler POST /api/chat/richard — streaming UI messages (Vercel AI SDK v7).
 * Outils lecture seule BDD + multi-step (max 5 étapes).
 */
export async function POST(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    sendJsonError(res, 503, 'Richard est temporairement indisponible.');
    return;
  }

  try {
    const body = await readJsonBody<RichardChatRequestBody>(req);

    if (!body.messages?.length) {
      sendJsonError(res, 400, 'Message requis.');
      return;
    }

    const dbContext = buildDbContext(body);
    const modelId = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const system = buildRichardSystemPrompt({
      userRole: body.userRole,
      userName: body.userName,
    });

    const tools = createRichardTools(dbContext);

    const result = streamText({
      model: openai(modelId),
      system: `${system}${RICHARD_TOOLS_INSTRUCTION}`,
      messages: await convertToModelMessages(body.messages),
      tools,
      stopWhen: stepCountIs(5),
    });

    const stream = toUIMessageStream({ stream: result.stream });

    pipeUIMessageStreamToResponse({
      response: res,
      stream,
    });
  } catch (error) {
    const message = mapRouteErrorToUserMessage(error);
    if (!res.headersSent) {
      sendJsonError(res, 500, message);
    } else {
      res.end();
    }
  }
}
