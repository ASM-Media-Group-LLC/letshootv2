-- Una propuesta INTERNA es PARA una modelo (nueva o activa). Si es nueva, se
-- identifica por su Instagram (obligatorio, todavía no tiene cuenta ni correo).
-- (Aplicada en producción el 2026-09-13 vía MCP; se versiona acá para el repo.)
alter table public.photo_proposals
  add column if not exists recipient_instagram text;
