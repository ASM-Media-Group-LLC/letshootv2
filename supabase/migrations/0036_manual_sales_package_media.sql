-- Split content into images/videos (how the deal closed) and record which
-- pricing package was sold, so the entry form can preselect it.
alter table public.manual_sales add column if not exists images integer not null default 0;
alter table public.manual_sales add column if not exists videos integer not null default 0;
alter table public.manual_sales add column if not exists package_key text;
alter table public.manual_sales add column if not exists package_name text;
