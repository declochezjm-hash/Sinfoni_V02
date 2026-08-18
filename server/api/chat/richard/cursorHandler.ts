import type { IncomingMessage, ServerResponse } from 'node:http';
import { CursorAgentError } from '@cursor/sdk';
import {
  createUIMessageStream,
  generateId,
  pipeUIMessageStreamToResponse,
  type UIMessage,
} from 'ai';
import { buildRichardNavigationNote, sanitizeRichardPageContext } from '../../../../src/lib/ai/pageContext.ts';
import { buildRichardSystemPrompt } from '../../../../src/lib/ai/prompts/richardTemplate.ts';
import { createRichardCursorCustomTools, mapCursorToolName } from './cursorTools.ts';
import { buildRichardDbContext } from './dbContext.ts';
import {
  getOrCreateRichardSession,
  isRichardSessionInitialized,
  markRichardSessionInitialized,
} from './cursorSession.ts';
import type { RichardChatRequestBody } from './route.ts';

const RICHARD_TOOLS_INSTRUCTION = `
## Outils (usage interne — ne jamais en parler à l'utilisateur)
Appelle silencieusement un outil dès qu'on demande un planning, un statut d'affaire, un budget macro ou un agent. Ne décris jamais l'outil ni la BDD.
- getAgentAffaires : affaires d'un agent.
- getAffaireDetails : détail par UUID ou référence (ex. AF-2026-VOIRIE-005).
- getPPIMaintenanceOverview : PPI et tickets maintenance.
- getBudgetSummary : synthèse financière (total, engagé, reste, nb affaires). Filtres : communeInsee, filiere, exercice.
Si ok: false / AFFAIRE_NOT_FOUND : « ⚪ Aucune affaire correspondante dans votre périmètre. » + une relance. N'invente rien.`;

function buildDbContext(body: RichardChatRequestBody) {
  return buildRichardDbContext(body);
}

function getLastUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'user') continue;
    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
      .trim();
    if (text) return text;
  }
  throw new Error('Message utilisateur requis.');
}

