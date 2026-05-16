import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export function useJobChat(jobId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    supabase
      .from('job_messages')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? []);
        setLoading(false);
      });

    const channelId = `chat-${jobId}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'job_messages',
        filter: `job_id=eq.${jobId}`,
      }, (payload) => {
        setMessages((prev) => {
          const withoutOptimistic = prev.filter(
            (m) => !(m.id.startsWith('optimistic-') && m.text === payload.new.text && m.user_id === payload.new.user_id)
          );
          if (withoutOptimistic.some((m) => m.id === payload.new.id)) return withoutOptimistic;
          return [...withoutOptimistic, payload.new];
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [jobId]);

  const sendMessage = async (text, userId, senderName) => {
    if (!text.trim()) return;
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      job_id: jobId,
      user_id: userId,
      sender_name: senderName,
      text: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const { error } = await supabase.from('job_messages').insert({
      job_id: jobId,
      user_id: userId,
      sender_name: senderName,
      text: text.trim(),
    });
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      throw error;
    }
  };

  const refresh = () =>
    supabase
      .from('job_messages')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []));

  return { messages, loading, sendMessage, refresh };
}
