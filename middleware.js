import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Prefijos de rutas que exigen sesión (portal privado). Todo lo demás es
// público (marketing, landings, /make). Reproduce EXACTAMENTE lo que antes
// hacía el `matcher`, ahora como comprobación explícita para poder ampliar
// el matcher sin gate accidental en páginas públicas.
const PROTECTED = ['/panel', '/admin', '/onboarding', '/trabajo', '/cuenta', '/agencia', '/agente', '/owner', '/sales', '/numbers'];

function needsAuth(pathname) {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(req) {
  const host = (req.headers.get('host') || '').toLowerCase();
  const url = req.nextUrl.clone();

  // ── Routing por subdominio ────────────────────────────────────────────────
  // make.letshoot.ai sirve la sección /make de esta misma app. El subdominio
  // se configura en Vercel (dominio) + GoDaddy (CNAME) y aquí se reescribe el
  // host a la ruta /make/*. Las páginas internas usan links root-relative
  // (href="/algo") y el rewrite los resuelve a /make/algo — patrón multi-tenant.
  if (host.startsWith('make.') && !url.pathname.startsWith('/make')) {
    url.pathname = `/make${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── Gate de sesión — solo rutas privadas ─────────────────────────────────
  if (!needsAuth(url.pathname)) {
    return NextResponse.next({ request: req });
  }

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
    const login = req.nextUrl.clone();
    login.pathname = '/login';
    login.search = '';
    return NextResponse.redirect(login);
  }
  return res;
}

export const config = {
  // Corre en todas las rutas de página para poder reescribir el subdominio en
  // «/». Excluye estáticos (_next) y cualquier archivo con extensión (imágenes,
  // fuentes, videos, favicon…) para no reescribir assets ni pagar el costo del
  // gate en ellos.
  matcher: ['/((?!_next|.*\\.).*)'],
};
