import type { SDKCustomTool } from '@cursor/sdk';
import {
  type ReadOnlyDbContext,
  queryAgentAffaires,
  queryAffaireDetails,
  queryPpiMaintenanceOverview,
} from '../../../db/readOnlyClient.ts';
import { parseAffaireDetailsInput } from './dbContext.ts';

function affaireNotFoundPayload(searched: { reference?: string; affaireId?: string }) {
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
): Promise<string> {
  try {
    const result = await fn();
    return JSON.stringify({ ok: true, data: result });
  } catch (error) {
    const technical = error instanceof Error ? error.message : 'Erreur inconnue';
    return JSON.stringify({
      ok: false,
      error: technical,
      message: `Consultation ${scopeLabel} impossible pour le moment.`,
      userMessage: `Je n’ai pas pu consulter ${scopeLabel} pour le moment. Vous pouvez réessayer ou accéder directement au module correspondant dans SINFONI.`,
    });
  }
}

export function createRichardCursorCustomTools(
  dbContext: ReadOnlyDbContext,
): Record<string, SDKCustomTool> {
  return {
    getAgentAffaires: {
      description:
        "Liste les affaires (référence, titre, statut, type, budgets) d'un chargé d'affaires ou agent. Filtre automatiquement par organisation (tenant).",
      inputSchema: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: "ID de l'agent (owner_id). Par défaut : utilisateur courant.",
          },
          limit: {
            type: 'number',
            description: "Nombre maximum d'affaires (défaut 20).",
          },
        },
      },
      execute: async (args) => {
        const agentId = typeof args.agentId === 'string' ? args.agentId : undefined;
        const limit = typeof args.limit === 'number' ? args.limit : 20;
        return safeReadOnlyExecute('le module Affaires', async () => {
          const affaires = await queryAgentAffaires(dbContext, agentId, limit);
          return { count: affaires.length, affaires };
        });
      },
    },

    getAffaireDetails: {
      description:
        "Récupère le détail d'une affaire par UUID ou code/référence (colonne reference en base, ex. AF-2026-VOIRIE-005), avec documents GED (table documents) et historique (activity_logs, workflow_steps).",
      inputSchema: {
        type: 'object',
        properties: {
          affaireId: { type: 'string', description: "UUID de l'affaire." },
          reference: {
            type: 'string',
            description: 'Référence / code affaire (ex. AF-2026-VOIRIE-005).',
          },
          code: { type: 'string', description: 'Alias de reference.' },
          codeAffaire: { type: 'string', description: 'Alias de reference (code_affaire métier).' },
        },
      },
      execute: async (args) => {
        const parsed = parseAffaireDetailsInput(args);
        return safeReadOnlyExecute('la fiche affaire et la GED', async () => {
          const details = await queryAffaireDetails(
            dbContext,
            parsed.affaireId,
            parsed.reference,
            { code: parsed.code, codeAffaire: parsed.codeAffaire },
          );
          if (!details.affaire) {
            return affaireNotFoundPayload({
              reference: parsed.reference ?? parsed.code ?? parsed.codeAffaire,
              affaireId: parsed.affaireId,
            });
          }
          return { ok: true, found: true, ...details };
        });
      },
    },

    getPPIMaintenanceOverview: {
      description:
        "Synthèse PPI (planification pluriannuelle) et alertes maintenance (tickets ouverts / en cours) pour l'organisation.",
      inputSchema: {
        type: 'object',
        properties: {
          exerciseYear: { type: 'number', description: "Année d'exercice PPI." },
          maintenanceLimit: { type: 'number' },
          ppiLimit: { type: 'number' },
        },
      },
      execute: async (args) => {
        const exerciseYear = typeof args.exerciseYear === 'number' ? args.exerciseYear : undefined;
        const maintenanceLimit = typeof args.maintenanceLimit === 'number' ? args.maintenanceLimit : 15;
        const ppiLimit = typeof args.ppiLimit === 'number' ? args.ppiLimit : 15;
        return safeReadOnlyExecute('le PPI et la maintenance', async () =>
          queryPpiMaintenanceOverview(dbContext, exerciseYear, maintenanceLimit, ppiLimit),
        );
      },
    },
  };
}

const RICHARD_DB_TOOL_NAMES = new Set([
  'getAgentAffaires',
  'getAffaireDetails',
  'getPPIMaintenanceOverview',
]);

export function mapCursorToolName(rawName: string): string | null {
  const normalized = rawName.toLowerCase();
  for (const name of RICHARD_DB_TOOL_NAMES) {
    if (
      rawName === name ||
      rawName.endsWith(name) ||
      rawName.includes(name) ||
      normalized.includes(name.toLowerCase())
    ) {
      return name;
    }
  }
  return null;
}
