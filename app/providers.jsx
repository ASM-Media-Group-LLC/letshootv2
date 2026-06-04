'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { dict, SUPPORTED_LANGS } from '@/lib/i18n';

/* ─── LANGUAGE ─── */
const LangContext = createContext({ lang: 'es', setLang: () => {}, t: dict.es });

export function LangProvider({ children }) {
  const [lang, setLang] = useState('es');

  useEffect(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem('letshoot-lang');
    if (stored && SUPPORTED_LANGS.includes(stored)) {
      setLang(stored);
      return;
    }
    if (typeof navigator !== 'undefined') {
      const navLang = (navigator.language || 'es').slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGS.includes(navLang)) setLang(navLang);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('letshoot-lang', lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t: dict[lang] || dict.es }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/* ─── THEME (default dark) ─── */
const ThemeContext = createContext({ theme: 'dark', setTheme: () => {}, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('letshoot-theme');
    if (stored === 'light' || stored === 'dark') setTheme(stored);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('letshoot-theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/* ─── COMBINED ─── */
export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <LangProvider>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LangProvider>
    </ThemeProvider>
  );
}
