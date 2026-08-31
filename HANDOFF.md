# LetShoot — Handoff al próximo dev

> Este documento es el punto de entrada. Léelo primero, después leé los README de cada repo y `CLAUDE.md` si existe. Todo lo que necesitás está referenciado desde acá.

Última actualización: 2026-08-26 · Autor de la entrega: Alvaro (rusin24@gmail.com).

---

## 1) Qué es LetShoot

Plataforma que vende contenido generado por IA para creadoras de OnlyFans y sus agencias, con proceso interno de curaduría y entrega.

Dos productos:
- **Sitio principal** (este repo) — portal público + panel de admin, agencias, staff y creadoras.
- **Plataforma interna** (`~/letshoot-internal`, repo aparte) — motor de generación con Higgsfield conectado. **Todavía en fase 1/1.5 — no está en producción.**

Idioma del portal: **es** (staff) + **en/de/it/fr** (creadora / portal público). El landing marketing soporta 7 (agregar pt/zh cuando se avance).

---

## 2) Acceso — pedile al owner esto ANTES de tocar código

Ordenado por criticidad. Sin esto no podés hacer prácticamente nada:

| # | Recurso | Para qué | Cómo llega |
|---|---|---|---|
| 1 | **GitHub · org `ASM-Media-Group-LLC`** | Repo `letshootv2` (sitio principal) + `letshoot-internal` (plataforma nueva) | Invitación al team `dev` desde GitHub |
| 2 | **Vercel** — proyecto `letshootv2` | Deploy · env vars de producción · logs · dominios | Invitación al team de Vercel de la org |
| 3 | **Supabase** — proyecto ref `grbvkwolcjcqxfsiytox` | Base de datos, RLS, migraciones, edge functions, storage buckets | Invitación como developer al proyecto |
| 4 | **GoDaddy** — dominio `letshoot.ai` | DNS · SPF/DKIM para email · subdominio `make.letshoot.ai` | Compartir cuenta de GoDaddy (o usar 2FA + one-time) |
| 5 | **Resend** — cuenta de emails | Emails transaccionales (invites, KYC, avisos) | Owner tiene la API key en Vercel env vars |
| 6 | **Higgsfield** — cloud + web app (rusin24@gmail.com) | Generación de contenido con la LoRA Julia Parker + creación de nuevas LoRAs | Compartir credenciales de Clerk o cambiar la cuenta a un email de dev |
| 7 | **fal.ai** | (opcional) Alternativa API-nativa para entrenar LoRAs portables | Cuenta separada + tarjeta |
| 8 | **muapi.ai** | (opcional) Fallback económico para inferencia con LoRA | La cuenta actual (rusin24@) tiene ~$29 de saldo |

**Al recibir acceso, HACER ESTOS 3 PASOS PRIMERO (seguridad):**

1. **Revocar y regenerar los API keys que aparecen en `~/letshoot-internal/.env`** (Higgsfield + fal.ai). Están en el archivo local de esta Mac. Cuando el owner o vos migren esa cuenta, esos secretos ya fueron vistos por otro proceso.
2. **Rotar el SUPABASE_SERVICE_ROLE_KEY** desde Supabase → Settings → API. El dueño anterior tenía acceso.
3. **Confirmar que el `.env.local` del sitio principal existe SOLO local** (nunca se comitea — está en `.gitignore`).

---

## 3) Repos — qué es qué

### 3.1 `letshootv2` (este repo — sitio principal)

- **Stack:** Next.js 14 App Router (JSX, no TS) · Tailwind · Supabase JS · Resend.
- **Deploy:** Vercel, autodeploy en push a `main`.
- **URL producción:** `letshoot.ai` + subdominio `make.letshoot.ai` (redirige internamente a `/make`, ver `middleware.js`).
- **Auth:** Supabase Auth (email/password + email confirmation).
- **Base de datos:** Supabase Postgres — schema en `supabase/migrations/`. Última migración es `0060_agents_and_referrals.sql`.
- **Storage buckets Supabase:**
  - `deliveries` — fotos generadas entregadas a la creadora
  - `identity` — documentos de KYC (encriptado, acceso restringido)
  - `assets` — biblioteca general
  - `avatars`, `agency-media`, etc.
