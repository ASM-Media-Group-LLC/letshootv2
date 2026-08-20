'use client';

// Workspace del agente vendedor. Su único trabajo: REFERIR modelos.
// Pone el correo (y opcionalmente el nombre) de una creadora potencial;
// LetShoot le manda invitación para registrarse. El récord queda en
// agent_referrals y se auto-actualiza cuando la CC se registra / paga
// (trigger sync_agent_referral). Sin acceso al contenido de las CCs.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, UserPlus, Loader2, Mail, CheckCircle2, Clock, DollarSign, X, Users, Send, RotateCcw } from 'lucide-react';
import { getUserProfile, signOut, homeForRole } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import Avatar from '@/components/Avatar';

const STATUS = {
  invited:   { label: 'Invitada',    Ic: Mail,          cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  registered:{ label: 'Registrada',  Ic: CheckCircle2,  cls: 'border-brand/30 bg-brand/10 text-brand' },
  paid:      { label: 'Pagó — Activa', Ic: DollarSign,  cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  expired:   { label: 'Expirada',    Ic: Clock,         cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
};

export default function AgentePage() {
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [reOpen, setReOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.from('agent_referrals').select('*').order('invited_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (up.profile?.role !== 'agent' && up.profile?.role !== 'admin') { router.replace(homeForRole(up.profile?.role)); return; }
      setMe(up);
      load();
    })();
  }, [router, load]);

  function flash(m) { setToast(m); setTimeout(() => setToast(''), 3000); }

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  const stats = {
    invited:   rows.filter((r) => r.status === 'invited').length,
    registered:rows.filter((r) => r.status === 'registered').length,
    paid:      rows.filter((r) => r.status === 'paid').length,
    total:     rows.length,
  };

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <Link href="/" aria-label="Ir al home" className="flex items-center transition-opacity hover:opacity-80"><Logo size="sm" /></Link>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3">
              <Avatar src={me.profile?.avatar_url} name={me.profile?.full_name} size="xs" />
              <span className="hidden leading-tight sm:block">
                <span className="block text-xs font-semibold text-paper">{me.profile?.full_name}</span>
                <span className="block text-[10px] text-paper-dim">Agente · Vendedor</span>
              </span>
            </div>
            <button onClick={async () => { await signOut(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        {/* Hero */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Tus referidas</h1>
            <p className="mt-1.5 text-sm text-paper-mute">Refiere modelos con solo su correo. Le llega la invitación para clonarse; tú llevas el récord.</p>
          </div>
          <button onClick={() => setReOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02]">
            <UserPlus size={15} /> Referir nueva modelo
          </button>
        </div>

        {/* Stats — 4 KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat n={stats.total} label="Total referidas" Ic={Users} />
          <Stat n={stats.invited} label="Invitadas" Ic={Mail} tone="amber" />
          <Stat n={stats.registered} label="Registradas" Ic={CheckCircle2} tone="brand" />
          <Stat n={stats.paid} label="Pagaron" Ic={DollarSign} tone="emerald" />
        </div>

        {/* Lista */}
        <div className="mt-8">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Historial</p>
          {loading ? (
            <div className="grid place-items-center py-10 text-paper-dim"><Loader2 size={20} className="animate-spin text-brand" /></div>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-card/40 p-10 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><UserPlus size={20} /></div>
              <p className="font-display text-base font-semibold text-paper">Aún no has referido a nadie</p>
              <p className="mt-1 text-sm text-paper-mute">Empieza con la primera. Solo necesitas su correo.</p>
              <button onClick={() => setReOpen(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
                <UserPlus size={14} /> Referir primera modelo
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => {
                const st = STATUS[r.status] || STATUS.invited;
                const when = new Date(r.invited_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-paper">{r.invited_name || r.invited_email}</p>
                      <p className="truncate text-[11px] text-paper-dim">{r.invited_email} · referida el {when}</p>
                      {r.notes && <p className="mt-1 text-[12px] text-paper-mute">{r.notes}</p>}
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${st.cls}`}>
                      <st.Ic size={11} /> {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-brand/40 bg-ink/95 px-4 py-2.5 text-sm font-medium text-paper shadow-glow-sm backdrop-blur">
          {toast}
        </div>
      )}

      {reOpen && (
        <ReferModal onClose={() => setReOpen(false)}
          onDone={(msg) => { setReOpen(false); flash(msg); load(); }} />
      )}
    </div>
  );
}

function Stat({ n, label, Ic, tone }) {
  const tones = { amber: 'text-amber-300', brand: 'text-brand', emerald: 'text-emerald-300' };
  const cls = tones[tone] || 'text-paper-mute';
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-paper-dim">
        <Ic size={12} className={cls} /> {label}
      </div>
      <div className={`mt-1.5 font-display text-2xl font-bold ${n > 0 ? cls : 'text-paper'}`}>{n}</div>
    </div>
  );
}

// Modal para referir una nueva CC — inserta en agent_referrals y (best-effort)
// dispara un correo de invitación a la modelo con el link para registrarse.
function ReferModal({ onClose, onDone }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const em = email.trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setErr('Correo inválido.'); return; }
    setBusy(true);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('agent_referrals').insert({
      agent_id: user.id, invited_email: em, invited_name: name.trim() || null, notes: notes.trim() || null,
    }).select('id').maybeSingle();
    if (error) { setBusy(false); setErr(error.message); return; }
    // Dispara correo de invitación (opcional — no bloquea si falla).
    supabase.functions.invoke('agent-invite', {
      body: { referral_id: data?.id, email: em, name: name.trim() || null },
    }).catch(() => {});
    setBusy(false);
    onDone(`Invitación enviada a ${em}`);
  }

  const input = 'w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60';
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/85 p-4 backdrop-blur-sm" onClick={() => !busy && onClose()}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-7">
        <button type="button" onClick={onClose} disabled={busy}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
          <X size={16} />
        </button>
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/12 text-brand"><UserPlus size={19} /></span>
          <div>
            <h3 className="font-display text-lg font-bold text-paper">Referir nueva modelo</h3>
            <p className="mt-0.5 text-sm text-paper-mute">Le llega la invitación para registrarse y crear su clon IA.</p>
          </div>
        </div>
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-paper-dim">Correo de la modelo</span>
            <input required type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="modelo@correo.com" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-paper-dim">Nombre <span className="text-paper-dim/70">(opcional)</span></span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cómo la conoces" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-paper-dim">Notas <span className="text-paper-dim/70">(opcional, solo tú las ves)</span></span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Amiga de IG, ya vende contenido, potencial Pro Pack…" className={`${input} resize-none`} />
          </label>
        </div>
        {err && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
        <button type="submit" disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-bold text-on-accent shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60">
          {busy ? <><Loader2 size={15} className="animate-spin" /> Enviando…</> : <><Send size={15} /> Enviar invitación</>}
        </button>
      </form>
    </div>
  );
}
