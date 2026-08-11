import type { Project, ProjectTimesheet } from '../types';
import { LABOR_HOURLY_RATE } from '../lib/projectConstants';

export type AlertType = 'budget' | 'retard' | 'facturation';

export interface ProjectAlert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
}

const BUDGET_THRESHOLD = 0.9;

export function buildLaborCostsMap(
  timesheets: Pick<ProjectTimesheet, 'projectId' | 'hours'>[],
): Record<string, number> {
  const hoursByProject: Record<string, number> = {};
  for (const entry of timesheets) {
    hoursByProject[entry.projectId] = (hoursByProject[entry.projectId] ?? 0) + entry.hours;
  }
  const costs: Record<string, number> = {};
  for (const [projectId, hours] of Object.entries(hoursByProject)) {
    costs[projectId] = hours * LABOR_HOURLY_RATE;
  }
  return costs;
}

export function getEffectiveBudgetConsumed(
  project: Project,
  laborCostsByProjectId: Record<string, number>,
): number {
  const laborCost = project.enableTimeTracking
    ? (laborCostsByProjectId[project.id] ?? 0)
    : 0;
  return project.budgetConsumed + laborCost;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function checkBudgetAlert(
  project: Project,
  laborCostsByProjectId: Record<string, number>,
): ProjectAlert | null {
  if (project.budgetTotal <= 0) return null;
  const consumed = getEffectiveBudgetConsumed(project, laborCostsByProjectId);
  if (consumed / project.budgetTotal <= BUDGET_THRESHOLD) return null;

  const pct = Math.round((consumed / project.budgetTotal) * 100);
  const laborNote =
    project.enableTimeTracking && (laborCostsByProjectId[project.id] ?? 0) > 0
      ? ' (incluant la main-d\'œuvre)'
      : '';

  return {
    id: project.id,
    title: project.title,
    message: `Budget consommé à ${pct}%${laborNote} (${consumed.toLocaleString('fr-FR')} € / ${project.budgetTotal.toLocaleString('fr-FR')} €).`,
    type: 'budget',
  };
}

function checkDelayAlert(project: Project, today: Date): ProjectAlert | null {
  if (project.status === 'Clôturé' || !project.expectedEndDate) return null;

  const expected = startOfDay(new Date(project.expectedEndDate));
  const now = startOfDay(today);
  if (now <= expected) return null;

  const diffDays = Math.round((now.getTime() - expected.getTime()) / (24 * 60 * 60 * 1000));

  return {
    id: project.id,
    title: project.title,
    message: `Retard de ${diffDays} jour${diffDays > 1 ? 's' : ''} — fin prévue le ${expected.toLocaleDateString('fr-FR')}.`,
    type: 'retard',
  };
}

function checkBillingAlert(project: Project): ProjectAlert | null {
  if (project.quoteStatus !== 'Accepté' || project.billingStatus !== 'À émettre') {
    return null;
  }

  return {
    id: project.id,
    title: project.title,
    message: 'Devis accepté — la facturation est toujours « À émettre ».',
    type: 'facturation',
  };
}

/** Analyse la liste des projets et renvoie les alertes actives calculées en temps réel. */
export function computeProjectAlerts(
  projects: Project[],
  laborCostsByProjectId: Record<string, number> = {},
  today: Date = new Date(),
): ProjectAlert[] {
  const alerts: ProjectAlert[] = [];

  for (const project of projects) {
    const budgetAlert = checkBudgetAlert(project, laborCostsByProjectId);
    if (budgetAlert) alerts.push(budgetAlert);

    const delayAlert = checkDelayAlert(project, today);
    if (delayAlert) alerts.push(delayAlert);

    const billingAlert = checkBillingAlert(project);
    if (billingAlert) alerts.push(billingAlert);
  }

  return alerts;
}

/** Regroupe les alertes par identifiant de projet. */
export function groupAlertsByProjectId(alerts: ProjectAlert[]): Record<string, ProjectAlert[]> {
  const grouped: Record<string, ProjectAlert[]> = {};
  for (const alert of alerts) {
    if (!grouped[alert.id]) grouped[alert.id] = [];
    grouped[alert.id].push(alert);
  }
  return grouped;
}

/** Retourne l'alerte critique majeure (budget > retard > facturation). */
export function getPrimaryAlertType(alerts: ProjectAlert[]): AlertType | null {
  const types = new Set(alerts.map((a) => a.type));
  if (types.has('budget')) return 'budget';
  if (types.has('retard')) return 'retard';
  if (types.has('facturation')) return 'facturation';
  return null;
}
