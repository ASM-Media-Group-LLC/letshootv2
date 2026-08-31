import { Onest, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppProviders } from './providers';

// Fuente principal — Onest. Fresca, moderna, súper legible (2024).
// Reemplaza Inter (cuerpo) y Poppins (display) — ahora TODA la plataforma
// respira con el mismo lenguaje tipográfico limpio y actual.
// Mantengo los MISMOS nombres de variables (--font-inter, --font-poppins,
// --font-mono) para no romper Tailwind ni ningún componente.
const onest = Onest({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const onestDisplay = Onest({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const inter = onest;
const poppins = onestDisplay;

export const metadata = {
  title: 'LetShoot — Tu fotógrafo IA',
  description:
    'Tu fotógrafo IA. Genera fotos y videos de nivel editorial desde cualquier lugar, cuando quieras. Para creadores y agencias que nunca paran.',
  metadataBase: new URL('https://letshoot.ai'),
  openGraph: {
    title: 'LetShoot — Tu fotógrafo IA',
    description:
      'Genera fotos y videos de nivel editorial desde cualquier lugar. Tu fotógrafo IA, siempre disponible.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#070A0F',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} ${poppins.variable} ${mono.variable}`}>
      <head>
        {/* Anti-FOUC: apply stored theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('letshoot-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}",
          }}
        />
      </head>
      <body className="bg-ink font-sans text-paper antialiased">
        <AppProviders>{children}</AppProviders>
        <div className="noise" aria-hidden />
      </body>
    </html>
  );
}
