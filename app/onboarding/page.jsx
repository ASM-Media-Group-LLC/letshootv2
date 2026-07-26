'use client';

// Creator onboarding wizard — FINAL flow (owner's rules):
//   1) Datos  2) Identidad (ID) + CONSENTIMIENTO  3) Aprobación admin  4) Cobro
// The charge happens ONLY after consent is signed AND the admin approved —
// so nothing ever needs refunding. LoRA clone photos are OPTIONAL and can be
// uploaded at any point (before or after) via the LoraUploader card below.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Check, ShieldCheck, IdCard, CreditCard, Clock,
  Upload, User, AlertTriangle, ArrowRight, Loader2,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { usePortal } from '@/lib/portal-i18n';
import { getSupabase } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import CloneSetup from '@/components/CloneSetup';

const STEPS = [
  { key: 'info',   icon: User },
  { key: 'id',     icon: IdCard },
  { key: 'review', icon: Clock },
  { key: 'pay',    icon: CreditCard },
];

function stepFromStatus(s) {
  if (s === 'registered') return 0;
  if (s === 'info' || s === 'id_rejected') return 1;
  if (s === 'id_pending') return 2;
  if (s === 'id_approved' || s === 'authorized') return 3;
  return 4; // active (or legacy paid) → done
}

export default function OnboardingPage() {
  const { t } = usePortal();
  const router = useRouter();
  const [me, setMe] = useState(undefined);

  const refresh = useCallback(async () => {
    const up = await getUserProfile();
    if (!up) { router.replace('/login'); return; }
    if (up.profile?.role && up.profile.role !== 'creator') { router.replace('/admin'); return; }
    setMe(up);
  }, [router]);

  useEffect(() => { refresh(); }, [refresh]);

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">{t.common.loading}</div>;

  const status = me.profile?.onboarding_status || 'registered';
  const step = stepFromStatus(status);

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">{t.common.registro}</span>
          </div>
          <button onClick={async () => { await signOut(); router.replace('/login'); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
            <LogOut size={15} /> {t.common.exit}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <Stepper step={step} t={t} />
        <div className="mt-8 space-y-5">
          {step === 0 && <InfoStep me={me} onDone={refresh} t={t} />}
          {step === 1 && <IdentityStep me={me} onDone={refresh} t={t} rejected={status === 'id_rejected'} reason={me.profile?.id_rejection_reason} />}
          {step === 2 && <ReviewStep t={t} />}
          {step === 3 && <PayStep me={me} onDone={refresh} t={t} />}
          {step === 4 && <DoneStep router={router} t={t} />}

          {/* Guided clone-photo setup — optional, never blocks the flow */}
          {step >= 1 && step < 4 && <CloneSetup userId={me.user.id} />}
        </div>
      </main>
    </div>
  );
}

function Stepper({ step, t }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`grid h-9 w-9 place-items-center rounded-full border text-sm transition-colors ${
                done ? 'border-brand bg-brand text-on-accent' : active ? 'border-brand bg-brand/15 text-brand' : 'border-line bg-card text-paper-dim'}`}>
                {done ? <Check size={16} /> : <s.icon size={16} />}
              </div>
              <span className={`text-[11px] font-medium ${active || done ? 'text-paper' : 'text-paper-dim'}`}>{t.onboarding.steps[s.key]}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`mx-1 h-0.5 flex-1 rounded-full ${i < step ? 'bg-brand' : 'bg-line'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function Card({ icon: Icon, title, desc, children }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-8">
      <div className="mb-1 flex items-center gap-2.5">
        {Icon && <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/12 text-brand"><Icon size={18} /></span>}
        <h2 className="font-display text-xl font-semibold text-paper">{title}</h2>
      </div>
      {desc && <p className="mb-5 text-sm text-paper-mute">{desc}</p>}
      {children}
    </div>
  );
}

// ── Step 0: personal / legal info ──────────────────────────────────────────
function InfoStep({ me, onDone, t }) {
  const p = me.profile || {};
  const [form, setForm] = useState({
    legal_first_name: p.legal_first_name || '', legal_last_name: p.legal_last_name || '',
    date_of_birth: p.date_of_birth || '', country: p.country || '', phone: p.phone || '',
    stage_name: p.stage_name || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
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
    const { error: err } = await getSupabase().from('profiles').update({
      ...form,
      full_name: form.stage_name || `${form.legal_first_name} ${form.legal_last_name}`.trim(),
      onboarding_status: 'info',
    }).eq('id', me.user.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone();
  }

  return (
    <Card icon={User} title={t.onboarding.info.title} desc={t.onboarding.info.desc}>
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
          className="group mt-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
          {saving ? t.common.saving : t.common.continue} {!saving && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
        </button>
      </form>
    </Card>
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

// ── Step 1: identity (ID docs) + CONSENT ───────────────────────────────────
const KYC_SLOTS = ['id_front', 'id_back', 'selfie_id'];
const CONSENT_KEYS = ['person', 'clone', 'billing'];

function IdentityStep({ me, onDone, t, rejected, reason }) {
  const [files, setFiles] = useState({});
  const [consents, setConsents] = useState({ person: false, clone: false, billing: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
        onboarding_status: 'id_pending',
        id_rejection_reason: null,
        consent_clone: true,
        consent_billing: true,
        consent_at: new Date().toISOString(),
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
    <Card icon={IdCard} title={t.onboarding.id.title} desc={t.onboarding.id.desc}>
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
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
        {saving ? <><Loader2 size={18} className="animate-spin" /> {t.onboarding.id.uploading}</> : <><ShieldCheck size={18} /> {t.onboarding.id.submit}</>}
      </button>
      <p className="mt-3 text-center text-[11px] text-paper-dim">{t.onboarding.id.note}</p>
    </Card>
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

// ── Step 2: waiting for admin approval (nothing charged yet) ───────────────
function ReviewStep({ t }) {
  return (
    <Card icon={Clock} title={t.onboarding.review.title} desc={t.onboarding.review.desc}>
      <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-4 text-sm text-paper-mute">
        <Loader2 size={20} className="animate-spin text-brand" />
        {t.onboarding.review.state} <span className="font-semibold text-brand">{t.onboarding.review.stateValue}</span> {t.onboarding.review.note}
      </div>
    </Card>
  );
}

// ── Step 3: payment (only reachable AFTER consent + admin approval) ────────
function PayStep({ me, onDone, t }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function pay() {
    setSaving(true); setError('');
    const { error: err } = await getSupabase().from('profiles')
      .update({ payment_status: 'paid', onboarding_status: 'active' }).eq('id', me.user.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone();
  }
  return (
    <Card icon={CreditCard} title={t.onboarding.pay.title} desc={t.onboarding.pay.desc}>
      <div className="rounded-2xl border border-brand/30 bg-brand/[0.06] p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-lg font-semibold text-paper">{t.onboarding.pay.plan}</span>
          <span className="font-display text-2xl font-bold text-brand">$—<span className="text-sm text-paper-dim">{t.onboarding.pay.perMonth}</span></span>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-paper-mute">
          <li className="flex items-center gap-2"><Check size={14} className="text-brand" /> {t.onboarding.pay.f1}</li>
          <li className="flex items-center gap-2"><Check size={14} className="text-brand" /> {t.onboarding.pay.f2}</li>
        </ul>
      </div>
      {error && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      <button onClick={pay} disabled={saving}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
        {saving ? t.onboarding.pay.submitting : t.onboarding.pay.submit}
      </button>
      <p className="mt-3 text-center text-[11px] text-paper-dim">{t.onboarding.pay.stub}</p>
    </Card>
  );
}

// ── Step 4: done ───────────────────────────────────────────────────────────
function DoneStep({ router, t }) {
  return (
    <Card icon={Check} title={t.onboarding.done.title} desc={t.onboarding.done.desc}>
      <button onClick={() => router.push('/panel')}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01]">
        {t.onboarding.done.goPanel} <ArrowRight size={18} />
      </button>
    </Card>
  );
}
