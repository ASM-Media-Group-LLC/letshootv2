-- Consentimiento de VOZ (clon de voz), aparte del de imagen (consent_clone).
-- El dueño lo quiere en UNA sola casilla imagen+voz, pero guardamos el permiso
-- de voz por separado para tener el registro/auditoría.
alter table public.profiles
  add column if not exists consent_voice boolean not null default false;

comment on column public.profiles.consent_voice is
  'La creadora dio permiso para clonar/usar su VOZ (se marca junto con consent_clone al aceptar el consentimiento imagen+voz).';
