import type { UIMessage } from 'ai';

const RICHARD_DB_TOOLS = new Set([
  'getAgentAffaires',
  'getAffaireDetails',
  'getPPIMaintenanceOverview',
]);

export const RICHARD_TOOL_LABELS: Record<string, string> = {
  getAgentAffaires: 'Données récupérées depuis le module Affaires',
  getAffaireDetails: 'Données récupérées depuis Affaires & GED',
  getPPIMaintenanceOverview: 'Données récupérées depuis PPI & Maintenance',
};

export interface RichardToolBadge {
  toolName: string;
  label: string;
  status: 'success' | 'error';
  partKey: string;
}

type ToolPartLike = UIMessage['parts'][number] & {
  state?: string;
  output?: unknown;
  errorText?: string;
  toolCallId?: string;
};

export function getUIMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function getToolNameFromPartType(partType: string): string | null {
  if (!partType.startsWith('tool-')) return null;
  return partType.slice(5);
}

export function isRichardDatabaseToolPart(part: UIMessage['parts'][number]): boolean {
  const toolName = getToolNameFromPartType(part.type);
  return toolName != null && RICHARD_DB_TOOLS.has(toolName);
}

function isToolOutputFailure(output: unknown): boolean {
  if (!output || typeof output !== 'object') return false;
  const record = output as Record<string, unknown>;
  if (record.ok === false) return true;
  if (typeof record.error === 'string' && record.error.length > 0) return true;
  return false;
}

function isToolPartFailed(part: ToolPartLike): boolean {
  if (part.state === 'output-error') return true;
  if (part.errorText) return true;
  if (part.state === 'output-available' && isToolOutputFailure(part.output)) return true;
  return false;
}

/** Badges discrets pour les outils BDD exécutés dans un message assistant. */
export function getRichardToolBadges(message: UIMessage): RichardToolBadge[] {
  const badges: RichardToolBadge[] = [];

  message.parts.forEach((part, index) => {
    if (!isRichardDatabaseToolPart(part)) return;

    const toolName = getToolNameFromPartType(part.type);
    if (!toolName) return;

    const toolPart = part as ToolPartLike;
    const isComplete =
      toolPart.state === 'output-available' || toolPart.state === 'output-error';

    if (!isComplete) return;

    const failed = isToolPartFailed(toolPart);
    badges.push({
      toolName,
      label: failed
        ? 'Consultation SINFONI indisponible'
        : (RICHARD_TOOL_LABELS[toolName] ?? 'Données récupérées depuis SINFONI'),
      status: failed ? 'error' : 'success',
      partKey: `${message.id}-${toolName}-${index}`,
    });
  });

  return badges;
}

/** Indique si Richard exécute actuellement un outil de consultation BDD. */
export function isRichardQueryingDatabase(messages: UIMessage[]): boolean {
  return messages.some((message) =>
    message.parts.some((part) => {
      if (!isRichardDatabaseToolPart(part)) return false;
      const state = (part as ToolPartLike).state;
      return (
        state === 'input-streaming' ||
        state === 'input-available' ||
        state === 'approval-requested'
      );
    }),
  );
}

/** Erreurs d'outils terminées dans l'historique (pour affichage global discret). */
export function hasRichardToolErrors(messages: UIMessage[]): boolean {
  return messages.some((message) =>
    message.parts.some((part) => isRichardDatabaseToolPart(part) && isToolPartFailed(part as ToolPartLike)),
  );
}

export function getFriendlyChatErrorMessage(error: Error | undefined): string {
  if (!error?.message) {
    return 'Une difficulté temporaire empêche Richard de répondre. Veuillez réessayer dans un instant.';
  }

  const rawMessage = error.message.trim();

  try {
    const parsed = JSON.parse(rawMessage) as { error?: string };
    if (parsed.error) {
      return mapKnownErrorText(parsed.error);
    }
  } catch {
    // Corps non-JSON (texte brut, HTML, etc.)
  }

  return mapKnownErrorText(rawMessage);
}

function mapKnownErrorText(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('clé cursor invalide') ||
    normalized.includes('cle cursor invalide') ||
    normalized.includes('invalid user api key')
  ) {
    return 'Clé Cursor invalide. Créez une User API Key sur https://cursor.com/dashboard/api (copiez le secret complet à la création) puis mettez-le dans .env.local.';
  }
  if (normalized.includes('temporairement indisponible')) {
    return message;
  }
  if (normalized.includes('404') || normalized.includes('not found')) {
    return 'Le service Richard n’est pas joignable. Redémarrez le serveur de développement (npm run dev).';
  }
  if (
    normalized.includes('richard n’est pas disponible') ||
    normalized.includes("richard n'est pas disponible") ||
    normalized.includes('ajoutez cursor_api_key') ||
    normalized.includes('ajoutez openai_api_key')
  ) {
    return message;
  }
  if (
    normalized.includes('openai_api_key') &&
    (normalized.includes('manqu') || normalized.includes('non configur') || normalized.includes('absent'))
  ) {
    return 'Richard n’est pas disponible : ajoutez OPENAI_API_KEY dans .env.local puis redémarrez npm run dev.';
  }
  if (
    normalized.includes('cursor_api_key') &&
    (normalized.includes('manqu') || normalized.includes('non configur') || normalized.includes('absent') || normalized.includes('invalide'))
  ) {
    return message.includes('invalide')
      ? message
      : 'Richard n’est pas disponible : ajoutez CURSOR_API_KEY dans .env.local puis redémarrez npm run dev.';
  }
  if (normalized.includes('tenant') || normalized.includes('organization')) {
    return 'Votre session ne permet pas d’accéder aux données. Reconnectez-vous ou changez de profil.';
  }
  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('failed to fetch')
  ) {
    return 'Connexion interrompue. Vérifiez votre réseau et réessayez.';
  }
  if (normalized.includes('temporairement indisponible')) {
    return message;
  }

  if (import.meta.env.DEV) {
    return message;
  }

  return 'Une difficulté temporaire empêche Richard de répondre. Veuillez réessayer dans un instant.';
}
