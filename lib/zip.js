// ZIP mínimo en el navegador, SIN dependencias (método "store" = sin comprimir;
// las fotos ya vienen comprimidas). Suficiente para bajar varias fotos "de golpe"
// en un solo archivo, fácil de mandar por WhatsApp/correo/Telegram.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const u16 = (n) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
const u32 = (n) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);

// files: [{ name: string, data: Uint8Array }] → Blob (application/zip)
export function buildZip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  const push = (arr) => { parts.push(arr); offset += arr.length; };

  for (const f of files) {
    const name = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);
    const localStart = offset;
    // Local file header
    push(u32(0x04034b50)); push(u16(20)); push(u16(0)); push(u16(0)); // sig, ver, flag, method=store
    push(u16(0)); push(u16(0));                                        // mod time, mod date
    push(u32(crc)); push(u32(data.length)); push(u32(data.length));    // crc, comp size, uncomp size
    push(u16(name.length)); push(u16(0));                              // name len, extra len
    push(name);
    push(data);
    // Central directory entry (se arma aparte, se concatena al final)
    const cd = [];
    const cpush = (arr) => cd.push(arr);
    cpush(u32(0x02014b50)); cpush(u16(20)); cpush(u16(20)); cpush(u16(0)); cpush(u16(0));
    cpush(u16(0)); cpush(u16(0)); cpush(u32(crc)); cpush(u32(data.length)); cpush(u32(data.length));
    cpush(u16(name.length)); cpush(u16(0)); cpush(u16(0)); cpush(u16(0)); cpush(u16(0)); cpush(u32(0));
    cpush(u32(localStart)); cpush(name);
    central.push(cd);
  }

  const centralStart = offset;
  let centralSize = 0;
  const centralParts = [];
  for (const cd of central) for (const p of cd) { centralParts.push(p); centralSize += p.length; }

  const eocd = [
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralSize), u32(centralStart), u16(0),
  ];
  return new Blob([...parts, ...centralParts, ...eocd], { type: 'application/zip' });
}
