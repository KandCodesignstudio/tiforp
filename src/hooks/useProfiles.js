import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { STATIC_TECHNICIANS } from '../data/technicians';

export function useProfiles() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'technician')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        const supabaseTechs = (data ?? []).map((t) => ({ ...t, isStatic: false }));
        const supabaseNames = new Set(
          supabaseTechs.map((t) => (t.full_name ?? '').trim().toLowerCase())
        );
        const staticTechs = STATIC_TECHNICIANS
          .filter((name) => !supabaseNames.has(name.toLowerCase()))
          .map((name) => ({ id: null, full_name: name, role: 'technician', isStatic: true }));

        setTechnicians([...supabaseTechs, ...staticTechs]);
        setLoading(false);
      });
  }, []);

  return { technicians, loading };
}
