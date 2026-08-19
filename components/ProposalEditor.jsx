'use client';

// Editor de la propuesta personalizada. Diseño pulido tipo herramienta:
// hero card con estado + acciones grandes, slides con hover states y drag
// handles visuales, autosave indicator, botón publicar prominente.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Plus, X, ArrowUp, ArrowDown, Loader2, Eye, CheckCircle2, ArrowLeft, Save, Sparkles, GripVertical, Rocket, RotateCcw, Camera } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import ProposalDeck from '@/components/ProposalDeck';

const MAX_SLIDES = 8;
const MIN_SLIDES = 3;

export default function ProposalEditor({ creator, onClose, flash }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [slides, setSlides] = useState([]);
  const [intro, setIntro] = useState('');
  const [savedTick, setSavedTick] = useState(null); // muestra «guardado» por 2s

  const load = useCallback(async () => {
    const supabase = getSupabase();
    let { data: pr } = await supabase.from('creator_proposals').select('*').eq('creator_id', creator.id).maybeSingle();
    if (!pr) {
      const { data: created, error } = await supabase.from('creator_proposals').insert({ creator_id: creator.id }).select('*').single();
      if (error) { flash && flash('No se pudo crear la propuesta: ' + error.message); setLoading(false); return; }
      pr = created;
    }
    setProposal(pr);
    setIntro(pr.intro || '');
    const { data: sl } = await supabase.from('proposal_slides').select('*').eq('proposal_id', pr.id).order('position');
    setSlides(sl || []);
    setLoading(false);
  }, [creator.id, flash]);

  useEffect(() => { load(); }, [load]);

  function markSaved() {
    setSavedTick(Date.now());
    setTimeout(() => setSavedTick(null), 2000);
  }

  async function saveIntro() {
    if (!proposal) return;
    setSaving(true);
    const { error } = await getSupabase().from('creator_proposals').update({ intro: intro.trim() || null, updated_at: new Date().toISOString() }).eq('id', proposal.id);
    setSaving(false);
    if (error) { flash && flash('Error al guardar intro: ' + error.message); return; }
    setProposal((p) => ({ ...p, intro: intro.trim() || null }));
    markSaved();
  }

  async function addSlide() {
    if (slides.length >= MAX_SLIDES) { flash && flash(`Máximo ${MAX_SLIDES} trípticos.`); return; }
    if (!proposal) return;
    const position = slides.length;
    const { data, error } = await getSupabase().from('proposal_slides').insert({ proposal_id: proposal.id, position }).select('*').single();
    if (error) { flash && flash('Error al crear tríptico: ' + error.message); return; }
    setSlides((s) => [...s, data]);
  }

  async function delSlide(id) {
    if (!window.confirm('¿Borrar este tríptico?')) return;
    const { error } = await getSupabase().from('proposal_slides').delete().eq('id', id);
    if (error) { flash && flash('Error al borrar: ' + error.message); return; }
    setSlides((s) => s.filter((x) => x.id !== id));
  }

  async function moveSlide(id, dir) {
    const idx = slides.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const swap = idx + dir;
    if (swap < 0 || swap >= slides.length) return;
    const arr = [...slides];
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    const reordered = arr.map((s, i) => ({ ...s, position: i }));
    setSlides(reordered);
    const supabase = getSupabase();
    await Promise.all([
      supabase.from('proposal_slides').update({ position: reordered[idx].position }).eq('id', reordered[idx].id),
      supabase.from('proposal_slides').update({ position: reordered[swap].position }).eq('id', reordered[swap].id),
    ]);
  }

  async function updateSlide(id, patch) {
    setSlides((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await getSupabase().from('proposal_slides').update(patch).eq('id', id);
    if (error) flash && flash('Error al guardar: ' + error.message);
    else markSaved();
  }

  async function uploadPhoto(slideId, kind, file) {
    if (!file) return;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${creator.id}/${slideId}-${kind}-${Date.now()}.${ext}`;
    const supabase = getSupabase();
    const { error: upErr } = await supabase.storage.from('proposals').upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { flash && flash('Error al subir: ' + upErr.message); return; }
    const { data: pub } = supabase.storage.from('proposals').getPublicUrl(path);
    const url = pub?.publicUrl;
    if (!url) { flash && flash('No se obtuvo la URL de la foto.'); return; }
    const col = kind === 'inspiration' ? 'inspiration_url' : kind === 'real' ? 'real_url' : 'ai_url';
    await updateSlide(slideId, { [col]: url });
  }

  async function publish() {
    if (!proposal) return;
    if (slides.length < MIN_SLIDES) { flash && flash(`Sube al menos ${MIN_SLIDES} trípticos antes de publicar.`); return; }
    const incomplete = slides.filter((s) => !s.inspiration_url || !s.real_url || !s.ai_url).length;
    if (incomplete > 0) {
      if (!window.confirm(`Hay ${incomplete} tríptico${incomplete === 1 ? '' : 's'} con fotos faltantes. ¿Publicar de todos modos?`)) return;
    }
    setPublishing(true);
    await getSupabase().from('creator_proposals').update({
      intro: intro.trim() || null,
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', proposal.id);
    setPublishing(false);
    setProposal((p) => ({ ...p, status: 'published', published_at: new Date().toISOString(), intro: intro.trim() || null }));
    flash && flash(`✨ Propuesta publicada — ${creator.full_name || 'la creadora'} ya la ve en su cuenta.`);
  }

  async function unpublish() {
    if (!proposal) return;
    if (!window.confirm('¿Volver a borrador? La creadora deja de verla hasta que la publiques de nuevo.')) return;
    await getSupabase().from('creator_proposals').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', proposal.id);
    setProposal((p) => ({ ...p, status: 'draft' }));
    flash && flash('Propuesta en borrador');
  }

  if (loading) {
    return (
      <div className="mt-8 grid min-h-[40vh] place-items-center gap-2 text-center text-paper-dim">
        <Loader2 size={22} className="animate-spin text-brand" />
        <p className="text-sm">Cargando propuesta…</p>
      </div>
    );
  }

  if (preview) {
    return (
      <ProposalDeck
        creatorName={creator.stage_name || creator.full_name}
        intro={intro || proposal?.intro}
        slides={slides}
        onClose={() => setPreview(false)}
      />
    );
  }

  const published = proposal?.status === 'published';
  const complete = slides.length >= MIN_SLIDES && slides.every((s) => s.inspiration_url && s.real_url && s.ai_url);

  return (
    <div className="mt-2">
      {/* Volver */}
      <button onClick={onClose} className="mb-4 inline-flex items-center gap-1.5 text-sm text-paper-mute transition-colors hover:text-paper">
        <ArrowLeft size={15} /> Volver
      </button>

      {/* HERO CARD — estado + acciones grandes */}
      <div className={`relative overflow-hidden rounded-3xl border p-6 sm:p-7 ${
        published
          ? 'border-brand/40 bg-gradient-to-br from-brand/[0.10] to-transparent shadow-glow-sm'
          : 'border-line bg-card'
      }`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                published ? 'border-brand/40 bg-brand/15 text-brand' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}>
                {published ? <><CheckCircle2 size={11} /> Publicada</> : <>Borrador</>}
              </span>
              {savedTick && (
                <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand">
                  <CheckCircle2 size={10} /> Guardado
                </motion.span>
              )}
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-paper">
              Propuesta de <span className="text-brand">{creator.stage_name || creator.full_name || 'la creadora'}</span>
            </h2>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-paper-mute">
              {published
                ? 'La creadora ya la ve al entrar a su cuenta. Puedes seguir editándola — los cambios entran en vivo.'
                : 'Arma su lookbook con 3–8 trípticos (Inspiración · Foto real · Resultado IA). Cuando esté listo, publícala y la verá al entrar sin haber pagado.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button onClick={() => setPreview(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-paper transition-colors hover:border-brand/40 hover:text-brand">
              <Eye size={14} /> Preview
            </button>
            {published ? (
              <button onClick={unpublish}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-paper-mute hover:border-amber-500/40 hover:text-amber-300">
                <RotateCcw size={14} /> Volver a borrador
              </button>
            ) : (
              <button onClick={publish} disabled={publishing || slides.length < MIN_SLIDES}
                title={slides.length < MIN_SLIDES ? `Sube al menos ${MIN_SLIDES} trípticos` : 'Publicar y hacerla visible a la creadora'}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100">
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />} Publicar
              </button>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Array.from({ length: MAX_SLIDES }).map((_, i) => {
            const s = slides[i];
            const filled = s && s.inspiration_url && s.real_url && s.ai_url;
            const partial = s && !filled;
            return (
              <div key={i} className={`h-1.5 rounded-full transition-colors ${
                filled ? 'bg-brand' : partial ? 'bg-brand/40' : 'bg-white/[0.05]'
              }`} />
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-paper-dim">
          {slides.length} / {MAX_SLIDES} trípticos · {complete ? 'lista para publicar' : slides.length < MIN_SLIDES ? `faltan ${MIN_SLIDES - slides.length} para el mínimo` : 'algunas fotos faltan'}
        </p>
      </div>

      {/* INTRO editable */}
      <div className="mt-5 rounded-3xl border border-line bg-card p-5 sm:p-6">
        <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-paper-dim">
          <Sparkles size={12} className="text-brand" /> Intro personalizada
          <span className="ml-1 font-normal normal-case tracking-normal text-paper-dim/70">(opcional — reemplaza al copy por default)</span>
        </label>
        <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} placeholder="A partir de tus fotos reales construimos un modelo idéntico a ti…"
          className="w-full resize-none rounded-2xl border border-line bg-ink-2 px-4 py-3 text-sm leading-relaxed text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
        <div className="mt-2 flex justify-end">
          <button onClick={saveIntro} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-paper-mute hover:border-brand/40 hover:text-brand disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar intro
          </button>
        </div>
      </div>

      {/* SLIDES */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-paper">Trípticos</p>
          <p className="text-[11px] text-paper-dim">{slides.length} de {MAX_SLIDES} · mínimo {MIN_SLIDES} para publicar</p>
        </div>
        <button onClick={addSlide} disabled={slides.length >= MAX_SLIDES}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100">
          <Plus size={15} /> Agregar tríptico
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <AnimatePresence initial={false}>
          {slides.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-3xl border-2 border-dashed border-line bg-card/30 p-10 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                <Camera size={22} />
              </div>
              <p className="font-display text-base font-semibold text-paper">Aún no hay trípticos</p>
              <p className="mt-1 text-sm text-paper-mute">Cada uno lleva 3 fotos: Inspiración, la foto real que tienes de la creadora, y el resultado que hace su clon.</p>
              <button onClick={addSlide}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
                <Plus size={14} /> Crear el primer tríptico
              </button>
            </motion.div>
          )}
          {slides.map((s, i) => (
            <SlideEditor
              key={s.id}
              slide={s}
              index={i}
              total={slides.length}
              onDelete={() => delSlide(s.id)}
              onMove={(dir) => moveSlide(s.id, dir)}
              onUpload={(kind, file) => uploadPhoto(s.id, kind, file)}
              onCaption={(v) => updateSlide(s.id, { caption: v.trim() || null })}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SlideEditor({ slide, index, total, onDelete, onMove, onUpload, onCaption }) {
  const [caption, setCaption] = useState(slide.caption || '');
  const complete = slide.inspiration_url && slide.real_url && slide.ai_url;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`group rounded-3xl border p-5 transition-colors ${
        complete ? 'border-line bg-card' : 'border-amber-500/25 bg-amber-500/[0.03]'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-hair/10 text-paper-mute">
            <GripVertical size={14} />
          </span>
          <div>
            <p className="font-display text-base font-semibold tabular-nums text-paper">Tríptico {String(index + 1).padStart(2, '0')}</p>
            <p className="text-[10px] uppercase tracking-widest text-paper-dim">{complete ? 'Completo' : 'Faltan fotos'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0} title="Subir"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-paper-mute hover:border-brand/40 hover:text-brand disabled:opacity-30 disabled:hover:border-line disabled:hover:text-paper-mute">
            <ArrowUp size={13} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} title="Bajar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-paper-mute hover:border-brand/40 hover:text-brand disabled:opacity-30 disabled:hover:border-line disabled:hover:text-paper-mute">
            <ArrowDown size={13} />
          </button>
          <button onClick={onDelete} title="Borrar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-paper-mute hover:border-rose-500/50 hover:text-rose-300">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <PhotoSlot label="Inspiración" n={1} url={slide.inspiration_url} onFile={(f) => onUpload('inspiration', f)} />
        <PhotoSlot label="Foto real"   n={2} url={slide.real_url}        onFile={(f) => onUpload('real', f)} />
        <PhotoSlot label="Resultado IA" n={3} url={slide.ai_url}         onFile={(f) => onUpload('ai', f)} highlight />
      </div>

      <div className="mt-3">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => onCaption(caption)}
          placeholder="Caption opcional (ej. Escena: café en la mañana)"
          className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60"
        />
      </div>
    </motion.div>
  );
}

function PhotoSlot({ label, n, url, onFile, highlight }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  async function handleFile(f) {
    if (!f) return;
    setUploading(true);
    try { await onFile(f); } finally { setUploading(false); }
  }
  return (
    <div>
      <div className={`mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${highlight ? 'text-brand' : 'text-paper-dim'}`}>
        <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${highlight ? 'bg-brand text-on-accent' : 'bg-hair/10 text-paper-mute'}`}>{n}</span>
        {label}
      </div>
      <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
        className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
          url ? (highlight ? 'border-brand/40' : 'border-line') : 'border-line hover:border-brand/40 hover:bg-brand/[0.04]'
        } ${uploading ? 'opacity-60' : ''}`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center gap-2 text-paper-dim">
            <Upload size={20} />
            <span className="text-[11px] font-medium">Subir foto</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 text-white backdrop-blur-sm">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}
        {url && !uploading && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white opacity-0 transition-opacity hover:opacity-100">
            <Upload size={11} /> Reemplazar
          </div>
        )}
      </button>
      <input type="file" ref={ref} accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
}
