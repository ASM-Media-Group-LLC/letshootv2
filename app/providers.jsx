'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { dict, SUPPORTED_LANGS } from '@/lib/i18n';

/* ─── LANGUAGE ─── */
const LangContext = createContext({ lang: 'es', setLang: () => {}, t: dict.es });

export function LangProvider({ children }) {
  const [lang, setLang] = useState('es');
  // Skip the very first write so the initial 'es' never overwrites the stored
  // value before the read effect applies it (otherwise lang resets on reload,
  // especially under React StrictMode's double-mount in dev).
  const firstWrite = useRef(true);

  useEffect(() => {
    // 1) Respect a saved preference (user changed it manually before).
    const stored = typeof window !== 'undefined' && localStorage.getItem('letshoot-lang');
    if (stored && SUPPORTED_LANGS.includes(stored)) {
      setLang(stored);
      return;
    }
    // 2) Auto-detect: walk the user's ordered language preferences and pick the
    //    first one we support (e.g. ['en-US','pt'] → 'en'). Falls back to 'es'.
    if (typeof navigator !== 'undefined') {
      const prefs = navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language || 'es'];
      const match = prefs
        .map((l) => l.slice(0, 2).toLowerCase())
        .find((l) => SUPPORTED_LANGS.includes(l));
      if (match) setLang(match);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (firstWrite.current) { firstWrite.current = false; return; }
    localStorage.setItem('letshoot-lang', lang);
    document.documentElement.lang = lang;
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
