-- Costo REAL del scraper de Instagram (Apify + filtro IA), por corrida.
--
-- Antes: scrape_runs.cost_real se llenaba con el costo de "la ÚLTIMA corrida exitosa del actor" (runs/last), que podía
-- ser otra corrida, y no se registraban el actor de REELS (videos), los reels por link ni el filtro IA (Anthropic).
-- Ahora el motor (edge function `higgsfield`) lanza cada actor con SU run id y guarda lo que Apify cobró por ESA corrida.
--
-- Columnas nuevas:
--   apify_run_ids   → ids de las corridas de Apify que usó este scrape (fotos, reels…)
--   cost_apify      → USD REAL que cobró Apify (suma de usageTotalUsd de esas corridas). null = no se supo todavía
--   cost_ai         → USD del filtro IA: tokens reales de Anthropic × precio público de Claude Haiku 4.5
--   videos          → videos guardados en la corrida (saved sigue siendo fotos)
--   cost_breakdown  → detalle: { v, photos:{actor,run_id,status,items,usd,est}, videos:{…}, ai:{model,calls,in_tokens,out_tokens,usd,kept} }
--   cost_source     → 'apify' (leído por run id) · 'backfill' (emparejado después con la lista de corridas de Apify)
--                     · 'partial' (una parte sin costo) · 'estimate' (Apify no dio el costo) · 'legacy_guess' (fila vieja)
--                     · 'none' (no hubo corrida de Apify: nada que cobrar ni que emparejar; apify_run_ids = '{}')
--   cost_checked_at → cuándo se leyó el costo de Apify
-- cost_real queda por compatibilidad = cost_apify (NUNCA el estimado).
-- status suma 'running': la fila se crea apenas Apify da el run id y se completa al final (si la función se corta por
-- tiempo, la corrida y su run id no se pierden; «Traer costo real de Apify» la completa y la marca como cortada).
-- kind suma 'ia_pendientes': pasada APARTE del filtro IA sobre fotos de búsquedas anteriores que quedaron sin revisar
-- (antes se le cobraban a la búsqueda siguiente, de otra cuenta).
--
-- Las filas viejas (cost_real sacado de "la última corrida") se marcan 'legacy_guess': la app NO las muestra como
-- reales hasta que el admin las complete con «Traer costo real de Apify» (acción scrape_cost_backfill).
--
-- BÚSQUEDAS EN SEGUNDO PLANO (segunda parte de esta migración, al final): producción mató la función a los 150 s
-- (504 IDLE_TIMEOUT) y no quedó NADA. Ahora cada búsqueda es UNA fila de scrape_runs (requested ≠ null) que avanza de a
-- pasos cortos (< 140 s) que dan la página y/o el cocinero de la Mac, con un candado por fila (lease, scrape_job_claim).
--   status: queued | running | ok | partial | empty | error | canceled   (sin CHECK, igual que 0120; las filas viejas
--           siguen con ok | error | empty | running). run_at = cuándo TERMINÓ (como siempre); created_at = cuándo se pidió.
--   requested (fijo) = qué se pidió · progress = avance (corridas de Apify, carriles fotos/videos, IA) · phase, note…
--   creator_vault.scrape_run_id = qué búsqueda guardó cada foto/video (conteos exactos aunque un paso muera).
--   scrape_accounts.video_rejects = reels que el filtro «sola» ya rechazó (no se vuelven a pagar), tope 300.
--
-- RLS igual que en 0120 (staff lee; escribe solo el motor con service_role). Idempotente: se puede correr más de una vez.
alter table public.scrape_runs add column if not exists apify_run_ids text[];
alter table public.scrape_runs add column if not exists cost_apify numeric;
alter table public.scrape_runs add column if not exists cost_ai numeric;
alter table public.scrape_runs add column if not exists videos integer;
alter table public.scrape_runs add column if not exists cost_breakdown jsonb;
alter table public.scrape_runs add column if not exists cost_source text;
alter table public.scrape_runs add column if not exists cost_checked_at timestamptz;

-- Filas viejas: su cost_real NO es confiable como "real" (se copiaba de otra corrida). Se marcan y NO se tocan sus números.
update public.scrape_runs
set cost_source = 'legacy_guess'
where cost_source is null
  and apify_run_ids is null;
