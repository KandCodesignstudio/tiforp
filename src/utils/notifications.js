import { supabase } from '../config/supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function notifyAdmins(title, body, data = {}) {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, push_token')
    .eq('role', 'admin');

  const adminList = admins ?? [];
  if (!adminList.length) return;

  const rows = adminList.map((a) => ({ user_id: a.id, title, body, data }));
  await supabase.from('notifications').insert(rows);

  const tokens = adminList.map((a) => a.push_token).filter(Boolean);
  if (!tokens.length) return;

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      tokens.map((to) => ({ to, title, body, data, sound: 'default' }))
    ),
  });
}
