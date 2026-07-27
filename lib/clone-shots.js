// 60 real, DISTINCT reference photos for the clone shot guide — one example per
// shot the creator should replicate, grouped by category (like the library grid).
// Curated from /public/lib (same model). No image is reused across categories.
// Counts: front 12 · left(3/4) 10 · right(de lado) 8 · expression 10 · half 10 · body 10 = 60.
//
// Honest catalog limits: the library has no PURE side profile (max ~strongly
// turned face) and no true head-to-toe full body (fullest reaches the knees) —
// these picks are the best available; the shot brief (docs/higgsfield-shot-brief.md)
// covers generating the missing true-profile / full-height shots.

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
    'bar-vino', 'spa-jacuzzi-noche', 'disfraces-cosplay', 'compras-super',
    'comida-desayuno',
  ],
  body: [
    'coqueteo-bailando', 'viajes-hotel', 'coqueteo-espejo', 'compras-ropa',
    'yoga-ropa', 'musica-baile', 'gimnasio-entrenando', 'resort-checkin',
    'playa-piscina', 'ciudad-rooftop',
  ],
};

// object-position for the example thumbnails, per category (faces framed high,
// body shots a touch lower to show the pose).
export const CLONE_POS = {
  front: '50% 26%',
  left: '50% 28%',
  right: '50% 28%',
  expression: '50% 26%',
  half: '50% 22%',
  body: '50% 22%',
};

export const CLONE_TOTAL = Object.values(CLONE_EXAMPLES).reduce((a, arr) => a + arr.length, 0); // 60
