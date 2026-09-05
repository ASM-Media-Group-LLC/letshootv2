# Módulo Propuestas — Spec técnico para implementación

> **Autor:** handoff de Alvaro para el nuevo dev.
> **Estado:** UI diseñada y validada en `/preview/*` (mock, sin persistencia). Todo lo que sigue es lo que hay que implementar para llevarlo a producción.
> **Alcance:** el link público de "propuesta de fotos" que el admin le manda a una modelo por WhatsApp/Email, con feedback anónimo, watermark, anti-download, y export a PDF desde el admin.

---

## 0. ⚠️ Aclaración crítica de naming

**Ya existe una tabla `creator_proposals`** (migración `0058_creator_proposals.sql`) que es para **otro caso de uso**:

- **`creator_proposals`** (existente) = onboarding tríptico (Inspiración/Real/IA) que ve la CC dentro de su `/panel` cuando aún no pagó. Es 1:1 con `profiles`.
- **`photo_proposals`** (nuevo, este spec) = presentación pública tipo lookbook que el admin le manda a UNA modelo por link para que dé feedback sobre un set de fotos. Es N:1 con `profiles` (una modelo puede recibir múltiples).

**No mezclar. Usar el prefijo `photo_proposals` para todo lo nuevo.**

---

## 1. Estado actual (mocks en `/preview`)

| Archivo | Rol | Portar a |
|---|---|---|
| [app/preview/admin/page.jsx](../app/preview/admin/page.jsx) | Lista de propuestas del admin | `app/admin/propuestas/page.jsx` |
| [app/preview/nueva-propuesta/page.jsx](../app/preview/nueva-propuesta/page.jsx) | Wizard 3 pasos crear | `app/admin/propuestas/nueva/page.jsx` |
| [app/preview/propuesta-admin/page.jsx](../app/preview/propuesta-admin/page.jsx) | Editor completo (baúl + paquete + link+QR) | `app/admin/propuestas/[id]/page.jsx` |
| [app/preview/propuesta/page.jsx](../app/preview/propuesta/page.jsx) | Vista pública fullscreen que ve la modelo | `app/p/[linkId]/page.jsx` |
| [lib/propuesta-i18n.js](../lib/propuesta-i18n.js) | Diccionario 5 idiomas del link público | reutilizar tal cual |

Todo el diseño, densidades, watermark tileado, feedback like/reject/comentar, y estructura de datos en state está resuelto en los mocks. **La UI no hay que rehacerla, hay que conectarla.**

---

## 2. Modelo de datos

### 2.1 Migración nueva `0061_photo_proposals.sql`

