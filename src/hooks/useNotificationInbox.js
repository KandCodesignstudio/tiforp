import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

function transformNotification(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    data: row.data ?? {},
    readAt: row.read_at ? new Date(row.read_at) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

export function useNotificationInbox(userId, channelId = 'default') {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = () =>
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error) setNotifications((data ?? []).map(transformNotification));
        setLoading(false);
      });

  useEffect(() => {
    if (!userId) return;

    fetchAll();

    const channel = supabase
      .channel(`notifications-${userId}-${channelId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setNotifications((prev) => [transformNotification(payload.new), ...prev]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setNotifications((prev) =>
          prev.map((n) => n.id === payload.new.id ? transformNotification(payload.new) : n)
        ),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id)),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) =>
      n.id === id ? { ...n, readAt: new Date() } : n
    ));
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  };

  const markAllRead = async () => {
    const now = new Date();
    const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);
    if (!unreadIds.length) return;
    setNotifications((prev) => prev.map((n) => n.readAt ? n : { ...n, readAt: now }));
    await supabase.from('notifications').update({ read_at: now.toISOString() }).in('id', unreadIds);
  };

  const remove = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };

  return { notifications, unreadCount, loading, markRead, markAllRead, remove, refresh: fetchAll };
}
