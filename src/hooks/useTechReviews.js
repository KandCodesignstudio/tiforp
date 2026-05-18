import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

function transformReview(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    technicianId: row.technician_id,
    technicianName: row.technician_name,
    rating: row.rating,
    comment: row.comment ?? '',
    reviewerName: row.reviewer_name ?? '',
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

export function useTechReviews(technicianId) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!technicianId) { setLoading(false); return; }

    supabase
      .from('tech_reviews')
      .select('*')
      .eq('technician_id', technicianId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setReviews((data ?? []).map(transformReview));
        setLoading(false);
      });
  }, [technicianId]);

  const addReview = async ({ jobId, technicianId, technicianName, rating, comment, reviewerName, reviewerId }) => {
    const { data, error } = await supabase
      .from('tech_reviews')
      .insert({
        job_id: jobId,
        technician_id: technicianId ?? null,
        technician_name: technicianName ?? null,
        rating,
        comment: comment?.trim() ?? null,
        reviewer_name: reviewerName ?? null,
        reviewer_id: reviewerId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    setReviews((prev) => [transformReview(data), ...prev]);
    return data;
  };

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return { reviews, loading, addReview, avgRating };
}

export async function submitReview({ jobId, technicianId, technicianName, rating, comment, reviewerName, reviewerId }) {
  const { error } = await supabase.from('tech_reviews').insert({
    job_id: jobId,
    technician_id: technicianId ?? null,
    technician_name: technicianName ?? null,
    rating,
    comment: comment?.trim() ?? null,
    reviewer_name: reviewerName ?? null,
    reviewer_id: reviewerId ?? null,
  });
  if (error) throw error;
}
