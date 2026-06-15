'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/app/providers';
import Logo from './Logo';
import LangToggle from './LangToggle';
import ThemeToggle from './ThemeToggle';

export default function Nav() {
  const { t } = useLang();
  // Visible by default so the nav shows during the intro vapor text screens
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById('hero');
      if (!hero) { setVisible(true); return; }
      // Nav is visible:
      //  - At the very top (initial intro screen with the vapor text)
      //  - After the hero editor has finished
      // It's HIDDEN during the editor phase (when the photo is being edited).
      const heroTop = hero.offsetTop;
      const heroBottom = heroTop + hero.offsetHeight - window.innerHeight;
      const heroProgress = (window.scrollY - heroTop) / Math.max(1, heroBottom - heroTop);
      // Hidden during editor + finale screen; reappears as the hero ends so it
      // greets the user when content sections start showing.
      const inImmersive = heroProgress > 0.28 && heroProgress < 0.97;
      setVisible(!inImmersive);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const links = [
    { href: '#creators', label: t.nav.creators },
    { href: '#agencies', label: t.nav.agencies },
    { href: '#pricing', label: t.nav.pricing },
    { href: '#results', label: t.nav.results },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 px-3 pt-3 transition-all duration-500 ease-out sm:px-5 sm:pt-4 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-[130%] opacity-0'
      }`}
    >
      <nav className="nav-glass mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-8">
          <a href="#top" aria-label="LetShoot">
            <Logo size="sm" />
          </a>
          <div className="hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-paper-mute transition-colors hover:text-brand"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <LangToggle />
          <a
            href="#pricing"
            className="hidden rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.04] sm:inline-block"
          >
            {t.nav.cta}
          </a>
        </div>
      </nav>
    </header>
  );
}
