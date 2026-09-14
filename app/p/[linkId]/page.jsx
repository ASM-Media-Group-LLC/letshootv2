// Ruta pública dinámica de propuestas: /p/<CODE> (y /p/demo → fallback DEMO).
import PropuestaViewer from '@/components/PropuestaViewer';

// Foto linda por defecto (por si la propuesta no trae portada propia).
const OG_FALLBACK_IMG = '/model-latina.jpg';

// ── Open Graph / Twitter ──────────────────────────────────────────────────
// Para que al compartir el link por WhatsApp / redes salga una tarjeta linda
// (imagen de portada + título), no en blanco. El crawler NO corre JS, así que
// leemos la propuesta en el server (RPC pública get_proposal_by_link con la
// anon key) y devolvemos los meta tags. Por privacidad NO ponemos el nombre de
// la creadora — solo el título del paquete + la portada.
export async function generateMetadata({ params }) {
  const code = params.linkId;
  const meta = {
    title: 'Una propuesta privada · LetShoot',
    description: 'Una selección privada, hecha para vos. Mirala y contanos qué te gusta.',
    image: OG_FALLBACK_IMG,
  };

  if (code && code !== 'demo') {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const res = await fetch(`${url}/rest/v1/rpc/get_proposal_by_link`, {
          method: 'POST',
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_link: code }),
          next: { revalidate: 300 },
        });
        if (res.ok) {
          const rows = await res.json();
          const p = Array.isArray(rows) ? rows[0] : null;
          if (p) {
            const name = (p.name || '').trim() || 'Contenido para tus redes';
            meta.title = `${name} · LetShoot`;
            meta.ogTitle = name;
            const intro = (p.intro || '').trim();
            if (intro) meta.description = intro.slice(0, 180);
            if (p.cover_url) meta.image = p.cover_url;
          }
        }
      }
    } catch { /* si falla, quedan los defaults lindos */ }
  }

  // El <title> de la pestaña lleva el nombre de la propuesta (útil). El COMPARTIR
  // (og/twitter) va limpio y de marca: "LetShoot" + tagline, sin datos de la
  // propuesta. La imagen la genera opengraph-image.jsx (card de marca).
  const BRAND_DESC = 'Tu clon digital y de voz.';
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: 'LetShoot',
      description: BRAND_DESC,
      type: 'website',
      siteName: 'LetShoot',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LetShoot',
      description: BRAND_DESC,
    },
  };
}

export default function Page({ params }) {
  return <PropuestaViewer linkId={params.linkId} />;
}
