'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLang } from '@/app/providers';
import { SUPPORTED_LANGS, LANG_LABELS, LANG_SHORT } from '@/lib/i18n';

export default function LangToggle() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Idioma / Language"
        className="inline-flex items-center gap-1 rounded-full border border-line bg-hair/5 px-2.5 py-1.5 font-mono text-[11px] tracking-wider text-paper transition-colors hover:border-brand/60 hover:text-brand"
      >
        {LANG_SHORT[lang]}
        <ChevronDown
          size={13}
          aria-hidden
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-line bg-card/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          {SUPPORTED_LANGS.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={lang === code}
                onClick={() => {
                  setLang(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                  lang === code
                    ? 'bg-brand/15 text-brand'
                    : 'text-paper-mute hover:bg-hair/[0.06] hover:text-paper'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-6 font-mono text-[10px] opacity-60">{LANG_SHORT[code]}</span>
                  {LANG_LABELS[code]}
                </span>
                {lang === code && <Check size={14} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
