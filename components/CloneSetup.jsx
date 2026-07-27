'use client';

// Guided clone-photo setup. A visual shot list — each shot type shows a real
// reference photo of the exact framing to capture (front, sides, expressions,
// half & full body) so the creator builds a high-quality LoRA. Each shot
// uploads immediately to the private 'lora' bucket, tagged with its category.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, Check, Lightbulb } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';

// Real reference photo per shot type (premium examples from the library, not
// childish diagrams). 'right' reuses the turned-head shot mirrored, to show the
// opposite side without a second near-identical asset.
const EXAMPLE = {
  front: '/lib/belleza-salon.jpg',
  left: '/lib/ducha-pelo.jpg',
  right: '/lib/ducha-pelo.jpg',
  expression: '/lib/emociones-feliz.jpg',
  half: '/lib/bar-coctel.jpg',
  body: '/lib/playa-playa.jpg',
};

// object-position per shot so the reference photo frames the face/body, not the
// top of the head (these are tall portraits).
const POS = {
  front: '50% 30%',
  left: '50% 34%',
  right: '50% 34%',
  expression: '50% 34%',
  half: '50% 26%',
  body: '50% 30%',
};

// Recommended count per shot type — sums to the LoRA target (Higgsfield needs
// a varied set; ~50 is the sweet spot, more is better).
const SHOTS = [
  { key: 'front', rec: 10 },
  { key: 'left', rec: 6 },
  { key: 'right', rec: 6 },
  { key: 'expression', rec: 8 },
  { key: 'half', rec: 8 },
  { key: 'body', rec: 12 },
];
const TOTAL_REC = SHOTS.reduce((a, s) => a + s.rec, 0); // 50

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
  const pct = Math.min(100, Math.round((total / TOTAL_REC) * 100));

  return (
    <div className={embedded ? '' : 'rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-8'}>
      {!embedded && <h2 className="mb-1 font-display text-xl font-semibold text-paper">{t.lora.setupTitle}</h2>}
      <p className="mb-5 text-sm leading-relaxed text-paper-mute">{t.lora.setupDesc}</p>

      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-sm font-medium text-paper-mute">{total}/{TOTAL_REC} {t.lora.progress}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHOTS.map((s) => {
          const shot = t.lora.shots[s.key];
          const photos = byCat?.[s.key] || [];
          const complete = photos.length >= s.rec;
          return (
            <ShotCard key={s.key} kind={s.key} label={shot.label} hint={shot.hint} rec={s.rec}
              example={EXAMPLE[s.key]} pos={POS[s.key]} exampleLabel={t.lora.example} mirror={s.key === 'right'}
              photos={photos} complete={complete} busy={busyCat === s.key} progress={progress}
              addLabel={t.lora.addPhotos} onFiles={(fl) => addToCategory(s.key, fl)} />
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

function ShotCard({ label, hint, rec, example, pos, exampleLabel, mirror, photos, complete, busy, progress, addLabel, onFiles }) {
  const ref = useRef(null);
  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors ${complete ? 'border-brand/40 bg-brand/[0.04]' : 'border-line bg-ink-2'}`}>
      {/* Reference photo */}
      <div className="relative h-36 overflow-hidden border-b border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={example} alt="" style={{ objectPosition: pos }} className={`h-full w-full object-cover ${mirror ? '-scale-x-100' : ''}`} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper backdrop-blur-sm">
          {exampleLabel}
        </span>
        <span className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${complete ? 'border-brand/50 bg-brand/20 text-paper' : 'border-white/20 bg-ink/60 text-paper'}`}>
          {photos.length}/{rec}
        </span>
        {photos.length > 0 && (
          <div className="absolute bottom-2 left-2 flex -space-x-2">
            {photos.slice(0, 4).map((p) => (
              <span key={p.id} className="h-6 w-6 overflow-hidden rounded-full border border-ink-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              </span>
            ))}
          </div>
        )}
      </div>
      {/* Info + add */}
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 font-medium text-paper">
          {complete && <Check size={14} className="text-brand" />} {label}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-paper-dim">{hint}</p>
        <button type="button" onClick={() => ref.current?.click()} disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60">
          {busy ? <><Loader2 size={14} className="animate-spin" /> {progress}</> : <><Upload size={14} /> {addLabel}</>}
        </button>
        <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
      </div>
    </div>
  );
}
