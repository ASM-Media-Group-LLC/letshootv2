// ─────────────────────────────────────────────────────────────────────────
// strip-meta — saca la METADATA de una foto SIN re-codificarla (cero pérdida:
// los píxeles quedan byte a byte iguales). Sin dependencias; corre en el
// navegador y en node.
//
// REGLA DEL NEGOCIO: nada que llega a una modelo lleva metadata (EXIF, XMP,
// IPTC, C2PA «hecho con IA», comentarios/texto). Esto se corre sobre cada foto
// antes de meterla en un .zip o de guardarla.
//
//   stripImageMeta(u8, mimeOrExt) → Promise<Uint8Array>
//     · Devuelve una COPIA NUEVA limpia; nunca toca el arreglo de entrada.
//     · Formato desconocido (mp4, webm, gif…) o archivo que no se puede leer
//       bien → devuelve los bytes ORIGINALES tal cual. Nunca rompe una foto.
//   scanMeta(u8) → { exif, xmp, c2pa, iptc, text } (booleans; para tests).
//   detectFormat(u8) → 'jpeg' | 'png' | 'webp' | 'gif' | 'avif' | 'heic' |
//                      'mov' | 'mp4' | 'webm' | null   (por los primeros bytes)
//
// Qué se queda y qué se va, por formato:
//   · JPEG: se va APP1 (EXIF/XMP), APP2 que no sea ICC_PROFILE, APP3–APP15
//     (APP11 = JUMBF/C2PA, APP13 = IPTC/Photoshop), COM y lo que venga después
//     de EOI. Se queda SOI, APP0 JFIF (sin miniatura), APP2 ICC_PROFILE (el
//     color), DQT/SOF/DHT/DRI/SOS… EOI. Excepción deliberada: APP14 «Adobe» de
//     12 bytes (no lleva texto; dice cómo convertir el color — sin él una JPEG
//     RGB/CMYK se ve con los colores cambiados).
//   · PNG: solo chunks críticos + de dibujo (IHDR PLTE IDAT IEND tRNS gAMA cHRM
//     sRGB iCCP sBIT pHYs bKGD, + acTL/fcTL/fdAT de APNG para no matar la
//     animación). Se va tEXt/zTXt/iTXt/eXIf/tIME/caBX (C2PA) y todo lo demás.
//   · WebP: se va EXIF, «XMP », C2PA y cualquier chunk desconocido; en VP8X se
//     apagan las banderas EXIF (bit 3) y XMP (bit 2); se recalcula el tamaño
//     RIFF. Se queda VP8X/VP8/VP8L/ALPH/ANIM/ANMF/ICCP.
// ─────────────────────────────────────────────────────────────────────────

function toU8(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  return null;
}

const ascii = (u8, off, len) => {
  let s = '';
  for (let i = 0; i < len && off + i < u8.length; i++) s += String.fromCharCode(u8[off + i]);
  return s;
};
const be16 = (u8, o) => (u8[o] << 8) | u8[o + 1];
const be32 = (u8, o) => ((u8[o] << 24) >>> 0) + (u8[o + 1] << 16) + (u8[o + 2] << 8) + u8[o + 3];
const le32 = (u8, o) => (u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16)) + ((u8[o + 3] << 24) >>> 0);

