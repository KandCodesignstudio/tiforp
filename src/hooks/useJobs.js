import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { rollupJobStatus, getTripStatus } from '../utils/status';
import { notifyAdmins, notifyUser } from '../utils/notifications';

function transformJob(row) {
  return {
    id: row.id,
    jobNumber: row.job_number,
    status: row.status,
    technicianId: row.technician_id,
    technicianName: row.metadata?.technicianName ?? null,
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
    metadata: row.metadata ?? {},
  };
}

export function useJobs({ isAdmin = false, userId = null, channelId = 'default', userProfile = null } = {}) {
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
      .channel(`jobs-changes-${channelId}-${Math.random().toString(36).slice(2)}`)
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

    if (!isAdmin) {
      const statusLabel = getTripStatus(newStatus).label;
      const techName = userProfile?.full_name ?? 'Technician';
      const title = newStatus === 'pending_approval'
        ? 'Completion Approval Needed'
        : 'Trip Status Update';
      const body = newStatus === 'pending_approval'
        ? `${techName} submitted Trip for approval on job ${job.jobNumber ?? jobId}. Please review notes and photos.`
        : `${techName} marked Trip as "${statusLabel}" on job ${job.jobNumber ?? jobId}`;
      notifyAdmins(title, body, { jobId }).catch(() => {});
    }

    if (isAdmin && newStatus === 'completed') {
      notifyUser(
        job.technicianId,
        'Trip Approved!',
        `Admin approved completion of Trip on job ${job.jobNumber ?? jobId}.`,
        { jobId }
      ).catch(() => {});
    }
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

  const addTrip = async (jobId, { scheduledAt, scopeOfWork }) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const nextNumber = (job.trips?.length ?? 0) + 1;
    const newTrip = {
      id: `trip_${Date.now()}`,
      tripNumber: nextNumber,
      status: 'scheduled',
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      scopeOfWork: (scopeOfWork ?? '').trim(),
    };
    const updatedTrips = [
      ...job.trips.map((t) => ({ ...t, scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt })),
      newTrip,
    ];
    const newJobStatus = rollupJobStatus(updatedTrips);
    const nextTripIso = updatedTrips
      .filter((t) => t.status === 'scheduled' && t.scheduledAt)
      .map((t) => t.scheduledAt)
      .sort()[0] ?? null;

    setJobs((prev) => prev.map((j) =>
      j.id === jobId
        ? {
            ...j,
            status: newJobStatus,
            trips: updatedTrips.map((t) => ({ ...t, scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null })),
            nextTrip: nextTripIso ? new Date(nextTripIso) : null,
          }
        : j
    ));

    await supabase
      .from('jobs')
      .update({ trips: updatedTrips, status: newJobStatus, next_trip: nextTripIso })
      .eq('id', jobId);
  };

  const updateTrip = async (jobId, tripId, { scheduledAt, scopeOfWork }) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const updatedTrips = job.trips.map((t) =>
      t.id === tripId
        ? { ...t, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null, scopeOfWork: (scopeOfWork ?? '').trim() }
        : { ...t, scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt }
    );
    const nextTripIso = updatedTrips
      .filter((t) => t.status === 'scheduled' && t.scheduledAt)
      .map((t) => t.scheduledAt)
      .sort()[0] ?? null;

    setJobs((prev) => prev.map((j) =>
      j.id === jobId
        ? {
            ...j,
            trips: updatedTrips.map((t) => ({ ...t, scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null })),
            nextTrip: nextTripIso ? new Date(nextTripIso) : null,
          }
        : j
    ));

    await supabase.from('jobs').update({ trips: updatedTrips, next_trip: nextTripIso }).eq('id', jobId);
  };

  const deleteTrip = async (jobId, tripId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const remaining = job.trips
      .filter((t) => t.id !== tripId)
      .map((t, idx) => ({ ...t, tripNumber: idx + 1, scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt }));
    const newJobStatus = rollupJobStatus(remaining);
    const nextTripIso = remaining
      .filter((t) => t.status === 'scheduled' && t.scheduledAt)
      .map((t) => t.scheduledAt)
      .sort()[0] ?? null;

    setJobs((prev) => prev.map((j) =>
      j.id === jobId
        ? {
            ...j,
            status: newJobStatus,
            trips: remaining.map((t) => ({ ...t, scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null })),
            nextTrip: nextTripIso ? new Date(nextTripIso) : null,
          }
        : j
    ));

    await supabase.from('jobs').update({ trips: remaining, status: newJobStatus, next_trip: nextTripIso }).eq('id', jobId);
  };

  const updateAttachments = (jobId, attachments) => {
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, attachments } : j));
  };

  const closeJob = async (jobId) => {
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'closed' } : j));
    await supabase.from('jobs').update({ status: 'closed' }).eq('id', jobId);
  };

  return { jobs, loading, updateJobStatus, updateTripStatus, updatePayments, addTrip, updateTrip, deleteTrip, updateAttachments, closeJob, refresh: fetchJobs };
}
