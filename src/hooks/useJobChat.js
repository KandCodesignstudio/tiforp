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
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [jobId]);

  const sendMessage = async (text, userId, senderName) => {
    if (!text.trim()) return;
    const { error } = await supabase.from('job_messages').insert({
      job_id: jobId,
      user_id: userId,
      sender_name: senderName,
      text: text.trim(),
    });
    if (error) throw error;
  };

  return { messages, loading, sendMessage };
}