- **RLS:** Todas las tablas críticas tienen RLS activo. No la desactives.

**Convención de tokens de diseño (importante — leer antes de tocar UI):**
- Colores: `ink`, `ink-2`, `card`, `paper`, `paper-mute`, `paper-dim`, `line`, `hair`
- Marca: `brand` (#00B1F6, cyan) + `brand-deep` (#0A84FF) + `sky` (#7FE0FF) — **no meter otras familias de color, siempre azul**
- Utilities 3D en `app/globals.css`: `.btn3d`, `.btn3d-ghost`, `.card3d`, `.card3d-active`, `.card3d-warn`, `.card3d-bad`, `.card3d-ok`, `.tab3d-active`
- Componentes clave compartidos:
  - `components/PortalHeader.jsx` — top bar unificado de todo el portal interno (avatar dropdown con idioma/tema/salir)
  - `components/StatusDot.jsx` — pills estilo Linear/Notion (`<StatusDot tone="brand|warn|bad|ok|zinc">…</StatusDot>` y `<StatusBanner>`)
  - `components/Avatar.jsx` — el `src` es `src=`, no `url=`, y size es string `xs|sm|md|lg`
- Fuentes: Poppins (display) + Inter (sans) + Instrument Serif (headings de marketing) — `app/layout.jsx`
- Ver `app/preview/estilo/` para muestra en vivo de todo el design system.

**Rutas principales:**

| Ruta | Quién entra | Qué hace |
|---|---|---|
| `/` | Público | Landing marketing (7 idiomas) |
| `/agency` | Público | Landing para agencias (falta traducción pt/zh — ver §8) |
| `/login`, `/signup`, `/forgot`, `/reset` | Público | Auth |
| `/onboarding/*` | Creadora | Registro de identidad, plan, LoRA |
| `/panel` | Creadora | Su panel privado (biblioteca, ventas, LoRA, cuenta) |
| `/lora` | Creadora | Uploader de fotos para entrenar su LoRA |
| `/cuenta` | Creadora | Datos + suscripción |
| `/trabajo` | Staff (uploader/producer/chatter) | Cola de pedidos, entrega, creadoras |
| `/admin` | Admin/owner | Registros, métricas, verificaciones, equipo, agencias, actividad |
| `/agencia` | Owner de agencia | Panel de la agencia (modelos + ingresos) |
| `/agente` | Agente vendedor | Ver referidos que trajo |
| `/owner` | Solo owner | Herramientas de sistema y demos |
| `/sales` | Admin | Libro manual de ingresos |
| `/report` | Admin | Reportes |
| `/preview/*` | Owner/dev | **Previews de features en desarrollo**: `nueva-propuesta`, `propuesta` (link público), `propuesta-admin`, `admin` (tab presentaciones), `estilo` (design system) |
| `/make` | Público | Subdominio `make.letshoot.ai` — próxima línea de producto |

**Middleware (`middleware.js`):**
- Reescribe `make.letshoot.ai/*` → `/make/*`.
- Gate de sesión para `/panel /admin /onboarding /trabajo /cuenta /agencia /agente /owner /sales`. Sin sesión → `/login`.

### 3.2 `letshoot-internal` — motor de generación (repo aparte, `~/letshoot-internal`)

- **Stack:** Next.js 14 + TypeScript + Drizzle + Postgres + Redis + BullMQ + MinIO + Vitest.
- **Estado:** Fase 1 y 1.5 terminadas (dominio, cola, proveedor simulado, endurecimiento). **No está en producción todavía.**
- **Cómo levantar:** `docker compose up -d` + `npm install` + `npm run db:migrate` + `npm run db:seed` + `npm run dev` (puerto 3100).
- **Documentación completa:** `README.md` de ese repo. Léelo antes de tocar nada.
- **60 tests con Vitest** (32 fase 1 + 28 fase 1.5) — verdes cuando lo dejé.
- **Higgsfield conectado:** Sí (auth verificada) pero el Soul de Julia entrenado en la web NO es accesible por la API pública (limitación de Higgsfield — spec §0). Ver `HANDOFF.md` de ese repo (§4) para el análisis completo de las alternativas.

---

## 4) Estado actual — qué está deployado y qué no

### En producción (letshootv2 rama `main` = Vercel)

Todo hasta el commit `4c916ba` (`infra(make): routing por subdominio`).

### En mi Mac, sin commitear (⚠️ ACCIÓN REQUERIDA)

En este repo hay **20 archivos modificados** que NO están en `main` todavía. Son los diseños nuevos (rediseño 3D azul, PortalHeader unificado, StatusDot, rediseño de la sección de propuestas, correcciones i18n).

**Trabajo pendiente antes de mergearlos:**
1. Ver diff completo — `cd '~/Lets Shoot new' && git diff`
2. Probar cada página con sesión real en dev (`npm run dev`)
3. Aplicar el mismo pase de `StatusDot` + `MetricStrip` que hice en `/admin` en el resto: `/trabajo`, `/agencia`, `/panel`, `/agente`
4. Commit granular por área (design system, portalheader, admin, propuestas)
5. Push a `main` → autodeploy a Vercel
6. Verificación visual en producción con las 5 cuentas reales (ver §7)

Cambios listos pero sin mergear:
- **Design system 3D** (`app/globals.css`): botones/cards con bisel + gradiente vertical + sombras multicapa
- **PortalHeader** unificado en 5 páginas (avatar dropdown con idioma/tema/salir)
- **StatusDot / StatusBanner** aplicados en `/admin` (Registros + Métricas)
- **MetricStrip densa** en /admin registros
- **Módulo de propuestas** completo en `/preview/*` (nueva-propuesta, propuesta, propuesta-admin, admin/tab presentaciones)
- **i18n de portal** ampliado a de/it/fr (`lib/portal-i18n.js` + `lib/propuesta-i18n.js` nuevo)
- **Bug fixes** de la auditoría (§8)

---

## 5) Features en desarrollo — el módulo Presentaciones

Es la mitad del último trabajo. Está TODO en `/preview/*` como demos navegables sin base de datos:

- `/preview/admin` — Cómo se ve el tab "Presentaciones" en /admin (con lista + botón crear).
- `/preview/nueva-propuesta` — Wizard 3 pasos (elegir modelo → armar paquete → publicar link con QR).
- `/preview/propuesta` — Cómo lo ve el receptor (formato minimal fullscreen scroll, feedback anónimo, 5 idiomas).
- `/preview/propuesta-admin` — Editor completo (baúl con filtros + drag & drop).

**Para llevarlo a producción faltan:**
1. Tablas Supabase: `packages`, `package_items`, `package_feedback`, `package_views` (schema propuesto en `HANDOFF.md` del subproyecto).
2. Endpoints Next: create/update/publish/feedback.
3. Integración con `/admin` real como tab nuevo "Presentaciones".
4. Notificación a la modelo por email + en su `/panel`.
5. Trigger de vencimiento automático (cron o edge function).

Ver §9 del `README.md` principal para la spec funcional que definió el owner (baúl, filtros, formato IG, watermark, anónimo, editable).

---

## 6) Correr localmente

```bash
# Sitio principal
cd '~/Lets Shoot new'
cp .env.example .env.local  # si no existe (pedir al owner los valores reales)
npm install
npm run dev  # http://localhost:3000

# Plataforma interna (opcional, la mayoría no la necesitás para el sitio)
cd ~/letshoot-internal
docker compose up -d
npm install
npm run db:migrate && npm run db:seed
npm run dev  # http://localhost:3100
```

`.env.local` que se necesita para el sitio principal (pedile al owner los valores reales — están en Vercel → Settings → Environment Variables):
- `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` · `NEXT_PUBLIC_SITE_URL`
- (opcional en local) `HIGGSFIELD_KEY_ID` · `HIGGSFIELD_KEY_SECRET`

---

## 7) Cuentas reales en el sistema — no borrar como "demo"

Hay 6 cuentas reales que se usan para probar/operar. NO son dummies:

- `rusin24@gmail.com` — **Owner (Alvaro)** — admin, la cuenta principal
- `grace@…` — 2do admin
- `creadora@letshoot.ai` — cuenta de test SIN registrar (se usa para probar signup limpio) — **NO tocar**
- Kash Agency + creadoras asociadas
- Cuenta de prueba de test (`profiles.is_test = true`, excluida de accounting)

Cualquier limpieza masiva "de cuentas demo" tiene que consultarse con el owner primero.

---

## 8) Bugs conocidos + auditoría hecha

Corrí una auditoría masiva de la plataforma (5 agentes en paralelo revisando cada área). Encontraron **51 hallazgos únicos** — algunos ya arreglados, otros no. La lista completa vive en el output del último workflow (`/private/tmp/…/tasks/*.output`) y en los commits.

**Los HIGH que quedan por resolver:**
1. `components/Nav.jsx` línea 60-155 → hrefs `#pricing` `#delivery` son page-relative; rompen en `/agency`. Cambiar a `/#pricing`, `/#delivery`.
2. `app/agency/page.jsx` línea 24 → COPY solo tiene `en/es`. Faltan traducciones para pt/fr/de/it/zh (los archivos ya se generaron en `/tmp/…/scratchpad/agency-copy-{de,it,fr}.js` — pegarlas en el COPY).
3. `lib/portal-i18n.js` — falta `pt` y `zh` en el portal de la creadora (usePortal mapea solo 5).
4. `app/trabajo/page.jsx` línea 931 → `selected` Set no se limpia al cambiar carpetas.
5. `app/preview/nueva-propuesta/page.jsx` línea 122 → LAN_HOST hardcodeado en el link "Ver como cliente" (ya lo arreglé — verificá).

**Los MEDIUM más importantes:**
6. `middleware.js` línea 8 → `/owner` y `/sales` NO están en PROTECTED. Se sirve el bundle antes de redirigir a login (leak de UI). Agregarlos.
7. `app/agencia/page.jsx` línea 424 → los books y el income roll-up de agencia no sumaban `agency_weekly_sales` (dinero mal contado). **Ya lo arreglé — verificá el diff.**
8. `app/panel/page.jsx` línea 441 → WelcomeTour de la creadora tiene strings hardcodeados en español (rompe experiencia EN).

La lista completa (los 51 hallazgos) está en `journal.jsonl` del workflow — no te pases todo el tiempo con los LOW, priorizá HIGH y los que se noten al usuario.

---

## 9) Roadmap corto — lo que quería hacer

Lo que el owner me pidió y no llegué a completar:

1. Cerrar el pase de rediseño 3D azul en `/trabajo`, `/agencia`, `/panel`, `/agente` (mismo lenguaje que ya está en `/admin`).
2. Implementación real del módulo de propuestas (§5) → tablas Supabase + endpoints + integración a `/admin` real.
3. Traducir el landing `/agency` a pt/fr/de/it/zh (los archivos de de/it/fr ya están generados, faltan pegar + los 2 restantes).
4. Cerrar los HIGH y MEDIUM de §8.
5. Decidir la ruta de generación real:
   - Higgsfield tiene la LoRA de Julia pero solo accesible por su web app, no por API.
   - Alternativas: entrenar LoRA en fal.ai (portable, +$2) o muapi (más barato pero hosteado).
   - El detalle está en el `HANDOFF.md` del subproyecto `letshoot-internal`.

---

## 10) Cómo trabajar con esto

- **Sesiones cortas de contexto:** documenté todas las decisiones no obvias en los CLAUDE.md/memory. Si usás Claude Code / Cursor, tienen acceso a eso.
- **NO desactivar RLS en Supabase.** Si algo no funciona, es RLS. Las migraciones muestran cómo agregar la política.
- **NO commitear `.env*`.** Están en `.gitignore` por algo. Los secretos van en Vercel.
- **NO cambiar la familia de color** — siempre azul (`brand`). No hay verde, ni pink, ni amarillo como marca.
- **NO borrar cuentas "demo"** — leer §7 primero.
- **NO deployar sin build local pasando** — `npx next build` local antes de push.

---

## 11) Contacto durante la transición

- Owner: Alvaro (rusin24@gmail.com) — puede contestar dudas de negocio y decisiones históricas.
- Sitio de estado: Vercel dashboard → si algo se rompe, ahí están los logs.
- Supabase logs → para RLS o queries que fallan.

**Suerte. Todo lo que necesitás está en los README, en los commits (léelos, cuentan la historia) y en este archivo. Si algo no está claro, empezá por `git log --all --oneline` y leé la historia.**
