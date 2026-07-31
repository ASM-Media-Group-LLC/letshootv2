-- ─────────────────────────────────────────────────────────────────────────
-- New role: AGENCY (a.k.a. manager). An external partner that manages one or
-- more creators — views their delivered content, makes content requests, and
-- records what each piece sold (the platform keeps the agency's books).
-- Enum value must be committed in its own migration before it can be USED in
-- policies/inserts (see 0016).
-- ─────────────────────────────────────────────────────────────────────────
alter type public.user_role add value if not exists 'agency';
