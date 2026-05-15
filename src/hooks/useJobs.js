import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { rollupJobStatus } from '../utils/status';

function transformJob(row) {
  return {
    id: row.id,
    jobNumber: row.job_number,
    status: row.status,
    technicianId: row.technician_id,
    clientPaid: row.client_paid ?? false,
    techPaid: row.tech_paid ?? false,
    client: row.client ?? {},
    description: row.description,
    trips: (row.trips ?? []).map((t, idx) => ({
      ...t,
      id: t.id ?? `trip_${row.id}_${idx}`,
      scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null,
    })),
    attachments: row.attachments ?? [],
    nextTrip: row.next_trip ? new Date(row.next_trip) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

export function useJobs({ isAdmin = false, userId = null, channelId = 'default' } = {}) {
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
      .channel(`jobs-changes-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchJobs)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isAdmin, userId]);

  const updateJobStatus = async (jobId, status) => {
    await supabase.from('jobs').update({ status }).eq('id', jobId);
  };

  const updateTripStatus = async (jobId, tripId, newStatus) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const updatedTrips = job.trips.map((t) =>
      t.id === tripId ? { ...t, status: newStatus, scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt } : { ...t, scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt }
    );
    const newJobStatus = rollupJobStatus(updatedTrips);

    // Optimistic update
    setJobs((prev) => prev.map((j) =>
      j.id === jobId
        ? { ...j, status: newJobStatus, trips: updatedTrips.map((t) => ({ ...t, scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null })) }
        : j
    ));

    await supabase.from('jobs').update({ trips: updatedTrips, status: newJobStatus }).eq('id', jobId);
  };

  const updatePayments = async (jobId, { clientPaid, techPaid }) => {
    // Optimistic update
    setJobs((prev) => prev.map((j) =>
      j.id === jobId
        ? { ...j, ...(clientPaid !== undefined && { clientPaid }), ...(techPaid !== undefined && { techPaid }) }
        : j
    ));

    const payload = {};
    if (clientPaid !== undefined) payload.client_paid = clientPaid;
    if (techPaid !== undefined) payload.tech_paid = techPaid;
    await supabase.from('jobs').update(payload).eq('id', jobId);
  };

  return { jobs, loading, updateJobStatus, updateTripStatus, updatePayments, refresh: fetchJobs };
}