// Junta pedazos (subarrays) en UN Uint8Array nuevo.
function concat(chunks) {
  let n = 0;
  for (const c of chunks) n += c.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export function detectFormat(input) {
  const u8 = toU8(input);
  if (!u8 || u8.length < 12) return null;
  if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return 'jpeg';
  if (u8[0] === 0x89 && ascii(u8, 1, 3) === 'PNG' && u8[4] === 0x0d && u8[5] === 0x0a && u8[6] === 0x1a && u8[7] === 0x0a) return 'png';
  if (ascii(u8, 0, 4) === 'RIFF' && ascii(u8, 8, 4) === 'WEBP') return 'webp';
  if (ascii(u8, 0, 4) === 'GIF8') return 'gif';
  if (ascii(u8, 4, 4) === 'ftyp') {
    // ISO-BMFF: por la marca. AVIF/HEIC también son «ftyp» — no son video.
    const brands = ascii(u8, 8, Math.min(32, u8.length - 8));
    if (/avif|avis/.test(brands)) return 'avif';
    if (/heic|heix|hevc|hevx|mif1|msf1/.test(brands)) return 'heic';
    if (brands.startsWith('qt  ')) return 'mov';
    return 'mp4';
  }
  if (u8[0] === 0x1a && u8[1] === 0x45 && u8[2] === 0xdf && u8[3] === 0xa3) return 'webm';
  return null;
}

// ── JPEG ──────────────────────────────────────────────────────────────────
// Recorre los marcadores. Después de cada SOS lee los datos de la imagen
// (entropía: FF00 = byte relleno, FFD0–FFD7 = reinicio) hasta el próximo
// marcador real, y sigue — así también limpia lo que venga entre barridos de
// una JPEG progresiva y corta todo lo pegado después de EOI.
function stripJpeg(u8) {
  const out = [u8.subarray(0, 2)]; // SOI
  let i = 2;
  const n = u8.length;
  let sawSOS = false;
  while (i < n) {
    if (u8[i] !== 0xff) {
      // Bytes sueltos entre segmentos (p. ej. un 00 de más): el decodificador
      // (libjpeg, el de Chrome) los salta con un aviso y la foto se ve igual.
      // Hacemos lo mismo — saltar hasta el próximo FF — en vez de rendirnos
      // (rendirse = devolver el original CON su EXIF).
      i++;
      continue;
    }
    let m = i + 1;
    while (m < n && u8[m] === 0xff) m++; // bytes de relleno FF FF…
    if (m >= n) break;
    const marker = u8[m];
    const segStart = m - 1; // el FF justo antes del marcador
    if (marker === 0xd9) { out.push(u8.subarray(segStart, m + 1)); return concat(out); } // EOI → fin (se va lo de atrás)
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { out.push(u8.subarray(segStart, m + 1)); i = m + 1; continue; }
    if (marker === 0x00) { i = m + 1; continue; } // FF 00 fuera de la imagen: libjpeg también lo descarta
    if (marker === 0xd8) return sawSOS ? concat([...out, u8.subarray(segStart)]) : null;
    if (m + 2 >= n) return sawSOS ? concat([...out, u8.subarray(segStart)]) : null;
    const len = be16(u8, m + 1); // incluye los 2 bytes del largo
    const end = m + 1 + len;
    if (len < 2 || end > n) return sawSOS ? concat([...out, u8.subarray(segStart)]) : null;
    const payload = m + 3; // arranque de los datos del segmento
    const plen = len - 2;

    let keep = true;
    if (marker === 0xe0) {
      // APP0: solo JFIF (sin miniatura). JFXX y otros → afuera.
      if (plen >= 14 && ascii(u8, payload, 5) === 'JFIF\0') {
        const jfif = new Uint8Array(18);
        jfif[0] = 0xff; jfif[1] = 0xe0; jfif[2] = 0; jfif[3] = 16;
        jfif.set(u8.subarray(payload, payload + 12), 4); // JFIF\0 + versión + unidades + densidad
        jfif[16] = 0; jfif[17] = 0; // miniatura 0×0
        out.push(jfif);
      }
      keep = false;
    } else if (marker === 0xe1) {
      keep = false; // EXIF / XMP
    } else if (marker === 0xe2) {
      keep = plen >= 12 && ascii(u8, payload, 12) === 'ICC_PROFILE\0'; // color sí; FPXR/MPF no
    } else if (marker === 0xee) {
      keep = plen === 12 && ascii(u8, payload, 5) === 'Adobe'; // transformación de color, sin texto
    } else if (marker >= 0xe3 && marker <= 0xef) {
      keep = false; // APP3–APP15 (APP11 JUMBF/C2PA, APP13 IPTC/Photoshop…)
    } else if (marker === 0xfe) {
      keep = false; // COM
    }
    if (keep) out.push(u8.subarray(segStart, end));
    i = end;

    if (marker === 0xda) {
      // SOS: datos comprimidos hasta el próximo marcador real.
      sawSOS = true;
      let j = end;
      while (j < n) {
        if (u8[j] !== 0xff) { j++; continue; }
        const b = u8[j + 1];
        if (b === 0x00 || (b >= 0xd0 && b <= 0xd7)) { j += 2; continue; }
        if (b === 0xff) { j++; continue; }
        break;
      }
      if (j >= n) { out.push(u8.subarray(end)); return concat(out); } // sin EOI: igual se copia (nunca romper)
      out.push(u8.subarray(end, j));
      i = j;
    }
  }
  return sawSOS ? concat(out) : null;
}

// ── PNG ───────────────────────────────────────────────────────────────────
const PNG_KEEP = new Set([
  'IHDR', 'PLTE', 'IDAT', 'IEND',
  'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'pHYs', 'bKGD',
  'acTL', 'fcTL', 'fdAT', // APNG: animación, sin texto
]);
function stripPng(u8) {
  const out = [u8.subarray(0, 8)];
  let i = 8;
  const n = u8.length;
  let sawIHDR = false;
  while (i + 12 <= n) {
    const len = be32(u8, i);
    const type = ascii(u8, i + 4, 4);
    const end = i + 12 + len;
    if (end > n || !/^[A-Za-z]{4}$/.test(type)) return null;
    if (type === 'IHDR') sawIHDR = true;
    // Crítico desconocido (primera letra mayúscula) → se deja: sacarlo sí rompería.
    const critical = type.charCodeAt(0) >= 65 && type.charCodeAt(0) <= 90;
    if (PNG_KEEP.has(type) || critical) out.push(u8.subarray(i, end));
    i = end;
    if (type === 'IEND') return sawIHDR ? concat(out) : null; // lo pegado atrás se va
  }
  return null; // sin IEND: archivo cortado → original
}

// ── WebP (RIFF) ───────────────────────────────────────────────────────────
const WEBP_KEEP = new Set(['VP8X', 'VP8 ', 'VP8L', 'ALPH', 'ANIM', 'ANMF', 'ICCP']);
function stripWebp(u8) {
  const n = u8.length;
  const riffEnd = Math.min(n, 8 + le32(u8, 4)); // lo que venga después del RIFF se va
  const chunks = [];
  let i = 12;
  let sawImage = false;
  while (i + 8 <= riffEnd) {
    const type = ascii(u8, i, 4);
    const size = le32(u8, i + 4);
    const dataEnd = i + 8 + size;
    if (dataEnd > riffEnd) return null;
    const end = Math.min(riffEnd, dataEnd + (size & 1)); // relleno a par
    if (type === 'VP8 ' || type === 'VP8L' || type === 'ANMF') sawImage = true;
    if (WEBP_KEEP.has(type)) {
      if (type === 'VP8X' && size >= 1) {
        const c = u8.slice(i, end); // copia: acá sí cambiamos un byte
        c[8] &= ~(0x08 | 0x04); // apaga EXIF (bit 3) y XMP (bit 2)
        chunks.push(c);
      } else {
        chunks.push(u8.subarray(i, end));
      }
    }
    i = end;
  }
  if (!sawImage) return null;
  let body = 4; // 'WEBP'
  for (const c of chunks) body += c.length;
  const head = new Uint8Array(12);
  head.set(u8.subarray(0, 4), 0); // 'RIFF'
  head[4] = body & 0xff; head[5] = (body >>> 8) & 0xff; head[6] = (body >>> 16) & 0xff; head[7] = (body >>> 24) & 0xff;
  head.set(u8.subarray(8, 12), 8); // 'WEBP'
  return concat([head, ...chunks]);
}

// mimeOrExt es solo una pista: manda lo que dicen los bytes (una .webp que en
// realidad es JPEG se limpia como JPEG).
export async function stripImageMeta(input, mimeOrExt) { // eslint-disable-line no-unused-vars
  const u8 = toU8(input);
  if (!u8) return input;
  try {
    const fmt = detectFormat(u8);
    let out = null;
    if (fmt === 'jpeg') out = stripJpeg(u8);
    else if (fmt === 'png') out = stripPng(u8);
    else if (fmt === 'webp') out = stripWebp(u8);
    // gif / avif / heic / mp4 / mov / webm / desconocido → tal cual (esta lib
    // no los toca; el que llama decide).
    if (!out || out.length === 0) return input;
    // Si por algún motivo la salida no es del mismo formato, no nos arriesgamos.
    if (detectFormat(out) !== fmt) return input;
    return out;
  } catch {
    return input;
  }
}

// ── scanMeta: ¿queda algo? (estructura + textos delatores) ───────────────
function indexOfBytes(u8, pat, from = 0) {
  const first = pat[0];
  const last = u8.length - pat.length;
  outer: for (let i = from; i <= last; i++) {
    if (u8[i] !== first) continue;
    for (let k = 1; k < pat.length; k++) if (u8[i + k] !== pat[k]) continue outer;
    return i;
  }
  return -1;
}
const enc = (s) => Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);
const has = (u8, s) => indexOfBytes(u8, enc(s)) !== -1;
const hasAny = (u8, list) => list.some((s) => has(u8, s));

