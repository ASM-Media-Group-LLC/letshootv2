// Lista de países para el selector del alta (bandera + nombre + código telefónico).
// Guardamos el código ISO-2 (ej. 'MX'); la bandera se saca del código con emoji
// regional y el `dial` es el prefijo telefónico (ej. '+52'), para prellenar el
// teléfono al elegir país. Orden: los más comunes de la plataforma primero, luego
// alfabético.

// Bandera emoji desde el código ISO-2 (dos "regional indicator symbols").
export function flagEmoji(code) {
  if (!code || code.length !== 2) return '';
  const A = 0x1f1e6;
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65));
}

const RAW = [
  { code: 'US', name: 'Estados Unidos', dial: '+1' },
  { code: 'MX', name: 'México', dial: '+52' },
  { code: 'CO', name: 'Colombia', dial: '+57' },
  { code: 'AR', name: 'Argentina', dial: '+54' },
  { code: 'ES', name: 'España', dial: '+34' },
  { code: 'PE', name: 'Perú', dial: '+51' },
  { code: 'CL', name: 'Chile', dial: '+56' },
  { code: 'VE', name: 'Venezuela', dial: '+58' },
  { code: 'EC', name: 'Ecuador', dial: '+593' },
  { code: 'GT', name: 'Guatemala', dial: '+502' },
  { code: 'CU', name: 'Cuba', dial: '+53' },
  { code: 'BO', name: 'Bolivia', dial: '+591' },
  { code: 'DO', name: 'República Dominicana', dial: '+1' },
  { code: 'HN', name: 'Honduras', dial: '+504' },
  { code: 'PY', name: 'Paraguay', dial: '+595' },
  { code: 'SV', name: 'El Salvador', dial: '+503' },
  { code: 'NI', name: 'Nicaragua', dial: '+505' },
  { code: 'CR', name: 'Costa Rica', dial: '+506' },
  { code: 'PA', name: 'Panamá', dial: '+507' },
  { code: 'UY', name: 'Uruguay', dial: '+598' },
  { code: 'PR', name: 'Puerto Rico', dial: '+1' },
  { code: 'BR', name: 'Brasil', dial: '+55' },
  { code: 'CA', name: 'Canadá', dial: '+1' },
  // Resto (alfabético)
  { code: 'DE', name: 'Alemania', dial: '+49' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'AT', name: 'Austria', dial: '+43' },
  { code: 'BE', name: 'Bélgica', dial: '+32' },
  { code: 'CN', name: 'China', dial: '+86' },
  { code: 'KR', name: 'Corea del Sur', dial: '+82' },
  { code: 'DK', name: 'Dinamarca', dial: '+45' },
  { code: 'AE', name: 'Emiratos Árabes Unidos', dial: '+971' },
  { code: 'PH', name: 'Filipinas', dial: '+63' },
  { code: 'FI', name: 'Finlandia', dial: '+358' },
  { code: 'FR', name: 'Francia', dial: '+33' },
  { code: 'GR', name: 'Grecia', dial: '+30' },
  { code: 'NL', name: 'Países Bajos', dial: '+31' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'IE', name: 'Irlanda', dial: '+353' },
  { code: 'IT', name: 'Italia', dial: '+39' },
  { code: 'JP', name: 'Japón', dial: '+81' },
  { code: 'MY', name: 'Malasia', dial: '+60' },
  { code: 'MA', name: 'Marruecos', dial: '+212' },
  { code: 'NO', name: 'Noruega', dial: '+47' },
  { code: 'NZ', name: 'Nueva Zelanda', dial: '+64' },
  { code: 'PL', name: 'Polonia', dial: '+48' },
  { code: 'PT', name: 'Portugal', dial: '+351' },
  { code: 'GB', name: 'Reino Unido', dial: '+44' },
  { code: 'CZ', name: 'República Checa', dial: '+420' },
  { code: 'RO', name: 'Rumanía', dial: '+40' },
  { code: 'RU', name: 'Rusia', dial: '+7' },
  { code: 'SE', name: 'Suecia', dial: '+46' },
  { code: 'CH', name: 'Suiza', dial: '+41' },
  { code: 'TH', name: 'Tailandia', dial: '+66' },
  { code: 'TR', name: 'Turquía', dial: '+90' },
  { code: 'UA', name: 'Ucrania', dial: '+380' },
  { code: 'ZA', name: 'Sudáfrica', dial: '+27' },
];

// Cada país lleva ya su banderita calculada (para pintarla sin recalcular).
export const COUNTRIES = RAW.map((c) => ({ ...c, flag: flagEmoji(c.code) }));

// Nombre legible desde el código (para mostrar el país guardado).
export function countryName(code) {
  return COUNTRIES.find((c) => c.code === code)?.name || code || '';
}

// País (objeto completo, con dial y flag) a partir del nombre guardado. Como
// respaldo también acepta el código ISO-2 por si algún perfil viejo lo guardó así.
export function countryByName(name) {
  if (!name) return null;
  const n = String(name).trim().toLowerCase();
  return (
    COUNTRIES.find((c) => c.name.toLowerCase() === n) ||
    COUNTRIES.find((c) => c.code.toLowerCase() === n) ||
    null
  );
}

// Parte un teléfono guardado ("+52 55 1234 5678") en { dial, national }. El alta
// lo guarda como "<dial> <número>", así que partimos en el primer espacio. Si no
// hay espacio pero empieza con '+', intentamos reconocer un prefijo conocido.
export function splitPhone(phone) {
  const s = String(phone || '').trim();
  if (!s) return { dial: '', national: '' };
  const sp = s.indexOf(' ');
  if (sp > -1) return { dial: s.slice(0, sp).trim(), national: s.slice(sp + 1).trim() };
  if (s.startsWith('+')) {
    const dials = [...new Set(COUNTRIES.map((c) => c.dial))].sort((a, b) => b.length - a.length);
    const hit = dials.find((d) => s.startsWith(d));
    if (hit) return { dial: hit, national: s.slice(hit.length).trim() };
    return { dial: s, national: '' };
  }
  return { dial: '', national: s };
}
