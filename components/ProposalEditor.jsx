'use client';

// Editor de la propuesta personalizada de una CC. Usado desde /trabajo (staff
// con capability 'content') y desde /admin (dueño). Carga la propuesta de esa
// CC (o la crea si no existe), deja subir 3-8 trípticos con las 3 fotos
// (Inspiración / Foto real / Resultado), reordenar, escribir intro, y
// publicar. Publicar = la CC ya lo ve en su cuenta.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Plus, X, ArrowUp, ArrowDown, Loader2, Eye, CheckCircle2, ArrowLeft, Save } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import ProposalDeck from '@/components/ProposalDeck';

const MAX_SLIDES = 8;

export default function ProposalEditor({ creator, onClose, flash }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [proposal, setProposal] = useState(null); // { id, status, intro, published_at }
  const [slides, setSlides] = useState([]);       // [{ id, position, inspiration_url, real_url, ai_url, caption }]
  const [intro, setIntro] = useState('');

  const load = useCallback(async () => {
    const supabase = getSupabase();
    // Buscar o crear propuesta para esta CC.
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

  async function saveIntro() {
    if (!proposal) return;
    setSaving(true);
    const { error } = await getSupabase().from('creator_proposals').update({ intro: intro.trim() || null, updated_at: new Date().toISOString() }).eq('id', proposal.id);
    setSaving(false);
    if (error) { flash && flash('Error al guardar intro: ' + error.message); return; }
    setProposal((p) => ({ ...p, intro: intro.trim() || null }));
    flash && flash('Intro guardada');
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
    // Persistir orden — un update por slide movido.
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
    if (slides.length < 3) { flash && flash('Sube al menos 3 trípticos antes de publicar.'); return; }
    const incomplete = slides.filter((s) => !s.inspiration_url || !s.real_url || !s.ai_url).length;
    if (incomplete > 0) {
      if (!window.confirm(`Hay ${incomplete} tríptico${incomplete === 1 ? '' : 's'} con fotos faltantes. ¿Publicar de todos modos?`)) return;
    }
    setPublishing(true);
    // Guardar intro por si cambió.
    await getSupabase().from('creator_proposals').update({
      intro: intro.trim() || null,
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', proposal.id);
    setPublishing(false);
    setProposal((p) => ({ ...p, status: 'published', published_at: new Date().toISOString(), intro: intro.trim() || null }));
    flash && flash(`Propuesta publicada — ${creator.full_name || 'la creadora'} ya la ve en su cuenta.`);
  }

  async function unpublish() {
    if (!proposal) return;
    if (!window.confirm('¿Volver a borrador? La creadora deja de verla hasta que la publiques de nuevo.')) return;
    await getSupabase().from('creator_proposals').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', proposal.id);
    setProposal((p) => ({ ...p, status: 'draft' }));
    flash && flash('Propuesta en borrador');
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center text-paper-dim">Cargando propuesta…</div>;

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

  return (
    <div className="mt-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-paper-mute transition-colors hover:text-paper">
          <ArrowLeft size={15} /> Volver
        </button>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            published ? 'border-brand/40 bg-brand/10 text-brand' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          }`}>
            {published ? <><CheckCircle2 size={11} /> Publicada</> : 'Borrador'}
          </span>
          <button onClick={() => setPreview(true)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-paper-mute hover:border-brand/40 hover:text-brand">
            <Eye size={13} /> Preview
          </button>
          {published ? (
            <button onClick={unpublish} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-paper-mute hover:border-amber-500/40 hover:text-amber-300">Volver a borrador</button>
          ) : (
            <button onClick={publish} disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-on-accent shadow-glow-sm hover:brightness-110 disabled:opacity-60">
              {publishing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Publicar
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-5">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Propuesta para</p>
        <p className="font-display text-xl font-semibold text-paper">{creator.stage_name || creator.full_name || 'Creadora'}</p>
        <p className="mt-0.5 text-xs text-paper-dim">Se muestra a pantalla completa dentro de su cuenta cuando entra sin haber pagado.</p>
      </div>

      {/* Intro */}
      <div className="mt-4 rounded-2xl border border-line bg-card p-5">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Intro personalizada (opcional)</label>
        <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} placeholder="A partir de tus fotos reales construimos un modelo idéntico a ti…"
          className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
        <div className="mt-2 flex justify-end">
          <button onClick={saveIntro} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-paper-mute hover:border-brand/40 hover:text-brand disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar intro
          </button>
        </div>
      </div>

      {/* Slides */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Trípticos · {slides.length} / {MAX_SLIDES}</p>
        <button onClick={addSlide} disabled={slides.length >= MAX_SLIDES}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 disabled:opacity-40">
          <Plus size={13} /> Agregar tríptico
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {slides.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-paper-dim">
            Aún no hay trípticos. Agrega el primero — cada uno lleva Inspiración + Foto real + Resultado IA.
          </p>
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
      </div>
    </div>
  );
}

function SlideEditor({ slide, index, total, onDelete, onMove, onUpload, onCaption }) {
  const [caption, setCaption] = useState(slide.caption || '');
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-paper">Tríptico {index + 1}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line text-paper-mute hover:text-paper disabled:opacity-30" title="Subir">
            <ArrowUp size={12} />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line text-paper-mute hover:text-paper disabled:opacity-30" title="Bajar">
            <ArrowDown size={12} />
          </button>
          <button onClick={onDelete}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line text-paper-mute hover:border-rose-500/50 hover:text-rose-300" title="Borrar">
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <PhotoSlot label="1 · Inspiración" url={slide.inspiration_url} onFile={(f) => onUpload('inspiration', f)} />
        <PhotoSlot label="2 · Foto real" url={slide.real_url} onFile={(f) => onUpload('real', f)} />
        <PhotoSlot label="3 · Resultado IA" url={slide.ai_url} onFile={(f) => onUpload('ai', f)} highlight />
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
    </div>
  );
}

function PhotoSlot({ label, url, onFile, highlight }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  async function handleFile(f) {
    if (!f) return;
    setUploading(true);
    try { await onFile(f); } finally { setUploading(false); }
  }
  return (
    <div>
      <p className={`mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] ${highlight ? 'text-brand' : 'text-paper-dim'}`}>{label}</p>
      <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
        className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          url ? 'border-brand/40' : 'border-line hover:border-brand/40'
        } ${uploading ? 'opacity-60' : ''}`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center gap-1 text-paper-dim">
            <Upload size={18} />
            <span className="text-[11px]">Subir</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-black/50 text-white"><Loader2 size={20} className="animate-spin" /></div>
        )}
      </button>
      <input type="file" ref={ref} accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
}
