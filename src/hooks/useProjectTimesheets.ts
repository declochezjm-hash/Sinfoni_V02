import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSupabaseQueryEnabled, queryLoadingWhileAuth } from '../lib/authQuery';
import { useAuth } from './useAuth';
import type { ProjectTimesheet } from '../types';

export interface TimesheetInput {
  companyName: string;
  userName: string;
  hours: number;
  description?: string;
}

function mapTimesheet(row: Record<string, unknown>): ProjectTimesheet {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    companyName: String(row.company_name || ''),
    userName: String(row.user_name || ''),
    hours: Number(row.hours || 0),
    description: row.description ? String(row.description) : undefined,
    createdAt: String(row.created_at),
  };
}

async function fetchAllTimesheets(organizationId: string | null | undefined): Promise<ProjectTimesheet[]> {
  let query = supabase.from('project_timesheets').select('*');
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapTimesheet);
}

export function useAllProjectTimesheets() {
  const { authInitialized, organizationId, enabled: queryEnabled } = useSupabaseQueryEnabled();
  const query = useQuery({
    queryKey: ['project-timesheets', organizationId ?? 'all'],
    queryFn: () => fetchAllTimesheets(organizationId),
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  return {
    ...query,
    isLoading: queryLoadingWhileAuth(authInitialized, queryEnabled, query.isLoading),
  };
}

export function useProjectTimesheets(projectId: string | null) {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [timesheets, setTimesheets] = useState<ProjectTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimesheets = useCallback(async () => {
    if (!projectId) {
      setTimesheets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('project_timesheets')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .order('company_name', { ascending: true })
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
      setTimesheets([]);
    } else {
      setTimesheets((data || []).map(mapTimesheet));
    }
    setLoading(false);
  }, [projectId, organizationId]);

  useEffect(() => {
    void fetchTimesheets();
  }, [fetchTimesheets]);

  const addTimesheet = useCallback(
    async (input: TimesheetInput) => {
      if (!projectId) return;
      const { error: err } = await supabase.from('project_timesheets').insert({
        organization_id: organizationId,
        project_id: projectId,
        company_name: input.companyName.trim(),
        user_name: input.userName.trim(),
        hours: input.hours,
        description: input.description?.trim() || null,
      });
      if (err) throw err;
      await fetchTimesheets();
      void queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
    },
    [projectId, organizationId, fetchTimesheets, queryClient],
  );

  const deleteTimesheet = useCallback(
    async (id: string) => {
      const { error: err } = await supabase
        .from('project_timesheets')
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', id);
      if (err) throw err;
      await fetchTimesheets();
      void queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
    },
    [organizationId, fetchTimesheets, queryClient],
  );

  return { timesheets, loading, error, refetch: fetchTimesheets, addTimesheet, deleteTimesheet };
}
