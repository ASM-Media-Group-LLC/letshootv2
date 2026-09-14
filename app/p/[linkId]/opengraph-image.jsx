// Imagen de compartir (Open Graph) — SIMPLE y de marca. El dueño la quiere
// limpia: solo LetShoot + un tagline ("tu clon digital y de voz"), nada de
// título de propuesta, intro ni foto (decía demasiada info). Card de marca,
// igual para todas las propuestas.
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'LetShoot — tu clon digital y de voz';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SITE = 'https://letshoot.ai';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(58% 58% at 50% 32%, rgba(0,177,246,0.22) 0%, rgba(0,177,246,0) 62%), linear-gradient(135deg, #0c2a3c 0%, #06131c 66%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${SITE}/logo.png`} height={104} alt="LetShoot" />
        <div style={{ marginTop: 40, color: '#d3e4f2', fontSize: 44, fontWeight: 500, letterSpacing: -0.5 }}>
          Tu clon digital y de voz
        </div>
        <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.5)', fontSize: 24 }}>
          <div style={{ width: 8, height: 8, borderRadius: 8, background: '#25c2ff' }} />
          letshoot.ai
        </div>
      </div>
    ),
    { ...size },
  );
}
