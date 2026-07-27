'use client';

// Creator onboarding — horizontal tabs at the top; clicking a tab opens its
// full section below. No forced order, no "pending" locks: the creator can
// fill data, subscribe and upload clone photos in parallel to get ahead.
// Identity verification + payment are what activate the account.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Check, ShieldCheck, IdCard, CreditCard, Upload, User,
  AlertTriangle, ArrowRight, Loader2, Sparkles, Clock, CheckCircle2, Circle,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import Logo from '@/components/Logo';
import LangToggle from '@/components/LangToggle';
import CloneSetup from '@/components/CloneSetup';
import ShotArt from '@/components/ShotArt';
import { PACKS, PERIODS, PRICING_COPY } from '@/components/Pricing';

export default function OnboardingPage() {
  const { t, lang } = usePortal();
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [tab, setTab] = useState('pago');
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
    { key: 'pago', label: h.tabs.pago, desc: h.tabDesc.pago, icon: CreditCard, done: paid },
    { key: 'clon', label: h.tabs.clon, desc: h.tabDesc.clon, icon: Sparkles, done: loraCount > 0 },
    { key: 'datos', label: h.tabs.datos, desc: h.tabDesc.datos, icon: User, done: datosDone },
    { key: 'identidad', label: h.tabs.identidad, desc: h.tabDesc.identidad, icon: IdCard, done: idApproved },
  ];
  const doneCount = TABS.filter((tb) => tb.done).length;

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h1 className="font-display text-2xl font-semibold sm:text-[1.75rem]">{h.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-paper-mute">{h.sub}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
            <div className="relative grid h-11 w-11 place-items-center">
              <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-line" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                  className="text-brand" strokeDasharray={2 * Math.PI * 18}
                  strokeDashoffset={2 * Math.PI * 18 * (1 - doneCount / 4)} />
              </svg>
              <span className="absolute text-xs font-semibold text-paper">{doneCount}/4</span>
            </div>
            <div className="whitespace-pre-line text-xs leading-tight text-paper-mute">{h.stepsDone}</div>
          </div>
        </div>

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

        {/* Premium stepper tabs — same card language as the plan cards */}
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TABS.map((tb) => {
            const active = tab === tb.key;
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className={`group relative flex flex-col gap-4 rounded-2xl border p-5 text-left transition-all ${
                  active
                    ? 'border-brand bg-brand/[0.06] shadow-glow-sm'
                    : 'border-line bg-card hover:border-hair hover:bg-ink-2'}`}>
                <div className="flex items-start justify-between">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${
                    active ? 'bg-brand text-on-accent' : 'bg-hair/[0.07] text-paper-mute group-hover:text-paper'}`}>
                    <tb.icon size={19} />
                  </span>
                  {tb.done ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                      <CheckCircle2 size={15} /> {h.doneShort}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-paper-dim">
                      <Circle size={13} /> {h.incomplete}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-display text-base font-semibold text-paper">{tb.label}</div>
                  <div className="mt-0.5 text-xs text-paper-dim">{tb.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div className="mt-6">
          {tab === 'datos' && <InfoStep me={me} t={t} onDone={done} />}
          {tab === 'identidad' && <IdentityStep me={me} t={t} onDone={done}
            rejected={st === 'id_rejected'} reason={p.id_rejection_reason} approved={idApproved} pending={st === 'id_pending'} />}
          {tab === 'pago' && <PayStep me={me} t={t} lang={lang} paid={paid} plan={p.plan} onDone={done} />}
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
          <UploadSlot key={k} kind={k} label={t.onboarding.id.slots[k].label} hint={t.onboarding.id.slots[k].hint} tap={t.onboarding.id.tap} file={files[k]}
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

function UploadSlot({ kind, label, hint, tap, file, onFile }) {
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
            <ShotArt kind={kind} className="block h-20 w-20 text-brand/80" />
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-paper-dim"><Upload size={13} /> {tap}</span>
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

/* ── Suscripción — identical cards to the public /pricing, just selectable ─ */
function PayStep({ me, onDone, t, lang, paid, plan }) {
  const c = PRICING_COPY[lang] || PRICING_COPY.en;
  const [period, setPeriod] = useState('m');
  const [sel, setSel] = useState(plan || PACKS.find((p) => p.popular)?.key || PACKS[0].key);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const current = PACKS.find((p) => p.key === sel) || PACKS[0];
  const curPrice = current[period];

  if (paid) {
    return (
      <Panel title={t.onboarding.pay.title}>
        <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-4 text-sm text-paper-mute">
          <Check size={18} className="text-brand" /> {current.name} · ${current.m}{c.perMo} — {t.onboarding.hub.badge.paid}
        </div>
      </Panel>
    );
  }

  async function pay() {
    setSaving(true); setError('');
    const { error: err } = await getSupabase().from('profiles').update({ payment_status: 'paid', plan: sel }).eq('id', me.user.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone();
  }

  return (
    <Panel title={t.onboarding.pay.title} desc={t.onboarding.pay.desc}>
      {/* Billing period toggle — identical to /pricing */}
      <div className="mx-auto mb-6 flex w-full max-w-md items-stretch gap-1 rounded-full border border-line bg-card p-1.5">
        {PERIODS.map((per) => {
          const active = period === per.key;
          return (
            <button key={per.key} type="button" onClick={() => setPeriod(per.key)}
              className={`relative flex flex-1 flex-col items-center justify-center rounded-full px-3 py-2 text-sm font-bold transition-all duration-200 ${active ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'}`}>
              <span>{c.periods[per.key]}</span>
              {per.off > 0 && (
                <span className={`mt-0.5 rounded-full px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${active ? 'bg-on-accent/20 text-on-accent' : 'bg-brand/15 text-brand'}`}>{c.save} {per.off}%</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3 packs — same card language as /pricing */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PACKS.map((pack) => {
          const pc = c.packs[pack.key];
          const price = pack[period];
          const active = sel === pack.key;
          const months = PERIODS.find((p) => p.key === period).months;
          const billedTotal = price * months;
          return (
            <button key={pack.key} type="button" onClick={() => setSel(pack.key)}
              className={`group relative flex flex-col rounded-3xl border p-6 text-left transition-all ${
                active ? 'border-brand bg-brand/[0.07] shadow-glow-sm ring-1 ring-brand' : pack.popular ? 'border-brand/50 bg-brand/[0.04]' : 'border-line bg-card hover:border-paper/20'}`}>
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-on-accent shadow-glow-sm">{c.popular}</div>
              )}
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-mute">{pack.name}</span>
              <div className="mt-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-sm text-paper-dim line-through decoration-paper-dim/60">${pack.was.toLocaleString('en-US')}</span>
                  <span className="rounded bg-brand/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">-{Math.round((1 - price / pack.was) * 100)}%</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-display text-[2.8rem] leading-none ${pack.popular || active ? 'text-brand' : 'text-paper'}`}>${price}</span>
                  <span className="font-mono text-[11px] text-paper-dim">{c.perMo}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-paper-dim">
                  {period === 'm' ? c.billed.m : `$${billedTotal.toLocaleString('en-US')} ${c.billed[period]}`}
                </div>
              </div>
              <p className="mt-4 min-h-[2.5rem] text-[13px] leading-relaxed text-paper-mute">{pc.desc}</p>
              <div className="my-4 h-px bg-line/70" />
              <ul className="flex-1 space-y-2.5">
                {pc.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2 text-[13px] text-paper-mute">
                    <Check size={15} className="mt-0.5 shrink-0 text-brand" /><span className="flex-1">{f}</span>
                  </li>
                ))}
              </ul>
              <span className={`mt-6 inline-flex items-center justify-center gap-1 rounded-full px-4 py-2.5 text-sm font-bold ${active ? 'bg-brand text-on-accent shadow-glow-sm' : 'border border-line text-paper'}`}>
                {active ? <><Check size={15} /> {t.onboarding.pay.chosen}</> : t.onboarding.pay.choose}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-center text-xs font-medium text-brand">{t.onboarding.pay.launch}</p>
      {error && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      <button onClick={pay} disabled={saving}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-semibold text-on-accent transition-colors hover:bg-brand/90 disabled:opacity-60">
        {saving ? t.onboarding.pay.submitting : t.onboarding.pay.payBtn(current.name, curPrice)}
      </button>
      <p className="mt-3 text-center text-[11px] text-paper-dim">{t.onboarding.pay.stub}</p>
    </Panel>
  );
}
