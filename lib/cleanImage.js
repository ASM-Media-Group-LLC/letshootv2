// Limpia la metadata de una imagen re-codificándola en un <canvas> (se cae todo
// el EXIF/XMP/C2PA — queda "como un screenshot") y la devuelve en WebP alta
// calidad, sin perder calidad al ojo. Solo para imágenes raster estándar que el
// navegador sabe decodificar; para HEIC/GIF/video/archivos raros devuelve null
// y el que llama sube el original tal cual (no rompemos esos casos).
const CLEANABLE = /^image\/(jpeg|jpg|png|webp|avif|bmp)$/i;

export function canClean(file) {
  if (!file) return false;
  if (CLEANABLE.test(file.type || '')) return true;
  // Sin content-type: mirar la extensión.
  const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp'].includes(ext);
}

// Devuelve { blob, ext, type } | null. maxDim alto (2560) = casi nunca achica.
export function cleanImageToWebp(file, { maxDim = 2560, quality = 0.95 } = {}) {
  return new Promise((resolve) => {
    if (!canClean(file) || typeof document === 'undefined') { resolve(null); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => (blob ? resolve({ blob, ext: 'webp', type: 'image/webp' })
            : canvas.toBlob((b) => resolve(b ? { blob: b, ext: 'jpg', type: 'image/jpeg' } : null), 'image/jpeg', quality)),
          'image/webp', quality,
        );
      } catch { URL.revokeObjectURL(url); resolve(null); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
