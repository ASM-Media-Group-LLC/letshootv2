'use client';

// Guided clone-photo setup. A full VISUAL shot list: each category shows real,
// distinct reference photos of Julia (from the library) so the creator sees
// exactly what to replicate, then uploads her own. Full body is shown clothed
// and in bikini (real head-to-toe Julia); tattoos/marks and nude are
// upload-only categories. Every example is clickable to view full size.
// Uploads go to the private 'lora' bucket, tagged with the category.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, Check, Lightbulb, Lock, X, Expand, ChevronDown, Images } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import { CLONE_EXAMPLES, CLONE_RECS, CLONE_POS, FULLBODY_CATS, MARKS_CATEGORY, NUDE_CATEGORY, LORA_MIN, LORA_MAX } from '@/lib/clone-shots';

const SHOTS = Object.keys(CLONE_EXAMPLES).map((key) => ({ key, rec: CLONE_RECS[key] || CLONE_EXAMPLES[key].length }));
const ALL_CATS = [...SHOTS.map((s) => s.key), MARKS_CATEGORY, NUDE_CATEGORY];

export default function CloneSetup({ userId, embedded = false }) {
  const { t } = usePortal();
  const [byCat, setByCat] = useState(null);
  const [busyCat, setBusyCat] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null); // src string when open

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

  async function addToCategory(cat, list) {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
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
    } catch (err) {
      setError(err.message || t.lora.failed);
    } finally {
      setBusyCat(''); setProgress('');
    }
  }

  // Every uploaded photo (all categories, marks and nude included) feeds the
  // LoRA training set: minimum 50, up to 80 for best quality.
  const total = byCat ? ALL_CATS.reduce((a, k) => a + (byCat[k]?.length || 0), 0) : 0;
  const pct = Math.min(100, Math.round((total / LORA_MAX) * 100));
  const minPct = (LORA_MIN / LORA_MAX) * 100;
  const missing = Math.max(0, LORA_MIN - total);

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

      <div className="space-y-4">
        {SHOTS.map((s) => (
          <CategoryBlock key={s.key} label={t.lora.shots[s.key].label} hint={t.lora.shots[s.key].hint} rec={s.rec}
            examples={CLONE_EXAMPLES[s.key]} pos={CLONE_POS[s.key]} contain={FULLBODY_CATS.includes(s.key)}
            photos={byCat?.[s.key] || []} busy={busyCat === s.key} progress={progress} t={t}
            onView={setLightbox} onFiles={(fl) => addToCategory(s.key, fl)} />
        ))}

        {/* Tattoos / distinctive marks — instructional, with a close-up example */}
        <UploadOnlyBlock info={t.lora.marks} examples={['julia-marca-1']} photos={byCat?.[MARKS_CATEGORY] || []}
          busy={busyCat === MARKS_CATEGORY} progress={progress} t={t} onView={setLightbox}
          onFiles={(fl) => addToCategory(MARKS_CATEGORY, fl)} />

        {/* Optional nude — upload only, private */}
        <UploadOnlyBlock info={t.lora.nude} priv photos={byCat?.[NUDE_CATEGORY] || []}
          busy={busyCat === NUDE_CATEGORY} progress={progress} t={t} onView={setLightbox}
          onFiles={(fl) => addToCategory(NUDE_CATEGORY, fl)} />
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

function AddButton({ busy, progress, label, onFiles }) {
  const ref = useRef(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60">
        {busy ? <><Loader2 size={14} className="animate-spin" /> {progress}</> : <><Upload size={14} /> {label}</>}
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

function Uploads({ photos, label, onView }) {
  if (!photos.length) return null;
  return (
    <>
      <p className="mb-2 mt-4 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
        <Check size={12} /> {label} · {photos.length}
      </p>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {photos.map((p) => <Thumb key={p.id} src={p.url} contain brand onView={onView} />)}
      </div>
    </>
  );
}

// Collapsible reference-examples section — a compact button that expands into
// the labelled grid, so the guide isn't a wall of photos.
function Examples({ examples, pos, contain, t, onView }) {
  const [open, setOpen] = useState(false);
  if (!examples?.length) return null;
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          open ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line text-paper-mute hover:border-brand/40 hover:text-paper'}`}>
        <Images size={13} /> {open ? t.lora.hideExamples : t.lora.seeExamples} ({examples.length})
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">{t.lora.examples}</p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {examples.map((img) => (
              <Thumb key={img} src={`/lib/${img}.jpg`} pos={pos} contain={contain} onView={onView} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryBlock({ label, hint, rec, examples, pos, contain, photos, busy, progress, t, onView, onFiles }) {
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
        <AddButton busy={busy} progress={progress} label={t.lora.addPhotos} onFiles={onFiles} />
      </div>

      <Examples examples={examples} pos={pos} contain={contain} t={t} onView={onView} />

      <Uploads photos={photos} label={t.lora.yours} onView={onView} />
    </div>
  );
}

// Upload category with no full example grid: tattoos/marks (optional close-up
// example) or private nude (no example).
function UploadOnlyBlock({ info, examples, priv, photos, busy, progress, t, onView, onFiles }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-ink-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-paper">
            {photos.length > 0 && <Check size={15} className="text-brand" />}
            {info.label}
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-paper-dim">{info.optional}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-paper-dim">{info.hint}</p>
        </div>
        <AddButton busy={busy} progress={progress} label={t.lora.addPhotos} onFiles={onFiles} />
      </div>

      <Examples examples={examples} pos="50% 40%" t={t} onView={onView} />

      {info.note && (
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-paper-dim">
          {priv && <Lock size={12} className="shrink-0" />} {info.note}
        </p>
      )}
      <Uploads photos={photos} label={t.lora.yours} onView={onView} />
    </div>
  );
}
