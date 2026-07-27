'use client';

// Creator onboarding — horizontal tabs at the top; clicking a tab opens its
// full section below. No forced order, no "pending" locks: the creator can
// fill data, subscribe and upload clone photos in parallel to get ahead.
// Identity verification + payment are what activate the account.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Check, ShieldCheck, IdCard, CreditCard, Upload, User,
  AlertTriangle, ArrowRight, Loader2, Sparkles, Clock,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import Logo from '@/components/Logo';
import LangToggle from '@/components/LangToggle';
import CloneSetup from '@/components/CloneSetup';

export default function OnboardingPage() {
  const { t } = usePortal();
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [tab, setTab] = useState('datos');
  const [loraCount, setLoraCount] = useState(0);

  const refresh = useCallback(async () => {
    const up = await getUserProfile();
    if (!up) { router.replace('/login'); return; }
    if (up.profile?.role && up.profile.role !== 'creator') { router.replace('/admin'); return; }
    if (up.profile?.onboarding_status === 'active') { router.replace('/panel'); return; }
    const { count } = await getSupabase().from('lora_photos')
      .select('id', { count: 'exact', head: true }).eq('user_id', up.user.id);
    setLoraCount(count || 0);
    setMe(up);
  }, [router]);

  useEffect(() => { refresh(); }, [refresh]);

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">{t.common.loading}</div>;

  const p = me.profile || {};
  const st = p.onboarding_status || 'registered';
  const h = t.onboarding.hub;

  const datosDone = !!(p.legal_first_name && p.legal_last_name && p.date_of_birth && p.country);
  const idApproved = ['id_approved', 'active', 'paid'].includes(st);
  const paid = p.payment_status === 'paid';
  const canActivate = idApproved && paid;

  const TABS = [
    { key: 'datos', label: h.tabs.datos, icon: User, done: datosDone },
    { key: 'identidad', label: h.tabs.identidad, icon: IdCard, done: idApproved },
    { key: 'pago', label: h.tabs.pago, icon: CreditCard, done: paid },
    { key: 'clon', label: h.tabs.clon, icon: Sparkles, done: loraCount > 0 },
  ];

  async function activate() {
    await getSupabase().from('profiles').update({ onboarding_status: 'active' }).eq('id', me.user.id);
    router.replace('/panel');
  }

  const done = () => refresh();

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">{t.common.registro}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <LangToggle />
            <button onClick={async () => { await signOut(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <LogOut size={15} /> {t.common.exit}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-display text-2xl font-semibold sm:text-[1.75rem]">{h.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-paper-mute">{h.sub}</p>

        {canActivate && (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-brand/40 bg-brand/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-display text-base font-semibold text-paper">{h.activateTitle}</div>
              <p className="mt-1 text-sm text-paper-mute">{h.activateDesc}</p>
            </div>
            <button onClick={activate}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-brand/90">
              {h.activateBtn} <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Horizontal tabs */}
        <div className="mt-7 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`relative -mb-px flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === tb.key ? 'text-brand' : 'text-paper-mute hover:text-paper'}`}>
              {tb.done ? <Check size={15} className="text-brand" /> : <tb.icon size={15} />}
              {tb.label}
              {tab === tb.key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="mt-6">
          {tab === 'datos' && <InfoStep me={me} t={t} onDone={done} />}
          {tab === 'identidad' && <IdentityStep me={me} t={t} onDone={done}
            rejected={st === 'id_rejected'} reason={p.id_rejection_reason} approved={idApproved} pending={st === 'id_pending'} />}
          {tab === 'pago' && <PayStep me={me} t={t} paid={paid} plan={p.plan} onDone={done} />}
          {tab === 'clon' && <CloneSetup userId={me.user.id} embedded />}
        </div>
      </main>
    </div>
  );
}

/* ── Datos ──────────────────────────────────────────────────────────────── */
function InfoStep({ me, onDone, t }) {
  const p = me.profile || {};
  const [form, setForm] = useState({
    legal_first_name: p.legal_first_name || '', legal_last_name: p.legal_last_name || '',
    date_of_birth: p.date_of_birth || '', country: p.country || '', phone: p.phone || '',
    stage_name: p.stage_name || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function ageFrom(dob) {
    const d = new Date(dob); const n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    const m = n.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
    return a;
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    if (!form.legal_first_name || !form.legal_last_name || !form.date_of_birth || !form.country) {
      setError(t.onboarding.info.missing); return;
    }
    if (ageFrom(form.date_of_birth) < 18) { setError(t.onboarding.info.underage); return; }
    setSaving(true);
    const patch = { ...form, full_name: form.stage_name || `${form.legal_first_name} ${form.legal_last_name}`.trim() };
    if (me.profile.onboarding_status === 'registered') patch.onboarding_status = 'info';
    const { error: err } = await getSupabase().from('profiles').update(patch).eq('id', me.user.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true); onDone();
  }

  return (
    <Panel title={t.onboarding.info.title} desc={t.onboarding.info.desc}>
      <form onSubmit={save} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.onboarding.info.firstName} value={form.legal_first_name} onChange={set('legal_first_name')} required />
          <Field label={t.onboarding.info.lastName} value={form.legal_last_name} onChange={set('legal_last_name')} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.onboarding.info.dob} type="date" value={form.date_of_birth} onChange={set('date_of_birth')} required />
          <Field label={t.onboarding.info.country} value={form.country} onChange={set('country')} placeholder={t.onboarding.info.countryPh} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.onboarding.info.phone} value={form.phone} onChange={set('phone')} placeholder={t.onboarding.info.phonePh} />
          <Field label={t.onboarding.info.stage} value={form.stage_name} onChange={set('stage_name')} placeholder={t.onboarding.info.stagePh} />
        </div>
        {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        <button type="submit" disabled={saving}
          className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-brand py-3 font-semibold text-on-accent transition-colors hover:bg-brand/90 disabled:opacity-60">
          {saving ? t.common.saving : saved ? <><Check size={17} /> {t.common.save}</> : t.common.save}
        </button>
      </form>
    </Panel>
  );
}

function Panel({ title, desc, children }) {
  return (
    <div className="rounded-xl border border-line bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-paper">{title}</h2>
      {desc && <p className="mb-5 mt-1 text-sm leading-relaxed text-paper-mute">{desc}</p>}
      {children}
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, required }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-paper-mute">{label}</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-3 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60 [color-scheme:dark]" />
    </label>
  );
}

/* ── Identidad + consentimiento ─────────────────────────────────────────── */
const KYC_SLOTS = ['id_front', 'id_back', 'selfie_id'];
const CONSENT_KEYS = ['person', 'clone', 'billing'];

function IdentityStep({ me, onDone, t, rejected, reason, approved, pending }) {
  const [files, setFiles] = useState({});
  const [consents, setConsents] = useState({ person: false, clone: false, billing: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (approved) {
    return (
      <Panel title={t.onboarding.id.title}>
        <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-4 text-sm text-paper-mute">
          <ShieldCheck size={20} className="text-brand" /> {t.cuenta.states.id_approved}
        </div>
      </Panel>
    );
  }
  if (pending) {
    return (
      <Panel title={t.onboarding.id.title}>
        <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-4 text-sm text-paper-mute">
          <Clock size={20} className="text-brand" />
          {t.onboarding.review.state} <span className="font-semibold text-brand">{t.onboarding.review.stateValue}</span> — {t.onboarding.id.note}
        </div>
      </Panel>
    );
  }

  async function submit() {
    setError('');
    if (KYC_SLOTS.some((k) => !files[k])) { setError(t.onboarding.id.missingDocs); return; }
    if (!consents.person || !consents.clone || !consents.billing) { setError(t.onboarding.id.missingConsent); return; }
    setSaving(true);
    const supabase = getSupabase();
    try {
      for (const k of KYC_SLOTS) {
        const file = files[k];
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${me.user.id}/${k}.${ext}`;
        const { error: upErr } = await supabase.storage.from('kyc').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from('kyc_documents')
          .upsert({ user_id: me.user.id, doc_type: k, storage_path: path }, { onConflict: 'user_id,doc_type' });
        if (dbErr) throw dbErr;
      }
      const { error: pErr } = await supabase.from('profiles').update({
        onboarding_status: 'id_pending', id_rejection_reason: null,
        consent_clone: true, consent_billing: true, consent_at: new Date().toISOString(),
      }).eq('id', me.user.id);
      if (pErr) throw pErr;
      onDone();
    } catch (err) {
      setError(err.message || t.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title={t.onboarding.id.title} desc={t.onboarding.id.desc}>
      {rejected && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div><span className="font-semibold">{t.onboarding.id.rejectedTitle}</span> {reason ? <span>{t.onboarding.id.rejectedReason} {reason}.</span> : null} {t.onboarding.id.rejectedRetry}</div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {KYC_SLOTS.map((k) => (
          <UploadSlot key={k} label={t.onboarding.id.slots[k].label} hint={t.onboarding.id.slots[k].hint} tap={t.onboarding.id.tap} file={files[k]}
            onFile={(f) => setFiles((prev) => ({ ...prev, [k]: f }))} />
        ))}
      </div>
      <div className="mt-6 space-y-2.5">
        {CONSENT_KEYS.map((k) => (
          <label key={k} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-ink-2 px-4 py-3 transition-colors hover:border-brand/30">
            <input type="checkbox" checked={consents[k]} onChange={(e) => setConsents((v) => ({ ...v, [k]: e.target.checked }))} className="peer sr-only" />
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${consents[k] ? 'border-brand bg-brand text-on-accent' : 'border-line'}`}>
              {consents[k] && <Check size={13} />}
            </span>
            <span className="text-sm leading-relaxed text-paper-mute">{t.onboarding.id.consents[k]}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      <button onClick={submit} disabled={saving}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 font-semibold text-on-accent transition-colors hover:bg-brand/90 disabled:opacity-60">
        {saving ? <><Loader2 size={18} className="animate-spin" /> {t.onboarding.id.uploading}</> : <><ShieldCheck size={18} /> {t.onboarding.id.submit}</>}
      </button>
      <p className="mt-3 text-center text-[11px] text-paper-dim">{t.onboarding.id.note}</p>
    </Panel>
  );
}

function UploadSlot({ label, hint, tap, file, onFile }) {
  const ref = useRef(null);
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <div>
      <button type="button" onClick={() => ref.current?.click()}
        className={`relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-3 text-center transition-colors ${file ? 'border-brand/50 bg-brand/5' : 'border-line bg-ink-2 hover:border-brand/40'}`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <Upload size={22} className="text-paper-dim" />
            <span className="text-xs text-paper-dim">{tap}</span>
          </>
        )}
        {file && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-brand text-on-accent"><Check size={14} /></span>}
      </button>
      <div className="mt-2">
        <p className="text-sm font-medium text-paper">{label}</p>
        <p className="text-[11px] text-paper-dim">{hint}</p>
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

/* ── Suscripción — real plans ───────────────────────────────────────────── */
function PayStep({ me, onDone, t, paid, plan }) {
  const plans = t.onboarding.pay.plans;
  const [sel, setSel] = useState(plan || plans.find((p) => p.popular)?.key || plans[0].key);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (paid) {
    const cur = plans.find((p) => p.key === plan) || plans.find((p) => p.key === sel);
    return (
      <Panel title={t.onboarding.pay.title}>
        <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-4 text-sm text-paper-mute">
          <Check size={18} className="text-brand" /> {cur ? `${cur.name} · $${cur.price}${t.onboarding.pay.perMonth}` : t.onboarding.hub.badge.paid} — {t.onboarding.hub.badge.paid}
        </div>
      </Panel>
    );
  }

  const current = plans.find((p) => p.key === sel) || plans[0];

  async function pay() {
    setSaving(true); setError('');
    const { error: err } = await getSupabase().from('profiles').update({ payment_status: 'paid', plan: sel }).eq('id', me.user.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone();
  }

  return (
    <Panel title={t.onboarding.pay.title} desc={t.onboarding.pay.desc}>
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((pl) => {
          const active = sel === pl.key;
          return (
            <button key={pl.key} type="button" onClick={() => setSel(pl.key)}
              className={`relative rounded-xl border p-4 text-left transition-colors ${active ? 'border-brand bg-brand/[0.06]' : 'border-line bg-ink-2 hover:border-brand/40'}`}>
              {pl.popular && <span className="absolute -top-2 left-4 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-accent">{t.onboarding.pay.popular}</span>}
              <div className="font-display font-semibold text-paper">{pl.name}</div>
              <div className="mt-1 font-display text-2xl font-bold text-brand">${pl.price}<span className="text-sm font-normal text-paper-dim">{t.onboarding.pay.perMonth}</span></div>
              <p className="mt-2 text-xs leading-relaxed text-paper-mute">{pl.feat}</p>
              <span className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${active ? 'text-brand' : 'text-paper-dim'}`}>
                {active ? <><Check size={13} /> {t.onboarding.pay.chosen}</> : t.onboarding.pay.choose}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      <button onClick={pay} disabled={saving}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 font-semibold text-on-accent transition-colors hover:bg-brand/90 disabled:opacity-60">
        {saving ? t.onboarding.pay.submitting : t.onboarding.pay.payBtn(current.name, current.price)}
      </button>
      <p className="mt-3 text-center text-[11px] text-paper-dim">{t.onboarding.pay.stub}</p>
    </Panel>
  );
}
