'use client';

// ─────────────────────────────────────────────────────────────────────────
// PortalHeader — top bar unificado para TODO el portal interno
// (/admin, /trabajo, /agencia, /panel, /agente).
//
// Estructura:
//   [Logo · ← Volver · chip de sección]        [extras · switch · CUENTA ▾]
//
// El menú de CUENTA concentra todo lo que antes flotaba suelto:
//   · Mi cuenta (/cuenta)
//   · Idioma — selector inline (los 7 del sitio; el portal traduce 5)
//   · Tema — claro/oscuro
//   · Link de cambio de área (ej. Trabajo ↔ Admin) — prop `switchTo`
//   · Salir
// «Ver como…» u otros controles específicos entran por la prop `extras`.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, LogOut, User, Globe, Moon, Sun, Settings, Check, ArrowLeftRight,
} from 'lucide-react';
import Logo from '@/components/Logo';
import Avatar from '@/components/Avatar';
import { useLang, useTheme } from '@/app/providers';
import { SUPPORTED_LANGS, LANG_LABELS } from '@/lib/i18n';
import { signOut } from '@/lib/supabase/session';

// Labels por defecto en español (staff). Las páginas traducidas (p. ej.
// /panel de la creadora) pasan `labels` desde su diccionario.
const DEFAULT_LABELS = {
  back: 'Volver',
  account: 'Mi cuenta',
  language: 'Idioma',
  themeDark: 'Tema oscuro',
  themeLight: 'Tema claro',
  change: 'cambiar',
  goTo: 'Ir a',
  logout: 'Salir',
};

export default function PortalHeader({
  section,            // texto del chip: 'Administración', 'Trabajo', …
  sectionIcon: SectionIcon, // ícono lucide opcional para el chip
  me,                 // { full_name, avatar_url }
  roleLabel,          // 'Dueño · Administración', 'Agencia', … (dinámico, no hardcodear)
  switchTo,           // { href, label } — link de cambio de área
  extras,             // nodo extra (ej. <ImpersonateMenu/>)
  backHref,           // si existe, muestra ← Volver a esa ruta
  maxW = 'max-w-5xl', // ancho del contenedor (igual al de la página)
  accountHref = '/cuenta',
  labels: labelsProp, // override traducible (páginas de creadora)
}) {
  const labels = { ...DEFAULT_LABELS, ...(labelsProp || {}) };
  const router = useRouter();
  const { lang, setLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/85 backdrop-blur">
      <div className={`mx-auto flex ${maxW} items-center justify-between gap-3 px-5 py-3`}>
        {/* ── Izquierda: logo + volver + sección ── */}
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="LetShoot" className="flex shrink-0 items-center transition-opacity hover:opacity-80">
            <Logo size="sm" />
          </Link>
          {backHref && (
            <button
              onClick={() => (typeof window !== 'undefined' && window.history.length > 1 ? router.back() : router.push(backHref))}
              className="hidden items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-paper sm:inline-flex"
            >
              <ChevronDown size={13} className="rotate-90" /> {labels.back}
            </button>
          )}
          {section && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
              {SectionIcon && <SectionIcon size={12} />} {section}
            </span>
          )}
        </div>

        {/* ── Derecha: extras + switch de área + cuenta ── */}
        <div className="flex shrink-0 items-center gap-2">
          {extras}
          {switchTo && (
            <a
              href={switchTo.href}
              className="btn3d-ghost hidden items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-semibold sm:inline-flex"
            >
              <ArrowLeftRight size={14} /> {switchTo.label}
            </a>
          )}

          {/* CUENTA ▾ */}
          <div ref={ref} className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={open}
              className={`card3d flex items-center gap-2 rounded-2xl border bg-card py-1 pl-1 pr-2.5 transition-colors ${
                open ? 'border-brand/50 card3d-active' : 'border-line hover:border-brand/30'
              }`}
            >
              <Avatar src={me?.avatar_url} name={me?.full_name} size="xs" />
              <span className="hidden text-left leading-tight md:block">
                <span className="block max-w-[140px] truncate text-xs font-semibold text-paper">{me?.full_name || 'Cuenta'}</span>
                {roleLabel && <span className="block max-w-[140px] truncate text-[10px] text-paper-dim">{roleLabel}</span>}
              </span>
              <ChevronDown size={14} className={`text-paper-dim transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div
                role="menu"
                className="card3d absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-2xl border border-line bg-card shadow-soft"
              >
                {/* Cabecera del menú */}
                <div className="flex items-center gap-3 border-b border-line bg-ink-2/50 px-4 py-3">
                  <Avatar src={me?.avatar_url} name={me?.full_name} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-paper">{me?.full_name}</div>
                    {roleLabel && <div className="truncate text-[11px] text-paper-dim">{roleLabel}</div>}
                  </div>
                </div>

                {/* Mi cuenta */}
                <Link
                  href={accountHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-paper transition-colors hover:bg-brand/[0.07]"
                >
                  <User size={15} className="text-paper-mute" /> {labels.account}
                </Link>

                {/* Idioma */}
                <div className="border-t border-line px-4 py-2.5">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-dim">
                    <Globe size={11} /> {labels.language}
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {SUPPORTED_LANGS.map((l) => (
                      <button
                        key={l}
                        onClick={() => setLang(l)}
                        className={`rounded-lg px-1.5 py-1.5 text-center font-mono text-[11px] font-semibold uppercase transition-all ${
                          lang === l
                            ? 'bg-brand text-on-accent shadow-glow-sm'
                            : 'text-paper-mute hover:bg-hair/[0.07] hover:text-paper'
                        }`}
                        title={LANG_LABELS[l]}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tema */}
                <button
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-between border-t border-line px-4 py-2.5 text-sm text-paper transition-colors hover:bg-brand/[0.07]"
                >
                  <span className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon size={15} className="text-paper-mute" /> : <Sun size={15} className="text-paper-mute" />}
                    {theme === 'dark' ? labels.themeDark : labels.themeLight}
                  </span>
                  <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase text-paper-dim">
                    {labels.change}
                  </span>
                </button>

                {/* Switch de área (visible también en mobile desde el menú) */}
                {switchTo && (
                  <a
                    href={switchTo.href}
                    className="flex items-center gap-3 border-t border-line px-4 py-2.5 text-sm text-brand transition-colors hover:bg-brand/[0.07]"
                  >
                    <ArrowLeftRight size={15} /> {labels.goTo} {switchTo.label}
                  </a>
                )}

                {/* Salir */}
                <button
                  onClick={async () => { await signOut(); router.replace('/login'); }}
                  className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-sm text-rose-300 transition-colors hover:bg-rose-500/[0.08]"
                >
                  <LogOut size={15} /> {labels.logout}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
