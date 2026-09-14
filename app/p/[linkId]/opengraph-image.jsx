// Imagen de compartir (Open Graph) — panel de marca (LetShoot + "tu clon digital
// y de voz") sobre azul marino sólido a la izquierda (siempre legible), y la foto
// de Miami a la derecha con un degradé que la funde. Simple, con onda, y sin
// depender de overlays/backgroundImage que satori renderiza mal.
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'LetShoot — tu clon digital y de voz';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SITE = 'https://letshoot.ai';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#06131c' }}>
        {/* Panel de marca (azul marino) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 56px',
            background: 'linear-gradient(135deg, #0d2c3f 0%, #071620 68%)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${SITE}/logo.png`} height={102} alt="LetShoot" />
          <div style={{ marginTop: 40, color: '#eaf3fb', fontSize: 43, fontWeight: 500, letterSpacing: -0.5, textAlign: 'center' }}>
            Tu clon digital y de voz
          </div>
          <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.6)', fontSize: 23 }}>
            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#25c2ff' }} />
            letshoot.ai
          </div>
        </div>

        {/* Foto de Miami a la derecha, fundida hacia el panel */}
        <div style={{ width: 442, height: '100%', display: 'flex', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${SITE}/prop-miami-1.jpg`} width={442} height={630} alt="" style={{ objectFit: 'cover', width: 442, height: 630 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: 442, height: 630, background: 'linear-gradient(90deg, #071620 0%, rgba(7,22,32,0) 36%)' }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