```sql
-- Propuesta de fotos: link público que el admin manda a una modelo
-- con un paquete curado de fotos de su baúl. La modelo da feedback
-- anónimo (like/reject/comentar) sin identificarse. El admin ve
-- las respuestas + descarga PDF lookbook.

create table if not exists public.photo_proposals (
  id uuid primary key default gen_random_uuid(),
  -- Link corto que se comparte (letshoot.ai/p/AB12CD34)
  link_id text not null unique check (length(link_id) between 6 and 12),
  -- Modelo destinataria
  model_id uuid not null references public.profiles(id) on delete cascade,
  -- Config visible en la portada del link
  name text not null,
  subtitle text,
  intro text,
  cover_asset_id uuid, -- referencia a asset del baúl para la portada
  -- Idioma del link público (es|en|de|it|fr)
  lang text not null default 'es' check (lang in ('es','en','de','it','fr')),
  -- Estado + expiración
  status text not null default 'draft' check (status in ('draft','published','expired','archived')),
  expires_at timestamptz,
  published_at timestamptz,
  -- Autoría / auditoría
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index photo_proposals_model_id_idx on public.photo_proposals(model_id, status);
create index photo_proposals_link_id_idx on public.photo_proposals(link_id) where status = 'published';

-- Items del paquete (orden importa, se muestra en ese orden)
create table if not exists public.photo_proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.photo_proposals(id) on delete cascade,
  -- FK al baúl existente (ver §2.3 sobre qué tabla es exactamente)
  asset_id uuid not null,
  position int not null default 0,
  caption text,
  created_at timestamptz not null default now(),
  unique(proposal_id, asset_id)
);

create index photo_proposal_items_proposal_idx on public.photo_proposal_items(proposal_id, position);

-- Feedback de la modelo (público, sin auth)
create table if not exists public.photo_proposal_feedback (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.photo_proposals(id) on delete cascade,
  item_id uuid not null references public.photo_proposal_items(id) on delete cascade,
  -- 'liked' | 'rejected' | null (solo comentario)
  reaction text check (reaction in ('liked','rejected')),
  comment text,
  -- Metadata sin identificar: solo para dedupe/anti-spam
  visitor_hash text, -- hash(link_id + user-agent + ip class /24)
  created_at timestamptz not null default now()
);

create index photo_proposal_feedback_proposal_idx on public.photo_proposal_feedback(proposal_id, item_id);

-- Eventos para el panel admin (opened, expired, pdf_downloaded, etc)
create table if not exists public.photo_proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.photo_proposals(id) on delete cascade,
  kind text not null, -- 'created','published','opened','item_liked','item_rejected','item_commented','pdf_downloaded','expired'
  actor_id uuid references public.profiles(id), -- null si es la modelo (público)
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index photo_proposal_events_proposal_idx on public.photo_proposal_events(proposal_id, created_at desc);

-- ─── RLS ────────────────────────────────────────────────────────────────
alter table public.photo_proposals enable row level security;
alter table public.photo_proposal_items enable row level security;
alter table public.photo_proposal_feedback enable row level security;
alter table public.photo_proposal_events enable row level security;

-- Admin/supervisor con capability 'sales' ve/edita todo
drop policy if exists "photo_proposals staff all" on public.photo_proposals;
create policy "photo_proposals staff all" on public.photo_proposals
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and 'sales' = any(p.capabilities)
    )
  );

-- Items siguen la propuesta
drop policy if exists "photo_proposal_items staff all" on public.photo_proposal_items;
create policy "photo_proposal_items staff all" on public.photo_proposal_items
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and 'sales' = any(p.capabilities)
    )
  );

-- Feedback y events: staff lee todo, INSERTs públicos van por edge function con service role
drop policy if exists "photo_proposal_feedback staff read" on public.photo_proposal_feedback;
create policy "photo_proposal_feedback staff read" on public.photo_proposal_feedback
  for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and 'sales' = any(p.capabilities)
    )
  );

drop policy if exists "photo_proposal_events staff read" on public.photo_proposal_events;
create policy "photo_proposal_events staff read" on public.photo_proposal_events
  for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'supervisor'
        and 'sales' = any(p.capabilities)
    )
  );

-- NO se dan policies public.* — la lectura del link público va por
-- endpoint del server con service role, filtrando por link_id + status='published'
-- + expires_at > now(). Ver §3.2.
```

### 2.2 Generación del `link_id`

Función en Postgres (base32 sin caracteres ambiguos):

```sql
create or replace function public.gen_short_link_id(len int default 8)
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- 31 chars: sin I, O, L, 0, 1
  result text := '';
  i int := 0;
begin
  for i in 1..len loop
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return result;
end;
$$;
```

Uso en app: `insert into photo_proposals (link_id, ...) values (gen_short_link_id(8), ...)` con retry en caso de colisión (probabilidad ~1 en 850k para 8 chars, negligible).

### 2.3 De dónde viene el baúl (asset_id)

**⚠️ A verificar:** el baúl de fotos de cada modelo vive en la ruta `/biblioteca` (ver [app/biblioteca/](../app/biblioteca/)). El nombre exacto de la tabla que guarda las fotos aprobadas del baúl hay que confirmarlo — buscar por `content_library`, `library_items`, `creator_assets` o similar en las migraciones.

Una vez identificada la tabla, `photo_proposal_items.asset_id` referencia esa tabla con FK. Añadir `references public.<tabla_baul>(id) on delete cascade` a la migración.

---

## 3. API endpoints

Todos bajo `app/api/propuestas/`. Convención: Route Handlers de App Router, Supabase server client con RLS.

### 3.1 Admin (autenticado)

