'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme, useLang } from '@/app/providers';

const ARIA = {
  es: { light: 'Cambiar a modo claro', dark: 'Cambiar a modo oscuro' },
  en: { light: 'Switch to light mode', dark: 'Switch to dark mode' },
  pt: { light: 'Mudar para modo claro', dark: 'Mudar para modo escuro' },
  fr: { light: 'Passer en mode clair', dark: 'Passer en mode sombre' },
  de: { light: 'Zum hellen Modus wechseln', dark: 'Zum dunklen Modus wechseln' },
  it: { light: 'Passa alla modalità chiara', dark: 'Passa alla modalità scura' },
  zh: { light: '切换到浅色模式', dark: '切换到深色模式' },
};

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { lang } = useLang();
  const isDark = theme === 'dark';
  const aria = ARIA[lang] || ARIA.en;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? aria.light : aria.dark}
      className="grid h-8 w-8 place-items-center rounded-full text-paper-mute transition-colors hover:text-brand"
      style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)' }}
    >
      {isDark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
    </button>
  );
}
