import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { MOCK_JOBS } from '../config/mockData';

const USE_MOCK = true;

const JobsContext = createContext(null);

function initMockJobs() {
  return MOCK_JOBS.map((job) => ({
    ...job,
    trips: job.trips.map((t) => ({
      ...t,
      checkedInAt: null,
      checkedOutAt: null,
    })),
  }));
}

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
      checkedInAt: t.checked_in_at ? new Date(t.checked_in_at) : null,
      checkedOutAt: t.checked_out_at ? new Date(t.checked_out_at) : null,
    })),
    attachments: row.attachments ?? [],
    nextTrip: row.next_trip ? new Date(row.next_trip) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function patchTrip(jobs, jobId, tripId, patchFn) {
  return jobs.map((j) =>
    j.id !== jobId
      ? j
      : { ...j, trips: j.trips.map((t) => (t.id !== tripId ? t : patchFn(t))) }
  );
}

export function JobsProvider({ children }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCK) {
      setJobs(initMockJobs());
      setLoading(false);
      return;
    }

    supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setJobs((data ?? []).map(transformJob));
        setLoading(false);
      });

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

  const getJobById = (jobId) => jobs.find((j) => j.id === jobId);

  const checkIn = async (jobId, tripId) => {
    const now = new Date();
    if (USE_MOCK) {
      setJobs((prev) =>
        patchTrip(prev, jobId, tripId, (t) => ({
          ...t,
          checkedInAt: now,
          status: 'in_progress',
        }))
      );
      return;
    }
    await supabase
      .from('trips')
      .update({ checked_in_at: now.toISOString(), status: 'in_progress' })
      .eq('id', tripId);
  };

  const checkOut = async (jobId, tripId) => {
    const now = new Date();
    if (USE_MOCK) {
      setJobs((prev) =>
        patchTrip(prev, jobId, tripId, (t) => ({ ...t, checkedOutAt: now }))
      );
      return;
    }
    await supabase
      .from('trips')
      .update({ checked_out_at: now.toISOString() })
      .eq('id', tripId);
  };

  const markTripComplete = async (jobId, tripId) => {
    const now = new Date();
    if (USE_MOCK) {
      setJobs((prev) => {
        const patched = patchTrip(prev, jobId, tripId, (t) => ({
          ...t,
          status: 'completed',
          checkedOutAt: t.checkedOutAt ?? now,
        }));
        return patched.map((j) => {
          if (j.id !== jobId) return j;
          const allDone = j.trips.every((t) => t.status === 'completed');
          return allDone ? { ...j, status: 'completed' } : j;
        });
      });
      return;
    }
    await supabase.from('trips').update({ status: 'completed' }).eq('id', tripId);
  };

  const updateJobStatus = async (jobId, status) => {
    if (USE_MOCK) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
      return;
    }
    await supabase.from('jobs').update({ status }).eq('id', jobId);
  };

  return (
    <JobsContext.Provider
      value={{ jobs, loading, getJobById, checkIn, checkOut, markTripComplete, updateJobStatus }}
    >
      {children}
    </JobsContext.Provider>
  );
}

export const useJobs = () => useContext(JobsContext);
