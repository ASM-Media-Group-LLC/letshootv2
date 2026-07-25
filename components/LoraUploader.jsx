'use client';

// Optional, non-blocking LoRA clone-set uploader.
// Photos can be added at ANY point of the journey (before or after payment) —
// each file uploads immediately to the private 'lora' bucket and is recorded
// in lora_photos. Used in /onboarding (optional card) and /panel.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Sparkles, Loader2, Check } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';

const LORA_TARGET = 80; // Higgsfield clone-set goal

export default function LoraUploader({ userId, compact = false }) {
  const ref = useRef(null);
  const [count, setCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [justDone, setJustDone] = useState(false);

  const loadCount = useCallback(async () => {
    const { count: c } = await getSupabase()
      .from('lora_photos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    setCount(c ?? 0);
  }, [userId]);

  useEffect(() => { loadCount(); }, [loadCount]);

  async function addFiles(list) {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setBusy(true); setError(''); setJustDone(false);
    const supabase = getSupabase();
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`${i + 1}/${files.length}`);
        const file = files[i];
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('lora').upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from('lora_photos').insert({ user_id: userId, storage_path: path });
        if (dbErr) throw dbErr;
      }
      // First photos flip the profile flag so the team knows a set is coming in.
      await supabase.from('profiles').update({ lora_status: 'pending' }).eq('id', userId).eq('lora_status', 'none');
      setJustDone(true);
      await loadCount();
    } catch (err) {
      setError(err.message || 'No se pudieron subir las fotos.');
    } finally {
      setBusy(false); setProgress('');
      if (ref.current) ref.current.value = '';
    }
  }

  const n = count ?? 0;
  const pct = Math.min(100, Math.round((n / LORA_TARGET) * 100));

  return (
    <div className={`rounded-2xl border border-line bg-card ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display font-semibold text-paper">
          <Sparkles size={17} className="text-brand" /> Fotos para tu clon
          <span className="rounded-full bg-hair/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-paper-dim">Opcional · cuando quieras</span>
        </div>
        <span className="text-sm text-paper-mute">{count === null ? '…' : `${n} / ${LORA_TARGET}`}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-paper-dim">
          Rostro desde varios ángulos, cuerpo completo, distintas luces y expresiones. Puedes subirlas ahora o después — no detiene tu registro.
        </p>
      )}
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/10 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60">
        {busy ? <><Loader2 size={16} className="animate-spin" /> Subiendo {progress}…</>
          : justDone ? <><Check size={16} /> ¡Fotos guardadas! Agregar más</>
          : <><Upload size={16} /> Subir fotos</>}
      </button>
      {error && <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
    </div>
  );
}
