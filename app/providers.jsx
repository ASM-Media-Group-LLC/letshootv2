'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { dict, SUPPORTED_LANGS } from '@/lib/i18n';

/* ─── LANGUAGE ─── */
const LangContext = createContext({ lang: 'es', setLang: () => {}, t: dict.es });

// US/Canada timezones → English; Brazil → Portuguese; rest of the Americas → Spanish.
const US_CA_TZ = new Set([
  'America/New_York', 'America/Detroit', 'America/Toronto', 'America/Chicago',
  'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage',
  'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax',
  'America/Boise', 'America/Indiana/Indianapolis', 'America/Kentucky/Louisville',
  'America/Regina', 'America/St_Johns', 'Pacific/Honolulu',
]);
const BRAZIL_TZ = new Set([
  'America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife',
  'America/Manaus', 'America/Belem', 'America/Cuiaba', 'America/Campo_Grande',
  'America/Porto_Velho', 'America/Boa_Vista', 'America/Maceio', 'America/Noronha',
]);

// Pick a language from the visitor's location (timezone) first, then their
// browser languages, then a sensible default.
function detectLang() {
  if (typeof Intl !== 'undefined') {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.startsWith('US/') || tz.startsWith('Canada/') || US_CA_TZ.has(tz)) return 'en';
      if (BRAZIL_TZ.has(tz)) return SUPPORTED_LANGS.includes('pt') ? 'pt' : 'es';
      if (tz.startsWith('America/')) return 'es'; // rest of the Americas = Latin America
    } catch (e) { /* ignore */ }
  }
  if (typeof navigator !== 'undefined') {
    const prefs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ''];
    const match = prefs
      .map((l) => l.slice(0, 2).toLowerCase())
      .find((l) => SUPPORTED_LANGS.includes(l));
    if (match) return match;
  }
  return 'en';
}

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
    const detected = detectLang();
    if (detected) setLang(detected);
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
