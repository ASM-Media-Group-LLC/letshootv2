'use client';

// Guided clone-photo setup. A full VISUAL shot list: each category shows real,
// distinct reference photos of Julia (from the library) so the creator sees
// exactly what to replicate, then uploads her own. Full body is shown clothed
// and in bikini (real head-to-toe Julia); tattoos/marks and nude are
// upload-only categories. Every example is clickable to view full size.
// Uploads go to the private 'lora' bucket, tagged with the category.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, Check, Lightbulb, Lock, X, Expand, ChevronDown, Images, Trash2, CheckSquare, Square } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import { CLONE_EXAMPLES, CLONE_RECS, CLONE_POS, FULLBODY_CATS, MARKS_CATEGORY, MARKS_EXAMPLES, MARKS_REC, NUDE_CATEGORY, LORA_MIN, LORA_MAX } from '@/lib/clone-shots';

const SHOTS = Object.keys(CLONE_EXAMPLES).map((key) => ({ key, rec: CLONE_RECS[key] || CLONE_EXAMPLES[key].length }));
const ALL_CATS = [...SHOTS.map((s) => s.key), MARKS_CATEGORY, NUDE_CATEGORY];

export default function CloneSetup({ userId, embedded = false }) {
  const { t } = usePortal();
  const [byCat, setByCat] = useState(null);
  const [busyCat, setBusyCat] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null); // src string when open
  // Batch-delete: `selectMode` shows checkboxes on every thumb; `selected` holds
  // the ids the user has picked. One "Delete N" button acts on all of them.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadPhotos = useCallback(async () => {
    const supabase = getSupabase();
    const { data: rows } = await supabase.from('lora_photos')
      .select('id, storage_path, category').eq('user_id', userId).order('created_at');
    const cats = {};
    ALL_CATS.forEach((k) => { cats[k] = []; });
    const paths = (rows || []).map((r) => r.storage_path);
    const urls = {};
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('lora').createSignedUrls(paths, 3600);
      (signed || []).forEach((s, i) => { if (s?.signedUrl) urls[paths[i]] = s.signedUrl; });
    }
    (rows || []).forEach((r) => {
      const cat = cats[r.category] ? r.category : 'front';
      cats[cat].push({ id: r.id, url: urls[r.storage_path] || '' });
    });
    setByCat(cats);
  }, [userId]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  async function addToCategory(cat, list, catMax) {
    let files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    // Corta el bloque por dos topes: (a) lo que le falta a la categoría para llegar
    // a su recomendado; (b) lo que le falta al total para llegar a LORA_MAX. Nunca
    // subimos de más — es más honesto avisar que aceptar y sorprender después.
    const catUsed = byCat?.[cat]?.length || 0;
    const catRemaining = Math.max(0, (catMax || Infinity) - catUsed);
    const totalUsed = byCat ? ALL_CATS.reduce((a, k) => a + (byCat[k]?.length || 0), 0) : 0;
    const totalRemaining = Math.max(0, LORA_MAX - totalUsed);
    const allowed = Math.min(files.length, catRemaining, totalRemaining);
    if (allowed <= 0) {
      setError(totalRemaining <= 0
        ? `Llegaste al máximo de ${LORA_MAX} fotos. Borra alguna para agregar otra.`
        : 'Esta categoría ya está llena. Borra alguna para agregar otra.');
      return;
    }
    const dropped = files.length - allowed;
    files = files.slice(0, allowed);
    setBusyCat(cat); setError('');
    const supabase = getSupabase();
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`${i + 1}/${files.length}`);
        const file = files[i];
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('lora').upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from('lora_photos').insert({ user_id: userId, storage_path: path, category: cat });
        if (dbErr) throw dbErr;
      }
      await supabase.from('profiles').update({ lora_status: 'pending' }).eq('id', userId).eq('lora_status', 'none');
      await loadPhotos();
      if (dropped > 0) setError(`Se subieron ${allowed}. ${dropped} no cabía${dropped === 1 ? '' : 'n'} (llegaste al tope).`);
    } catch (err) {
      console.error(err);
      setError(t.lora.failed);
    } finally {
      setBusyCat(''); setProgress('');
    }
  }

  // Borra una foto (o varias, batch). Quita la fila de lora_photos y el archivo
  // del bucket 'lora'. RLS ya limita a la dueña + staff.
  async function deletePhotos(ids) {
    if (!ids?.length) return;
    setDeleting(true); setError('');
    const supabase = getSupabase();
    try {
      // Necesitamos los storage_path para borrar el archivo también.
      const { data: rows } = await supabase.from('lora_photos').select('id, storage_path').in('id', ids);
      const paths = (rows || []).map((r) => r.storage_path).filter(Boolean);
      if (paths.length) await supabase.storage.from('lora').remove(paths);
      const { error: delErr } = await supabase.from('lora_photos').delete().in('id', ids);
      if (delErr) throw delErr;
      setSelected(new Set());
      setSelectMode(false);
      await loadPhotos();
    } catch (err) {
      console.error(err);
      setError(t.lora.deleteFailed || 'No se pudo borrar. Reintenta.');
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Every uploaded photo (all categories, marks and nude included) feeds the
  // LoRA training set: minimum 50, up to 80 for best quality.
  const total = byCat ? ALL_CATS.reduce((a, k) => a + (byCat[k]?.length || 0), 0) : 0;
  const pct = Math.min(100, Math.round((total / LORA_MAX) * 100));
  const minPct = (LORA_MIN / LORA_MAX) * 100;
  const missing = Math.max(0, LORA_MIN - total);
  const reachedMax = total >= LORA_MAX;

  return (
    <div className={embedded ? '' : 'rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-8'}>
      {!embedded && <h2 className="mb-1 font-display text-xl font-semibold text-paper">{t.lora.setupTitle}</h2>}
      <p className="mb-5 text-sm leading-relaxed text-paper-mute">{t.lora.setupDesc}</p>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${total >= LORA_MIN ? 'text-brand' : 'text-paper'}`}>{total} {t.lora.progress}</span>
          <span className="text-xs font-medium text-paper-dim">{t.lora.minMax}</span>
        </div>
        <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          {/* marker at the 50-photo minimum */}
          <span className="absolute inset-y-0 w-0.5 bg-paper/60" style={{ left: `${minPct}%` }} aria-hidden />
        </div>
        <p className={`mt-1.5 text-xs ${total >= LORA_MIN ? 'font-medium text-brand' : 'text-paper-mute'}`}>
          {total >= LORA_MIN ? t.lora.minReached : t.lora.minMissing(missing)}
        </p>
      </div>

      {/* Barra de acciones: seleccionar para borrar (una o en batch). Solo aparece
          cuando ya hay al menos una foto subida. */}
      {total > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-ink-2 p-3">
          <div className="text-xs text-paper-mute">
            {selectMode
              ? (selected.size === 0
                  ? (t.lora.selectHint || 'Toca las fotos que quieras borrar.')
                  : (t.lora.selectedN ? t.lora.selectedN(selected.size) : `${selected.size} seleccionadas`))
              : (t.lora.manageHint || 'Puedes borrar cualquier foto que subiste.')}
          </div>
          <div className="flex items-center gap-2">
            {selectMode && selected.size > 0 && (
              <button type="button" disabled={deleting} onClick={() => deletePhotos([...selected])}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {t.lora.deleteN ? t.lora.deleteN(selected.size) : `Borrar ${selected.size}`}
              </button>
            )}
            <button type="button" onClick={() => { setSelectMode((m) => !m); setSelected(new Set()); }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectMode ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line text-paper-mute hover:text-paper'}`}>
              {selectMode ? <><X size={13} /> {t.lora.cancelSelect || 'Cancelar'}</> : <><CheckSquare size={13} /> {t.lora.selectToDelete || 'Seleccionar para borrar'}</>}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {SHOTS.map((s) => (
          <CategoryBlock key={s.key} label={t.lora.shots[s.key].label} hint={t.lora.shots[s.key].hint} rec={s.rec}
            examples={CLONE_EXAMPLES[s.key]} pos={CLONE_POS[s.key]} contain={FULLBODY_CATS.includes(s.key)}
            photos={byCat?.[s.key] || []} busy={busyCat === s.key} progress={progress} t={t}
            onView={setLightbox} onFiles={(fl) => addToCategory(s.key, fl, s.rec)} reachedMax={reachedMax}
            selectMode={selectMode} selected={selected} onToggle={toggleSelected} onDelete={(id) => deletePhotos([id])} />
        ))}

        {/* Tattoos / distinctive marks — 10 real close-up examples, rec 10 */}
        <UploadOnlyBlock info={t.lora.marks} examples={MARKS_EXAMPLES} rec={MARKS_REC}
          photos={byCat?.[MARKS_CATEGORY] || []}
          busy={busyCat === MARKS_CATEGORY} progress={progress} t={t} onView={setLightbox}
          onFiles={(fl) => addToCategory(MARKS_CATEGORY, fl, MARKS_REC)} reachedMax={reachedMax}
          selectMode={selectMode} selected={selected} onToggle={toggleSelected} onDelete={(id) => deletePhotos([id])} />

        {/* Optional nude — upload only, private (sin tope específico, el global manda) */}
        <UploadOnlyBlock info={t.lora.nude} priv photos={byCat?.[NUDE_CATEGORY] || []}
          busy={busyCat === NUDE_CATEGORY} progress={progress} t={t} onView={setLightbox}
          onFiles={(fl) => addToCategory(NUDE_CATEGORY, fl, LORA_MAX)} reachedMax={reachedMax}
          selectMode={selectMode} selected={selected} onToggle={toggleSelected} onDelete={(id) => deletePhotos([id])} />
      </div>

      {error && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

      <div className="mt-6 rounded-2xl border border-line bg-ink-2 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-paper">
          <Lightbulb size={15} className="text-brand" /> {t.lora.tips}
        </div>
        <ul className="space-y-1.5 text-xs text-paper-mute">
          {t.lora.tipList.map((tip, i) => (
            <li key={i} className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-brand" /> {tip}</li>
          ))}
        </ul>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-line bg-ink-2 text-paper hover:border-brand/50">
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-glow" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function AddButton({ busy, progress, label, onFiles, disabled, fullLabel }) {
  const ref = useRef(null);
  const off = disabled || busy;
  return (
    <>
      <button type="button" onClick={() => !off && ref.current?.click()} disabled={off} aria-disabled={off}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-paper-dim disabled:opacity-70">
        {busy ? <><Loader2 size={14} className="animate-spin" /> {progress}</>
          : disabled ? <><Check size={14} /> {fullLabel || 'Completo'}</>
          : <><Upload size={14} /> {label}</>}
      </button>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
    </>
  );
}

// A clickable reference/upload thumbnail. `contain` shows the whole figure.
function Thumb({ src, pos, contain, brand, onView }) {
  return (
    <button type="button" onClick={() => onView(src)}
      className={`group relative aspect-[3/4] overflow-hidden rounded-md border ${brand ? 'border-brand/40' : 'border-line'} bg-ink-2`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" style={contain ? undefined : { objectPosition: pos }}
        className={`h-full w-full ${contain ? 'object-contain' : 'object-cover'}`} />
      <span className="absolute inset-0 grid place-items-center bg-ink/0 opacity-0 transition-opacity group-hover:bg-ink/40 group-hover:opacity-100">
        <Expand size={16} className="text-paper" />
      </span>
    </button>
  );
}

function Uploads({ photos, label, onView, selectMode, selected, onToggle, onDelete }) {
  if (!photos.length) return null;
  return (
    <>
      <p className="mb-2 mt-4 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
        <Check size={12} /> {label} · {photos.length}
      </p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {photos.map((p) => (
          <UploadThumb key={p.id} p={p} onView={onView}
            selectMode={selectMode} on={!!selected?.has?.(p.id)}
            onToggle={() => onToggle?.(p.id)} onDelete={() => onDelete?.(p.id)} />
        ))}
      </div>
    </>
  );
}

// Thumb propia (con la que subió la creadora). En modo normal muestra un ícono
// de borrar al pasar el mouse; en modo selección se comporta como checkbox.
function UploadThumb({ p, onView, selectMode, on, onToggle, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  if (selectMode) {
    return (
      <button type="button" onClick={onToggle}
        className={`group relative aspect-[3/4] overflow-hidden rounded-md border transition-colors ${on ? 'border-brand ring-2 ring-brand/50' : 'border-brand/40 hover:border-brand'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.url} alt="" loading="lazy" className={`h-full w-full object-contain transition-opacity ${on ? 'opacity-60' : ''}`} />
        <span className={`absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md border ${on ? 'border-brand bg-brand text-on-accent' : 'border-line bg-ink/80 text-paper-mute'}`}>
          {on ? <Check size={12} /> : <Square size={12} />}
        </span>
      </button>
    );
  }
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-md border border-brand/40 bg-ink-2">
      <button type="button" onClick={() => onView(p.url)} className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.url} alt="" loading="lazy" className="h-full w-full object-contain" />
        <span className="absolute inset-0 grid place-items-center bg-ink/0 opacity-0 transition-opacity group-hover:bg-ink/40 group-hover:opacity-100">
          <Expand size={16} className="text-paper" />
        </span>
      </button>
      {/* Trash siempre visible en móvil (no hay hover); en desktop aparece al pasar. */}
      {!confirm ? (
        <button type="button" aria-label="Borrar" onClick={(e) => { e.stopPropagation(); setConfirm(true); }}
          className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md border border-line bg-ink/80 text-paper-mute opacity-100 transition-opacity hover:border-red-500/60 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100">
          <Trash2 size={13} />
        </button>
      ) : (
        <div className="absolute inset-x-1 top-1 flex items-center gap-1 rounded-md border border-red-500/40 bg-ink/95 p-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex-1 rounded bg-red-500/90 px-2 py-1 text-[10px] font-bold text-white">Borrar</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setConfirm(false); }}
            className="rounded border border-line px-2 py-1 text-[10px] text-paper-mute">Cancelar</button>
        </div>
      )}
    </div>
  );
}

// Collapsible reference-examples section — closed by default; the expand
// button previews the first photos as a stacked peek so it invites the tap.
function Examples({ examples, pos, contain, t, onView }) {
  const [open, setOpen] = useState(false);
  if (!examples?.length) return null;
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen(!open)}
        className={`flex items-center gap-3 rounded-xl border py-1.5 pl-1.5 pr-3.5 text-xs font-semibold transition-all ${
          open
            ? 'border-brand/50 bg-brand/10 text-brand'
            : 'border-line bg-ink text-paper-mute hover:border-brand/40 hover:bg-brand/[0.04] hover:text-paper'}`}>
        <span className="flex -space-x-2.5">
          {examples.slice(0, 3).map((img) => (
            <span key={img} className="h-8 w-8 overflow-hidden rounded-full border-2 border-ink-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/lib/${img}.jpg`} alt="" loading="lazy" style={{ objectPosition: pos }} className="h-full w-full object-cover" />
            </span>
          ))}
        </span>
        <span className="flex items-center gap-1.5">
          {open ? t.lora.hideExamples : t.lora.seeExamples}
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${open ? 'bg-brand/20 text-brand' : 'bg-hair/[0.08] text-paper-dim'}`}>{examples.length}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <>
          <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">{t.lora.examples}</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {examples.map((img) => (
              <Thumb key={img} src={`/lib/${img}.jpg`} pos={pos} contain={contain} onView={onView} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryBlock({ label, hint, rec, examples, pos, contain, photos, busy, progress, t, onView, onFiles, reachedMax, selectMode, selected, onToggle, onDelete }) {
  const complete = photos.length >= rec;
  return (
    <div className={`rounded-2xl border p-4 transition-colors sm:p-5 ${complete ? 'border-brand/40 bg-brand/[0.04]' : 'border-line bg-ink-2'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-paper">
            {complete && <Check size={15} className="text-brand" />}
            {label}
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${complete ? 'border-brand/50 text-brand' : 'border-line text-paper-dim'}`}>
              {photos.length}/{rec}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-paper-dim">{hint}</p>
        </div>
        <AddButton busy={busy} progress={progress} label={t.lora.addPhotos} onFiles={onFiles}
          disabled={complete || reachedMax} fullLabel={complete ? 'Completo' : 'Tope alcanzado'} />
      </div>

      <Examples examples={examples} pos={pos} contain={contain} t={t} onView={onView} />

      <Uploads photos={photos} label={t.lora.yours} onView={onView}
        selectMode={selectMode} selected={selected} onToggle={onToggle} onDelete={onDelete} />
    </div>
  );
}

// Upload category with an optional example grid + optional target count:
// tattoos/marks (10 close-up examples, rec 10) or private nude (no examples).
function UploadOnlyBlock({ info, examples, rec, priv, photos, busy, progress, t, onView, onFiles, reachedMax, selectMode, selected, onToggle, onDelete }) {
  const complete = rec ? photos.length >= rec : false;
  return (
    <div className="rounded-2xl border border-dashed border-line bg-ink-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-paper">
            {photos.length > 0 && <Check size={15} className="text-brand" />}
            {info.label}
            {rec ? (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${photos.length >= rec ? 'border-brand/50 text-brand' : 'border-line text-paper-dim'}`}>
                {photos.length}/{rec}
              </span>
            ) : null}
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-paper-dim">{info.optional}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-paper-dim">{info.hint}</p>
        </div>
        <AddButton busy={busy} progress={progress} label={t.lora.addPhotos} onFiles={onFiles}
          disabled={complete || reachedMax} fullLabel={complete ? 'Completo' : 'Tope alcanzado'} />
      </div>

      <Examples examples={examples} pos="50% 40%" t={t} onView={onView} />

      {info.note && (
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-paper-dim">
          {priv && <Lock size={12} className="shrink-0" />} {info.note}
        </p>
      )}
      <Uploads photos={photos} label={t.lora.yours} onView={onView}
        selectMode={selectMode} selected={selected} onToggle={onToggle} onDelete={onDelete} />
    </div>
  );
}
