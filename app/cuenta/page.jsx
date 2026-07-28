'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, ShieldCheck, ArrowLeft, Check } from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import Logo from '@/components/Logo';
import LangToggle from '@/components/LangToggle';

export default function CuentaPage() {
  const { t } = usePortal();
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [form, setForm] = useState({ stage_name: '', phone: '' });
  const [pw, setPw] = useState({ a: '', b: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState('');

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      setMe(up);
      setForm({ stage_name: up.profile?.stage_name || '', phone: up.profile?.phone || '' });
    })();
  }, [router]);

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">{t.common.loading}</div>;

  function flash(m) { setMsg(m); setErr(''); setTimeout(() => setMsg(''), 2500); }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving('profile'); setErr('');
    const patch = { stage_name: form.stage_name || null, phone: form.phone || null };
    if (form.stage_name) patch.full_name = form.stage_name;
    const { error } = await getSupabase().from('profiles').update(patch).eq('id', me.user.id);
    setSaving('');
    if (error) { console.error(error); setErr(t.common.error); return; }
    flash(t.cuenta.saved);
  }

  async function changePassword(e) {
    e.preventDefault();
    setErr('');
    if (pw.a.length < 8) { setErr(t.signup.shortPassword); return; }
    if (pw.a !== pw.b) { setErr(t.reset.mismatch); return; }
    setSaving('pw');
    const { error } = await getSupabase().auth.updateUser({ password: pw.a });
    setSaving('');
    if (error) { console.error(error); setErr(t.common.error); return; }
    setPw({ a: '', b: '' });
    flash(t.cuenta.passwordChanged);
  }

  const status = t.cuenta.states[me.profile?.onboarding_status] || me.profile?.onboarding_status || '—';

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3"><Logo size="sm" /></div>
          <div className="flex items-center gap-2.5">
            <LangToggle />
            <button onClick={async () => { await signOut(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <LogOut size={15} /> {t.common.exit}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <Link href="/panel" className="inline-flex items-center gap-1.5 text-sm text-paper-dim transition-colors hover:text-brand">
          <ArrowLeft size={15} /> {t.cuenta.backPanel}
        </Link>
        <h1 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">{t.cuenta.title}</h1>
        <p className="mt-1 text-sm text-paper-mute">{t.cuenta.sub}</p>

        <form onSubmit={saveProfile} className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
          <div className="mb-4 flex items-center gap-2 font-display font-semibold"><User size={17} className="text-brand" /> {t.cuenta.profile}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.cuenta.stageName}</span>
              <input value={form.stage_name} onChange={(e) => setForm((f) => ({ ...f, stage_name: e.target.value }))}
                className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-3 text-paper outline-none transition-colors focus:border-brand/60" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.cuenta.phone}</span>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-3 text-paper outline-none transition-colors focus:border-brand/60" />
            </label>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-paper-mute sm:grid-cols-2">
            <div><span className="text-paper-dim">{t.cuenta.emailLabel}:</span> {me.profile?.email}</div>
            <div><span className="text-paper-dim">{t.cuenta.statusLabel}:</span> <span className="text-brand">{status}</span></div>
          </div>
          <button type="submit" disabled={saving === 'profile'}
            className="mt-5 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
            {saving === 'profile' ? t.common.saving : t.common.save}
          </button>
        </form>

        <form onSubmit={changePassword} className="mt-5 rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
          <div className="mb-4 flex items-center gap-2 font-display font-semibold"><ShieldCheck size={17} className="text-brand" /> {t.cuenta.security}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.cuenta.newPassword}</span>
              <input type="password" autoComplete="new-password" value={pw.a} onChange={(e) => setPw((p) => ({ ...p, a: e.target.value }))}
                className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-3 text-paper outline-none transition-colors focus:border-brand/60" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.cuenta.confirmPassword}</span>
              <input type="password" autoComplete="new-password" value={pw.b} onChange={(e) => setPw((p) => ({ ...p, b: e.target.value }))}
                className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-3 text-paper outline-none transition-colors focus:border-brand/60" />
            </label>
          </div>
          <button type="submit" disabled={saving === 'pw'}
            className="mt-5 rounded-xl border border-brand/40 bg-brand/10 px-6 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60">
            {saving === 'pw' ? t.common.saving : t.cuenta.changePassword}
          </button>
        </form>

        {err && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
        {msg && (
          <div className="fixed bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-sm font-medium text-brand backdrop-blur">
            <Check size={15} /> {msg}
          </div>
        )}
      </main>
    </div>
  );
}
