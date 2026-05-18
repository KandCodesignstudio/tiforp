import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

function transformReport(row) {
  return {
    id: row.id,
    userId: row.user_id,
    reporterName: row.reporter_name ?? 'Unknown',
    reporterEmail: row.reporter_email ?? '',
    description: row.description,
    status: row.status ?? 'open',
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

export async function submitBugReport({ userId, reporterName, reporterEmail, description }) {
  const { error } = await supabase.from('bug_reports').insert({
    user_id: userId ?? null,
    reporter_name: reporterName ?? null,
    reporter_email: reporterEmail ?? null,
    description: description.trim(),
    status: 'open',
  });
  if (error) throw error;
}

export function useBugReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = () =>
    supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setReports((data ?? []).map(transformReport));
        setLoading(false);
      });

  useEffect(() => {
    fetchReports();
  }, []);

  const markResolved = async (id) => {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: 'resolved' } : r));
    await supabase.from('bug_reports').update({ status: 'resolved' }).eq('id', id);
  };

  const markOpen = async (id) => {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: 'open' } : r));
    await supabase.from('bug_reports').update({ status: 'open' }).eq('id', id);
  };

  return { reports, loading, markResolved, markOpen, refresh: fetchReports };
}
