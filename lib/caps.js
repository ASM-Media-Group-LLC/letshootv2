// SINGLE SOURCE OF TRUTH for the platform's granular functions (capabilities).
// Mapped by SECTION → function, mirroring the areas of the platform, so when
// the owner creates a puesto he grants access per area, function by function.
// 'datos' vs 'kyc' are split on purpose: 'datos' = see the creator's profile
// WITHOUT her ID documents; 'kyc' = also see + verify the identity documents.
export const CAP_SECTIONS = [
  {
    id: 'creadoras', name: 'Creadoras',
    caps: [
      { v: 'datos', l: 'Ver datos de la creadora', hint: 'Perfil y datos (sin documentos de ID)' },
      { v: 'kyc', l: 'Verificar identidad', hint: 'Ver documentos de ID + aprobar / rechazar' },
    ],
  },
  {
    id: 'contenido', name: 'Contenido & pedidos',
    caps: [
      { v: 'content', l: 'Subir entregas', hint: 'Entregar fotos y videos a la biblioteca de cada creadora' },
      { v: 'requests', l: 'Atender pedidos', hint: 'Tomar y entregar pedidos de agencias y creadoras' },
      { v: 'feedback', l: 'Responder feedback', hint: 'Resolver lo que las creadoras piden cambiar' },
    ],
  },
  {
    id: 'empresa', name: 'Empresa',
    caps: [
      { v: 'metrics', l: 'Ver números de la empresa', hint: 'Producción, Manual Sales (/sales) y agencias' },
    ],
  },
  {
    id: 'equipo', name: 'Equipo',
    caps: [
      { v: 'team', l: 'Gestionar equipo', hint: 'Crear puestos y dar accesos' },
    ],
  },
];

// Flat list, for code that only needs v/l/hint.
export const CAPS = CAP_SECTIONS.flatMap((s) => s.caps);
export const ALL_CAP_VALUES = CAPS.map((c) => c.v);
