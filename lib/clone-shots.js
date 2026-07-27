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
  // Full body, clothed — fullest standing shots we have of Julia
  body: [
    'coqueteo-espejo', 'musica-baile', 'compras-ropa', 'yoga-ropa',
    'gimnasio-entrenando', 'viajes-hotel',
  ],
  // Full body, bikini/swimwear — so the body is clearly visible
  bikini: [
    'playa-piscina', 'playa-playa', 'playa-mojada', 'resort-cabana',
    'resort-atardecer', 'spa-jacuzzi-noche',
  ],
};

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

// Optional upload-only category — no example photos (the creator adds these
// privately). Rendered as an upload space with a discreet note.
export const NUDE_CATEGORY = 'nude';

export const CLONE_TOTAL = Object.values(CLONE_EXAMPLES).reduce((a, arr) => a + arr.length, 0);
