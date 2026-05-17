import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export async function logJobEvent(jobId, type, description, actorName = null) {
  await supabase.from('job_events').insert({ job_id: jobId, type, description, actor_name: actorName });
}

export function useJobEvents(jobId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    supabase
      .from('job_events')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn('job_events fetch error:', error.message, error.code);
        else setEvents(data ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`job-events-${jobId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_events', filter: `job_id=eq.${jobId}` },
        (payload) => setEvents((prev) => [payload.new, ...prev]),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [jobId]);

  return { events, loading };
}
