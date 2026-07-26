'use client';

import { getSupabase } from '@/lib/supabase/client';

// Fire-and-forget transactional email via the 'send-email' Edge Function.
// Never blocks or throws — a missing RESEND_API_KEY simply no-ops server-side.
export function sendEmail(template, userId, extra = '', lang = 'es') {
  try {
    getSupabase().functions
      .invoke('send-email', { body: { template, user_id: userId, extra, lang } })
      .catch(() => {});
  } catch { /* ignore */ }
}
