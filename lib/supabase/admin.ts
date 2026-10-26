import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './env';

// Server-only: SUPABASE_SERVICE_ROLE_KEY bypasses RLS. Import this only from server actions.
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createClient(supabaseConfig().url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function adminConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
