// Recommended LoRA training set for a person (identity-consistent clone).
// Total target = 80 photos, split by category so the model generalizes well.
// This is the "better than a flat 80-photo dump" structure.

export const LORA_TARGET = 80;

export const LORA_CATEGORIES = [
  {
    id: 'face',
    name: 'Rostro (close-up)',
    target: 20,
    tip: 'La cara llena el encuadre. Frente, 3/4 izquierda y derecha, ligeramente arriba/abajo. Luz pareja. Es lo más importante para la identidad.',
  },
  {
    id: 'bust',
    name: 'Medio cuerpo',
    target: 15,
    tip: 'De la cintura para arriba. Distintos outfits y expresiones, cara siempre visible y nítida.',
  },
  {
    id: 'full',
    name: 'Cuerpo completo',
    target: 15,
    tip: 'De pies a cabeza, de pie. Varias poses y outfits para que aprenda tus proporciones.',
  },
  {
    id: 'angles',
    name: 'Perfiles y ángulos',
    target: 8,
    tip: 'Perfil izquierdo y derecho, mirando por encima del hombro, 3/4 desde atrás.',
  },
  {
    id: 'expressions',
    name: 'Expresiones',
    target: 7,
    tip: 'Sonriendo, seria, riendo, sensual, boca abierta/cerrada. Variedad real de gestos.',
  },
  {
    id: 'lighting',
    name: 'Iluminación variada',
    target: 7,
    tip: 'Luz natural de día, interior cálido, golden hour, estudio. Ayuda a generalizar la luz.',
  },
  {
    id: 'outfits',
    name: 'Outfits / estilos',
    target: 8,
    tip: 'Casual, elegante, deportivo, lencería/traje de baño. Misma persona, distintos looks.',
  },
];

export const LORA_DOS = [
  '80 fotos recientes (últimos meses) de la misma persona',
  'Alta resolución y bien enfocadas — la cara siempre nítida',
  'Solo ella en la foto (nadie más)',
  'Fondos y escenarios variados',
  'Buena luz; el rostro claramente visible',
];

export const LORA_DONTS = [
  'Nada de filtros pesados (Snapchat/FaceApp) ni maquillaje que la irreconozca',
  'Sin lentes de sol, sombreros o manos que tapen la cara',
  'Nada borroso, pixeleado ni capturas de pantalla',
  'Sin collages, marcas de agua ni texto sobre la foto',
  'No repetir la misma foto o el mismo outfit muchas veces',
];
