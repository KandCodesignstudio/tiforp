import { createClient } from '@supabase/supabase-js';

// Get these from: https://supabase.com/dashboard → your project → Settings → API
const SUPABASE_URL = 'YOUR_SUPABASE_URL';       // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
