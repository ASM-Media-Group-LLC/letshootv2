-- ─────────────────────────────────────────────────────────────────────────
-- Client delivery experience: per-asset PURPOSE (why the team made it, set by
-- staff on delivery) + performance tracking the creator marks herself
-- (sales / revenue / reach / interactions) so she can see, per photo, what her
-- paid content is doing — the "tracking de lo que su agencia está vendiendo".
-- ─────────────────────────────────────────────────────────────────────────

alter table public.assets
  add column if not exists purpose      text,                       -- why it was made (staff)
  add column if not exists title        text,                       -- short label (staff)
  add column if not exists sales_count  integer not null default 0, -- units sold (creator)
  add column if not exists revenue      numeric(10,2) not null default 0, -- $ earned (creator)
  add column if not exists reach        integer not null default 0, -- views / reach (creator)
  add column if not exists interactions integer not null default 0; -- likes / DMs (creator)

-- The creator updates ONLY her own asset's performance stats. Staff keep full
-- write access via the existing "assets write" policy (purpose/title on upload).
create or replace function public.mark_asset_stats(
  aid uuid,
  p_sales integer,
  p_revenue numeric,
  p_reach integer,
  p_interactions integer
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.assets where id = aid and creator_id = auth.uid()) then
    raise exception 'No es tu contenido.';
  end if;
  update public.assets set
    sales_count  = greatest(0, coalesce(p_sales, sales_count)),
    revenue      = greatest(0, coalesce(p_revenue, revenue)),
    reach        = greatest(0, coalesce(p_reach, reach)),
    interactions = greatest(0, coalesce(p_interactions, interactions))
  where id = aid;
end; $$;

revoke execute on function public.mark_asset_stats(uuid, integer, numeric, integer, integer) from anon, public;
grant execute on function public.mark_asset_stats(uuid, integer, numeric, integer, integer) to authenticated;
