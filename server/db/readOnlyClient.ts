import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Tables exposées en lecture seule pour Richard (vues public.*). */
export const READ_ONLY_TABLES = [
  'projects',
  'documents',
  'activity_logs',
  'workflow_steps',
  'tickets_maintenance_enriched',
  'ppi_planification',
] as const;

export type ReadOnlyTable = (typeof READ_ONLY_TABLES)[number];

export interface ReadOnlyDbContext {
  /** Identifiant organisation (multi-tenant). */
  tenantId: string;
  userId?: string;
  userRole?: string;
  communeInseeCode?: string;
}

export class ReadOnlyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReadOnlyViolationError';
  }
}

let cachedClient: SupabaseClient | null = null;

export function getReadOnlySupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Configuration Supabase manquante (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ou clé anon).',
    );
  }

  cachedClient = createClient(url, key, {
    db: { schema: 'public' },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedClient;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertReadOnlyContext(ctx: ReadOnlyDbContext): void {
  if (!ctx.tenantId || !UUID_RE.test(ctx.tenantId)) {
    throw new Error('tenant_id (organization_id) invalide ou manquant.');
  }
}

export function assertReadOnlyTable(table: string): ReadOnlyTable {
  if (!(READ_ONLY_TABLES as readonly string[]).includes(table)) {
    throw new ReadOnlyViolationError(`Table non autorisée en lecture : ${table}`);
  }
  return table as ReadOnlyTable;
}

export interface AgentAffaireRow {
  id: string;
  reference: string;
  title: string;
  status: string;
  type: string;
  ownerId: string;
  ownerName: string;
  budgetTotal: number;
  budgetConsumed: number;
  communeInseeCode?: string;
  updatedAt: string;
}

export async function queryAgentAffaires(
  ctx: ReadOnlyDbContext,
  agentId?: string,
  limit = 20,
): Promise<AgentAffaireRow[]> {
  assertReadOnlyContext(ctx);
  assertReadOnlyTable('projects');
  const client = getReadOnlySupabaseClient();
  const effectiveAgentId = agentId ?? ctx.userId;

  let query = client
    .from('projects')
    .select(
      'id, reference, title, status, type, owner_id, owner_name, budget_total, budget_consumed, commune_insee_code, updated_at',
    )
    .eq('organization_id', ctx.tenantId);

  if (ctx.userRole === 'COMMUNE' && ctx.communeInseeCode) {
    query = query.eq('commune_insee_code', ctx.communeInseeCode);
  }

  if (effectiveAgentId) {
    query = query.eq('owner_id', effectiveAgentId);
  }

  const { data, error } = await query.order('updated_at', { ascending: false }).limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    reference: String(row.reference),
    title: String(row.title),
    status: String(row.status),
    type: String(row.type),
    ownerId: String(row.owner_id ?? ''),
    ownerName: String(row.owner_name ?? ''),
    budgetTotal: Number(row.budget_total ?? 0),
    budgetConsumed: Number(row.budget_consumed ?? 0),
    communeInseeCode: row.commune_insee_code ? String(row.commune_insee_code) : undefined,
    updatedAt: String(row.updated_at ?? ''),
  }));
}

export interface AffaireDocumentRow {
  id: string;
  name: string;
  category: string;
  size: string;
  version: number;
  createdAt: string;
}

export interface AffaireActivityRow {
  id: string;
  action: string;
  userName: string;
  userRole: string;
  timestamp: string;
}

export interface AffaireDetailsResult {
  affaire: Record<string, unknown> | null;
  documents: AffaireDocumentRow[];
  activityHistory: AffaireActivityRow[];
  workflowSteps: Record<string, unknown>[];
}

