'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Check, ShieldCheck, IdCard, CreditCard, Sparkles, Clock,
  Upload, User, AlertTriangle, ArrowRight, Loader2, X,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import Logo from '@/components/Logo';

// Onboarding status → wizard step index
const STEPS = [
  { key: 'info',     label: 'Datos',     icon: User },
  { key: 'id',       label: 'Identidad', icon: IdCard },
  { key: 'review',   label: 'Revisión',  icon: Clock },
  { key: 'pay',      label: 'Pago',      icon: CreditCard },
  { key: 'lora',     label: 'Tu clon',   icon: Sparkles },
];

function stepFromStatus(s) {
  if (s === 'registered') return 0;
  if (s === 'info' || s === 'id_rejected') return 1;
  if (s === 'id_pending') return 2;
  if (s === 'id_approved') return 3;
  if (s === 'paid') return 4;
  return 5; // active → done
}

const LORA_TARGET = 80; // Higgsfield clone set target

export default function OnboardingPage() {
  const router = useRouter();
  const [me, setMe] = useState(undefined);

  const refresh = useCallback(async () => {
    const up = await getUserProfile();
    if (!up) { router.replace('/login'); return; }
    if (up.profile?.role && up.profile.role !== 'creator') { router.replace('/admin'); return; }
    setMe(up);
  }, [router]);

  useEffect(() => { refresh(); }, [refresh]);

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  const status = me.profile?.onboarding_status || 'registered';
  const step = stepFromStatus(status);

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">Registro</span>
          </div>
          <button onClick={async () => { await signOut(); router.replace('/login'); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <Stepper step={step} />
        <div className="mt-8">
          {step === 0 && <InfoStep me={me} onDone={refresh} />}
          {step === 1 && <IdStep me={me} onDone={refresh} rejected={status === 'id_rejected'} reason={me.profile?.id_rejection_reason} />}
          {step === 2 && <ReviewStep />}
          {step === 3 && <PayStep me={me} onDone={refresh} />}
          {step === 4 && <LoraStep me={me} onDone={refresh} />}
          {step === 5 && <DoneStep router={router} />}
        </div>
      </main>
    </div>
  );
}

function Stepper({ step }) {
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
              <span className={`text-[11px] font-medium ${active || done ? 'text-paper' : 'text-paper-dim'}`}>{s.label}</span>
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
function InfoStep({ me, onDone }) {
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
      setError('Completa tu nombre legal, fecha de nacimiento y país.'); return;
    }
    if (ageFrom(form.date_of_birth) < 18) { setError('Debes ser mayor de 18 años para usar el servicio.'); return; }
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
    <Card icon={User} title="Tus datos" desc="Usamos tu nombre legal solo para verificar tu identidad. Tu nombre artístico es el que verá el equipo.">
      <form onSubmit={save} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre legal" value={form.legal_first_name} onChange={set('legal_first_name')} required />
          <Field label="Apellido legal" value={form.legal_last_name} onChange={set('legal_last_name')} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de nacimiento" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} required />
          <Field label="País" value={form.country} onChange={set('country')} placeholder="Ej. Estados Unidos" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono (opcional)" value={form.phone} onChange={set('phone')} placeholder="+1 …" />
          <Field label="Nombre artístico (opcional)" value={form.stage_name} onChange={set('stage_name')} placeholder="Cómo te conocen" />
        </div>
        {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        <button type="submit" disabled={saving}
          className="group mt-1 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
          {saving ? 'Guardando…' : 'Continuar'} {!saving && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
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

// ── Step 1: KYC — ID front / back / selfie holding ID ──────────────────────
const KYC_SLOTS = [
  { type: 'id_front', label: 'ID — frente', hint: 'Documento oficial por delante, legible.' },
  { type: 'id_back',  label: 'ID — reverso', hint: 'La parte de atrás del documento.' },
  { type: 'selfie_id', label: 'Selfie con tu ID', hint: 'Tu cara junto al documento, ambos visibles.' },
];

function IdStep({ me, onDone, rejected, reason }) {
  const [files, setFiles] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError('');
    if (KYC_SLOTS.some((s) => !files[s.type])) { setError('Sube las tres imágenes para continuar.'); return; }
    setSaving(true);
    const supabase = getSupabase();
    try {
      for (const s of KYC_SLOTS) {
        const file = files[s.type];
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${me.user.id}/${s.type}.${ext}`;
        const { error: upErr } = await supabase.storage.from('kyc').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from('kyc_documents')
          .upsert({ user_id: me.user.id, doc_type: s.type, storage_path: path }, { onConflict: 'user_id,doc_type' });
        if (dbErr) throw dbErr;
      }
      const { error: pErr } = await supabase.from('profiles')
        .update({ onboarding_status: 'id_pending', id_rejection_reason: null }).eq('id', me.user.id);
      if (pErr) throw pErr;
      onDone();
    } catch (err) {
      setError(err.message || 'No se pudo subir. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card icon={IdCard} title="Verifica tu identidad" desc="Por ley, confirmamos que eres una persona real y mayor de 18 antes de crear tu clon. Tus documentos son privados y solo los ve nuestro equipo de verificación.">
      {rejected && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div><span className="font-semibold">Tu verificación fue rechazada.</span> {reason ? <span>Motivo: {reason}</span> : 'Vuelve a subir imágenes claras.'}</div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {KYC_SLOTS.map((s) => (
          <UploadSlot key={s.type} label={s.label} hint={s.hint} file={files[s.type]}
            onFile={(f) => setFiles((prev) => ({ ...prev, [s.type]: f }))} />
        ))}
      </div>
      {error && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      <button onClick={submit} disabled={saving}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
        {saving ? <><Loader2 size={18} className="animate-spin" /> Subiendo…</> : <><ShieldCheck size={18} /> Enviar para verificación</>}
      </button>
    </Card>
  );
}

function UploadSlot({ label, hint, file, onFile }) {
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
            <span className="text-xs text-paper-dim">Toca para subir</span>
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

// ── Step 2: waiting for admin review ───────────────────────────────────────
function ReviewStep() {
  return (
    <Card icon={Clock} title="Verificación en revisión" desc="Nuestro equipo está revisando tus documentos. Suele tardar poco. Te avisaremos y podrás continuar con el pago apenas se apruebe.">
      <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-4 text-sm text-paper-mute">
        <Loader2 size={20} className="animate-spin text-brand" />
        Estado: <span className="font-semibold text-brand">en revisión</span> — puedes cerrar y volver más tarde.
      </div>
    </Card>
  );
}

// ── Step 3: payment (stub) ─────────────────────────────────────────────────
function PayStep({ me, onDone }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function pay() {
    setSaving(true); setError('');
    const { error: err } = await getSupabase().from('profiles')
      .update({ payment_status: 'paid', onboarding_status: 'paid' }).eq('id', me.user.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone();
  }
  return (
    <Card icon={CreditCard} title="Activa tu suscripción" desc="¡Identidad verificada! Elige tu plan para activar la creación de tu clon. El cobro es recurrente y puedes cancelar cuando quieras.">
      <div className="rounded-2xl border border-brand/30 bg-brand/[0.06] p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-lg font-semibold text-paper">Plan Creadora</span>
          <span className="font-display text-2xl font-bold text-brand">$—<span className="text-sm text-paper-dim">/mes</span></span>
        </div>
        <p className="mt-2 text-sm text-paper-mute">Contenido a demanda, fresco y en abundancia. (Precio y checkout se conectan con el procesador de pago.)</p>
      </div>
      {error && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      <button onClick={pay} disabled={saving}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
        {saving ? 'Procesando…' : 'Continuar al pago'}
      </button>
      <p className="mt-3 text-center text-[11px] text-paper-dim">Integración de pago (Epoch / CCBill) pendiente — este botón simula el pago aprobado.</p>
    </Card>
  );
}

// ── Step 4: LoRA training set ──────────────────────────────────────────────
function LoraStep({ me, onDone }) {
  const ref = useRef(null);
  const [items, setItems] = useState([]); // {file, url}
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  function addFiles(list) {
    const arr = Array.from(list).filter((f) => f.type.startsWith('image/'));
    setItems((prev) => [...prev, ...arr.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }
  function removeAt(i) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }

  async function submit() {
    setError('');
    if (items.length < 10) { setError(`Sube al menos 10 fotos (ideal ${LORA_TARGET}) para un clon de calidad.`); return; }
    setSaving(true); setProgress(0);
    const supabase = getSupabase();
    try {
      for (let i = 0; i < items.length; i++) {
        const file = items[i].file;
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${me.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('lora').upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from('lora_photos').insert({ user_id: me.user.id, storage_path: path });
        if (dbErr) throw dbErr;
        setProgress(i + 1);
      }
      const { error: pErr } = await supabase.from('profiles')
        .update({ lora_status: 'training', onboarding_status: 'active' }).eq('id', me.user.id);
      if (pErr) throw pErr;
      onDone();
    } catch (err) {
      setError(err.message || 'No se pudieron subir las fotos.');
    } finally {
      setSaving(false);
    }
  }

  const pct = Math.min(100, Math.round((items.length / LORA_TARGET) * 100));

  return (
    <Card icon={Sparkles} title="Fotos para tu clon" desc={`Sube tu mejor set de fotos: rostro desde varios ángulos, cuerpo completo, distintas luces y expresiones. Mientras más variedad y calidad, mejor el clon. Meta: ${LORA_TARGET} fotos.`}>
      <button type="button" onClick={() => ref.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-ink-2 py-8 transition-colors hover:border-brand/40">
        <Upload size={26} className="text-paper-dim" />
        <span className="text-sm font-medium text-paper">Toca para elegir fotos</span>
        <span className="text-xs text-paper-dim">JPG o PNG · varias a la vez</span>
      </button>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-paper-mute">{items.length} / {LORA_TARGET} fotos</span>
        <div className="ml-3 h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-4 grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
          {items.map((it, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt="" className="h-full w-full object-cover" />
              {!saving && (
                <button onClick={() => removeAt(i)} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink/80 text-paper opacity-0 transition-opacity group-hover:opacity-100">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      <button onClick={submit} disabled={saving}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
        {saving ? <><Loader2 size={18} className="animate-spin" /> Subiendo {progress}/{items.length}…</> : <>Enviar mis fotos <ArrowRight size={18} /></>}
      </button>
    </Card>
  );
}

// ── Step 5: done ───────────────────────────────────────────────────────────
function DoneStep({ router }) {
  return (
    <Card icon={Check} title="¡Todo listo!" desc="Recibimos tus fotos y ya estamos preparando tu clon. Te avisaremos cuando tu primer contenido esté disponible en tu panel.">
      <button onClick={() => router.push('/panel')}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01]">
        Ir a mi panel <ArrowRight size={18} />
      </button>
    </Card>
  );
}
