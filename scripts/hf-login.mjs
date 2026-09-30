#!/usr/bin/env node
// Conecta UNA cuenta de Higgsfield al CLI de esta Mac (la del cocinero) SIN tocar el login de siempre
// (~/.config/higgsfield = Cuenta 1, la de Julia). Cada cuenta tiene su propio login en:
//   ~/.config/higgsfield/accounts/<account_id>/credentials.json + config.json   (carpeta con permisos 700)
// y el cocinero (scripts/kitchen-worker.mjs) cocina a cada modelo con el login de SU cuenta.
//
// Uso:   node scripts/hf-login.mjs <account_id>                              → login en el navegador + workspace + chequeo
//        node scripts/hf-login.mjs <account_id> --check                      → sin login: elige workspace (si hay 1) y muestra el estado
//        node scripts/hf-login.mjs <account_id> --check --workspace <ws_id>  → elige ESE workspace (si la cuenta tiene varios)
// El <account_id> sale en /conexion → Cuentas de Higgsfield (botón copiar).
// Nunca imprime tokens ni lee el archivo de credenciales.
// OJO: nunca corras `higgsfield workspace set …` a mano SIN el env de la cuenta: eso escribe el config de SIEMPRE
// (~/.config/higgsfield/config.json = el de Julia). Para elegir el workspace de esta cuenta usá --workspace acá.
import { mkdirSync, chmodSync, existsSync, readFileSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LEGACY_HF_ACCOUNT = '06efe22b-68f2-4cfd-b9ca-8a2849d37933'; // Cuenta 1 = login de siempre (Julia)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HF_HOME = join(homedir(), '.config', 'higgsfield');
const ACC_DIR = join(HF_HOME, 'accounts');

const id = String(process.argv[2] || '').trim().toLowerCase();
const checkOnly = process.argv.includes('--check');
const wsFlag = process.argv.indexOf('--workspace');
const wantWs = wsFlag > -1 ? String(process.argv[wsFlag + 1] || '').trim() : '';
const say = (s = '') => console.log(s);
const loud = (s) => { say(''); say('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'); say(`!!  ${s}`); say('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'); say(''); };

if (!UUID_RE.test(id)) {
  say('Uso: node scripts/hf-login.mjs <account_id>   (el id está en /conexion → Cuentas de Higgsfield)');
  process.exit(1);
}
if (id === LEGACY_HF_ACCOUNT) {
  say('Esa es la Cuenta 1 (la de Julia): usa el login de SIEMPRE del CLI (~/.config/higgsfield). No se toca desde acá.');
  process.exit(1);
}
if (wsFlag > -1 && !wantWs) { say('Falta el id del workspace después de --workspace.'); process.exit(1); }

const dir = join(ACC_DIR, id);
const cred = join(dir, 'credentials.json');
const conf = join(dir, 'config.json');
// env de ESTA cuenta: su propio login + su propio config (workspace). Sin HIGGSFIELD_WORKSPACE_ID heredado.
const env = { ...process.env, HIGGSFIELD_CREDENTIALS_PATH: cred, HIGGSFIELD_CONFIG_PATH: conf };
delete env.HIGGSFIELD_WORKSPACE_ID;

function hf(args, { inherit = false, legacy = false } = {}) {
  const r = spawnSync('higgsfield', args, { env: legacy ? process.env : env, stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: inherit ? 15 * 60 * 1000 : 30000 });
  if (r.error) return { ok: false, err: String(r.error.message || r.error) };
  return { ok: r.status === 0, out: r.stdout || '', err: String(r.stderr || '').replace(/\s+/g, ' ').trim() };
}
function hfJson(args, opts) {
  const r = hf([...args, '--json'], opts);
  if (!r.ok) return { ok: false, err: r.err || r.out };
  try { return { ok: true, data: JSON.parse(r.out) }; } catch { return { ok: false, err: 'respuesta no-JSON del CLI' }; }
}
// Error del CLI SIN su "Hint: Run: hf workspace set …": ese comando, corrido sin el env de esta cuenta, pisaría el
// config de siempre (el de Julia). Nunca se lo mostramos al dueño.
const cleanErr = (s) => String(s || '').replace(/\s+/g, ' ').replace(/\s*Hint:.*$/i, '').trim();
const readWs = (p) => { try { return JSON.parse(readFileSync(p, 'utf8'))?.workspace_id || null; } catch { return null; } };
const legacyWs = () => process.env.HIGGSFIELD_WORKSPACE_ID || readWs(process.env.HIGGSFIELD_CONFIG_PATH || join(HF_HOME, 'config.json'));
const pickCmd = `node scripts/hf-login.mjs ${id} --check --workspace <workspace_id>`;
// Si la cuenta quedó logueada con la de Julia (o su workspace), se aparta el login Y su config (workspace) para que el
// cocinero NO la use y para que la próxima corrida arranque limpia (sin arrastrar el workspace equivocado).
function quarantine(why) {
  loud(why);
  const ts = Date.now();
  for (const [p, what] of [[cred, 'ese login'], [conf, 'su config (workspace)']]) {
    try { if (existsSync(p)) { const to = `${p}.equivocada-${ts}`; renameSync(p, to); say(`Aparté ${what} (${to}) para que el cocinero NO lo use.`); } } catch (e) { say(`No pude apartar ${p}: ${e.message}. Borralo a mano.`); }
  }
  say('Cerrá sesión de higgsfield.ai en el navegador (o usá una ventana privada) y corré de nuevo:');
  say(`  node scripts/hf-login.mjs ${id}`);
  process.exit(2);
}

// 0) El CLI existe
if (!hf(['version']).ok) { say('No encuentro el CLI `higgsfield` (brew install / PATH).'); process.exit(1); }

// 1) Con qué cuenta está el login de siempre (Cuenta 1 / Julia) — para comparar. (Solo lectura.)
const legacySt = hfJson(['account', 'status'], { legacy: true });
const legacyEmail = legacySt.ok && typeof legacySt.data?.email === 'string' ? legacySt.data.email.toLowerCase() : null;
const lws = legacyWs();
say(`Cuenta 1 (Julia, login de siempre): ${legacyEmail || '(no se pudo leer)'}${legacySt.ok && typeof legacySt.data?.credits === 'number' ? ` · ${legacySt.data.credits} créd` : ''}`);

// 2) Carpeta propia de esta cuenta (700)
mkdirSync(dir, { recursive: true, mode: 0o700 });
try { chmodSync(ACC_DIR, 0o700); chmodSync(dir, 0o700); } catch { /* noop */ }

// 3) Login en el navegador (OAuth). Ojo: si el navegador tiene abierta la sesión de la cuenta VIEJA, la autoriza sola.
if (!checkOnly) {
  say('');
  say(`Conectando la cuenta ${id}`);
  say('IMPORTANTE: entrá con la cuenta NUEVA de Higgsfield, NO con la de Julia.');
  say('Si el navegador ya tiene abierta la sesión vieja: cerrá sesión en higgsfield.ai antes, o copiá el link que');
  say('imprime el CLI y abrilo en una VENTANA PRIVADA.');
  say('');
  const lr = hf(['auth', 'login'], { inherit: true });
  if (!lr.ok) { say(''); say(`El login no terminó bien${lr.err ? ` (${cleanErr(lr.err).slice(0, 160)})` : ''}. Probá de nuevo.`); process.exit(1); }
  try { if (existsSync(cred)) chmodSync(cred, 0o600); } catch { /* noop */ }
}
if (!existsSync(cred)) { say(`Esta cuenta todavía no tiene login en la Mac. Corré: node scripts/hf-login.mjs ${id}`); process.exit(1); }

// 4) Workspace (el que paga) PRIMERO: sin workspace elegido el CLI no contesta nada más (`account status`,
//    `soul-id list` → "No workspace selected"), y `auth login` no elige ninguno. `workspace list` sí anda sin workspace.
//    Uno solo → se elige solo. Varios → lista y se elige con --workspace. Todo con el env de ESTA cuenta.
const wl = hfJson(['workspace', 'list']);
if (!wl.ok) {
  const e = cleanErr(wl.err);
  say(`No pude listar los workspaces de esta cuenta: ${e.slice(0, 200) || 'sin detalle'}`);
  if (/auth login|unauthori[sz]ed|\b401\b|\b403\b|forbidden|not logged|credentials|token/i.test(e)) say(`El login no quedó bien. Corré de nuevo: node scripts/hf-login.mjs ${id}`);
  process.exit(1);
}
const wss = (Array.isArray(wl.data) ? wl.data : []).filter((w) => w && w.id);
const wsIds = new Set(wss.map((w) => String(w.id)));
const isJuliaWs = (wid) => !!(lws && String(wid) === lws);
const listWs = () => wss.forEach((w, i) => say(`  ${i + 1}) ${w.id}  ·  ${w.name || '(sin nombre)'}  ·  plan ${w.plan_type || '?'}  ·  ${typeof w.credits === 'number' ? `${w.credits} créd` : '? créd'}${isJuliaWs(w.id) ? '   ← el de la Cuenta 1 (Julia): NO' : ''}`));
let chosen = readWs(conf);
// Un workspace guardado que es el de Julia, o que esta cuenta ni tiene (config viejo/equivocado) = no sirve: se limpia.
if (chosen && (isJuliaWs(chosen) || !wsIds.has(String(chosen)))) {
  hf(['workspace', 'unset']);
  chosen = null;
}
if (wantWs) {
  if (!wsIds.has(wantWs)) { say(`Ese workspace (${wantWs}) no es de esta cuenta. Los que tiene:`); listWs(); process.exit(1); }
  if (isJuliaWs(wantWs)) { say('Ese es el workspace de la Cuenta 1 (el de Julia): le cobraría a esa. Elegí otro de la lista:'); listWs(); process.exit(2); }
  if (chosen !== wantWs) {
    const sr = hf(['workspace', 'set', wantWs]);
    if (!sr.ok) { say(`No pude elegir el workspace: ${cleanErr(sr.err).slice(0, 160)}`); process.exit(1); }
    chosen = readWs(conf) || wantWs;
  }
} else if (!chosen) {
  if (wss.length === 0) {
    say('Esta cuenta no tiene ningún workspace, y el CLI de Higgsfield no genera sin uno elegido.');
    say(`Creá (o aceptá la invitación a) un workspace con esta cuenta en higgsfield.ai y después corré: node scripts/hf-login.mjs ${id} --check`);
    process.exit(1);
  }
  if (wss.length === 1) {
    const w = wss[0];
    if (isJuliaWs(w.id)) quarantine('OJO: el único workspace de esta cuenta es el de la Cuenta 1 (el de Julia): le cobraría a esa. Logueate con la cuenta NUEVA (la que tiene su propio workspace con los créditos de las modelos).');
    const sr = hf(['workspace', 'set', String(w.id)]);
    if (!sr.ok) { say(`No pude elegir el workspace: ${cleanErr(sr.err).slice(0, 160)}`); process.exit(1); }
    chosen = readWs(conf) || String(w.id);
  } else {
    say('');
    say('Esta cuenta tiene varios workspaces. Elegí el que tiene los créditos de las modelos (NO el de Julia):');
    listWs();
    say('');
    say('y corré (con TU id de workspace):');
    say(`  ${pickCmd}`);
    process.exit(3);
  }
}
if (!chosen) { say(`Esta cuenta quedó sin workspace elegido. Corré: ${pickCmd}`); process.exit(1); }
if (isJuliaWs(chosen)) quarantine('OJO: esta cuenta quedó con el MISMO workspace que la Cuenta 1 (la de Julia): le cobraría a esa.');

// 5) ¿Con qué cuenta quedó? (email + créditos) — recién ahora, con el workspace ya elegido.
const st = hfJson(['account', 'status']);
if (!st.ok) {
  if (/no workspace selected/i.test(String(st.err))) say(`El CLI dice que esta cuenta no tiene workspace elegido. Corré: ${pickCmd}`);
  else say(`El login quedó guardado pero el CLI no responde: ${cleanErr(st.err).slice(0, 200) || 'sin detalle'}`);
  process.exit(1);
}
const email = typeof st.data?.email === 'string' ? st.data.email : null;
if (email && legacyEmail && email.toLowerCase() === legacyEmail) {
  quarantine(`OJO: te logueaste con la MISMA cuenta que la Cuenta 1 (${email}). Esa es la de Julia — esta tiene que ser la cuenta NUEVA.`);
}
if (!legacyEmail) loud('No pude leer el email de la Cuenta 1 para comparar: confirmá a ojo que el email de abajo NO sea el de Julia. (El cocinero no va a usar esta cuenta hasta poder compararlo.)');

// 6) Resumen para confirmar
const ws2 = hfJson(['workspace', 'status']);
const souls = hfJson(['soul-id', 'list', '--soul-2', '--size', '100']);
say('');
say('──────────── Resultado ────────────');
say(`Cuenta ${id}`);
say(`  Logueada como: ${email || '(sin email)'}${legacyEmail ? `   (Julia/Cuenta 1: ${legacyEmail})` : ''}`);
say(`  Créditos (cuenta): ${typeof st.data?.credits === 'number' ? st.data.credits : '?'}`);
say(`  Workspace: ${ws2.ok ? `${ws2.data?.id || '?'} · plan ${ws2.data?.plan_type || '?'} · ${typeof ws2.data?.credits === 'number' ? `${ws2.data.credits} créd` : '? créd'}` : chosen}`);
if (ws2.ok && typeof st.data?.credits === 'number' && typeof ws2.data?.credits === 'number' && Math.abs(st.data.credits - ws2.data.credits) > 1) {
  say('  (ojo: los créditos de la cuenta y del workspace no coinciden — el cocinero mide con los de la cuenta)');
}
if (souls.ok && Array.isArray(souls.data)) {
  say(`  Souls 2.0 en esta cuenta (${souls.data.length}):`);
  souls.data.forEach((s) => say(`    · ${s.name || '(sin nombre)'}  ${s.id}  [${s.status || '?'}]`));
  say('  → En /conexion → «Modelos → cuenta» pegale a cada modelo SU Soul de esta lista.');
} else say(`  Souls: no pude listarlas (${cleanErr(souls.err).slice(0, 120)})`);
say('');
say('Listo. El cocinero la toma solo en su próximo chequeo (~1 min). En /conexion vas a ver «Login en la Mac: listo».');
