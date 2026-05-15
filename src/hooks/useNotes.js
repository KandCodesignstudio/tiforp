import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

function transformNote(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    tripNumber: row.trip_number,
    author: row.author,
    userId: row.user_id ?? null,
    text: row.text,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

export function useNotes(jobId) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = () =>
    supabase
      .from('notes')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setNotes((data ?? []).map(transformNote));
        setLoading(false);
      });

  useEffect(() => {
    if (!jobId) return;

    fetchNotes();

    const channel = supabase
      .channel(`notes-${jobId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notes', filter: `job_id=eq.${jobId}` },
        (payload) => setNotes((prev) => [...prev, transformNote(payload.new)]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notes', filter: `job_id=eq.${jobId}` },
        (payload) => setNotes((prev) => prev.map((n) => n.id === payload.new.id ? transformNote(payload.new) : n)),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notes', filter: `job_id=eq.${jobId}` },
        (payload) => setNotes((prev) => prev.filter((n) => n.id !== payload.old.id)),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [jobId]);

  const addNote = async (jobId, text, author, tripNumber, userId) => {
    await supabase.from('notes').insert({ job_id: jobId, text, author, trip_number: tripNumber, user_id: userId ?? null });
  };

  const updateNote = async (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, text: trimmed } : n));
    await supabase.from('notes').update({ text: trimmed }).eq('id', id);
  };

  const deleteNote = async (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from('notes').delete().eq('id', id);
  };

  return { notes, loading, addNote, updateNote, deleteNote, refresh: fetchNotes };
}
