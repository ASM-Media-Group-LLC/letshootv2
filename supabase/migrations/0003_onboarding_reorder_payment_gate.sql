-- ─────────────────────────────────────────────────────────────────────────
-- Reorder onboarding: datos → COBRO (autorizado) → fotos (ID + LoRA) → aprobación.
-- Payment is only captured after admin approval; a rejection voids/refunds it.
--   payment_status: unpaid → authorized → paid   (or → refunded on rejection)
--   onboarding_status adds 'authorized' (paid-hold, before uploading photos)
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles drop constraint if exists profiles_onboarding_status_check;
alter table public.profiles add constraint profiles_onboarding_status_check
  check (onboarding_status in ('registered','info','authorized','id_pending','id_rejected','id_approved','paid','active'));

alter table public.profiles drop constraint if exists profiles_payment_status_check;
alter table public.profiles add constraint profiles_payment_status_check
  check (payment_status in ('unpaid','authorized','paid','refunded'));
