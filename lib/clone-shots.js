// Reference photos for the clone shot guide — real, distinct Julia photos per
// category, each one verified against Higgsfield LoRA criteria (face fully
// visible and unobstructed — no hands/objects on the face, no sunglasses, no
// heavy shadow; only the model in frame; category-correct angle/framing; no
// near-duplicate frames). Re-curated 2026-07-28 by a 7-agent double-check.
//
// Full body is shown clothed and in bikini; "marks" (tattoos etc.) and "nude"
// are upload-only categories handled in CloneSetup.

export const CLONE_EXAMPLES = {
  front: [
    'gfe-extrane', 'confesiones-fantasia', 'pov-casa', 'pov-desperte',
    'viajes-ciudad', 'moto-carretera', 'tudecides-rueda', 'comida-desayuno',
    'ciudad-luces', 'bar-noche', 'tudecides-mandas', 'pedidos-parati',
  ],
  left: [
    'gfe-aqui', 'pov-vecina', 'despertar-desayuno', 'confesiones-preguntame',
    'belleza-salon', 'gimnasio-camino', 'lluvia-cafe', 'ciudad-vitrinas',
    'bar-coctel', 'ciudad-rooftop',
  ],
  // The catalog has no true side profiles — only the 2 most side-angled shots
  // qualify. Generate real profiles with the Julia LoRA to expand this set.
  right: ['gimnasio-post-entreno', 'yoga-ropa'],
  expression: [
    'emociones-emocionada', 'emociones-feliz', 'regalos-abriendo', 'gamer-setup',
    'bar-brindis', 'venta-adivina', 'hitos-1mes', 'social-fiesta',
  ],
  half: [
    'roles-azafata', 'lujo-champana', 'bar-vino', 'disfraces-cosplay',
    'compras-super', 'moto-enlamoto', 'lujo-hotel', 'comida-cocinando',
    'universidad-uniforme', 'transporte-uber',
  ],
  // Full body, clothed — best standing silhouettes available
  body: ['julia-body-1', 'julia-body-3', 'viajes-hotel', 'musica-baile', 'compras-ropa'],
  // Full body, bikini/lingerie — body clearly visible, no duplicate frames
  bikini: ['julia-bikini-1', 'julia-bikini-3', 'compras-lenceria', 'playa-piscina', 'resort-cabana'],
};

// How many photos we ask the creator to UPLOAD per category (independent of
// how many example photos we can show — e.g. 'right' shows 2 examples but the
// creator should still upload ~8 real profiles).
export const CLONE_RECS = {
  front: 12, left: 10, right: 8, expression: 10, half: 10, body: 5, bikini: 6,
};

// object-position for the example thumbnails, per category.
export const CLONE_POS = {
  front: '50% 26%',
  left: '50% 28%',
  right: '50% 28%',
  expression: '50% 26%',
  half: '50% 22%',
  body: '50% 20%',
  bikini: '50% 24%',
};

// Categories whose examples are shown whole (object-contain) so the full
// figure is visible in the thumbnail, not cropped to half body.
export const FULLBODY_CATS = ['body', 'bikini'];

// Upload-only categories — no example grid of their own.
// marks: close-ups of tattoos / scars / moles / piercings. nude: optional, private.
export const MARKS_CATEGORY = 'other';
export const NUDE_CATEGORY = 'nude';

export const CLONE_TOTAL = Object.values(CLONE_RECS).reduce((a, n) => a + n, 0);

// LoRA training set size: Higgsfield needs at least ~20, our house minimum for
// a quality clone is 50, and up to 80 photos improve it further.
export const LORA_MIN = 50;
export const LORA_MAX = 80;
