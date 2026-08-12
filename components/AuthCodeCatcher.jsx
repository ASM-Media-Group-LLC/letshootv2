'use client';

import { useEffect } from 'react';

// Safety net: some auth email links (e.g. anything still using Supabase's SITE_URL)
// land on the home page as `/?code=...` or `/?token_hash=...&type=recovery`. The home
// page can't act on them, so we forward to /reset, which knows how to verify the token
// and let the person set a new password. Renders nothing.
export default function AuthCodeCatcher() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const hasHashToken = /(?:access_token|type)=/.test(window.location.hash || '');
    if (p.get('code') || p.get('token_hash') || hasHashToken) {
      const qs = window.location.search || '';
      const hash = window.location.hash || '';
      window.location.replace(`/reset${qs}${hash}`);
    }
  }, []);
  return null;
}