export async function queryAffaireDetails(
  ctx: ReadOnlyDbContext,
  affaireId?: string,
  reference?: string,
): Promise<AffaireDetailsResult> {
  assertReadOnlyContext(ctx);
  assertReadOnlyTable('projects');
  const client = getReadOnlySupabaseClient();

  let projectQuery = client.from('projects').select('*').eq('organization_id', ctx.tenantId);

  if (ctx.userRole === 'COMMUNE' && ctx.communeInseeCode) {
    projectQuery = projectQuery.eq('commune_insee_code', ctx.communeInseeCode);
  }

  if (affaireId) {
    projectQuery = projectQuery.eq('id', affaireId);
  } else if (reference) {
    projectQuery = projectQuery.eq('reference', reference);
  } else {
    throw new Error('affaireId ou reference requis.');
  }

  const { data: projectRows, error: projectError } = await projectQuery.limit(1);
  if (projectError) throw new Error(projectError.message);

  const project = projectRows?.[0];
  if (!project) {
    return { affaire: null, documents: [], activityHistory: [], workflowSteps: [] };
  }

  const projectId = String(project.id);

  let documentsQuery = client
    .from('documents')
    .select('id, name, category, size, version, created_at')
    .eq('organization_id', ctx.tenantId)
    .eq('project_id', projectId);

  let activityQuery = client
    .from('activity_logs')
    .select('id, action, user_name, user_role, timestamp')
    .eq('organization_id', ctx.tenantId)
    .eq('target_type', 'project')
    .eq('target_id', projectId);

  let workflowQuery = client
    .from('workflow_steps')
    .select('step_key, step_label, step_order, status, completed_at, completed_by')
    .eq('organization_id', ctx.tenantId)
    .eq('project_id', projectId)
    .order('step_order', { ascending: true });

  const [documentsRes, activityRes, workflowRes] = await Promise.all([
    documentsQuery.order('created_at', { ascending: false }).limit(25),
    activityQuery.order('timestamp', { ascending: false }).limit(25),
    workflowQuery,
  ]);

  if (documentsRes.error) throw new Error(documentsRes.error.message);
  if (activityRes.error) throw new Error(activityRes.error.message);
  if (workflowRes.error) throw new Error(workflowRes.error.message);

  return {
    affaire: project as Record<string, unknown>,
    documents: (documentsRes.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      category: String(row.category),
      size: String(row.size ?? ''),
      version: Number(row.version ?? 1),
      createdAt: String(row.created_at ?? ''),
    })),
    activityHistory: (activityRes.data ?? []).map((row) => ({
      id: String(row.id),
      action: String(row.action ?? ''),
      userName: String(row.user_name ?? ''),
      userRole: String(row.user_role ?? ''),
      timestamp: String(row.timestamp ?? ''),
    })),
    workflowSteps: (workflowRes.data ?? []) as Record<string, unknown>[],
  };
}

export interface MaintenanceAlertRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  communeInseeCode: string;
  createdAt: string;
  scheduledStart?: string | null;
}

export interface PpiOverviewRow {
  id: string;
  projectId: string | null;
  chantierId: string | null;
  exerciseYear: number;
  enveloppeVotee: number;
  engage: number;
  realise: number;
  status: string;
}

export interface PpiMaintenanceOverviewResult {
  maintenanceAlerts: MaintenanceAlertRow[];
  ppiLines: PpiOverviewRow[];
  summary: {
    openMaintenanceTickets: number;
    ppiLinesCount: number;
    exerciseYear?: number;
  };
}

export async function queryPpiMaintenanceOverview(
  ctx: ReadOnlyDbContext,
  exerciseYear?: number,
  maintenanceLimit = 15,
  ppiLimit = 15,
): Promise<PpiMaintenanceOverviewResult> {
  assertReadOnlyContext(ctx);
  assertReadOnlyTable('tickets_maintenance_enriched');
  assertReadOnlyTable('ppi_planification');
  const client = getReadOnlySupabaseClient();
  const year = exerciseYear ?? new Date().getFullYear();

  let ticketsQuery = client
    .from('tickets_maintenance_enriched')
    .select('id, title, status, priority, commune_insee_code, created_at, scheduled_start')
    .eq('organization_id', ctx.tenantId)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(maintenanceLimit);

  if (ctx.userRole === 'COMMUNE' && ctx.communeInseeCode) {
    ticketsQuery = ticketsQuery.eq('commune_insee_code', ctx.communeInseeCode);
  }

  const ppiQuery = client
    .from('ppi_planification')
    .select('id, project_id, chantier_id, exercise_year, enveloppe_votee, engage, realise, status')
    .eq('organization_id', ctx.tenantId)
    .eq('exercise_year', year)
    .order('updated_at', { ascending: false })
    .limit(ppiLimit);

  const [ticketsRes, ppiRes] = await Promise.all([ticketsQuery, ppiQuery]);

  if (ticketsRes.error) throw new Error(ticketsRes.error.message);
  if (ppiRes.error) throw new Error(ppiRes.error.message);

  const maintenanceAlerts = (ticketsRes.data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    status: String(row.status),
    priority: String(row.priority),
    communeInseeCode: String(row.commune_insee_code ?? ''),
    createdAt: String(row.created_at ?? ''),
    scheduledStart: row.scheduled_start ? String(row.scheduled_start) : null,
  }));

  const ppiLines = (ppiRes.data ?? []).map((row) => ({
    id: String(row.id),
    projectId: row.project_id != null ? String(row.project_id) : null,
    chantierId: row.chantier_id != null ? String(row.chantier_id) : null,
    exerciseYear: Number(row.exercise_year),
    enveloppeVotee: Number(row.enveloppe_votee ?? 0),
    engage: Number(row.engage ?? 0),
    realise: Number(row.realise ?? 0),
    status: String(row.status ?? ''),
  }));

  return {
    maintenanceAlerts,
    ppiLines,
    summary: {
      openMaintenanceTickets: maintenanceAlerts.length,
      ppiLinesCount: ppiLines.length,
      exerciseYear: year,
    },
  };
}
