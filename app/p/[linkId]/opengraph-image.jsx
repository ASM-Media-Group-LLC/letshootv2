// Imagen de compartir (Open Graph) — limpia y de marca: LetShoot + "Fire your
// photographer" (inglés, tagline de marca, igual para todos, no depende del geo),
// sobre un fondo azul de marca con brillo cian. Sin foto (no le gustó) y sin
// datos de la propuesta.
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'LetShoot — Fire your photographer';
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
            'radial-gradient(52% 52% at 50% 34%, rgba(0,177,246,0.30) 0%, rgba(0,177,246,0) 62%), linear-gradient(135deg, #0e3247 0%, #071620 58%, #030d15 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${SITE}/logo.png`} height={112} alt="LetShoot" />
        <div
          style={{
            marginTop: 44,
            color: '#eaf3fb',
            fontSize: 48,
            fontWeight: 600,
            letterSpacing: -0.5,
            textShadow: '0 2px 22px rgba(0,0,0,0.4)',
          }}
        >
          Fire your photographer
        </div>
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.55)', fontSize: 24 }}>
          <div style={{ width: 8, height: 8, borderRadius: 8, background: '#25c2ff' }} />
          letshoot.ai
        </div>
      </div>
    ),
    { ...size },
  );
}