| Método | Path | Body | Devuelve |
|---|---|---|---|
| GET | `/api/propuestas` | — | Lista de propuestas del admin (filtro por model, status) |
| POST | `/api/propuestas` | `{ model_id, name, subtitle?, intro?, lang, item_ids[], expires_at? }` | Propuesta creada como `draft` con `link_id` generado |
| GET | `/api/propuestas/[id]` | — | Detalle + items + agregado de feedback + eventos |
| PATCH | `/api/propuestas/[id]` | `{ name?, subtitle?, intro?, lang?, expires_at?, item_ids? }` | Actualizada (solo si `status = draft`) |
| POST | `/api/propuestas/[id]/publish` | — | Marca `published`, setea `published_at`, dispara evento |
| POST | `/api/propuestas/[id]/archive` | — | Marca `archived` |
| GET | `/api/propuestas/[id]/pdf` | — | Descarga PDF (ver §5) |

### 3.2 Público (sin auth) — vista de la modelo

Bajo `app/api/p/`:

| Método | Path | Body | Devuelve |
|---|---|---|---|
| GET | `/api/p/[linkId]` | — | `{ proposal, items[] }` solo si `status='published' AND now() < expires_at`. **NO devuelve** `created_by`, ni `id` interno de items sin necesidad. Sanea la salida. |
| POST | `/api/p/[linkId]/open` | `{}` | Registra evento `opened` (rate-limited por `visitor_hash`, 1 por hora) |
| POST | `/api/p/[linkId]/feedback` | `{ item_id, reaction?: 'liked'\|'rejected', comment? }` | Upsert (dedupe por `visitor_hash + item_id`), dispara evento y notificación al admin |

**Implementación de `visitor_hash`:** `sha256(link_id + user_agent + ip_class_c)` — permite dedupe sin identificar. Usar `ip` del `x-forwarded-for` con máscara /24.

**Rate limit:** 60 requests / hora por `visitor_hash` en `/feedback`. Excedido → 429.

### 3.3 Route handler crítico: `/api/p/[linkId]/route.ts`

```ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // bypassea RLS con seguridad porque filtramos abajo
);

export async function GET(_req: NextRequest, { params }: { params: { linkId: string } }) {
  const { data: proposal, error } = await sb
    .from('photo_proposals')
    .select('id, link_id, name, subtitle, intro, lang, cover_asset_id, published_at, expires_at, model_id')
    .eq('link_id', params.linkId)
    .eq('status', 'published')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !proposal) return Response.json({ error: 'not_found' }, { status: 404 });

  const { data: items } = await sb
    .from('photo_proposal_items')
    .select('id, position, caption, asset_id')
    .eq('proposal_id', proposal.id)
    .order('position');

  // Traer las URLs firmadas o públicas de los assets del baúl.
  // Depende de dónde estén las fotos (ver §2.3).
  const enrichedItems = await Promise.all((items ?? []).map(async (it) => {
    const { data: asset } = await sb.from('<tabla_baul>').select('url').eq('id', it.asset_id).single();
    return { id: it.id, position: it.position, caption: it.caption, src: asset?.url };
  }));

  return Response.json({
    proposal: {
      link_id: proposal.link_id,
      name: proposal.name,
      subtitle: proposal.subtitle,
      intro: proposal.intro,
      lang: proposal.lang,
      cover_url: proposal.cover_asset_id ? enrichedItems.find(i => i.asset_id === proposal.cover_asset_id)?.src : enrichedItems[0]?.src,
      expires_at: proposal.expires_at,
      published_at: proposal.published_at,
      // model nombre + agencia — resolver desde profiles
    },
    items: enrichedItems,
  });
}
```

**⚠️ No devolver ID interno de la propuesta** en la respuesta pública, solo `link_id`. El feedback POST recibe `link_id` en path y busca `proposal_id` server-side.

---

## 4. Vista "Vault Infloww" — el Paso 2 del wizard

Alvaro pidió específicamente que el baúl (Paso 2 de `nueva-propuesta`) se vea/comporte como el **vault de Infloww** (herramienta de OF creators). Referencias visuales:

