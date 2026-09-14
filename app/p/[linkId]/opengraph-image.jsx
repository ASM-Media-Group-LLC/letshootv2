// Imagen de compartir (Open Graph) GENERADA por el server para cada propuesta.
// En vez de una foto pelada, sale un card de MARCA: KASH + LetShoot, "selección
// privada", el título, y la portada a un lado. Así al mandarlo por WhatsApp queda
// branded (como kashagency.me), no culero.
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Propuesta privada · LetShoot';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SITE = 'https://letshoot.ai';
const abs = (u) => (u ? (/^https?:\/\//.test(u) ? u : `${SITE}${u.startsWith('/') ? '' : '/'}${u}`) : null);

export default async function OgImage({ params }) {
  const code = params?.linkId;
  let name = 'Una propuesta para vos';
  let tagline = 'Contenido pensado para tus redes y tu OnlyFans.';
  let cover = abs('/model-latina.jpg');

  if (code && code !== 'demo') {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const res = await fetch(`${url}/rest/v1/rpc/get_proposal_by_link`, {
          method: 'POST',
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_link: code }),
        });
        if (res.ok) {
          const rows = await res.json();
          const p = Array.isArray(rows) ? rows[0] : null;
          if (p) {
            if (p.name) name = String(p.name).slice(0, 48);
            if (p.intro) tagline = String(p.intro).slice(0, 96);
            if (p.cover_url) cover = abs(p.cover_url);
          }
        }
      }
    } catch { /* quedan los defaults */ }
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#06131c' }}>
        {/* Panel de contenido (marca) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '62px 58px',
            background: 'linear-gradient(135deg, #0c2a3c 0%, #06131c 62%)',
          }}
        >
          {/* Lockup KASH + LetShoot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${SITE}/prop-agency-kash.png`} height={46} alt="" />
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 40, fontWeight: 300 }}>+</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${SITE}/logo.png`} height={40} alt="" />
          </div>

          {/* Título */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#25c2ff', fontSize: 23, letterSpacing: 6, textTransform: 'uppercase', fontWeight: 700 }}>
              Selección privada
            </div>
            <div style={{ color: '#ffffff', fontSize: 70, fontWeight: 800, lineHeight: 1.04, marginTop: 16, letterSpacing: -1 }}>
              {name}
            </div>
            <div style={{ color: '#9fb2c4', fontSize: 29, lineHeight: 1.35, marginTop: 20, maxWidth: 600 }}>
              {tagline}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.55)', fontSize: 23 }}>
            <div style={{ width: 8, height: 8, borderRadius: 8, background: '#25c2ff' }} />
            letshoot.ai
          </div>
        </div>

        {/* Portada a la derecha */}
        <div style={{ width: 430, height: '100%', display: 'flex', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} width={430} height={630} alt="" style={{ objectFit: 'cover', width: 430, height: 630 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #06131c 0%, rgba(6,19,28,0) 30%)' }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
