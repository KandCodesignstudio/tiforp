import { useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import { rollupJobStatus, getTripStatus } from '../utils/status';
import { notifyAdmins, notifyUser } from '../utils/notifications';
import { logJobEvent } from './useJobEvents';

function deriveJobTech(trips) {
  const active = [...(trips ?? [])].reverse()
    .find((t) => t.status !== 'completed' && t.status !== 'for_return' && t.technicianId);
  if (active) return { id: active.technicianId, name: active.technicianName };
  return { id: null, name: null };
}

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
      checkedInAt: t.checkedInAt ? new Date(t.checkedInAt) : null,
      checkedOutAt: t.checkedOutAt ? new Date(t.checkedOutAt) : null,
    })),
    attachments: row.attachments ?? [],
    nextTrip: row.next_trip ? new Date(row.next_trip) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    metadata: row.metadata ?? {},
  };
}

const POLL_INTERVAL_MS = 15000;

export function useJobs({ isAdmin = false, userId = null, channelId = 'default', userProfile = null } = {}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(null);

  const fetchJobs = () => {
    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (!isAdmin && userId) query = query.eq('technician_id', userId);
    query.then(({ data, error }) => {
      if (!error) setJobs((data ?? []).map(transformJob));
      setLoading(false);
    });
  };

  fetchRef.current = fetchJobs;

  useEffect(() => {
    fetchRef.current();

    const channel = supabase
      .channel(`jobs-changes-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchRef.current())
      .subscribe();

    const poll = setInterval(() => fetchRef.current(), POLL_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [isAdmin, userId, channelId]);

  const updateJobStatus = async (jobId, status) => {
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status } : j));
    await supabase.from('jobs').update({ status }).eq('id', jobId);
  };

  const updateTripStatus = async (jobId, tripId, newStatus) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const nowIso = new Date().toISOString();
    const updatedTrips = job.trips.map((t) => {
      if (t.id !== tripId) return { ...t, scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt, checkedInAt: t.checkedInAt?.toISOString?.() ?? t.checkedInAt ?? null, checkedOutAt: t.checkedOutAt?.toISOString?.() ?? t.checkedOutAt ?? null };
      return {
        ...t,
        status: newStatus,
        scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt,
        checkedInAt: newStatus === 'checked_in' ? nowIso : (t.checkedInAt?.toISOString?.() ?? t.checkedInAt ?? null),
        checkedOutAt: (newStatus === 'checked_out' && !t.checkedOutAt) ? nowIso : (t.checkedOutAt?.toISOString?.() ?? t.checkedOutAt ?? null),
      };
    });
    const newJobStatus = rollupJobStatus(updatedTrips);

    // Optimistic update
    setJobs((prev) => prev.map((j) =>
      j.id === jobId
        ? { ...j, status: newJobStatus, trips: updatedTrips.map((t) => ({ ...t, scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null })) }
        : j
    ));

    await supabase.from('jobs').update({ trips: updatedTrips, status: newJobStatus }).eq('id', jobId);

    const actorName = userProfile?.full_name ?? (isAdmin ? 'Admin' : 'Technician');
    const tripObj = job.trips.find((t) => t.id === tripId);
    const tripNum = tripObj?.tripLabel ?? tripObj?.tripNumber ?? '?';
    const jobNum = job.jobNumber ?? jobId;

    if (!isAdmin) {
      const statusLabel = getTripStatus(newStatus).label;
      const techName = userProfile?.full_name ?? 'Technician';
      const title = newStatus === 'pending_approval'
        ? 'Completion Approval Needed'
        : 'Trip Status Update';
      const body = newStatus === 'pending_approval'
        ? `${techName} submitted Trip for approval on job ${jobNum}. Please review notes and photos.`
        : `${techName} marked Trip as "${statusLabel}" on job ${jobNum}`;
      notifyAdmins(title, body, { jobId }, userId).catch(() => {});
    }

    if (isAdmin && newStatus === 'completed') {
      notifyUser(
        job.technicianId,
        'Trip Approved!',
        `Admin approved completion of Trip on job ${jobNum}.`,
        { jobId }
      ).catch(() => {});
    }

    if (isAdmin && newStatus === 'checked_out') {
      notifyUser(
        job.technicianId,
        'Trip Sent Back for Corrections',
        `Admin returned Trip on job ${jobNum} for corrections. Please review and resubmit.`,
        { jobId }
      ).catch(() => {});
    }

    // Log event for audit trail
    const eventDesc = {
      checked_in: `Trip ${tripNum} — Tech checked in`,
      checked_out: isAdmin
        ? `Trip ${tripNum} — Admin sent back for corrections`
        : `Trip ${tripNum} — Tech checked out`,
      pending_approval: `Trip ${tripNum} — Submitted for approval`,
      completed: `Trip ${tripNum} — Approved and marked complete`,
      for_return: `Trip ${tripNum} — Marked for return`,
    }[newStatus] ?? `Trip ${tripNum} — Status changed to ${newStatus}`;
    logJobEvent(jobId, newStatus, eventDesc, actorName).catch(() => {});
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

  const addTrip = async (jobId, { scheduledAt, scopeOfWork, technicianId, technicianName, tripLabel } = {}) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const nextNumber = (job.trips?.length ?? 0) + 1;
    const newTrip = {
      id: `trip_${Date.now()}`,
      tripNumber: nextNumber,
      tripLabel: tripLabel ?? String(nextNumber),
      technicianId: technicianId !== undefined ? technicianId : (job.technicianId ?? null),
      technicianName: technicianName !== undefined ? technicianName : (job.technicianName ?? null),
      status: 'scheduled',
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      scopeOfWork: (scopeOfWork ?? '').trim(),
    };
    const updatedTrips = [
      ...job.trips.map((t) => ({ ...t, scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt, checkedInAt: t.checkedInAt?.toISOString?.() ?? t.checkedInAt ?? null, checkedOutAt: t.checkedOutAt?.toISOString?.() ?? t.checkedOutAt ?? null })),
      newTrip,
    ];
    const newJobStatus = rollupJobStatus(updatedTrips);
    const nextTripIso = updatedTrips
      .filter((t) => t.status === 'scheduled' && t.scheduledAt)
      .map((t) => t.scheduledAt)
      .sort()[0] ?? null;

    const derived = deriveJobTech(updatedTrips);

    setJobs((prev) => prev.map((j) =>
      j.id === jobId
        ? {
            ...j,
            status: newJobStatus,
            technicianId: derived.id,
            technicianName: derived.name,
            trips: updatedTrips.map((t) => ({ ...t, scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null })),
            nextTrip: nextTripIso ? new Date(nextTripIso) : null,
          }
        : j
    ));

    await supabase
      .from('jobs')
      .update({ trips: updatedTrips, status: newJobStatus, next_trip: nextTripIso, technician_id: derived.id, metadata: { ...(job.metadata ?? {}), technicianName: derived.name } })
      .eq('id', jobId);

    const actor = userProfile?.full_name ?? 'Admin';
    const techPart = technicianName ? ` — assigned to ${technicianName}` : '';
    logJobEvent(jobId, 'trip_added', `Trip ${newTrip.tripLabel} added${techPart}`, actor).catch(() => {});
  };

  const updateTrip = async (jobId, tripId, { scheduledAt, scopeOfWork, technicianId, technicianName }) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const updatedTrips = job.trips.map((t) => {
      if (t.id !== tripId) return { ...t, scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt };
      const patch = {
        ...t,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        scopeOfWork: (scopeOfWork ?? '').trim(),
      };
      if (technicianId !== undefined) patch.technicianId = technicianId;
      if (technicianName !== undefined) patch.technicianName = technicianName;
      return patch;
    });
    const nextTripIso = updatedTrips
      .filter((t) => t.status === 'scheduled' && t.scheduledAt)
      .map((t) => t.scheduledAt)
      .sort()[0] ?? null;
    const derived = deriveJobTech(updatedTrips);

    setJobs((prev) => prev.map((j) =>
      j.id === jobId
        ? {
            ...j,
            trips: updatedTrips.map((t) => ({ ...t, scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null })),
            nextTrip: nextTripIso ? new Date(nextTripIso) : null,
          }
        : j
    ));

    await supabase.from('jobs').update({ trips: updatedTrips, next_trip: nextTripIso, technician_id: derived.id }).eq('id', jobId);

    const actor = userProfile?.full_name ?? 'Admin';
    const tripObj = job.trips.find((t) => t.id === tripId);
    const tripNum = tripObj?.tripLabel ?? tripObj?.tripNumber ?? '?';
    if (technicianName !== undefined) {
      logJobEvent(jobId, 'tech_assigned', `Trip ${tripNum} — technician assigned to ${technicianName}`, actor).catch(() => {});
    } else {
      logJobEvent(jobId, 'trip_updated', `Trip ${tripNum} updated`, actor).catch(() => {});
    }
  };

  const deleteTrip = async (jobId, tripId, actorName) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const deletedTrip = job.trips.find((t) => t.id === tripId);
    const tripNum = deletedTrip?.tripLabel ?? deletedTrip?.tripNumber ?? '?';
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
    logJobEvent(jobId, 'deleted', `Trip ${tripNum} deleted`, actorName ?? (userProfile?.full_name ?? 'Admin')).catch(() => {});
  };

  const updateAttachments = (jobId, attachments) => {
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, attachments } : j));
  };

  const closeJob = async (jobId, actorName = 'Admin') => {
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'closed' } : j));
    await supabase.from('jobs').update({ status: 'closed' }).eq('id', jobId);
    logJobEvent(jobId, 'closed', 'Job closed', actorName).catch(() => {});
  };

  const serializeTrip = (t) => ({
    ...t,
    scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt ?? null,
    checkedInAt: t.checkedInAt?.toISOString?.() ?? t.checkedInAt ?? null,
    checkedOutAt: t.checkedOutAt?.toISOString?.() ?? t.checkedOutAt ?? null,
  });

  const deserializeTrip = (t) => ({
    ...t,
    scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : null,
    checkedInAt: t.checkedInAt ? new Date(t.checkedInAt) : null,
    checkedOutAt: t.checkedOutAt ? new Date(t.checkedOutAt) : null,
  });

  // Tech (or admin) removes a tech from a specific trip with a reason
  const unassignTechFromTrip = async (jobId, tripId, reason, actorName = 'Technician') => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const trip = job.trips.find((t) => t.id === tripId);
    const techName = trip?.technicianName ?? job.technicianName ?? 'Technician';
    const tripLabel = trip?.tripLabel ?? String(trip?.tripNumber ?? '?');

    const updatedTrips = job.trips.map((t) =>
      t.id !== tripId ? serializeTrip(t) : {
        ...serializeTrip(t),
        technicianId: null,
        technicianName: null,
        unassignedReason: reason.trim(),
        status: 'scheduled',
        checkedInAt: null,
        checkedOutAt: null,
      }
    );
    const newJobStatus = rollupJobStatus(updatedTrips);
    const derived = deriveJobTech(updatedTrips);

    setJobs((prev) => prev.map((j) =>
      j.id !== jobId ? j : {
        ...j,
        technicianId: derived.id,
        technicianName: derived.name,
        status: newJobStatus,
        trips: updatedTrips.map(deserializeTrip),
      }
    ));

    await supabase.from('jobs').update({
      technician_id: derived.id,
      metadata: { ...(job.metadata ?? {}), technicianName: derived.name },
      trips: updatedTrips,
      status: newJobStatus,
    }).eq('id', jobId);

    const oldTechId = trip?.technicianId ?? job.technicianId;
    if (isAdmin) {
      // Admin removed the tech — notify the tech
      if (oldTechId) {
        notifyUser(oldTechId,
          'Removed from Trip',
          `You have been removed from Trip ${tripLabel} on job ${job.jobNumber ?? jobId}. Reason: ${reason}`,
          { jobId }
        ).catch(() => {});
      }
    } else {
      // Tech cancelled — notify admins
      notifyAdmins(
        'Tech Cancelled — Action Required',
        `${techName} cancelled Trip ${tripLabel} on job ${job.jobNumber ?? jobId}. Reason: ${reason}`,
        { jobId },
        userId
      ).catch(() => {});
    }

    logJobEvent(jobId, 'unassigned',
      `${techName} removed from Trip ${tripLabel} — Reason: ${reason}`,
      actorName
    ).catch(() => {});
  };

  // Admin assigns a new tech — creates sub-trips (e.g. "2.1") for any unassigned trips
  const reassignTech = async (jobId, newTech, adminName = 'Admin') => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const oldTechName = job.technicianName ?? 'unassigned';
    const unassignedTrips = job.trips.filter((t) => t.unassignedReason);

    // Build sub-trips for each unassigned trip
    const subTrips = unassignedTrips.map((t, i) => {
      const parentLabel = t.tripLabel ?? String(t.tripNumber ?? (job.trips.indexOf(t) + 1));
      return {
        id: `trip_${Date.now()}_${i}`,
        tripNumber: job.trips.length + i + 1,
        tripLabel: `${parentLabel}.1`,
        technicianId: newTech.id ?? null,
        technicianName: newTech.full_name ?? null,
        status: 'scheduled',
        scheduledAt: t.scheduledAt?.toISOString?.() ?? t.scheduledAt ?? null,
        scopeOfWork: t.scopeOfWork ?? '',
      };
    });

    const updatedTrips = [
      ...job.trips.map(serializeTrip),
      ...subTrips,
    ];
    const newJobStatus = rollupJobStatus(updatedTrips);

    setJobs((prev) => prev.map((j) =>
      j.id !== jobId ? j : {
        ...j,
        technicianId: newTech.id ?? null,
        technicianName: newTech.full_name ?? null,
        status: newJobStatus,
        trips: updatedTrips.map(deserializeTrip),
      }
    ));

    await supabase.from('jobs').update({
      technician_id: newTech.id ?? null,
      metadata: { ...(job.metadata ?? {}), technicianName: newTech.full_name ?? null },
      trips: updatedTrips,
      status: newJobStatus,
    }).eq('id', jobId);

    if (newTech.id) {
      notifyUser(newTech.id,
        'New Job Assigned',
        `You have been assigned to job ${job.jobNumber ?? jobId} — ${job.client?.name ?? ''}.`,
        { jobId }
      ).catch(() => {});
    }

    logJobEvent(jobId, 'reassigned',
      `Tech assigned: ${newTech.full_name ?? 'new technician'} (replaced ${oldTechName})`,
      adminName
    ).catch(() => {});
  };

  // Admin removes a tech: deletes the trip and creates a fresh scheduled replacement
  const adminRemoveTechFromTrip = async (jobId, tripId, reason, adminName = 'Admin') => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const trip = job.trips.find((t) => t.id === tripId);
    const techName = trip?.technicianName ?? job.technicianName ?? 'Technician';
    const oldTechId = trip?.technicianId ?? job.technicianId;
    const tripLabel = trip?.tripLabel ?? String(trip?.tripNumber ?? '?');

    const freshTrip = {
      id: `trip_${Date.now()}`,
      tripNumber: trip?.tripNumber ?? job.trips.length,
      tripLabel: tripLabel,
      technicianId: null,
      technicianName: null,
      status: 'scheduled',
      scheduledAt: trip?.scheduledAt?.toISOString?.() ?? trip?.scheduledAt ?? null,
      scopeOfWork: trip?.scopeOfWork ?? '',
    };

    const updatedTrips = job.trips.map((t) => t.id !== tripId ? serializeTrip(t) : freshTrip);
    const newJobStatus = rollupJobStatus(updatedTrips);
    const derived = deriveJobTech(updatedTrips);

    setJobs((prev) => prev.map((j) =>
      j.id !== jobId ? j : {
        ...j,
        technicianId: derived.id,
        technicianName: derived.name,
        status: newJobStatus,
        trips: updatedTrips.map(deserializeTrip),
      }
    ));

    await supabase.from('jobs').update({
      technician_id: derived.id,
      metadata: { ...(job.metadata ?? {}), technicianName: derived.name },
      trips: updatedTrips,
      status: newJobStatus,
    }).eq('id', jobId);

    if (oldTechId) {
      notifyUser(oldTechId,
        'Removed from Trip',
        `You have been removed from Trip ${tripLabel} on job ${job.jobNumber ?? jobId} by admin. Reason: ${reason}`,
        { jobId }
      ).catch(() => {});
    }

    logJobEvent(jobId, 'admin_removed',
      `Admin removed ${techName} from Trip ${tripLabel} — Reason: ${reason}. Trip reset for reassignment.`,
      adminName
    ).catch(() => {});
  };

  return { jobs, loading, updateJobStatus, updateTripStatus, updatePayments, addTrip, updateTrip, deleteTrip, updateAttachments, closeJob, unassignTechFromTrip, adminRemoveTechFromTrip, reassignTech, refresh: fetchJobs };
}