export function scanMeta(input) {
  const u8 = toU8(input);
  const r = { exif: false, xmp: false, c2pa: false, iptc: false, text: false };
  if (!u8) return r;
  const fmt = detectFormat(u8);

  // Estructura por formato.
  try {
    if (fmt === 'jpeg') {
      let i = 2;
      while (i + 4 <= u8.length) {
        if (u8[i] !== 0xff) { i++; continue; } // bytes sueltos: el decodificador los salta
        const mk = u8[i + 1];
        if (mk === 0xda || mk === 0xd9) break;
        if (mk === 0xff) { i++; continue; }
        if (mk === 0x00 || mk === 0x01 || (mk >= 0xd0 && mk <= 0xd7)) { i += 2; continue; }
        const len = be16(u8, i + 2);
        const p = i + 4;
        if (mk === 0xe1) {
          if (ascii(u8, p, 4) === 'Exif') r.exif = true;
          else r.xmp = true;
        } else if (mk === 0xe2 && ascii(u8, p, 12) !== 'ICC_PROFILE\0') r.text = true;
        else if (mk === 0xeb) r.c2pa = true;
        else if (mk === 0xed) r.iptc = true;
        else if (mk === 0xfe) r.text = true;
        else if (mk >= 0xe3 && mk <= 0xef && !(mk === 0xee && len === 14)) r.text = true;
        i += 2 + len;
      }
    } else if (fmt === 'png') {
      let i = 8;
      while (i + 12 <= u8.length) {
        const len = be32(u8, i);
        const t = ascii(u8, i + 4, 4);
        if (t === 'eXIf') r.exif = true;
        else if (t === 'caBX') r.c2pa = true;
        else if (t === 'tEXt' || t === 'zTXt' || t === 'iTXt' || t === 'tIME') r.text = true;
        else if (!PNG_KEEP.has(t)) r.text = true;
        i += 12 + len;
        if (t === 'IEND') { if (i < u8.length) r.text = true; break; }
      }
    } else if (fmt === 'webp') {
      let i = 12;
      const end = Math.min(u8.length, 8 + le32(u8, 4));
      while (i + 8 <= end) {
        const t = ascii(u8, i, 4);
        const size = le32(u8, i + 4);
        if (t === 'EXIF') r.exif = true;
        else if (t === 'XMP ') r.xmp = true;
        else if (t === 'C2PA') r.c2pa = true;
        else if (t === 'VP8X' && (u8[i + 8] & 0x0c)) r.text = true; // bandera prendida sin chunk
        else if (!WEBP_KEEP.has(t)) r.text = true;
        i += 8 + size + (size & 1);
      }
    }
  } catch { /* scan estructural roto: siguen los textos */ }

  // Textos delatores en TODO el archivo (también adentro de un perfil ICC o
  // pegado atrás del final).
  if (has(u8, 'Exif\0\0')) r.exif = true;
  if (hasAny(u8, ['http://ns.adobe.com/xap/1.0/', 'x:xmpmeta', 'XML:com.adobe.xmp', '<?xpacket'])) r.xmp = true;
  if (hasAny(u8, ['c2pa', 'C2PA', 'jumd', 'contentauth', 'contentcredentials'])) r.c2pa = true;
  if (hasAny(u8, ['Photoshop 3.0', 'Raw profile type iptc', 'Raw profile type 8bim'])) r.iptc = true;
  if (hasAny(u8, ['Made with AI', 'made with AI', 'Made with ai', 'made with ai', 'trainedAlgorithmicMedia', 'compositeSynthetic', 'AI generated', 'AI-generated', 'Lavc', 'Lavf'])) r.text = true;
  return r;
}
