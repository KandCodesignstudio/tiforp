import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { MOCK_NOTES } from '../config/mockData';

const USE_MOCK = true; // Set to false after configuring Supabase

function transformNote(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    tripNumber: row.trip_number,
    author: row.author,
    text: row.text,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

export function useNotes(jobId) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    if (USE_MOCK) {
      setNotes(MOCK_NOTES[jobId] || []);
      setLoading(false);
      return;
    }

    // Initial fetch
    supabase
      .from('notes')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setNotes((data ?? []).map(transformNote));
        setLoading(false);
      });

    // Real-time subscription
    const channel = supabase
      .channel(`notes-${jobId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notes', filter: `job_id=eq.${jobId}` },
        (payload) => setNotes((prev) => [...prev, transformNote(payload.new)]),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [jobId]);

  const addNote = async (jobId, text, author, tripNumber) => {
    if (USE_MOCK) {
      setNotes((prev) => [
        ...prev,
        { id: `note_${Date.now()}`, jobId, tripNumber, author, text, createdAt: new Date() },
      ]);
      return;
    }
    await supabase.from('notes').insert({ job_id: jobId, text, author, trip_number: tripNumber });
  };

  return { notes, loading, addNote };
}