-- (los índices por modelo/cuenta + fecha ya existen desde 0120)

-- ═══════════════ BÚSQUEDAS EN SEGUNDO PLANO (scrape jobs) ═══════════════
-- scrape_runs: una fila = UNA búsqueda (async). Las filas viejas quedan con requested = null (sincrónicas / legacy).
alter table public.scrape_runs add column if not exists created_at timestamptz;
update public.scrape_runs set created_at = run_at where created_at is null;
alter table public.scrape_runs alter column created_at set default now();
alter table public.scrape_runs add column if not exists requested jsonb;          -- null = fila vieja
alter table public.scrape_runs add column if not exists progress jsonb;
alter table public.scrape_runs add column if not exists phase text;              -- queued | apify | collect | finalize | done
alter table public.scrape_runs add column if not exists apify_active smallint not null default 0; -- corridas de Apify de esta búsqueda que no terminaron
alter table public.scrape_runs add column if not exists lease_until timestamptz;
alter table public.scrape_runs add column if not exists lease_owner uuid;
alter table public.scrape_runs add column if not exists next_step_at timestamptz;
alter table public.scrape_runs add column if not exists step_count integer not null default 0;
alter table public.scrape_runs add column if not exists updated_at timestamptz;
alter table public.scrape_runs add column if not exists finished_at timestamptz;
alter table public.scrape_runs add column if not exists dedupe_key text;          -- creator|kind|query normalizada
alter table public.scrape_runs add column if not exists note text;                -- resumen para el dueño («la cuenta solo tenía K…»)
alter table public.scrape_runs add column if not exists cancel_requested_at timestamptz;
create index if not exists scrape_runs_active_idx on public.scrape_runs (next_step_at) where status in ('queued','running');
-- Doble clic / dos pestañas: UNA sola búsqueda activa por (modelo, tipo, cuenta/tema/link).
create unique index if not exists scrape_runs_active_dedupe on public.scrape_runs (dedupe_key)
  where status in ('queued','running') and dedupe_key is not null;
-- Conteos exactos por búsqueda aunque un paso muera + «revisar solo las fotos de esta búsqueda».
alter table public.creator_vault add column if not exists scrape_run_id uuid references public.scrape_runs(id) on delete set null;
create index if not exists creator_vault_scrape_run_idx on public.creator_vault (scrape_run_id) where scrape_run_id is not null;
-- Reels que el filtro «sola» ya rechazó para esta cuenta (no se re-pagan en el próximo «Buscar más»). El motor corta en 300.
alter table public.scrape_accounts add column if not exists video_rejects text[];

-- Candado de UN paso por búsqueda: toma la que toca (o p_job), la marca por p_lease_s segundos para p_owner y la devuelve.
-- Orden: la modelo abierta primero (p_prefer) · las que ya corren · las que tocan antes · las más viejas.
-- SKIP LOCKED: dos pasos a la vez nunca toman la misma. Solo el motor (service_role) la puede llamar.
create or replace function public.scrape_job_claim(p_owner uuid, p_job uuid default null, p_prefer uuid default null, p_lease_s integer default 150)
returns setof public.scrape_runs language sql set search_path = public as $$
  with c as (
    select id from public.scrape_runs
     where status in ('queued','running')
       and (p_job is null or id = p_job)
       and (lease_until is null or lease_until < now())
       and (p_job is not null or next_step_at is null or next_step_at <= now())
     order by (p_prefer is not null and creator_id = p_prefer) desc, (status = 'running') desc,
              next_step_at asc nulls first, created_at asc
     limit 1 for update skip locked)
  update public.scrape_runs r
     set lease_until = now() + make_interval(secs => p_lease_s), lease_owner = p_owner, updated_at = now(), step_count = r.step_count + 1
    from c where r.id = c.id returning r.*;
$$;
revoke all on function public.scrape_job_claim(uuid,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.scrape_job_claim(uuid,uuid,uuid,integer) to service_role;
-- RLS sin cambios: staff lee todas las columnas nuevas (política de 0120), escribe solo el motor (service_role).
