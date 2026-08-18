import type { ReadOnlyDbContext } from '../../../db/readOnlyClient.ts';
import type { RichardChatRequestBody } from './route.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_ORGANIZATION_ID =
  process.env.VITE_DEFAULT_ORGANIZATION_ID?.trim() ||
  '00000000-0000-0000-0000-000000000001';

export interface AffaireDetailsToolInput {
  affaireId?: string;
  reference?: string;
  code?: string;
  codeAffaire?: string;
}

export function parseAffaireDetailsInput(
  input: Record<string, unknown>,
): AffaireDetailsToolInput {
  const pick = (key: string): string | undefined => {
    const value = input[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  };

  return {
    affaireId: pick('affaireId'),
    reference: pick('reference'),
    code: pick('code'),
    codeAffaire: pick('codeAffaire'),
  };
}

export function buildRichardDbContext(body: RichardChatRequestBody): ReadOnlyDbContext {
  const rawTenantId = body.tenantId?.trim();
  let tenantId = rawTenantId;

  if (!tenantId || !UUID_RE.test(tenantId)) {
    tenantId = DEFAULT_ORGANIZATION_ID;
    console.warn(
      '[Richard] organization_id absent ou invalide — repli sur',
      tenantId,
      rawTenantId ? `(reçu: ${rawTenantId})` : '(non transmis)',
    );
  }

  return {
    tenantId,
    userId: body.userId,
    userRole: body.userRole,
    communeInseeCode: body.communeInseeCode,
  };
}
