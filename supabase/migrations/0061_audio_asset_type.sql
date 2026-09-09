-- Audios en la biblioteca de cada creadora: el equipo los sube junto al
-- resto del contenido (bucket 'deliveries'), la creadora los escucha en su
-- panel y la agencia en el suyo — sin descarga para ellas.
-- (Aplicada en producción el 2026-09-08 vía MCP; se versiona acá para el repo.)
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'audio';
