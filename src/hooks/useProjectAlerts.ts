import { useMemo } from 'react';
import { useProjects } from './useProjects';
import { useAllProjectTimesheets } from './useProjectTimesheets';
import {
  buildLaborCostsMap,
  computeProjectAlerts,
  type ProjectAlert,
} from '../utils/alertEngine';

export function useProjectAlerts(): {
  alerts: ProjectAlert[];
  count: number;
  loading: boolean;
} {
  const { projects, isLoading: projectsLoading } = useProjects();
  const { data: timesheets = [], isLoading: timesheetsLoading } = useAllProjectTimesheets();

  const laborCosts = useMemo(() => buildLaborCostsMap(timesheets), [timesheets]);

  const alerts = useMemo(
    () => computeProjectAlerts(projects, laborCosts),
    [projects, laborCosts],
  );

  return {
    alerts,
    count: alerts.length,
    loading: projectsLoading || timesheetsLoading,
  };
}
