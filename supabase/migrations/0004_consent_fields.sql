-- ─────────────────────────────────────────────────────────────────────────
-- Consent (required before ANY charge — owner's rule):
--   consent_clone   → authorizes creating/using their digital clone (LoRA)
--   consent_billing → accepts recurring billing once verification is approved
--   consent_at      → when they signed
-- Final flow: datos → ID + consentimiento → aprobación admin → cobro → activa.
-- LoRA photos are OPTIONAL and can be uploaded at any point (before/after).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists consent_clone   boolean not null default false,
  add column if not exists consent_billing boolean not null default false,
  add column if not exists consent_at      timestamptz;
