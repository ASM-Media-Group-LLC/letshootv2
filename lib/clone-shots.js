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
    'julia-angulo-1', 'julia-angulo-2', 'despertar-desayuno', 'confesiones-preguntame',
    'belleza-salon', 'gimnasio-camino', 'lluvia-cafe', 'ciudad-vitrinas',
    'bar-coctel', 'ciudad-rooftop',
  ],
  // Real 90° side profiles — ALL generated with the Julia Parker character in
  // Higgsfield Soul, one coherent set (no near-frontal catalog fillers).
  right: [
    'julia-perfil-1', 'julia-perfil-2', 'julia-perfil-3', 'julia-perfil-4',
    'julia-perfil-5', 'julia-perfil-6', 'julia-perfil-7', 'julia-perfil-8',
  ],
  expression: [
    'emociones-emocionada', 'emociones-feliz', 'regalos-abriendo', 'gamer-setup',
    'bar-brindis', 'venta-adivina', 'hitos-1mes', 'social-fiesta',
    'julia-guino-1', 'julia-sorpresa-1',
  ],
  half: [
    'roles-azafata', 'lujo-champana', 'bar-vino', 'disfraces-cosplay',
    'compras-super', 'moto-enlamoto', 'lujo-hotel', 'comida-cocinando',
    'universidad-uniforme', 'transporte-uber',
  ],
  // Full body, clothed — head-to-toe studio shots generated with the Julia
  // character + the best real standing catalog shots.
  body: ['julia-vestida-1', 'julia-vestida-2', 'viajes-hotel', 'musica-baile', 'compras-ropa'],
  // Full body, bikini/lingerie — body clearly visible, no duplicate frames.
  // julia-bikini-7 = true head-to-toe standing studio bikini (generated).
  bikini: ['julia-bikini-7', 'julia-bikini-1', 'julia-bikini-3', 'compras-lenceria', 'playa-piscina', 'resort-cabana'],
  // Hands — close-ups (manicure, rings). AI needs these to get hands right.
  hands: ['julia-mano-1', 'julia-mano-2', 'julia-mano-3', 'julia-mano-4', 'julia-mano-5'],
  // Feet — close-ups (pedicure). Same reason: the clone learns real feet.
  feet: ['julia-pie-1', 'julia-pie-2', 'julia-pie-3', 'julia-pie-4', 'julia-pie-5'],
};

// Tattoos & marks — 9 real close-up examples (Julia's ribcage tulip crop +
// generated clean fine-line close-ups: butterflies, ankle flowers, hip moons).
export const MARKS_EXAMPLES = [
  'julia-marca-1', 'julia-marca-2', 'julia-marca-3', 'julia-marca-4', 'julia-marca-5',
  'julia-marca-6', 'julia-marca-8', 'julia-marca-9', 'julia-marca-10',
];
export const MARKS_REC = 9;

// How many photos we ask the creator to UPLOAD per category (independent of
// how many example photos we can show — e.g. 'right' shows 2 examples but the
// creator should still upload ~8 real profiles).
// RULE (owner): if we ask for N photos in a category, we show N examples,
// and the whole plan sums to exactly LORA_MAX (80):
// 12+10+8+10+10+5+6+5+5 (+ marks 9) = 80.
export const CLONE_RECS = {
  front: 12, left: 10, right: 8, expression: 10, half: 10, body: 5, bikini: 6,
  hands: 5, feet: 5,
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
  hands: '50% 50%',
  feet: '50% 55%',
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
