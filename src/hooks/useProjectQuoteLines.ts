import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import type { ProjectQuoteLine } from '../types';

export interface QuoteLineInput {
  bpuId?: string;
  designation: string;
  quantity: number;
  unitPriceHt: number;
}

function mapQuoteLine(row: Record<string, unknown>): ProjectQuoteLine {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    bpuId: row.bpu_id ? String(row.bpu_id) : undefined,
    designation: String(row.designation || ''),
    quantity: Number(row.quantity || 0),
    unitPriceHt: Number(row.unit_price_ht || 0),
    createdAt: String(row.created_at),
  };
}

export function computeQuoteLinesTotal(lines: ProjectQuoteLine[]): number {
  return Math.round(
    lines.reduce((sum, line) => sum + line.quantity * line.unitPriceHt, 0),
  );
}

export function computeQuoteLineTotal(line: Pick<ProjectQuoteLine, 'quantity' | 'unitPriceHt'>): number {
  return Math.round(line.quantity * line.unitPriceHt * 100) / 100;
}

export function useProjectQuoteLines(
  projectId: string | null,
  onTotalChange?: (totalHt: number) => void,
) {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<ProjectQuoteLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalHt = useMemo(() => computeQuoteLinesTotal(lines), [lines]);
  const prevLineCountRef = useRef(0);

  const fetchLines = useCallback(async () => {
    if (!projectId) {
      setLines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('project_quote_lines')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (err) {
      setError(err.message);
      setLines([]);
    } else {
      setLines((data || []).map(mapQuoteLine));
    }
    setLoading(false);
  }, [projectId, organizationId]);

  useEffect(() => {
    void fetchLines();
  }, [fetchLines]);

  useEffect(() => {
    if (lines.length > 0) {
      onTotalChange?.(totalHt);
    } else if (prevLineCountRef.current > 0) {
      onTotalChange?.(0);
    }
    prevLineCountRef.current = lines.length;
  }, [totalHt, lines.length, onTotalChange]);

  const addLine = useCallback(
    async (input: QuoteLineInput) => {
      if (!projectId) return;
      const { error: err } = await supabase.from('project_quote_lines').insert({
        organization_id: organizationId,
        project_id: projectId,
        bpu_id: input.bpuId || null,
        designation: input.designation.trim(),
        quantity: input.quantity,
        unit_price_ht: input.unitPriceHt,
      });
      if (err) throw err;
      await fetchLines();
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    [projectId, organizationId, fetchLines, queryClient],
  );

  const deleteLine = useCallback(
    async (id: string) => {
      const { error: err } = await supabase
        .from('project_quote_lines')
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', id);
      if (err) throw err;
      await fetchLines();
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    [organizationId, fetchLines, queryClient],
  );

  return { lines, totalHt, loading, error, refetch: fetchLines, addLine, deleteLine };
}
