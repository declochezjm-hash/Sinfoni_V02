import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'budget_alert' | 'delay_alert' | 'validation_alert' | 'system';
  read: boolean;
  projectId?: string;
  projectReference?: string;
  createdAt: string;
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    message: String(row.message),
    type: String(row.type) as Notification['type'],
    read: Boolean(row.read),
    projectId: row.project_id ? String(row.project_id) : undefined,
    projectReference: row.project_reference ? String(row.project_reference) : undefined,
    createdAt: String(row.created_at),
  };
}

export function useNotifications() {
  const { organizationId } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50);
    const list = (data || []).map(mapNotification);
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.read).length);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('organization_id', organizationId)
      .eq('id', id);
    if (err) throw err;
    await fetchNotifications();
  }, [organizationId, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    const { error: err } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('organization_id', organizationId)
      .eq('read', false);
    if (err) throw err;
    await fetchNotifications();
  }, [organizationId, fetchNotifications]);

  const deleteNotification = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('notifications')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id);
    if (err) throw err;
    await fetchNotifications();
  }, [organizationId, fetchNotifications]);

  return {
    notifications,
    loading,
    unreadCount,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
