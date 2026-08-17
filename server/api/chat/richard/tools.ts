import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import {
  type ReadOnlyDbContext,
  queryAgentAffaires,
  queryAffaireDetails,
  queryPpiMaintenanceOverview,
} from '../../../db/readOnlyClient.ts';

export interface RichardToolErrorResult {
  ok: false;
  error: string;
  userMessage: string;
}

export type RichardToolResult<T> = T | RichardToolErrorResult;

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
      userMessage: `Je n’ai pas pu consulter ${scopeLabel} pour le moment. Vous pouvez réessayer ou accéder directement au module correspondant dans SINFONI.`,
    };
  }
}

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
          .describe('Nombre maximum d\'affaires (défaut 20).'),
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
        "Récupère le détail d'une affaire par ID ou référence, avec pièces GED (documents) et historique d'activité.",
      inputSchema: z
        .object({
          affaireId: z.string().uuid().optional().describe('UUID de l\'affaire.'),
          reference: z.string().optional().describe('Référence métier de l\'affaire (ex. AFF-2024-001).'),
        })
        .refine((value) => value.affaireId || value.reference, {
          message: 'Fournir affaireId ou reference.',
        }),
      execute: async ({ affaireId, reference }) =>
        safeReadOnlyExecute('la fiche affaire et la GED', async () => {
          const details = await queryAffaireDetails(dbContext, affaireId, reference);
          if (!details.affaire) {
            return {
              found: false,
              message: 'Aucune affaire correspondante dans votre organisation.',
            };
          }
          return {
            found: true,
            ...details,
          };
        }),
    }),

    getPPIMaintenanceOverview: tool({
      description:
        'Synthèse PPI (planification pluriannuelle) et alertes maintenance (tickets ouverts / en cours) pour l\'organisation.',
      inputSchema: z.object({
        exerciseYear: z
          .number()
          .int()
          .min(2000)
          .max(2100)
          .optional()
          .describe('Année d\'exercice PPI (défaut : année courante).'),
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
