export type RichardEntityType = 'affaire' | 'commune';

export interface RichardCurrentEntity {
  type: RichardEntityType | string;
  id: string;
}

export interface RichardPageContext {
  currentPath: string;
  currentEntity: RichardCurrentEntity | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_PATH_LENGTH = 200;
const MAX_ENTITY_TYPE_LENGTH = 40;
const MAX_ENTITY_ID_LENGTH = 80;

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Détecte la page active et l'identifiant métier éventuellement présent dans l'URL.
 * Routes reconnues : `/affaires/:id`, `/commune/dossiers/:id`.
 */
export function parseRichardPageContext(pathname: string): RichardPageContext {
  const currentPath = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  const segments = currentPath.split('/').filter(Boolean);

  if (segments[0] === 'affaires' && segments[1]) {
    return {
      currentPath,
      currentEntity: { type: 'affaire', id: decodeSegment(segments[1]) },
    };
  }

  if (segments[0] === 'commune' && segments[1] === 'dossiers' && segments[2]) {
    return {
      currentPath,
      currentEntity: { type: 'affaire', id: decodeSegment(segments[2]) },
    };
  }

  return { currentPath, currentEntity: null };
}

export function isLikelyUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function stripControlChars(value: string): string {
  return value.replace(/[\r\n]/g, '').trim();
}

/** Valide le contexte de navigation reçu du client (anti-injection). */
export function sanitizeRichardPageContext(input: {
  currentPath?: unknown;
  currentEntity?: unknown;
}): { currentPath?: string; currentEntity: RichardCurrentEntity | null } {
  const rawPath = typeof input.currentPath === 'string' ? stripControlChars(input.currentPath) : '';
  const currentPath =
    rawPath.startsWith('/') && !rawPath.includes('://')
      ? rawPath.slice(0, MAX_PATH_LENGTH)
      : undefined;

  const rawEntity = input.currentEntity;
  let currentEntity: RichardCurrentEntity | null = null;
  if (rawEntity && typeof rawEntity === 'object') {
    const record = rawEntity as Record<string, unknown>;
    const type =
      typeof record.type === 'string'
        ? stripControlChars(record.type).slice(0, MAX_ENTITY_TYPE_LENGTH)
        : '';
    const id =
      typeof record.id === 'string'
        ? stripControlChars(record.id).slice(0, MAX_ENTITY_ID_LENGTH)
        : '';
    if (type && id) {
      currentEntity = { type, id };
    }
  }

  if (!currentPath) {
    return { currentPath: undefined, currentEntity: null };
  }

  return { currentPath, currentEntity };
}

/**
 * Note système courte à injecter dans la session Richard.
 * Retourne null si aucune page n'est identifiable.
 */
export function buildRichardNavigationNote(
  currentPath?: string | null,
  currentEntity?: RichardCurrentEntity | null,
): string | null {
  if (!currentPath) return null;

  if (currentEntity?.id) {
    return `Contexte de navigation : L'utilisateur consulte actuellement la page ${currentPath}. Si sa question est implicite (ex: « Fais la synthèse »), applique la recherche sur l'entité ${currentEntity.id}.`;
  }

  return `Contexte de navigation : L'utilisateur consulte actuellement la page ${currentPath}.`;
}
