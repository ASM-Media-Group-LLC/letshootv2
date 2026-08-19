'use client';

// Creator onboarding — horizontal tabs at the top; clicking a tab opens its
// full section below. No forced order, no "pending" locks: the creator can
// fill data, subscribe and upload clone photos in parallel to get ahead.
// Identity verification + payment are what activate the account.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Check, ShieldCheck, IdCard, CreditCard, Upload, User, Plus,
  AlertTriangle, ArrowRight, Loader2, Sparkles, Clock, CheckCircle2, Circle, Camera, ChevronDown,
} from 'lucide-react';
import { getUserProfile, signOut, homeForRole } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import { COUNTRIES, countryByName, splitPhone } from '@/lib/countries';
import Logo from '@/components/Logo';
import LangToggle from '@/components/LangToggle';
import CloneSetup from '@/components/CloneSetup';
import ShotArt from '@/components/ShotArt';
import ProposalDeck from '@/components/ProposalDeck';
import { PACKS, PERIODS, PRICING_COPY } from '@/components/Pricing';

export default function OnboardingPage() {
  const { t, lang } = usePortal();
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [tab, setTab] = useState('pago');
  const [loraCount, setLoraCount] = useState(0);
  const [proposal, setProposal] = useState(null); // { id, intro } si está publicada
  const [proposalSlides, setProposalSlides] = useState([]);
  const [showProposal, setShowProposal] = useState(false); // control de si el deck está abierto
  const [choosingPack, setChoosingPack] = useState(false);

  const refresh = useCallback(async () => {
    const up = await getUserProfile();
    if (!up) { router.replace('/login'); return; }
    if (up.profile?.role && up.profile.role !== 'creator') { router.replace(homeForRole(up.profile.role)); return; }
    if (up.profile?.onboarding_status === 'active') { router.replace('/panel'); return; }
    const supabase = getSupabase();
    const [{ count }, { data: pr }] = await Promise.all([
      supabase.from('lora_photos').select('id', { count: 'exact', head: true }).eq('user_id', up.user.id),
      supabase.from('creator_proposals').select('id, intro, published_at, status').eq('creator_id', up.user.id).maybeSingle(),
    ]);
    setLoraCount(count || 0);
    if (pr && pr.status === 'published') {
      setProposal(pr);
      const { data: sl } = await supabase.from('proposal_slides').select('*').eq('proposal_id', pr.id).order('position');
      setProposalSlides(sl || []);
      // Autoabrir el deck si la CC aún NO ha pagado y no lo cerró antes en esta sesión.
      const dismissed = typeof window !== 'undefined' && window.sessionStorage.getItem(`proposal-dismissed-${pr.id}`);
      if (up.profile?.payment_status !== 'paid' && !dismissed) setShowProposal(true);
    } else {
      setProposal(null); setProposalSlides([]);
    }
    setMe(up);
  }, [router]);

  useEffect(() => { refresh(); }, [refresh]);

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">{t.common.loading}</div>;

  const p = me.profile || {};
  const st = p.onboarding_status || 'registered';
  const h = t.onboarding.hub;

  const datosDone = !!(p.legal_first_name && p.legal_last_name && p.date_of_birth && p.country);
  const idApproved = ['id_approved', 'active', 'paid', 'authorized'].includes(st);
  const paid = p.payment_status === 'paid';
  const canActivate = idApproved && paid;

  // Datos + Identidad are ONE step now (kept every field — just merged).
  const esL = lang === 'es';
  const TABS = [
    { key: 'pago', label: h.tabs.pago, desc: h.tabDesc.pago, icon: CreditCard, done: paid },
    { key: 'clon', label: h.tabs.clon, desc: h.tabDesc.clon, icon: Sparkles, done: loraCount > 0 },
    { key: 'datos', label: esL ? 'Datos e identidad' : 'Data & identity', desc: esL ? 'Tu información y verificación' : 'Your info & verification', icon: IdCard, done: datosDone && idApproved },
  ];
  const doneCount = TABS.filter((tb) => tb.done).length;

  async function activate() {
    await getSupabase().from('profiles').update({ onboarding_status: 'active' }).eq('id', me.user.id);
    router.replace('/panel');
  }

  const done = () => refresh();

  // Elegir pack desde el deck de propuesta = marcar plan + payment_status
  // pending. La CC vuelve al hub, donde el step de pago le confirma que su
  // pago está en revisión y el equipo lo activa a mano.
  async function chooseFromProposal(packKey) {
    if (choosingPack) return;
    setChoosingPack(true);
    await getSupabase().from('profiles').update({ plan: packKey, payment_status: 'pending' }).eq('id', me.user.id);
    setChoosingPack(false);
    if (proposal) window.sessionStorage.setItem(`proposal-dismissed-${proposal.id}`, '1');
    setShowProposal(false);
    setTab('pago');
    await refresh();
  }

  function closeProposal() {
    if (proposal) window.sessionStorage.setItem(`proposal-dismissed-${proposal.id}`, '1');
    setShowProposal(false);
  }

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      {/* Lookbook full-screen — se muestra automáticamente si hay propuesta
          publicada y la CC aún no pagó. Puede cerrarse (queda accesible por
          el botón «Ver mi propuesta» abajo). */}
      {showProposal && proposal && (
        <ProposalDeck
          creatorName={p.stage_name || p.legal_first_name || p.full_name}
          intro={proposal.intro}
          slides={proposalSlides}
          onClose={closeProposal}
          onChoosePack={chooseFromProposal}
          chosenPack={p.plan}
          packDisabled={choosingPack}
        />
      )}
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand sm:inline-block">{t.common.registro}</span>
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
                  strokeDashoffset={2 * Math.PI * 18 * (1 - doneCount / TABS.length)} />
              </svg>
              <span className="absolute text-xs font-semibold text-paper">{doneCount}/{TABS.length}</span>
            </div>
            <div className="whitespace-pre-line text-xs leading-tight text-paper-mute">{h.stepsDone}</div>
          </div>
        </div>

        {proposal && !showProposal && (
          <button onClick={() => setShowProposal(true)}
            className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-brand/40 bg-gradient-to-br from-brand/[0.12] to-brand/[0.03] p-4 text-left transition-colors hover:from-brand/[0.18]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-paper">{esL ? 'Tu propuesta personalizada' : 'Your personalized proposal'}</p>
                <p className="text-xs text-paper-mute">{esL ? 'Mira cómo se vería tu clon con tus fotos + elige tu pack' : 'See how your clone would look with your photos + pick your pack'}</p>
              </div>
            </div>
            <ArrowRight size={16} className="shrink-0 text-brand" />
          </button>
        )}

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
        <div className="mt-7 grid grid-cols-3 gap-3">
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
                  {tb.done
                    ? <CheckCircle2 size={22} className="text-brand" aria-label={h.doneShort} />
                    : <Circle size={22} className="text-paper-dim/40" aria-label={h.incomplete} />}
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
        <div className="mt-6 space-y-6">
          {/* Datos + Identidad merged into one step (all fields kept) */}
          {tab === 'datos' && (
            <>
              <InfoStep me={me} t={t} onDone={done} />
              <IdentityStep me={me} t={t} lang={lang} onDone={done}
                rejected={st === 'id_rejected'} reason={p.id_rejection_reason} approved={idApproved} pending={st === 'id_pending'} />
            </>
          )}
          {tab === 'pago' && <PayStep me={me} t={t} lang={lang} paid={paid} paymentStatus={p.payment_status} subEndsAt={p.subscription_ends_at} plan={p.plan} onDone={done} onRefresh={refresh} />}
          {tab === 'clon' && <CloneSetup userId={me.user.id} embedded />}
        </div>
      </main>
    </div>
  );
}

