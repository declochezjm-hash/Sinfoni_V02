import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import {
  type ReadOnlyDbContext,
  queryAgentAffaires,
  queryAffaireDetails,
  queryPpiMaintenanceOverview,
} from '../../../db/readOnlyClient.ts';
import { parseAffaireDetailsInput } from './dbContext.ts';

export interface RichardToolErrorResult {
  ok: false;
  error: string;
  message: string;
  userMessage?: string;
}

export type RichardToolResult<T> = T | RichardToolErrorResult;

function affaireNotFoundResult(searched: {
  reference?: string;
  affaireId?: string;
}): RichardToolErrorResult {
  const label = searched.reference ?? searched.affaireId ?? 'ce code';
  return {
    ok: false,
    error: 'AFFAIRE_NOT_FOUND',
    message: `Aucune affaire ne correspond à « ${label} » pour votre organisation.`,
    userMessage:
      'Je n’ai trouvé aucune affaire avec ce code dans votre périmètre. Vérifiez la référence (ex. AF-2026-VOIRIE-005) ou vos droits d’accès selon votre rôle.',
  };
}

async function safeReadOnlyExecute<T>(
  scopeLabel: string,
  fn: () => Promise<T>,
): Promise<RichardToolResult<T>> {
  try {
    return await fn();
  } catch (error) {
    const technical = error instanceof Error ? error.message : 'Erreur inconnue';
    return {
      ok: false,
      error: technical,
      message: `Je n’ai pas pu consulter ${scopeLabel} pour le moment.`,
      userMessage: `Je n’ai pas pu consulter ${scopeLabel} pour le moment. Vous pouvez réessayer ou accéder directement au module correspondant dans SINFONI.`,
    };
  }
}

const affaireDetailsInputSchema = z
  .object({
    affaireId: z.string().optional().describe("UUID de l'affaire."),
    reference: z
      .string()
      .optional()
      .describe("Référence / code affaire (ex. AF-2026-VOIRIE-005). Colonne `reference` en base."),
    code: z.string().optional().describe('Alias de reference (code affaire métier).'),
    codeAffaire: z.string().optional().describe('Alias de reference.'),
  })
  .refine((value) => value.affaireId || value.reference || value.code || value.codeAffaire, {
    message: 'Fournir affaireId, reference ou code affaire.',
  });

export function createRichardTools(dbContext: ReadOnlyDbContext): ToolSet {
  return {
    getAgentAffaires: tool({
      description:
        "Liste les affaires (référence, titre, statut, type, budgets) d'un chargé d'affaires ou agent. Filtre automatiquement par organisation (tenant).",
      inputSchema: z.object({
        agentId: z
          .string()
          .optional()
          .describe("ID de l'agent (owner_id). Par défaut : utilisateur courant."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Nombre maximum d'affaires (défaut 20)."),
      }),
      execute: async ({ agentId, limit }) =>
        safeReadOnlyExecute('le module Affaires', async () => {
          const affaires = await queryAgentAffaires(dbContext, agentId, limit ?? 20);
          return {
            count: affaires.length,
            affaires,
          };
        }),
    }),

    getAffaireDetails: tool({
      description:
        "Récupère le détail d'une affaire par UUID ou code/référence (colonne reference, ex. AF-2026-VOIRIE-005), avec pièces GED (documents) et historique workflow (activity_logs, workflow_steps).",
      inputSchema: affaireDetailsInputSchema,
      execute: async (input) => {
        const parsed = parseAffaireDetailsInput(input as Record<string, unknown>);
        return safeReadOnlyExecute('la fiche affaire et la GED', async () => {
          const details = await queryAffaireDetails(
            dbContext,
            parsed.affaireId,
            parsed.reference,
            { code: parsed.code, codeAffaire: parsed.codeAffaire },
          );
          if (!details.affaire) {
            return affaireNotFoundResult({
              reference: parsed.reference ?? parsed.code ?? parsed.codeAffaire,
              affaireId: parsed.affaireId,
            });
          }
          return {
            ok: true,
            found: true,
            ...details,
          };
        });
      },
    }),

    getPPIMaintenanceOverview: tool({
      description:
        "Synthèse PPI (planification pluriannuelle) et alertes maintenance (tickets ouverts / en cours) pour l'organisation.",
      inputSchema: z.object({
        exerciseYear: z
          .number()
          .int()
          .min(2000)
          .max(2100)
          .optional()
          .describe("Année d'exercice PPI (défaut : année courante)."),
        maintenanceLimit: z.number().int().min(1).max(30).optional(),
        ppiLimit: z.number().int().min(1).max(30).optional(),
      }),
      execute: async ({ exerciseYear, maintenanceLimit, ppiLimit }) =>
        safeReadOnlyExecute('le PPI et la maintenance', async () =>
          queryPpiMaintenanceOverview(
            dbContext,
            exerciseYear,
            maintenanceLimit ?? 15,
            ppiLimit ?? 15,
          ),
        ),
    }),
  };
}
