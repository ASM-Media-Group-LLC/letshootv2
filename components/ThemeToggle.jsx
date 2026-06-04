'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/providers';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="grid h-8 w-8 place-items-center rounded-full text-paper-mute transition-colors hover:text-brand"
      style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)' }}
    >
      {isDark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
    </button>
  );
}