/* ── Datos ──────────────────────────────────────────────────────────────── */
function InfoStep({ me, onDone, t }) {
  const p = me.profile || {};
  const initialPhone = splitPhone(p.phone || '');
  const initialCountry = countryByName(p.country || '');
  const [form, setForm] = useState({
    legal_first_name: p.legal_first_name || '', legal_last_name: p.legal_last_name || '',
    date_of_birth: p.date_of_birth || '', country: p.country || '',
    stage_name: p.stage_name || '', handle: p.handle || '',
  });
  // Teléfono partido en código de país + número nacional. El código se prellena
  // al elegir país (o del teléfono ya guardado).
  const [dial, setDial] = useState(initialPhone.dial || initialCountry?.dial || '');
  const [phoneNational, setPhoneNational] = useState(initialPhone.national || '');
  const [avatarUrl, setAvatarUrl] = useState(p.avatar_url || '');
  const [avatarPreview, setAvatarPreview] = useState('');   // local object URL while uploading
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState('idle'); // idle | saving | saved — autoguardado
  const avatarRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // @handle: normalize as they type — lowercase, drop invalid chars, strip a leading @.
  const setHandle = (e) => setForm((f) => ({ ...f, handle: e.target.value.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._]/g, '') }));

  // Elegir país: guarda el nombre y, si el teléfono aún no tiene código puesto a
  // mano, prellena el código de área de ese país.
  function pickCountry(e) {
    const name = e.target.value;
    setForm((f) => ({ ...f, country: name }));
    const c = countryByName(name);
    if (c) setDial(c.dial);
  }

  const fullPhone = phoneNational.trim() ? `${dial} ${phoneNational.trim()}`.trim() : '';

  // ── Autoguardado del borrador ──────────────────────────────────────────
  // Si la persona llena algo y se sale, queda preguardado. Debounce 900ms; nunca
  // toca onboarding_status ni valida (eso es al pulsar Guardar). El @handle NO se
  // autoguarda para no chocar con el índice único; se guarda al pulsar Guardar.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setDraft('saving');
    const id = setTimeout(async () => {
      try {
        const patch = {
          legal_first_name: form.legal_first_name || null,
          legal_last_name: form.legal_last_name || null,
          date_of_birth: form.date_of_birth || null,
          country: form.country || null,
          phone: fullPhone || null,
          stage_name: form.stage_name || null,
        };
        await getSupabase().from('profiles').update(patch).eq('id', me.user.id);
        setDraft('saved');
      } catch { setDraft('idle'); }
    }, 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.legal_first_name, form.legal_last_name, form.date_of_birth, form.country, phoneNational, dial, form.stage_name]);

  const preview = avatarPreview || avatarUrl;

  // Upload the profile photo THE MOMENT it's picked — independent of the rest of
  // the form. (Before, it only uploaded on Save and got blocked by the required
  // legal-fields validation, which read as "the photo errored".)
  async function pickAvatar(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setAvatarError('');
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    const supabase = getSupabase();
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${me.user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`; // cache-bust on replace
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', me.user.id);
      if (dbErr) throw dbErr;
      setAvatarUrl(url);
      setAvatarPreview('');
    } catch (err) {
      console.error(err);
      setAvatarError(t.common.error);
      setAvatarPreview('');
    } finally {
      setAvatarUploading(false);
      if (avatarRef.current) avatarRef.current.value = '';
    }
  }

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
    if (form.handle && !/^[a-z0-9._]{3,30}$/.test(form.handle)) { setError(t.onboarding.info.handleBad); return; }
    setSaving(true);
    const supabase = getSupabase();
    const patch = {
      ...form,
      phone: fullPhone || null,
      handle: form.handle || null,
      full_name: form.stage_name || `${form.legal_first_name} ${form.legal_last_name}`.trim(),
    };
    if (me.profile.onboarding_status === 'registered') patch.onboarding_status = 'info';
    const { error: err } = await supabase.from('profiles').update(patch).eq('id', me.user.id);
    setSaving(false);
    if (err) {
      console.error(err);
      // 23505 = unique_violation on the handle index.
      setError(err.code === '23505' ? t.onboarding.info.handleTaken : t.common.error);
      return;
    }
    setSaved(true); onDone();
  }

  return (
    <Panel title={t.onboarding.info.title} desc={t.onboarding.info.desc}>
      <form onSubmit={save} className="grid gap-4">
        {/* Profile photo + @handle */}
        <div className="flex items-center gap-4 rounded-xl border border-line bg-ink-2 p-4">
          <div className="shrink-0 text-center">
            <button type="button" onClick={() => avatarRef.current?.click()} disabled={avatarUploading}
              className="group relative mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand/25 to-brand/5 ring-1 ring-inset ring-brand/30 transition-all hover:ring-brand/60 disabled:opacity-70">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <Camera size={24} className="text-brand/80 transition-colors group-hover:text-brand" strokeWidth={1.75} />
              )}
              {avatarUploading ? (
                <span className="absolute inset-0 grid place-items-center bg-ink/60"><Loader2 size={20} className="animate-spin text-brand" /></span>
              ) : (
                <span className="absolute inset-x-0 bottom-0 hidden items-center justify-center gap-1 bg-ink/75 py-1 text-[10px] font-medium text-paper group-hover:flex">
                  <Upload size={11} /> {preview ? t.onboarding.info.photoChange : t.onboarding.info.photoPick}
                </span>
              )}
              {/* Badge de cámara: limpio, centrado en el borde inferior. */}
              {!avatarUploading && (
                <span className="absolute bottom-0.5 right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink-2 bg-brand text-on-accent shadow-sm">
                  {preview ? <Camera size={11} /> : <Plus size={13} />}
                </span>
              )}
            </button>
            <p className="mt-1.5 text-[10px] font-medium text-paper-dim">{preview ? t.onboarding.info.photoChange : t.onboarding.info.photoAdd}</p>
          </div>
          <div className="min-w-0 flex-1">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.onboarding.info.handle}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim">@</span>
              <input value={form.handle} onChange={setHandle} placeholder={t.onboarding.info.handlePh} maxLength={30}
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
                className="w-full rounded-xl border border-line bg-ink py-3 pl-8 pr-3 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60" />
            </div>
            <p className="mt-1.5 text-[11px] text-paper-dim">{t.onboarding.info.photoHint}</p>
            {avatarError && <p className="mt-1 text-[11px] text-rose-300">{avatarError}</p>}
          </div>
          <input ref={avatarRef} type="file" accept="image/*" hidden
            onChange={(e) => e.target.files?.[0] && pickAvatar(e.target.files[0])} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.onboarding.info.firstName} value={form.legal_first_name} onChange={set('legal_first_name')} required />
          <Field label={t.onboarding.info.lastName} value={form.legal_last_name} onChange={set('legal_last_name')} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Rango razonable: entre 100 años atrás y hace 18 años. Bloquea años absurdos como 198888. */}
          <Field label={t.onboarding.info.dob} type="date" value={form.date_of_birth} onChange={set('date_of_birth')} required
            min={new Date(Date.now() - 100 * 365.25 * 864e5).toISOString().slice(0, 10)}
            max={new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10)} />
          {/* País: lista desplegable con bandera (guarda el nombre). */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.onboarding.info.country} <span className="text-rose-400">*</span></span>
            <div className="relative">
              <select value={form.country} onChange={pickCountry} required
                className={`w-full appearance-none rounded-xl border border-line bg-ink-2 py-3 pl-3.5 pr-10 outline-none transition-colors focus:border-brand/60 ${form.country ? 'text-paper' : 'text-paper-dim'}`}>
                <option value="" disabled>{t.onboarding.info.countryPick}</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.name} className="text-paper">{c.flag} {c.name}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
            </div>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Teléfono: elige país (trae el código) + tu número. */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.onboarding.info.phone}</span>
            <div className="flex gap-2">
              <div className="relative shrink-0">
                <select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Código de país"
                  className="h-full appearance-none rounded-xl border border-line bg-ink-2 py-3 pl-3 pr-7 text-paper outline-none transition-colors focus:border-brand/60">
                  <option value="">+</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-paper-dim" />
              </div>
              <input value={phoneNational} onChange={(e) => setPhoneNational(e.target.value.replace(/[^\d\s-]/g, ''))}
                inputMode="tel" placeholder={t.onboarding.info.phonePh}
                className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-3 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60" />
            </div>
          </label>
          <Field label={t.onboarding.info.stage} value={form.stage_name} onChange={set('stage_name')} placeholder={t.onboarding.info.stagePh} />
        </div>
        {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        <div className="mt-1 flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand py-3 font-semibold text-on-accent transition-colors hover:bg-brand/90 disabled:opacity-60">
            {saving ? t.common.saving : saved ? <><Check size={17} /> {t.common.save}</> : t.common.save}
          </button>
          {/* Indicador de autoguardado — que la persona sepa que no pierde nada. */}
          <span className="min-w-[110px] text-[11px] text-paper-dim">
            {draft === 'saving' ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> {t.onboarding.info.draftSaving}</span>
              : draft === 'saved' ? <span className="inline-flex items-center gap-1 text-brand"><Check size={12} /> {t.onboarding.info.draftSaved}</span>
              : null}
          </span>
        </div>
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

function Field({ label, type = 'text', value, onChange, placeholder, required, min, max }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-paper-mute">{label}</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        min={min} max={max}
        className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-3 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60 [color-scheme:dark]" />
    </label>
  );
}

/* ── Identidad + consentimiento ─────────────────────────────────────────── */
const KYC_SLOTS = ['id_front', 'id_back', 'selfie_id'];
// Granular, unbundled consents (biometric + AI-likeness must be separate & specific).
const CONSENT_KEYS = ['age', 'ownlikeness', 'biometric', 'likeness', 'aicontent', 'billing', 'terms'];
const CONSENT_INIT = Object.fromEntries(CONSENT_KEYS.map((k) => [k, false]));

function IdentityStep({ me, onDone, t, lang, rejected, reason, approved, pending }) {
  const [files, setFiles] = useState({});
  const [consents, setConsents] = useState(CONSENT_INIT);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false); // muestra el pop-up de gracias
  const esL = lang === 'es';
  const contactEmail = me.user?.email || me.profile?.email || '';

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
    if (CONSENT_KEYS.some((k) => !consents[k])) { setError(t.onboarding.id.missingConsent); return; }
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
      setSubmitted(true); // pop-up de gracias; onDone() se llama al cerrarlo
    } catch (err) {
      console.error(err);
      setError(t.common.error);
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
      <div className="mt-6">
        <p className="text-sm font-medium text-paper">{t.onboarding.id.consentsTitle}</p>
        <p className="mb-2.5 text-[11px] text-paper-dim">{t.onboarding.id.consentsIntro}</p>
        <div className="space-y-2.5">
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
        <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-paper-dim">
          <a href="/likeness-consent" target="_blank" className="underline hover:text-brand">{lang === 'es' ? 'Licencia de imagen IA' : 'AI Likeness License'}</a>
          <a href="/biometric-policy" target="_blank" className="underline hover:text-brand">{lang === 'es' ? 'Política biométrica' : 'Biometric Policy'}</a>
          <a href="/terms" target="_blank" className="underline hover:text-brand">{lang === 'es' ? 'Términos' : 'Terms'}</a>
          <a href="/privacy" target="_blank" className="underline hover:text-brand">{lang === 'es' ? 'Privacidad' : 'Privacy'}</a>
        </p>
      </div>
      {error && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      <button onClick={submit} disabled={saving}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 font-semibold text-on-accent transition-colors hover:bg-brand/90 disabled:opacity-60">
        {saving ? <><Loader2 size={18} className="animate-spin" /> {t.onboarding.id.uploading}</> : <><ShieldCheck size={18} /> {t.onboarding.id.submit}</>}
      </button>
      <p className="mt-3 text-center text-[11px] text-paper-dim">{t.onboarding.id.note}</p>

      {/* Pop-up de confirmación tras enviar la verificación */}
      {submitted && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-brand/25 bg-card p-7 text-center shadow-glow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand/15 text-brand">
              <CheckCircle2 size={34} />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold text-paper">
              {esL ? '¡Gracias! Recibimos tu verificación' : 'Thank you! We received your verification'}
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-paper-mute">
              {esL
                ? <>En aproximadamente <span className="font-semibold text-paper">48 horas</span> recibirás un correo{contactEmail ? <> a <span className="font-medium text-paper">{contactEmail}</span></> : ''} con el resultado de tu verificación y los siguientes pasos para activar tu cuenta.</>
                : <>In about <span className="font-semibold text-paper">48 hours</span> you’ll get an email{contactEmail ? <> at <span className="font-medium text-paper">{contactEmail}</span></> : ''} with your verification result and the next steps to activate your account.</>}
            </p>
            <button onClick={() => { setSubmitted(false); onDone(); }}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-brand/90">
              {esL ? 'Entendido' : 'Got it'}
            </button>
          </div>
        </div>
      )}
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
      <input ref={ref} type="file" accept="image/*" capture={kind === 'selfie_id' ? 'user' : 'environment'} hidden
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

/* ── Suscripción — identical cards to the public /pricing, just selectable ─ */
function PayStep({ me, onDone, onRefresh, t, lang, paid, paymentStatus, subEndsAt, plan }) {
  const c = PRICING_COPY[lang] || PRICING_COPY.en;
  const esL = lang === 'es';
  const [period, setPeriod] = useState('m');
  const [sel, setSel] = useState(plan || PACKS.find((p) => p.popular)?.key || PACKS[0].key);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const current = PACKS.find((p) => p.key === sel) || PACKS[0];
  const curPrice = current[period];

  // ── Suscripción ACTIVA: gestión (cambiar de plan / cancelar con motivo) ──
  if (paid) {
    return <ManageSubscription me={me} t={t} lang={lang} plan={plan} subEndsAt={subEndsAt} onRefresh={onRefresh} />;
  }

  // ── Suscripción CANCELADA: reactivar ──
  if (paymentStatus === 'canceled') {
    return <CanceledSubscription me={me} t={t} lang={lang} plan={plan} subEndsAt={subEndsAt} onRefresh={onRefresh} />;
  }

  // ── Plan elegido, pago EN CONFIRMACIÓN (billing manual) ──
  if (paymentStatus === 'pending') {
    const chosen = PACKS.find((p) => p.key === plan);
    return (
      <Panel title={esL ? 'Pago en confirmación' : 'Payment under review'} desc={esL ? 'Elegiste tu plan. Falta que confirmemos tu pago.' : 'You chose your plan. We just need to confirm your payment.'}>
        <div className="rounded-2xl border border-brand/25 bg-brand/[0.05] p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/15 text-brand"><Clock size={20} /></span>
            <div>
              <div className="font-display text-base font-semibold text-paper">{esL ? 'Tu plan' : 'Your plan'}: {chosen?.name || plan}</div>
              <p className="mt-0.5 text-sm text-paper-mute">{esL ? 'En cuanto confirmemos tu pago, tu cuenta se activa y empiezas a recibir contenido. Te avisamos por correo.' : 'As soon as we confirm your payment, your account activates and you start receiving content. We’ll email you.'}</p>
            </div>
          </div>
        </div>
        <button onClick={async () => { await getSupabase().from('profiles').update({ payment_status: 'unpaid' }).eq('id', me.user.id); onRefresh(); }}
          className="mt-4 w-full rounded-full border border-line py-3 text-sm font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
          {esL ? 'Cambiar de plan' : 'Change plan'}
        </button>
      </Panel>
    );
  }

  // Billing manual (sin procesador de pago aún): elegir plan NO cobra ni activa.
  // Deja el plan elegido + payment_status='pending' y el equipo confirma el pago
  // a mano. Así el panel interno no la muestra falsamente como «pagada».
  async function pay() {
    setSaving(true); setError('');
    const { error: err } = await getSupabase().from('profiles').update({ payment_status: 'pending', plan: sel }).eq('id', me.user.id);
    setSaving(false);
    if (err) { console.error(err); setError(t.common.error); return; }
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
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-full px-1.5 py-2 text-xs font-bold transition-all duration-200 sm:px-3 sm:text-sm ${active ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'}`}>
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
        {saving ? t.onboarding.pay.submitting : (esL ? `Elegir ${current.name} · $${curPrice}/mes` : `Choose ${current.name} · $${curPrice}/mo`)}
      </button>
      <p className="mt-3 text-center text-[11px] text-paper-dim">{esL ? 'No se te cobra ahora. Confirmamos tu pago contigo y activamos tu cuenta.' : 'You’re not charged now. We confirm your payment with you and activate your account.'}</p>
    </Panel>
  );
}

