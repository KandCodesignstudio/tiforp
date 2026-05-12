import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { MOCK_JOBS } from '../config/mockData';

const USE_MOCK = true; // Set to false after configuring Supabase

function transformJob(row) {
  return {
    id: row.id,
    jobNumber: row.job_number,
    status: row.status,
    client: row.client ?? {},
    description: row.description,
    trips: (row.trips ?? []).map((t) => ({
      ...t,
      scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null,
    })),
    attachments: row.attachments ?? [],
    nextTrip: row.next_trip ? new Date(row.next_trip) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

export function useJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCK) {
      setJobs(MOCK_JOBS);
      setLoading(false);
      return;
    }

    // Initial fetch
    supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setJobs((data ?? []).map(transformJob));
        setLoading(false);
      });

    // Real-time subscription
    const channel = supabase
      .channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data }) => setJobs((data ?? []).map(transformJob)));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const updateJobStatus = async (jobId, status) => {
    if (USE_MOCK) return;
    await supabase.from('jobs').update({ status }).eq('id', jobId);
  };

  return { jobs, loading, updateJobStatus };
}
