// Real, DISTINCT reference photos for the clone shot guide — one example per
// shot the creator should replicate, grouped by category (like the library grid).
// Every file is the real Julia from /public/lib (no other model, no drawings).
//
// Full body is shown two ways — clothed and bikini — so the creator sees she can
// do either (we need to see the body). A separate "nude" category is upload-only
// (no examples) — the creator adds those privately.

export const CLONE_EXAMPLES = {
  front: [
    'pov-cita', 'belleza-maquillaje', 'gfe-extrane', 'confesiones-secreto',
    'belleza-skincare', 'confesiones-fantasia', 'despertar-perezoso', 'pov-casa',
    'gfe-buenosdias', 'pov-desperte', 'madrugada-nodormir', 'emociones-sola',
  ],
  left: [
    'ducha-pelo', 'gfe-aqui', 'madrugada-2am', 'pov-vecina', 'ducha-vapor',
    'despertar-desayuno', 'confesiones-preguntame', 'belleza-salon',
    'musica-audifonos', 'gfe-dormir',
  ],
  right: [
    'madrugada-insomnio', 'emociones-dificil', 'ducha-antes', 'despertar-sabanas',
    'ciudad-vitrinas', 'gimnasio-camino', 'disfraces-fiesta', 'gimnasio-post-entreno',
  ],
  expression: [
    'emociones-emocionada', 'emociones-feliz', 'ducha-toalla', 'coqueteo-guino',
    'coqueteo-labio', 'confesiones-nunca-dicho', 'regalos-abriendo', 'gamer-setup',
    'bar-brindis', 'universidad-biblioteca',
  ],
  half: [
    'roles-azafata', 'spa-dia', 'lujo-champana', 'roles-profesora', 'lluvia-cafe',
    'bar-vino', 'disfraces-cosplay', 'compras-super', 'comida-desayuno', 'moto-enlamoto',
  ],
  // Full body, clothed — REAL head-to-toe Julia (front, side, back)
  body: ['julia-body-1', 'julia-body-2', 'julia-body-3', 'julia-body-4', 'julia-body-5'],
  // Full body, bikini — REAL head-to-toe Julia so the body is fully visible
  bikini: ['julia-bikini-1', 'julia-bikini-2', 'julia-bikini-3', 'julia-bikini-4', 'julia-bikini-5', 'julia-bikini-6'],
};

// Categories whose examples are shown whole (object-contain) so the full
// head-to-toe figure is visible in the thumbnail, not cropped to half body.
export const FULLBODY_CATS = ['body', 'bikini'];

// object-position per category so the example thumbnails frame the face/body.
export const CLONE_POS = {
  front: '50% 26%',
  left: '50% 28%',
  right: '50% 28%',
  expression: '50% 26%',
  half: '50% 22%',
  body: '50% 20%',
  bikini: '50% 24%',
};

// Upload-only categories — no example photos.
// marks: close-ups of tattoos / scars / moles / piercings (Higgsfield captures
// these as identifying "details"). nude: optional, private.
export const MARKS_CATEGORY = 'other';
export const NUDE_CATEGORY = 'nude';

export const CLONE_TOTAL = Object.values(CLONE_EXAMPLES).reduce((a, arr) => a + arr.length, 0);
