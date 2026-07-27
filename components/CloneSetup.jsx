'use client';

// Guided clone-photo setup. A full VISUAL shot list: every one of the 60 shots
// shows a real, distinct reference photo of the model (grouped by category) so
// the creator sees exactly the photo to replicate — then uploads her own per
// category. Uploads go to the private 'lora' bucket, tagged with the category.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, Check, Lightbulb } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import { CLONE_EXAMPLES, CLONE_POS, CLONE_TOTAL } from '@/lib/clone-shots';

const SHOTS = Object.entries(CLONE_EXAMPLES).map(([key, imgs]) => ({ key, rec: imgs.length }));

export default function CloneSetup({ userId, embedded = false }) {
  const { t } = usePortal();
  const [byCat, setByCat] = useState(null);
  const [busyCat, setBusyCat] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const loadPhotos = useCallback(async () => {
    const supabase = getSupabase();
    const { data: rows } = await supabase.from('lora_photos')
      .select('id, storage_path, category').eq('user_id', userId).order('created_at');
    const cats = {};
    SHOTS.forEach((s) => { cats[s.key] = []; });
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

  const total = byCat ? Object.values(byCat).reduce((a, arr) => a + arr.length, 0) : 0;
  const pct = Math.min(100, Math.round((total / CLONE_TOTAL) * 100));

  return (
    <div className={embedded ? '' : 'rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-8'}>
      {!embedded && <h2 className="mb-1 font-display text-xl font-semibold text-paper">{t.lora.setupTitle}</h2>}
      <p className="mb-5 text-sm leading-relaxed text-paper-mute">{t.lora.setupDesc}</p>

      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-sm font-medium text-paper-mute">{total}/{CLONE_TOTAL} {t.lora.progress}</span>
      </div>

      <div className="space-y-4">
        {SHOTS.map((s) => {
          const shot = t.lora.shots[s.key];
          const photos = byCat?.[s.key] || [];
          return (
            <CategoryBlock key={s.key} kind={s.key} label={shot.label} hint={shot.hint} rec={s.rec}
              examples={CLONE_EXAMPLES[s.key]} pos={CLONE_POS[s.key]} photos={photos}
              busy={busyCat === s.key} progress={progress} t={t}
              onFiles={(fl) => addToCategory(s.key, fl)} />
          );
        })}
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
    </div>
  );
}

function CategoryBlock({ label, hint, rec, examples, pos, photos, busy, progress, t, onFiles }) {
  const ref = useRef(null);
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
        <button type="button" onClick={() => ref.current?.click()} disabled={busy}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60">
          {busy ? <><Loader2 size={14} className="animate-spin" /> {progress}</> : <><Upload size={14} /> {t.lora.addPhotos}</>}
        </button>
        <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
      </div>

      {/* Reference examples — one real photo per shot to replicate */}
      <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">{t.lora.examples}</p>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {examples.map((img) => (
          <div key={img} className="relative aspect-[3/4] overflow-hidden rounded-md border border-line bg-hair/[0.04]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/lib/${img}.jpg`} alt="" loading="lazy" style={{ objectPosition: pos }} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      {/* Creator's own uploads for this category */}
      {photos.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wide text-brand">{t.lora.yours} · {photos.length}</p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-md border border-brand/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
