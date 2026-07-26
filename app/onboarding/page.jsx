'use client';

// Creator onboarding HUB (not a forced wizard). The creator picks what to do,
// in any order:
//   · Datos        — profile info
//   · Identidad    — ID + consent → this is what activates the account
//   · Pago         — subscription (independent)
//   · Fotos clon   — guided LoRA shot list (independent)
// Identity requires Datos first (it needs your legal name). Payment and clone
// photos are fully independent. Account goes "active" when identity is approved
// AND payment is done.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Check, ShieldCheck, IdCard, CreditCard, Clock, Upload, User,
  AlertTriangle, ArrowRight, Loader2, ChevronDown, Lock, Sparkles,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import Logo from '@/components/Logo';
import LangToggle from '@/components/LangToggle';
import CloneSetup from '@/components/CloneSetup';

const TONE = {
  zinc: 'border-line bg-hair/10 text-paper-dim',
  brand: 'border-brand/40 bg-brand/10 text-brand',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  rose: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
};

export default function OnboardingPage() {
  const { t } = usePortal();
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [open, setOpen] = useState(null);
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
  const idBadge = idApproved ? { l: h.badge.approved, tone: 'brand' }
    : st === 'id_pending' ? { l: h.badge.review, tone: 'amber' }
    : st === 'id_rejected' ? { l: h.badge.rejected, tone: 'rose' }
    : { l: h.badge.pending, tone: 'zinc' };
  const canActivate = idApproved && paid;

  const name = p.stage_name || p.legal_first_name || '';
  const activateCount = [datosDone, idApproved, paid].filter(Boolean).length;
  // The one action we gently point to next (still fully optional / any order).
  const next = !datosDone ? 'datos'
    : (!idApproved && st !== 'id_pending') ? 'identidad'
    : !paid ? 'pago'
    : null;

  async function activate() {
    await getSupabase().from('profiles').update({ onboarding_status: 'active' }).eq('id', me.user.id);
    router.replace('/panel');
  }

  const toggle = (k) => setOpen((o) => (o === k ? null : k));

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

      <main className="mx-auto max-w-2xl px-5 py-8">
        {/* Warm, personal welcome */}
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{name ? h.greeting(name) : h.greetingNew}</h1>
        <p className="mt-1.5 text-sm text-paper-mute">{h.welcomeSub}</p>

        {canActivate ? (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-brand/40 bg-brand/[0.08] p-5 shadow-glow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 font-display text-lg font-semibold text-paper">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-on-accent"><Check size={16} /></span>
                {h.activateTitle}
              </div>
              <p className="mt-1 text-sm text-paper-mute">{h.activateDesc}</p>
            </div>
            <button onClick={activate}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
              {h.activateBtn} <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          /* Activation tracker */
          <div className="mt-6 rounded-2xl border border-line bg-card p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-paper-mute">{h.groupActivate}</span>
              <span className="font-mono text-xs text-brand">{h.toActivate(activateCount)}</span>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < activateCount ? 'bg-brand' : 'bg-line'}`} />
              ))}
            </div>
          </div>
        )}

        {/* Group: activation */}
        <div className="mt-5 space-y-3">
          <TaskCard icon={User} title={h.cards.datos.title} desc={h.cards.datos.desc}
            badge={datosDone ? { l: h.badge.done, tone: 'brand' } : { l: h.badge.pending, tone: 'zinc' }}
            done={datosDone} next={next === 'datos'} nextLabel={h.nextUp}
            open={open === 'datos'} onToggle={() => toggle('datos')}>
            <InfoStep me={me} t={t} onDone={() => { setOpen(null); refresh(); }} />
          </TaskCard>

          <TaskCard icon={IdCard} title={h.cards.identidad.title} desc={h.cards.identidad.desc}
            badge={idBadge} locked={!datosDone} lockedMsg={h.lockedId}
            done={idApproved} next={next === 'identidad'} nextLabel={h.nextUp}
            open={open === 'identidad'} onToggle={() => toggle('identidad')}>
            <IdentityStep me={me} t={t} onDone={() => { setOpen(null); refresh(); }}
              rejected={st === 'id_rejected'} reason={p.id_rejection_reason} approved={idApproved} />
          </TaskCard>

          <TaskCard icon={CreditCard} title={h.cards.pago.title} desc={h.cards.pago.desc}
            badge={paid ? { l: h.badge.paid, tone: 'brand' } : { l: h.badge.optional, tone: 'zinc' }}
            done={paid} next={next === 'pago'} nextLabel={h.nextUp}
            open={open === 'pago'} onToggle={() => toggle('pago')}>
            <PayStep me={me} t={t} paid={paid} onDone={() => { setOpen(null); refresh(); }} />
          </TaskCard>
        </div>

        {/* Group: clone (optional, anytime) */}
        <p className="mb-3 mt-7 px-1 text-xs font-semibold uppercase tracking-wider text-paper-dim">{h.groupOptional}</p>
        <TaskCard icon={Sparkles} title={h.cards.clon.title} desc={h.cards.clon.desc}
          badge={loraCount > 0 ? { l: h.photosCount(loraCount), tone: 'brand' } : { l: h.badge.optional, tone: 'zinc' }}
          open={open === 'clon'} onToggle={() => toggle('clon')}>
          <CloneSetup userId={me.user.id} embedded />
        </TaskCard>
      </main>
    </div>
  );
}

/* ── Collapsible task card ──────────────────────────────────────────────── */
function TaskCard({ icon: Icon, title, desc, badge, locked, lockedMsg, done, next, nextLabel, open, onToggle, children }) {
  return (
    <div className={`overflow-hidden rounded-2xl border bg-card transition-all ${
      open ? 'border-brand/40' : next ? 'border-brand/50 shadow-glow-sm ring-1 ring-brand/30' : 'border-line'}`}>
      <button type="button" onClick={locked ? undefined : onToggle} disabled={locked}
        className={`flex w-full items-center gap-3 p-4 text-left ${locked ? 'cursor-not-allowed opacity-60' : 'hover:bg-hair/[0.03]'}`}>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${done ? 'bg-brand text-on-accent' : 'bg-brand/12 text-brand'}`}>
          {locked ? <Lock size={18} /> : done ? <Check size={18} /> : <Icon size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-paper">{title}</span>
            {next && <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-accent">{nextLabel}</span>}
          </div>
          <p className="truncate text-xs text-paper-dim">{locked ? lockedMsg : desc}</p>
        </div>
        <span className={`hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium sm:inline ${TONE[badge.tone]}`}>{badge.l}</span>
        {!locked && <ChevronDown size={18} className={`shrink-0 text-paper-dim transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && !locked && <div className="border-t border-line p-5">{children}</div>}
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
    onDone();
  }

  return (
    <form onSubmit={save} className="grid gap-4">
      <p className="text-sm text-paper-mute">{t.onboarding.info.desc}</p>
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
        {saving ? t.common.saving : t.common.save} {!saving && <Check size={18} />}
      </button>
    </form>
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

function IdentityStep({ me, onDone, t, rejected, reason, approved }) {
  const [files, setFiles] = useState({});
  const [consents, setConsents] = useState({ person: false, clone: false, billing: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const st = me.profile?.onboarding_status;

  if (approved) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-4 text-sm text-paper-mute">
        <ShieldCheck size={20} className="text-brand" /> {t.onboarding.review.title} — {t.cuenta.states.id_approved}
      </div>
    );
  }
  if (st === 'id_pending') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-4 text-sm text-paper-mute">
        <Loader2 size={20} className="animate-spin text-brand" />
        {t.onboarding.review.state} <span className="font-semibold text-brand">{t.onboarding.review.stateValue}</span> — {t.onboarding.id.note}
      </div>
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
    <div>
      <p className="mb-4 text-sm text-paper-mute">{t.onboarding.id.desc}</p>
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
    </div>
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

/* ── Pago (independent) ─────────────────────────────────────────────────── */
function PayStep({ me, onDone, t, paid }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (paid) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-4 text-sm text-paper-mute">
        <Check size={18} className="text-brand" /> {t.onboarding.pay.plan} — {t.onboarding.hub.badge.paid}
      </div>
    );
  }
  async function pay() {
    setSaving(true); setError('');
    const { error: err } = await getSupabase().from('profiles').update({ payment_status: 'paid' }).eq('id', me.user.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone();
  }
  return (
    <div>
      <p className="mb-4 text-sm text-paper-mute">{t.onboarding.pay.desc}</p>
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
    </div>
  );
}
