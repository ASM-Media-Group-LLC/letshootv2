import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Server-side gate for the portal. Client pages also guard themselves and RLS
// protects the data — this stops unauthenticated requests before they render.
export async function middleware(req) {
  const res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/panel/:path*', '/admin/:path*', '/onboarding/:path*', '/trabajo/:path*', '/cuenta/:path*', '/agencia/:path*'],
};
