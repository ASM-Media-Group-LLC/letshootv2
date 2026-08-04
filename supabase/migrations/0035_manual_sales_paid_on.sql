-- Good accounting: the date the money actually came in can differ from the
-- sale date. paid_on empty = sold but not collected yet (por cobrar).
alter table public.manual_sales add column if not exists paid_on date;
