-- Company-wide overview for the internal team dashboard. SECURITY DEFINER so
-- staff with the 'metrics' capability (not just admin) can see production,
-- payments and agencies without direct table RLS on other people's profiles.
create or replace function public.team_books()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  mstart date := date_trunc('month', now())::date;
  pstart date := (date_trunc('month', now()) - interval '1 month')::date;
begin
  if not (public.is_admin() or public.has_cap('metrics')) then
    raise exception 'no autorizado';
  end if;

  select jsonb_build_object(
    'agencies', (select count(*) from profiles where role = 'agency'),
    'creators', (select count(*) from profiles where role = 'creator'),
    'pieces',   (select count(*) from assets),
    'photos',   (select count(*) from assets where type <> 'video'),
    'videos',   (select count(*) from assets where type = 'video'),
    'revenue',  (select coalesce(sum(revenue), 0) from assets),
    'sales',    (select coalesce(sum(sales_count), 0) from assets),
    'month_pieces',  (select count(*) from assets where deliver_date >= mstart),
    'month_revenue', (select coalesce(sum(revenue), 0) from assets where deliver_date >= mstart),
    'prev_pieces',   (select count(*) from assets where deliver_date >= pstart and deliver_date < mstart),
    'prev_revenue',  (select coalesce(sum(revenue), 0) from assets where deliver_date >= pstart and deliver_date < mstart),
    'agency_rows', (
      select coalesce(jsonb_agg(row_to_json(a)), '[]'::jsonb) from (
        select ag.id,
          coalesce(ag.stage_name, ag.full_name, 'Agencia') as name,
          ag.handle, ag.avatar_url,
          (select count(*) from agency_creators ac where ac.agency_id = ag.id) as models,
          (select count(*) from assets x join agency_creators ac on ac.creator_id = x.creator_id where ac.agency_id = ag.id) as pieces,
          (select coalesce(sum(x.revenue), 0) from assets x join agency_creators ac on ac.creator_id = x.creator_id where ac.agency_id = ag.id) as revenue
        from profiles ag where ag.role = 'agency'
        order by revenue desc
      ) a
    ),
    'top_creators', (
      select coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) from (
        select cr.id,
          coalesce(cr.stage_name, cr.full_name, 'Modelo') as name,
          cr.handle, cr.avatar_url,
          count(x.id) as pieces,
          coalesce(sum(x.revenue), 0) as revenue,
          coalesce(sum(x.sales_count), 0) as sales
        from profiles cr left join assets x on x.creator_id = cr.id
        where cr.role = 'creator'
        group by cr.id
        order by pieces desc, revenue desc
        limit 24
      ) c
    )
  ) into result;

  return result;
end $$;

grant execute on function public.team_books() to authenticated;