function sendJsonError(res: ServerResponse, status: number, message: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

function mapCursorError(error: unknown): string {
  if (error instanceof CursorAgentError) {
    const normalized = error.message.toLowerCase();
    if (
      normalized.includes('unauthorized') ||
      normalized.includes('unauthenticated') ||
      normalized.includes('invalid user api key') ||
      normalized.includes('invalid api key') ||
      normalized.includes('invalid key') ||
      /\b401\b/.test(normalized)
    ) {
      return 'Clé Cursor invalide. Créez une User API Key sur https://cursor.com/dashboard/api (copiez le secret complet à la création) puis mettez-le dans .env.local.';
    }
    return error.message;
  }
  if (error instanceof Error) {
    if (error.message.includes('tenant_id')) {
      return 'Session invalide pour la consultation des données. Reconnectez-vous.';
    }
    return error.message;
  }
  return 'Richard est temporairement indisponible. Veuillez réessayer.';
}

function parseToolOutput(result: unknown): unknown {
  if (typeof result === 'string') {
    try {
      return JSON.parse(result) as unknown;
    } catch {
      return result;
    }
  }
  return result;
}

function extractCursorToolCall(update: {
  callId: string;
  toolCall: { type: string; args?: Record<string, unknown> };
}): { toolCallId: string; toolName: string | null; input: unknown } {
  const toolCallId = update.callId;
  if (update.toolCall.type === 'mcp') {
    const mcpArgs = update.toolCall.args as {
      toolName?: string;
      args?: Record<string, unknown>;
    };
    const rawName = mcpArgs.toolName ?? '';
    return {
      toolCallId,
      toolName: mapCursorToolName(rawName),
      input: mcpArgs.args ?? {},
    };
  }
  return { toolCallId, toolName: null, input: {} };
}

function extractCursorToolResult(update: {
  callId: string;
  toolCall: { type: string; result?: unknown; args?: Record<string, unknown> };
}): { toolCallId: string; toolName: string | null; output: unknown } {
  const toolCallId = update.callId;
  if (update.toolCall.type === 'mcp') {
    const mcpArgs = update.toolCall.args as { toolName?: string };
    const rawName = mcpArgs.toolName ?? '';
    const result = update.toolCall.result as
      | { status?: string; value?: { content?: Array<{ text?: { text?: string } }> } }
      | undefined;
    let output: unknown = result;
    if (result?.status === 'success' && result.value?.content) {
      const text = result.value.content
        .map((part) => part.text?.text ?? '')
        .join('')
        .trim();
      output = parseToolOutput(text || result);
    }
    return {
      toolCallId,
      toolName: mapCursorToolName(rawName),
      output,
    };
  }
  return { toolCallId, toolName: null, output: update.toolCall.result };
}

export async function handleCursorRichard(
  _req: IncomingMessage,
  res: ServerResponse,
  body: RichardChatRequestBody,
): Promise<void> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    sendJsonError(res, 503, 'Richard est temporairement indisponible.');
    return;
  }

  try {
    if (!body.messages?.length) {
      sendJsonError(res, 400, 'Message requis.');
      return;
    }

    const dbContext = buildDbContext(body);
    const userText = getLastUserText(body.messages);
    const sessionKey = body.sessionKey?.trim() || `richard-${dbContext.tenantId}`;
    const modelId = process.env.CURSOR_MODEL?.trim() || 'composer-2.5';
    const system = `${buildRichardSystemPrompt({
      userRole: body.userRole,
      userName: body.userName,
    })}${RICHARD_TOOLS_INSTRUCTION}`;
    const { currentPath, currentEntity } = sanitizeRichardPageContext(body);
    const navigationNote = buildRichardNavigationNote(currentPath, currentEntity);

    const customTools = createRichardCursorCustomTools(dbContext);
    const session = await getOrCreateRichardSession({
      sessionKey,
      apiKey,
      modelId,
      customTools,
    });

    const isFirstTurn = !isRichardSessionInitialized(sessionKey);
    const prompt = isFirstTurn
      ? `[Instructions système — Richard, assistant SINFONI]\n${system}${navigationNote ? `\n\n${navigationNote}` : ''}\n\n[Utilisateur]\n${userText}`
      : navigationNote
        ? `${navigationNote}\n\n${userText}`
        : userText;

    const messageId = generateId();
    const textPartId = generateId();
    const activeToolCalls = new Map<string, string>();

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: 'start', messageId });

        let textStarted = false;
        const ensureTextStarted = () => {
          if (textStarted) return;
          writer.write({ type: 'text-start', id: textPartId });
          textStarted = true;
        };

        const run = await session.agent.send(prompt, {
          local: { customTools },
          onDelta: ({ update }) => {
            if (update.type === 'text-delta' && update.text) {
              ensureTextStarted();
              writer.write({ type: 'text-delta', id: textPartId, delta: update.text });
            }

            if (update.type === 'tool-call-started') {
              const { toolCallId, toolName, input } = extractCursorToolCall(update);
              if (!toolName) return;
              activeToolCalls.set(toolCallId, toolName);
              writer.write({
                type: 'tool-input-start',
                toolCallId,
                toolName,
              });
              writer.write({
                type: 'tool-input-available',
                toolCallId,
                toolName,
                input,
              });
            }

            if (update.type === 'tool-call-completed') {
              const { toolCallId, toolName, output } = extractCursorToolResult(update);
              const mappedName = toolName ?? activeToolCalls.get(toolCallId);
              if (!mappedName) return;
              writer.write({
                type: 'tool-output-available',
                toolCallId,
                output,
              });
            }
          },
        });

        for await (const event of run.stream()) {
          if (event.type === 'tool_call') {
            const mappedName = mapCursorToolName(event.name);
            if (!mappedName) continue;
            const toolCallId = event.call_id;

            if (event.status === 'running') {
              activeToolCalls.set(toolCallId, mappedName);
              writer.write({ type: 'tool-input-start', toolCallId, toolName: mappedName });
              if (event.args) {
                writer.write({
                  type: 'tool-input-available',
                  toolCallId,
                  toolName: mappedName,
                  input: event.args,
                });
              }
            }

            if (event.status === 'completed' || event.status === 'error') {
              writer.write({
                type: 'tool-output-available',
                toolCallId,
                output: parseToolOutput(event.result),
              });
            }
          }
        }

        if (textStarted) {
          writer.write({ type: 'text-end', id: textPartId });
        }

        const result = await run.wait();
        if (result.status === 'error') {
          throw new Error(result.error?.message ?? 'Erreur agent Cursor.');
        }

        markRichardSessionInitialized(sessionKey);
        writer.write({ type: 'finish' });
      },
      onError: (error) => mapCursorError(error),
    });

    pipeUIMessageStreamToResponse({ response: res, stream });
  } catch (error) {
    const message = mapCursorError(error);
    if (!res.headersSent) {
      sendJsonError(res, 500, message);
    } else {
      res.end();
    }
  }
}
