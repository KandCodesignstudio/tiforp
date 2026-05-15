import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

function transformJob(row) {
  return {
    id: row.id,
    jobNumber: row.job_number,
    status: row.status,
    technicianId: row.technician_id,
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

export function useJobs({ isAdmin = false, userId = null } = {}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = () => {
    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (!isAdmin && userId) query = query.eq('technician_id', userId);
    query.then(({ data, error }) => {
      if (!error) setJobs((data ?? []).map(transformJob));
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchJobs();

    const channel = supabase
      .channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchJobs)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isAdmin, userId]);

  const updateJobStatus = async (jobId, status) => {
    await supabase.from('jobs').update({ status }).eq('id', jobId);
  };

  return { jobs, loading, updateJobStatus, refresh: fetchJobs };
}
