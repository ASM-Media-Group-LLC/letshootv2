/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware neutrals (flip via CSS vars in globals.css)
        ink: 'rgb(var(--bg) / <alpha-value>)',
        'ink-2': 'rgb(var(--bg-2) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        paper: 'rgb(var(--fg) / <alpha-value>)',
        'paper-mute': 'rgb(var(--fg-mute) / <alpha-value>)',
        'paper-dim': 'rgb(var(--fg-dim) / <alpha-value>)',
        line: 'var(--line)',
        // Theme-aware hairline/overlay (white on dark, dark on light)
        hair: 'rgb(var(--overlay) / <alpha-value>)',
        // Constant brand palette
        // Brand — blue family only (iOS premium palette)
        brand:       '#00B1F6',   // logo cyan — primary accent
        'brand-deep':'#0A84FF',   // deep blue — hover / depth
        sky:         '#7FE0FF',   // light sky — highlight / gradient end
        // Remap old accent tokens → brand family (no lime/pink/iris)
        lime:        '#7FE0FF',   // was green, now sky blue
        pink:        '#0A84FF',   // was pink,  now deep blue
        iris:        '#7FE0FF',   // was violet, now sky blue
        'on-accent': '#06101A',   // dark text on bright accent bg
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        wider2: '0.18em',
        widest2: '0.34em',
      },
      boxShadow: {
        glow: '0 14px 50px -12px rgba(0,177,246,0.55)',
        'glow-sm': '0 8px 30px -10px rgba(0,177,246,0.45)',
        soft: '0 30px 80px -40px rgba(0,0,0,0.8)',
      },
      animation: {
        marquee: 'marquee 36s linear infinite',
        floatY: 'floatY 7s ease-in-out infinite',
        spinslow: 'spinslow 16s linear infinite',
        blob: 'blob 18s ease-in-out infinite alternate',
        shimmer: 'shimmer 2.5s ease-in-out infinite',
        scan: 'scan 0.9s ease-in-out',
        risein: 'risein 0.5s ease-out',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        spinslow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        blob: {
          '0%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(4%,3%,0) scale(1.12)' },
          '100%': { transform: 'translate3d(-3%,-2%,0) scale(1.06)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        scan: {
          '0%': { transform: 'translateX(0)', opacity: '0' },
          '20%': { opacity: '1' },
          '100%': { transform: 'translateX(420%)', opacity: '0' },
        },
        risein: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
