// SERVER-ONLY Supabase client with the service-role key.
// Never import this from a client component — the service role bypasses RLS.
import { createClient } from '@supabase/supabase-js';

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // secret, server env only
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