// Copy bilingüe para la gestión de suscripción (contenido en el componente para
// no inflar el i18n global; el portal es ES/EN).
const MANAGE_COPY = {
  es: {
    title: 'Tu suscripción',
    active: 'Suscripción activa',
    renew: (d) => `Se renueva el ${d}`,
    perMo: '/mes',
    changePlan: 'Cambiar de plan',
    changeHint: 'Sube o baja tu plan cuando lo necesites.',
    upgrade: 'Subir a', downgrade: 'Bajar a',
    changeNote: 'El ajuste de precio se refleja en tu próximo cobro.',
    changed: 'Plan actualizado',
    cancel: 'Cancelar suscripción',
    cancelTitle: '¿Seguro que quieres cancelar?',
    cancelDesc: 'Perderás la entrega diaria de contenido al terminar tu ciclo. Cuéntanos por qué te vas — nos ayuda a mejorar.',
    reasonLabel: 'Motivo (elige uno)',
    notePh: 'Cuéntanos más (opcional)',
    confirmCancel: 'Sí, cancelar mi suscripción',
    keep: 'Mejor no, conservar mi plan',
    pickReason: 'Elige un motivo para continuar.',
    canceledBadge: 'Suscripción cancelada',
    canceledUntil: (d) => `Tu plan sigue activo hasta el ${d}. Después dejarás de recibir contenido.`,
    canceledNow: 'Ya no recibirás contenido nuevo.',
    reactivate: 'Reactivar mi suscripción',
    reactivated: 'Suscripción reactivada',
    reasons: {
      price: 'El precio es muy alto',
      usage: 'No lo estoy usando lo suficiente',
      features: 'Le faltan funciones que necesito',
      quality: 'La calidad no fue lo que esperaba',
      competitor: 'Encontré otro servicio',
      break: 'Solo tomo un descanso',
      other: 'Otro motivo',
    },
  },
  en: {
    title: 'Your subscription',
    active: 'Active subscription',
    renew: (d) => `Renews on ${d}`,
    perMo: '/mo',
    changePlan: 'Change plan',
    changeHint: 'Upgrade or downgrade whenever you need.',
    upgrade: 'Upgrade to', downgrade: 'Downgrade to',
    changeNote: 'The price change applies on your next billing.',
    changed: 'Plan updated',
    cancel: 'Cancel subscription',
    cancelTitle: 'Are you sure you want to cancel?',
    cancelDesc: "You'll lose your daily content when your cycle ends. Tell us why you're leaving — it helps us improve.",
    reasonLabel: 'Reason (pick one)',
    notePh: 'Tell us more (optional)',
    confirmCancel: 'Yes, cancel my subscription',
    keep: 'Never mind, keep my plan',
    pickReason: 'Pick a reason to continue.',
    canceledBadge: 'Subscription canceled',
    canceledUntil: (d) => `Your plan stays active until ${d}. After that you'll stop receiving content.`,
    canceledNow: "You won't receive new content.",
    reactivate: 'Reactivate my subscription',
    reactivated: 'Subscription reactivated',
    reasons: {
      price: 'The price is too high',
      usage: "I'm not using it enough",
      features: 'Missing features I need',
      quality: "Quality wasn't what I expected",
      competitor: 'Found another service',
      break: 'Just taking a break',
      other: 'Other reason',
    },
  },
};
const REASON_KEYS = ['price', 'usage', 'features', 'quality', 'competitor', 'break', 'other'];
const planRank = (key) => PACKS.findIndex((p) => p.key === key); // 0 test, 1 core, 2 pro

