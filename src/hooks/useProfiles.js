import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export function useProfiles() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'technician')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        setTechnicians(data ?? []);
        setLoading(false);
      });
  }, []);

  return { technicians, loading };
}
