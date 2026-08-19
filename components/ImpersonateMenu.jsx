'use client';

// «Ver como…» — dropdown reutilizable con lista buscable de creadoras. Un clic
// abre /panel?as=<id> en otra pestaña (impersonate read-only). Se usa tanto en
// /admin como en /trabajo para que todo el equipo interno (admin + supervisor)
// pueda ver el panel de una creadora tal como ella lo ve.
import { useEffect, useRef, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import Avatar from '@/components/Avatar';

export default function ImpersonateMenu({ creators }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const list = (creators || []).filter((c) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return `${c.full_name || ''} ${c.handle || ''} ${c.email || ''}`.toLowerCase().includes(t);
  }).slice(0, 12);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-paper-mute transition-colors hover:border-brand/40 hover:text-brand sm:px-3.5">
        <Eye size={14} /> <span className="hidden sm:inline">Ver como…</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-ink shadow-glow-sm">
          <div className="border-b border-line p-2.5">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar creadora…"
                className="w-full rounded-lg border border-line bg-ink-2 py-1.5 pl-7 pr-2 text-xs text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            </div>
            <p className="mt-1.5 text-[10px] text-paper-dim">Abre su panel en otra pestaña, tal como ella lo ve.</p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {list.length === 0 && <p className="px-3 py-4 text-center text-xs text-paper-dim">Ninguna coincide.</p>}
            {list.map((c) => (
              <button key={c.id}
                onClick={() => { window.open(`/panel?as=${c.id}`, '_blank', 'noopener'); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-hair/[0.06]">
                <Avatar src={c.avatar_url} name={c.full_name} size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-paper">{c.full_name || 'Sin nombre'}</span>
                  <span className="block truncate text-[10px] text-paper-dim">{c.handle ? `@${c.handle}` : c.email}</span>
                </span>
                <Eye size={12} className="shrink-0 text-paper-dim" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