- **Grid denso** (5-7 columnas en desktop, 2-3 en mobile), aspect ratio 4:5 uniforme
- **Filtros arriba en barra sticky** — chapter (Cafetería/Playa/Estudio/etc), tipo (IA/RAW/REF/SELFIE), aprobado sí/no, búsqueda por prompt
- **Multi-select por click** con checkbox visible en hover, contador flotante bottom-right ("12 seleccionadas · Continuar →")
- **Hover en foto → preview grande flotante** (side panel derecho, no modal) con: preview 500×625, prompt completo, fecha, chapter, botón "agregar al paquete" grande
- **Shift+click para range-select** (como Finder)
- **Cmd/Ctrl+A** selecciona todo el filtro visible
- **Drag para reordenar** el paquete (arriba a la derecha del vault, panel sticky)

El mock actual [nueva-propuesta/page.jsx:258-386](../app/preview/nueva-propuesta/page.jsx#L258) tiene ~70% de esto — falta:
- Preview flotante en hover
- Shift+click range-select
- Drag-to-reorder (hoy son botones ↑/↓)

Referencia externa para copiar visualmente: capturas de Infloww vault (Alvaro las tiene, pedírselas).

---

## 5. PDF Export

### 5.1 Decisión de librería

**Recomendado: [Puppeteer](https://pptr.dev/) headless** (o `@sparticuz/chromium` para Vercel).

Razones:
- El HTML del PDF es 99% el mismo que la vista pública `/p/[linkId]` — reutilizamos componentes React
- Watermark tileado, tipografía, y aspecto se garantiza pixel-perfect
- `react-pdf` no soporta bien fonts custom + watermarks + backgrounds full-bleed

Trade-off: pesado en cold-start (~2s), pero aceptable para descarga admin.

### 5.2 Layout del PDF (formato lookbook)

Tamaño: **A4 landscape** (297×210mm), 300 DPI para impresión.

Estructura:

```
Página 1 — PORTADA
┌─────────────────────────────────────────┐
│                                         │
│  [foto cover full-bleed]                │
│                                         │
│  ██ LETSHOOT · PROPUESTA PRIVADA        │
│                                         │
│  {name}                                 │
│  {subtitle}                             │
│                                         │
│  {model.name} · {agency}                │
│  Vence: {expires_at}  ·  {link_id}     │
└─────────────────────────────────────────┘

Página 2..N — UNA FOTO POR PÁGINA
┌─────────────────────────────────────────┐
│                                         │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │       [foto full-bleed]           │  │
│  │       (max 260×175mm)             │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  {caption}                              │
│  #{position} / {total}                  │
└─────────────────────────────────────────┘
[watermark tileado en background de cada pág]

Página última — RESUMEN
┌─────────────────────────────────────────┐
│  ██ RESUMEN                             │
│                                         │
│  {name}                                 │
│  {model.name} · {agency}                │
│                                         │
│  {N} fotos                              │
│  {link_id}                              │
│  Publicada: {published_at}              │
│  Vence: {expires_at}                    │
│                                         │
│  Para responder, la modelo debe abrir:  │
│  https://letshoot.ai/p/{link_id}        │
│                                         │
│  ─── LetShoot · propuestas ─────────    │
└─────────────────────────────────────────┘
```

### 5.3 Watermark en PDF

Igual que en web: SVG tileado con `LETSHOOT · {link_id} · {model.name}` en diagonal, opacidad 0.06, tamaño repetido cada ~200px. Se aplica como `background-image` en `<body>` del HTML previo al render.

Ver la implementación web en [preview/propuesta/page.jsx](../app/preview/propuesta/page.jsx) — extraer el `<Watermark>` a un componente compartido y reusar.

### 5.4 Endpoint

```ts
// app/api/propuestas/[id]/pdf/route.ts
import puppeteer from '@sparticuz/chromium-min';
import puppeteerCore from 'puppeteer-core';

export async function GET(_req, { params }) {
  // 1. Auth check (admin/supervisor con 'sales')
  // 2. Trae proposal + items desde DB
  // 3. Renderiza una URL interna: /internal/pdf/propuestas/[id]?token=... (protegida)
  // 4. Puppeteer.newPage() → page.goto(url) → page.pdf({ format: 'A4', landscape: true, printBackground: true })
  // 5. Registra evento 'pdf_downloaded'
  // 6. Devuelve Buffer como application/pdf
}
```

Página interna `/internal/pdf/propuestas/[id]` es un componente React que **NO** usa `PortalHeader`, tiene su propio CSS optimizado para print (`@media print`), y consume el mismo dataset que la vista pública.

### 5.5 Alternativa liviana (si Puppeteer es muy pesado)

**Fallback:** [react-pdf/renderer](https://react-pdf.org/) para un lookbook más simple. Pierde algo de fidelidad tipográfica pero corre en Node puro sin Chromium. Trade-off aceptable si el cold-start de Puppeteer molesta.

---

## 6. Watermark + Anti-download (web)

Ya implementado en [preview/propuesta/page.jsx](../app/preview/propuesta/page.jsx):
- `contextmenu` bloqueado
- `dragstart` bloqueado
- `userSelect: 'none'` en el wrapper

**Reforzar en producción:**

1. **CSP header** en el layout de `/p/[linkId]`:
   ```
   Content-Security-Policy: img-src 'self' <supabase-storage>; ...
   ```
2. **Servir las imágenes con `Content-Disposition: inline`** desde una route handler `/api/p/[linkId]/asset/[itemId]` en vez de URL directa del bucket, para poder:
   - Trackear cuántas veces se cargó cada foto (evento `item_viewed`)
   - Regenerar el asset con watermark server-side si algún día se decide
3. **Deshabilitar zoom pinch en mobile** con `<meta name="viewport" content="user-scalable=no">` en el layout de `/p/[linkId]`

**⚠️ Realidad:** ningún anti-download es 100%. Un usuario decidido siempre puede tomar screenshot. El objetivo es **fricción**, no imposibilidad.

---

## 7. Feedback → admin (notificaciones)

Cuando la modelo deja feedback (rechazo o comentario):

1. Insert en `photo_proposal_feedback`
2. Insert evento en `photo_proposal_events`
3. **Dispara email** al `created_by` de la propuesta vía Resend, con:
   - Subject: `Nueva respuesta en {name} — {model.name}`
   - Body: cita del comment + link directo a `/admin/propuestas/[id]`
4. Debounce: **1 email cada 10 min** por propuesta (agrupa múltiples reacciones), no 1 por reacción.

Tabla de agrupación en memoria (Redis) o simplemente `select count(*) from feedback where proposal_id=X and created_at > now() - interval '10 min'` antes de disparar.

---

## 8. Vista admin `/admin/propuestas/[id]`

Sobre el mock [preview/propuesta-admin/page.jsx](../app/preview/propuesta-admin/page.jsx), agregar:

### 8.1 Panel de feedback (columna 4 o accordion)

```
FEEDBACK · 12 respuestas · 8 me gusta · 3 rechazos · 6 comentarios

Foto 03 · Playa · Golden hour
  ❤ 3 likes
  💬 "Me encanta esta luz, quiero más así"
  💬 "Perfecto"

Foto 07 · Piscina · Mediodía
  ✕ 2 rechazos
  💬 "No me convence el ángulo"
```

Cada item del feedback linkea a la foto en el paquete.

### 8.2 Panel de eventos (timeline)

```
📅 EVENTOS
─ 2026-09-05 14:32 · Abierta 3ra vez
─ 2026-09-05 14:31 · ❤ Foto 03
─ 2026-09-05 14:30 · 💬 Foto 07
─ 2026-09-05 12:15 · Abierta 2da vez
─ 2026-09-04 18:00 · Abierta 1era vez
─ 2026-09-04 17:58 · Link enviado (WhatsApp)
─ 2026-09-04 17:55 · Publicada
─ 2026-09-04 17:30 · Creada por Alvaro
```

### 8.3 Botones de acción arriba

```
[👁️ Ver como cliente]  [📋 Copiar link]  [📄 Descargar PDF]  [📱 QR]  [⋯]
                                                                     └─ Archivar, Duplicar, Cambiar expiración
```

---

## 9. Lista `/admin/propuestas`

Sobre el mock [preview/admin/page.jsx](../app/preview/admin/page.jsx), estructura:

```
PROPUESTAS · [+ Nueva]

[⌕ Buscar]  [Todas ▾]  [Últimos 30d ▾]  [Todas las modelos ▾]

┌─────────────────────────────────────────────────────────┐
│ Selección editorial · Verano 2026     ● PUBLICADA · 5d  │
│ Julia Parker · Kash · 12 fotos                          │
│ ❤ 8  ✕ 3  💬 6   ·   👁 3 aperturas   ·   AB12CD34    │
│                              [Ver] [PDF] [Copiar link]  │
├─────────────────────────────────────────────────────────┤
│ Editorial otoño · Selección          ● BORRADOR         │
│ Mónica Rivas · Kash · 8 fotos                           │
│                                        [Editar] [Eliminar]│
└─────────────────────────────────────────────────────────┘
```

---

## 10. Roadmap sugerido (orden de implementación)

Prioridad de menos a más pesado, cada bloque = 1 PR independiente:

1. **Migración `0061_photo_proposals.sql`** (2h) — schema + RLS + función link_id
2. **API create/read/update draft** (4h) — CRUD básico admin, sin publicar
3. **Portar `/preview/nueva-propuesta` a `/admin/propuestas/nueva`** (3h) — wizard conectado, guarda draft
4. **Portar `/preview/propuesta-admin` a `/admin/propuestas/[id]`** (4h) — editor completo
5. **Endpoint publish + link_id + vista pública `/p/[linkId]`** (5h) — flujo end-to-end del receptor
6. **Feedback endpoint público + panel admin de feedback** (5h)
7. **Refuerzo anti-download (route handler para servir assets)** (2h)
8. **PDF export con Puppeteer** (6h — más incierto)
9. **Notificaciones email vía Resend** (2h)
10. **Analítica: eventos + dashboard mínimo en `/admin/propuestas/[id]`** (3h)

**Total estimado:** 36h ~ 1 semana calendario a full-time.

---

## 11. Checklist de arranque para el nuevo dev

- [ ] Leer todos los archivos en `app/preview/` para entender la UI ya diseñada
- [ ] Identificar tabla real del baúl (§2.3) y confirmar con Alvaro
- [ ] Crear migración 0061 y aplicarla en local
- [ ] Implementar en el orden del §10 (roadmap)
- [ ] Después de cada bloque: `npm run build` + probar en `/admin/propuestas`
- [ ] Al terminar: **borrar `/preview/*` de propuestas** (dejar solo si sirve como living style guide)
- [ ] Añadir traducciones faltantes en `lib/propuesta-i18n.js` si aparecen strings nuevos

---

## 12. Cosas que NO hacer

- ❌ **No reutilizar `creator_proposals`** (tabla existente para otro propósito).
- ❌ **No exponer** `photo_proposals.id` (UUID interno) en el link público — solo `link_id`.
- ❌ **No devolver `created_by`** al público (leak de info del admin).
- ❌ **No firmar URLs de storage** por cada foto para el link público — usar assets bucket `public: true` filtrado por autorización del route handler.
- ❌ **No permitir editar** una propuesta en estado `published` — obligar a `archive + duplicate`.
- ❌ **No borrar** una propuesta con feedback — solo archivar (audit trail).

---

## 13. Preguntas abiertas (validar con Alvaro antes de implementar)

1. **Baúl exacto** — ¿la tabla es `content_library`, `library_items`, `creator_assets`, otra? (§2.3)
2. **Bucket exacto** — ¿el bucket de storage del baúl es `library`, `content`, otro?
3. **Capability `sales` o `content`** — ¿supervisores con qué capability pueden crear propuestas? (§2.1 usa 'sales' — revisar)
4. **Expiración default** — el mock usa 10 días. ¿Es el default definitivo o configurable por admin?
5. **Reenvío del link** — ¿al reenviar un link vencido queremos que la modelo vea "Vencida, pídele al admin uno nuevo" o simplemente 404?
6. **PDF pesado** — ¿está bien un cold-start de ~2s en Puppeteer? Si molesta, ¿pagamos [Browserless.io](https://www.browserless.io/) para tenerlo warm?

---

**Fin del spec. Cualquier ambigüedad, escribir a Alvaro (rusin24@gmail.com) antes de tomar decisión.**
