import { supabase } from '../config/supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendToProfiles(profiles, title, body, data) {
  const list = profiles ?? [];
  if (!list.length) return;
  const rows = list.map((p) => ({ user_id: p.id, title, body, data }));
  await supabase.from('notifications').insert(rows);
  const tokens = list.map((p) => p.push_token).filter(Boolean);
  if (!tokens.length) return;
  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, data, sound: 'default' }))),
  });
}

export async function notifyAdmins(title, body, data = {}, excludeUserId = null) {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, push_token')
    .eq('role', 'admin');
  const filtered = excludeUserId ? (admins ?? []).filter((a) => a.id !== excludeUserId) : admins;
  await sendToProfiles(filtered, title, body, data);
}

export async function notifyUser(userId, title, body, data = {}) {
  if (!userId) return;
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, push_token')
    .eq('id', userId);
  await sendToProfiles(profiles, title, body, data);
}
