import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import type { BpuCatalogItem } from '../types';

function mapBpuCatalogItem(row: Record<string, unknown>): BpuCatalogItem {
  return {
    id: String(row.id),
    designation: String(row.designation || ''),
    unit: String(row.unit || 'U'),
    unitPriceHt: Number(row.unit_price_ht || 0),
    createdAt: String(row.created_at),
  };
}

export function useBpuCatalog() {
  const { organizationId } = useAuth();
  const [items, setItems] = useState<BpuCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('bpu_catalog')
      .select('*')
      .eq('organization_id', organizationId)
      .order('designation', { ascending: true });
    if (err) {
      setError(err.message);
      setItems([]);
    } else {
      setItems((data || []).map(mapBpuCatalogItem));
    }
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  return { items, loading, error, refetch: fetchCatalog };
}
