'use client';

// Guided clone-photo setup. Instead of a vague "0/80" blob, this walks the
// creator through a shot list (front, sides, expressions, half & full body)
// so she knows exactly what to upload for a high-quality LoRA. Each shot type
// uploads immediately to the private 'lora' bucket, tagged with its category.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, Check, Sparkles, User, Users, Smile, PersonStanding, Camera, Lightbulb } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';

// Recommended count per shot type (a good minimum — more is better).
const SHOTS = [
  { key: 'front', icon: User, rec: 5 },
  { key: 'left', icon: Camera, rec: 3 },
  { key: 'right', icon: Camera, rec: 3 },
  { key: 'expression', icon: Smile, rec: 5 },
  { key: 'half', icon: Users, rec: 6 },
  { key: 'body', icon: PersonStanding, rec: 8 },
];
const TOTAL_REC = SHOTS.reduce((a, s) => a + s.rec, 0);

export default function CloneSetup({ userId }) {
  const { t } = usePortal();
  const [byCat, setByCat] = useState(null); // { cat: [{id, url}] }
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
    let urls = {};
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
    <div className="rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-8">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/12 text-brand"><Sparkles size={18} /></span>
        <h2 className="font-display text-xl font-semibold text-paper">{t.lora.setupTitle}</h2>
      </div>
      <p className="mb-5 text-sm text-paper-mute">{t.lora.setupDesc}</p>

      {/* Overall progress */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-sm font-medium text-paper-mute">{total}/{TOTAL_REC}+ {t.lora.progress}</span>
      </div>

      {/* Shot-list */}
      <div className="space-y-3">
        {SHOTS.map((s) => {
          const shot = t.lora.shots[s.key];
          const photos = byCat?.[s.key] || [];
          const complete = photos.length >= s.rec;
          return <ShotRow key={s.key} icon={s.icon} label={shot.label} hint={shot.hint} rec={s.rec}
            photos={photos} complete={complete} busy={busyCat === s.key} progress={progress}
            addLabel={t.lora.addPhotos} recLabel={t.lora.recommended} doneLabel={t.lora.done}
            onFiles={(fl) => addToCategory(s.key, fl)} />;
        })}
      </div>

      {error && <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

      {/* Tips */}
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

function ShotRow({ icon: Icon, label, hint, rec, photos, complete, busy, progress, addLabel, recLabel, doneLabel, onFiles }) {
  const ref = useRef(null);
  return (
    <div className={`rounded-2xl border p-3.5 transition-colors ${complete ? 'border-brand/40 bg-brand/[0.05]' : 'border-line bg-ink-2'}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${complete ? 'bg-brand text-on-accent' : 'bg-hair/10 text-paper-dim'}`}>
          {complete ? <Check size={17} /> : <Icon size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-paper">{label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${complete ? 'bg-brand/15 text-brand' : 'bg-hair/10 text-paper-dim'}`}>
              {photos.length}/{rec} {complete ? doneLabel : recLabel}
            </span>
          </div>
          <p className="truncate text-xs text-paper-dim">{hint}</p>
        </div>
        <button type="button" onClick={() => ref.current?.click()} disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60">
          {busy ? <><Loader2 size={14} className="animate-spin" /> {progress}</> : <><Upload size={14} /> {addLabel}</>}
        </button>
        <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
      </div>

      {photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p) => (
            <div key={p.id} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
