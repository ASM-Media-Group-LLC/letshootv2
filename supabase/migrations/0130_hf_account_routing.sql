-- Ruteo POR CUENTA de Higgsfield (cada modelo cocina en SU cuenta).
-- Julia Parker queda en la Cuenta 1 (el login de siempre del CLI en la Mac); las demás
-- modelos van a la cuenta nueva (su propio login del CLI en ~/.config/higgsfield/accounts/<id>/).
--
-- Estado por cuenta que reporta el cocinero de la Mac (scripts/kitchen-worker.mjs):
--   balance / balance_at  → saldo REAL de esa cuenta (higgsfield account status con SU login)
--   cli_seen_at           → última vez que el cocinero tuvo un login del CLI que FUNCIONA para esa cuenta
--   cli_error             → por qué no funciona (sin login en la Mac, logueada con la cuenta equivocada, etc.)
--   cli_email             → email con el que está logueado el CLI de esa cuenta (para confirmar que es la correcta)
--   souls / souls_at      → las Souls 2.0 que tiene esa cuenta [{id,name,status}] (para elegir la Soul de cada modelo en /conexion)
--
-- RLS igual que antes (sin políticas = solo service_role; las llaves nunca salen al cliente).
-- Idempotente: se puede correr más de una vez.
alter table public.higgsfield_accounts add column if not exists balance numeric;
alter table public.higgsfield_accounts add column if not exists balance_at timestamptz;
alter table public.higgsfield_accounts add column if not exists cli_seen_at timestamptz;
alter table public.higgsfield_accounts add column if not exists cli_error text;
alter table public.higgsfield_accounts add column if not exists cli_email text;
alter table public.higgsfield_accounts add column if not exists souls jsonb;
alter table public.higgsfield_accounts add column if not exists souls_at timestamptz;

alter table public.higgsfield_accounts enable row level security;
-- (sin políticas a propósito, como en 0119)

-- Sembrar el saldo de la Cuenta 1 con el que ya está guardado (app_config.higgsfield_balance),
-- así la cabecera de /kitchen de Julia muestra el mismo número desde el primer momento.
update public.higgsfield_accounts a
set balance = nullif(c.value, '')::numeric,
    balance_at = c.updated_at
from public.app_config c
where c.key = 'higgsfield_balance'
  and a.id = '06efe22b-68f2-4cfd-b9ca-8a2849d37933'
  and a.balance is null
  and c.value ~ '^-?[0-9]+(\.[0-9]+)?$';
