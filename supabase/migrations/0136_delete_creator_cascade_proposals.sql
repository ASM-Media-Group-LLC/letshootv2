-- Fix "Database error deleting user" al eliminar una creadora:
-- photo_proposals.recipient_user_id era NO ACTION y bloqueaba el borrado cuando la
-- creadora tenía propuestas recibidas. Pasa a ON DELETE CASCADE para que, al borrar
-- la cuenta, se vayan sus propuestas y todo lo que cuelga de ellas (feedback, progreso,
-- contenido, recordatorios — ya cascadean desde photo_proposals).
alter table public.photo_proposals drop constraint photo_proposals_recipient_user_id_fkey;
alter table public.photo_proposals
  add constraint photo_proposals_recipient_user_id_fkey
  foreign key (recipient_user_id) references public.profiles(id) on delete cascade;
