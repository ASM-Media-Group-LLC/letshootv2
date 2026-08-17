'use client';

// /sales — Manual Sales, the company's sales ledger. Its OWN area, not a tab
// buried inside the team admin. Gated to internal team with the 'metrics'
// capability (or the admin). Everything here is real money entered by hand.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, DollarSign, ArrowLeft } from 'lucide-react';
import { getUserProfile, signOut, homeForRole } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import Avatar from '@/components/Avatar';
import ManualSalesLedger from '@/components/ManualSalesLedger';

export default function SalesPage() {
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [creators, setCreators] = useState([]);
  const [toast, setToast] = useState('');
  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 2600); }, []);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      const p = up.profile;
      const isTeam = ['admin', 'supervisor', 'producer', 'chatter'].includes(p?.role);
      const canSales = p?.role === 'admin' || (p?.capabilities || []).includes('metrics');
      if (!isTeam) { router.replace('/panel'); return; }
      if (!canSales) { router.replace('/trabajo'); return; }
      setMe(p);
      const { data: cr } = await getSupabase().rpc('team_creators');
      setCreators(cr || []);
    })();
  }, [router]);

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={homeForRole(me?.role)} aria-label="Ir al inicio" className="flex shrink-0 items-center transition-opacity hover:opacity-80"><Logo size="sm" /></Link>
            <span className="hidden items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand sm:inline-flex">
              <DollarSign size={12} /> Manual Sales
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3">
              <Avatar src={me?.avatar_url} name={me?.full_name} size="xs" />
              <span className="hidden leading-tight sm:block">
                <span className="block text-xs font-semibold text-paper">{me?.full_name}</span>
                <span className="block text-[10px] text-paper-dim">{me?.role === 'admin' ? 'Dueño' : (me?.job_title || 'Equipo')} · Ventas</span>
              </span>
            </div>
            <Link href={homeForRole(me?.role)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-paper-mute transition-colors hover:border-brand/40 hover:text-paper sm:px-3.5">
              <ArrowLeft size={14} /> Volver
            </Link>
            <button onClick={async () => { await signOut(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Manual Sales</h1>
        <p className="mt-1 text-sm text-paper-mute">
          El libro de ventas de la empresa. Cada venta se registra a mano y todo suma exacto — hasta que conectemos el procesador de pago.
        </p>

        <ManualSalesLedger creators={creators} me={me} flash={flash} />
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[70] w-max max-w-[calc(100vw-2.5rem)] -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-center text-sm font-medium text-brand backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}
