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
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const READ_ONLY_QUERY_TIMEOUT_MS = 15_000;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

function withReadOnlyTimeout<T>(label: string, promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Délai dépassé (${label}, ${READ_ONLY_QUERY_TIMEOUT_MS}ms).`));
    }, READ_ONLY_QUERY_TIMEOUT_MS);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function buildProjectsBaseQuery(client: SupabaseClient, ctx: ReadOnlyDbContext) {
  let query = client.from('projects').select('*').eq('organization_id', ctx.tenantId);

  if (ctx.userRole === 'COMMUNE' && ctx.communeInseeCode) {
    query = query.eq('commune_insee_code', ctx.communeInseeCode);
  }

  return query;
}

export interface AffaireLookupInput {
  affaireId?: string;
  reference?: string;
  code?: string;
  codeAffaire?: string;
}

export class AffaireNotFoundError extends Error {
  readonly code = 'AFFAIRE_NOT_FOUND';
  readonly searched: { reference?: string; affaireId?: string; organizationId: string };

  constructor(
    message: string,
    searched: { reference?: string; affaireId?: string; organizationId: string },
  ) {
    super(message);
    this.name = 'AffaireNotFoundError';
    this.searched = searched;
  }
}

async function findProjectByIdentifier(
  client: SupabaseClient,
  ctx: ReadOnlyDbContext,
  input: AffaireLookupInput,
): Promise<Record<string, unknown>> {
  const referenceCode = (input.reference ?? input.code ?? input.codeAffaire)?.trim();
  const affaireId = input.affaireId?.trim();

  if (!affaireId && !referenceCode) {
    throw new Error('affaireId, reference ou code affaire requis.');
  }

  const uuidCandidates = new Set<string>();
  if (affaireId && isUuid(affaireId)) uuidCandidates.add(affaireId);
  if (referenceCode && isUuid(referenceCode)) uuidCandidates.add(referenceCode);

  for (const id of uuidCandidates) {
    const { data, error } = await buildProjectsBaseQuery(client, ctx).eq('id', id).limit(1);
    if (error) throw new Error(error.message);
    if (data?.[0]) return data[0] as Record<string, unknown>;
  }

  if (referenceCode) {
    const attempts: Array<(q: ReturnType<typeof buildProjectsBaseQuery>) => ReturnType<typeof buildProjectsBaseQuery>> = [
      (q) => q.eq('reference', referenceCode),
      (q) => q.ilike('reference', referenceCode),
      (q) => q.ilike('reference', `%${escapeIlikePattern(referenceCode)}%`),
    ];

    for (const applyFilter of attempts) {
      const { data, error } = await applyFilter(buildProjectsBaseQuery(client, ctx)).limit(1);
      if (error) throw new Error(error.message);
      if (data?.[0]) return data[0] as Record<string, unknown>;
    }
  }

  throw new AffaireNotFoundError(
    'Aucune affaire ne correspond à ce code pour votre organisation.',
    {
      reference: referenceCode,
      affaireId: affaireId && isUuid(affaireId) ? affaireId : undefined,
      organizationId: ctx.tenantId,
    },
  );
}

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
  extra?: Pick<AffaireLookupInput, 'code' | 'codeAffaire'>,
): Promise<AffaireDetailsResult> {
  assertReadOnlyContext(ctx);
  assertReadOnlyTable('projects');
  const client = getReadOnlySupabaseClient();

  let project: Record<string, unknown>;
  try {
    project = await withReadOnlyTimeout(
      'recherche affaire',
      findProjectByIdentifier(client, ctx, {
        affaireId,
        reference,
        code: extra?.code,
        codeAffaire: extra?.codeAffaire,
      }),
    );
  } catch (error) {
    if (error instanceof AffaireNotFoundError) {
      return { affaire: null, documents: [], activityHistory: [], workflowSteps: [] };
    }
    throw error;
  }

  const projectId = String(project.id);

  const [documentsRes, activityRes, workflowRes] = await withReadOnlyTimeout(
    'détails affaire (GED, historique, workflow)',
    Promise.all([
      client
        .from('documents')
        .select('id, name, category, size, version, created_at')
        .eq('organization_id', ctx.tenantId)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(25),
      client
        .from('activity_logs')
        .select('id, action, user_name, user_role, timestamp')
        .eq('organization_id', ctx.tenantId)
        .eq('target_type', 'project')
        .eq('target_id', projectId)
        .order('timestamp', { ascending: false })
        .limit(25),
      client
        .from('workflow_steps')
        .select('step_key, step_label, step_order, status, completed_at, completed_by')
        .eq('organization_id', ctx.tenantId)
        .eq('project_id', projectId)
        .order('step_order', { ascending: true }),
    ]),
  );

  if (documentsRes.error) throw new Error(documentsRes.error.message);
  if (activityRes.error) throw new Error(activityRes.error.message);
  if (workflowRes.error) throw new Error(workflowRes.error.message);

  return {
    affaire: project,
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

export interface BudgetSummaryFilters {
  communeInsee?: string;
  filiere?: string;
  exercice?: number;
}

export interface BudgetSummaryResult {
  ok: true;
  filters: {
    communeInsee?: string;
    filiere?: string;
    filiereResolved?: string;
    exercice?: number;
  };
  affairesCount: number;
  budgetTotal: number;
  budgetEngage: number;
  resteAEngager: number;
  tauxConsommationPct: number | null;
  source: 'projects' | 'ppi_planification';
}

const PROJECT_TYPE_BY_FILIERE: Record<string, string> = {
  eclairage: 'Éclairage Public',
  'eclairage public': 'Éclairage Public',
  ep: 'Éclairage Public',
  led: 'Éclairage Public',
  electricite: 'Électricité',
  elec: 'Électricité',
  telecom: 'Télécom',
  irve: 'IRVE',
  borne: 'IRVE',
  recharge: 'IRVE',
};

function foldAscii(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function consumptionRate(total: number, engage: number): number | null {
  if (total <= 0) return null;
  return Math.round((engage / total) * 1000) / 10;
}

function resolveFiliereFilter(filiere?: string): { type?: string; textPattern?: string } {
  if (!filiere?.trim()) return {};
  const folded = foldAscii(filiere);
  const mappedType = PROJECT_TYPE_BY_FILIERE[folded];
  if (mappedType) return { type: mappedType };

  const knownType = (['Électricité', 'Éclairage Public', 'Télécom', 'IRVE'] as const).find(
    (type) => foldAscii(type) === folded,
  );
  if (knownType) return { type: knownType };

  return { textPattern: filiere.trim() };
}

interface BudgetProjectRow {
  id: string;
  reference: string;
  title: string;
  type: string;
  budget_total: number | null;
  budget_consumed: number | null;
  ppi_year: number | null;
  commune_insee_code: string | null;
  location: string | null;
}

interface BudgetPpiRow {
  project_id: string | null;
  enveloppe_votee: number | null;
  engage: number | null;
}

function sumBudgetFromProjects(rows: BudgetProjectRow[]): {
  budgetTotal: number;
  budgetEngage: number;
  resteAEngager: number;
  tauxConsommationPct: number | null;
} {
  const budgetTotal = roundMoney(
    rows.reduce((sum, row) => sum + Number(row.budget_total ?? 0), 0),
  );
  const budgetEngage = roundMoney(
    rows.reduce((sum, row) => sum + Number(row.budget_consumed ?? 0), 0),
  );
  return {
    budgetTotal,
    budgetEngage,
    resteAEngager: roundMoney(budgetTotal - budgetEngage),
    tauxConsommationPct: consumptionRate(budgetTotal, budgetEngage),
  };
}

export async function queryBudgetSummary(
  ctx: ReadOnlyDbContext,
  filters: BudgetSummaryFilters = {},
): Promise<BudgetSummaryResult> {
  assertReadOnlyContext(ctx);
  assertReadOnlyTable('projects');
  const client = getReadOnlySupabaseClient();

  const communeRaw = filters.communeInsee?.trim();
  const forcedCommuneInsee =
    ctx.userRole === 'COMMUNE' && ctx.communeInseeCode ? ctx.communeInseeCode : undefined;
  const filiereFilter = resolveFiliereFilter(filters.filiere);
  const exercice = filters.exercice;

  let query = client
    .from('projects')
    .select(
      'id, reference, title, type, budget_total, budget_consumed, ppi_year, commune_insee_code, location',
    )
    .eq('organization_id', ctx.tenantId);

  if (forcedCommuneInsee) {
    query = query.eq('commune_insee_code', forcedCommuneInsee);
  } else if (communeRaw) {
    if (/^\d{5}$/.test(communeRaw)) {
      query = query.eq('commune_insee_code', communeRaw);
    } else {
      query = query.ilike('location', `%${escapeIlikePattern(communeRaw)}%`);
    }
  }

  if (filiereFilter.type) {
    query = query.eq('type', filiereFilter.type);
  } else if (filiereFilter.textPattern) {
    const pattern = `%${escapeIlikePattern(filiereFilter.textPattern)}%`;
    query = query.or(
      `type.ilike.${pattern},title.ilike.${pattern},reference.ilike.${pattern},location.ilike.${pattern}`,
    );
  }

  const { data, error } = await query.order('updated_at', { ascending: false }).limit(1000);

  if (error) throw new Error(error.message);

  const projects = (data ?? []) as BudgetProjectRow[];
  const appliedFilters = {
    communeInsee: forcedCommuneInsee ?? communeRaw,
    filiere: filters.filiere?.trim() || undefined,
    filiereResolved: filiereFilter.type ?? filiereFilter.textPattern,
    exercice,
  };

  const emptyResult = (source: BudgetSummaryResult['source']): BudgetSummaryResult => ({
    ok: true,
    filters: appliedFilters,
    affairesCount: 0,
    budgetTotal: 0,
    budgetEngage: 0,
    resteAEngager: 0,
    tauxConsommationPct: null,
    source,
  });

  if (projects.length === 0) {
    return emptyResult('projects');
  }

  if (exercice != null) {
    assertReadOnlyTable('ppi_planification');
    const projectIds = projects.map((row) => row.id);
    const { data: ppiData, error: ppiError } = await client
      .from('ppi_planification')
      .select('project_id, enveloppe_votee, engage')
      .eq('organization_id', ctx.tenantId)
      .eq('exercise_year', exercice)
      .in('project_id', projectIds);

    if (ppiError) throw new Error(ppiError.message);

    const ppiLines = (ppiData ?? []) as BudgetPpiRow[];
    if (ppiLines.length > 0) {
      const budgetTotal = roundMoney(
        ppiLines.reduce((sum, row) => sum + Number(row.enveloppe_votee ?? 0), 0),
      );
      const budgetEngage = roundMoney(
        ppiLines.reduce((sum, row) => sum + Number(row.engage ?? 0), 0),
      );
      const distinctProjects = new Set(
        ppiLines
          .map((row) => (row.project_id != null ? String(row.project_id) : ''))
          .filter(Boolean),
      );

      return {
        ok: true,
        filters: appliedFilters,
        affairesCount: distinctProjects.size,
        budgetTotal,
        budgetEngage,
        resteAEngager: roundMoney(budgetTotal - budgetEngage),
        tauxConsommationPct: consumptionRate(budgetTotal, budgetEngage),
        source: 'ppi_planification',
      };
    }

    const yearProjects = projects.filter((row) => Number(row.ppi_year) === exercice);
    if (yearProjects.length === 0) {
      return emptyResult('projects');
    }

    return {
      ok: true,
      filters: appliedFilters,
      affairesCount: yearProjects.length,
      ...sumBudgetFromProjects(yearProjects),
      source: 'projects',
    };
  }

  return {
    ok: true,
    filters: appliedFilters,
    affairesCount: projects.length,
    ...sumBudgetFromProjects(projects),
    source: 'projects',
  };
}