function ManageSubscription({ me, t, lang, plan, subEndsAt, onRefresh }) {
  const m = MANAGE_COPY[lang] || MANAGE_COPY.en;
  const currentPack = PACKS.find((p) => p.key === plan) || PACKS[0];
  const [mode, setMode] = useState('view'); // view | change | cancel
  const [sel, setSel] = useState(plan || currentPack.key);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  async function changePlan() {
    if (sel === plan) return;
    setBusy(true); setError('');
    const supabase = getSupabase();
    try {
      const { error: e1 } = await supabase.from('profiles').update({ plan: sel }).eq('id', me.user.id);
      if (e1) throw e1;
      await supabase.from('subscription_events').insert({ creator_id: me.user.id, kind: 'plan_change', from_plan: plan, to_plan: sel });
      setFlash(m.changed); setMode('view');
      onRefresh && onRefresh();
    } catch (err) { console.error(err); setError(t.common.error); }
    finally { setBusy(false); }
  }

  async function cancelSub() {
    if (!reason) { setError(m.pickReason); return; }
    setBusy(true); setError('');
    const supabase = getSupabase();
    try {
      const { error: e1 } = await supabase.from('profiles').update({ payment_status: 'canceled' }).eq('id', me.user.id);
      if (e1) throw e1;
      await supabase.from('subscription_events').insert({ creator_id: me.user.id, kind: 'cancel', from_plan: plan, reason, note: note.trim() || null });
      onRefresh && onRefresh();
    } catch (err) { console.error(err); setError(t.common.error); setBusy(false); }
  }

  return (
    <Panel title={m.title}>
      {/* Estado actual */}
      <div className="rounded-2xl border border-brand/30 bg-brand/[0.06] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
              <Check size={12} /> {m.active}
            </div>
            <div className="mt-2 font-display text-2xl font-semibold text-paper">{currentPack.name} · ${currentPack.m}<span className="text-sm font-normal text-paper-dim">{m.perMo}</span></div>
            {subEndsAt && <div className="mt-0.5 text-xs text-paper-dim">{m.renew(fmtDate(subEndsAt))}</div>}
          </div>
        </div>
        {flash && <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand"><Check size={13} /> {flash}</p>}
      </div>

      {mode === 'view' && (
        <div className="mt-4 grid gap-3">
          <button onClick={() => { setMode('change'); setSel(plan); setError(''); setFlash(''); }}
            className="flex items-center justify-between rounded-xl border border-line bg-ink-2 px-4 py-3.5 text-left transition-colors hover:border-brand/40">
            <span>
              <span className="block text-sm font-semibold text-paper">{m.changePlan}</span>
              <span className="block text-[11px] text-paper-dim">{m.changeHint}</span>
            </span>
            <ArrowRight size={16} className="text-paper-dim" />
          </button>
          <button onClick={() => { setMode('cancel'); setReason(''); setNote(''); setError(''); }}
            className="flex items-center justify-between rounded-xl border border-line bg-ink-2 px-4 py-3.5 text-left transition-colors hover:border-rose-500/40">
            <span className="text-sm font-semibold text-rose-300">{m.cancel}</span>
            <ArrowRight size={16} className="text-paper-dim" />
          </button>
        </div>
      )}

      {mode === 'change' && (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {PACKS.map((pack) => {
              const active = sel === pack.key;
              const isCurrent = pack.key === plan;
              return (
                <button key={pack.key} type="button" onClick={() => setSel(pack.key)}
                  className={`relative flex flex-col rounded-2xl border p-4 text-left transition-all ${active ? 'border-brand bg-brand/[0.08] ring-1 ring-brand' : 'border-line bg-ink-2 hover:border-paper/20'}`}>
                  {isCurrent && <span className="absolute right-2 top-2 rounded-full bg-hair/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-paper-dim">{lang === 'es' ? 'Actual' : 'Current'}</span>}
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-paper-mute">{pack.name}</span>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className={`font-display text-2xl leading-none ${active ? 'text-brand' : 'text-paper'}`}>${pack.m}</span>
                    <span className="font-mono text-[10px] text-paper-dim">{m.perMo}</span>
                  </div>
                  <span className="mt-2 text-[11px] text-paper-dim">{pack.photos} {lang === 'es' ? 'fotos' : 'photos'} · {pack.videos} {lang === 'es' ? 'video' : 'video'}{pack.videos > 1 ? 's' : ''}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-paper-dim">{m.changeNote}</p>
          {error && <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={changePlan} disabled={busy || sel === plan}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-accent transition-transform hover:scale-[1.02] disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {sel === plan ? m.changePlan : `${planRank(sel) > planRank(plan) ? m.upgrade : m.downgrade} ${(PACKS.find((p) => p.key === sel) || {}).name}`}
            </button>
            <button onClick={() => { setMode('view'); setError(''); }} className="rounded-full border border-line px-4 py-2.5 text-sm text-paper-mute hover:text-paper">{t.common.cancel || (lang === 'es' ? 'Volver' : 'Back')}</button>
          </div>
        </div>
      )}

      {mode === 'cancel' && (
        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-5">
          <h3 className="font-display text-lg font-semibold text-paper">{m.cancelTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-paper-mute">{m.cancelDesc}</p>
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{m.reasonLabel}</p>
            <div className="grid gap-2">
              {REASON_KEYS.map((k) => (
                <button key={k} type="button" onClick={() => setReason(k)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${reason === k ? 'border-brand/60 bg-brand/10 text-paper' : 'border-line bg-ink-2 text-paper-mute hover:border-paper/20'}`}>
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${reason === k ? 'border-brand bg-brand' : 'border-paper-dim'}`}>{reason === k && <Check size={10} className="text-on-accent" />}</span>
                  {m.reasons[k]}
                </button>
              ))}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={m.notePh} rows={2}
              className="mt-3 w-full resize-none rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
          </div>
          {error && <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
          <div className="mt-4 flex flex-col gap-2">
            <button onClick={cancelSub} disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />} {m.confirmCancel}
            </button>
            <button onClick={() => { setMode('view'); setError(''); }} className="rounded-full border border-brand/40 px-5 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/10">{m.keep}</button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function CanceledSubscription({ me, t, lang, plan, subEndsAt, onRefresh }) {
  const m = MANAGE_COPY[lang] || MANAGE_COPY.en;
  const currentPack = PACKS.find((p) => p.key === plan) || PACKS[0];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  async function reactivate() {
    setBusy(true); setError('');
    const supabase = getSupabase();
    try {
      const { error: e1 } = await supabase.from('profiles').update({ payment_status: 'paid' }).eq('id', me.user.id);
      if (e1) throw e1;
      await supabase.from('subscription_events').insert({ creator_id: me.user.id, kind: 'resume', to_plan: plan });
      onRefresh && onRefresh();
    } catch (err) { console.error(err); setError(t.common.error); setBusy(false); }
  }

  return (
    <Panel title={m.title}>
      <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-rose-300">
          <AlertTriangle size={12} /> {m.canceledBadge}
        </div>
        <div className="mt-2 font-display text-xl font-semibold text-paper">{currentPack.name} · ${currentPack.m}{m.perMo}</div>
        <p className="mt-1 text-sm text-paper-mute">{subEndsAt ? m.canceledUntil(fmtDate(subEndsAt)) : m.canceledNow}</p>
        {error && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        <button onClick={reactivate} disabled={busy}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-accent transition-transform hover:scale-[1.02] disabled:opacity-60">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />} {m.reactivate}
        </button>
      </div>
    </Panel>
  );
}
