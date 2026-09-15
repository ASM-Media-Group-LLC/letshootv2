// Lista de países para el selector del alta (bandera + nombre). Guardamos el
// código ISO-2 (ej. 'MX') y la bandera se saca del código con emoji regional,
// así después se puede pintar la banderita en cualquier lado ("carta bonita").
// Orden: los más comunes de la plataforma primero, luego alfabético.

export const COUNTRIES = [
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'CO', name: 'Colombia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'ES', name: 'España' },
  { code: 'PE', name: 'Perú' },
  { code: 'CL', name: 'Chile' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'CU', name: 'Cuba' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'HN', name: 'Honduras' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panamá' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CA', name: 'Canadá' },
  // Resto (alfabético)
  { code: 'DE', name: 'Alemania' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'CN', name: 'China' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'AE', name: 'Emiratos Árabes Unidos' },
  { code: 'PH', name: 'Filipinas' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'FR', name: 'Francia' },
  { code: 'GR', name: 'Grecia' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'IT', name: 'Italia' },
  { code: 'JP', name: 'Japón' },
  { code: 'MY', name: 'Malasia' },
  { code: 'MA', name: 'Marruecos' },
  { code: 'NO', name: 'Noruega' },
  { code: 'NZ', name: 'Nueva Zelanda' },
  { code: 'PL', name: 'Polonia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'CZ', name: 'República Checa' },
  { code: 'RO', name: 'Rumanía' },
  { code: 'RU', name: 'Rusia' },
  { code: 'SE', name: 'Suecia' },
  { code: 'CH', name: 'Suiza' },
  { code: 'TH', name: 'Tailandia' },
  { code: 'TR', name: 'Turquía' },
  { code: 'UA', name: 'Ucrania' },
  { code: 'ZA', name: 'Sudáfrica' },
];

// Bandera emoji desde el código ISO-2 (dos "regional indicator symbols").
export function flagEmoji(code) {
  if (!code || code.length !== 2) return '';
  const A = 0x1f1e6;
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65));
}

// Nombre legible desde el código (para mostrar el país guardado).
export function countryName(code) {
  return COUNTRIES.find((c) => c.code === code)?.name || code || '';
}
