#!/bin/sh
# Arranque del worker en la nube: reconstruye el login de Higgsfield desde env vars
# (el dueño las pega en Railway; jamás viven en el repo) y lanza el loop del worker.
set -e

CFG_DIR="$HOME/.config/higgsfield"
mkdir -p "$CFG_DIR"

if [ -z "$HIGGSFIELD_CREDENTIALS" ]; then
  echo "ERROR: falta la variable HIGGSFIELD_CREDENTIALS (pegá el contenido de ~/.config/higgsfield/credentials.json)."
  exit 1
fi
printf '%s' "$HIGGSFIELD_CREDENTIALS" > "$CFG_DIR/credentials.json"
printf '%s' "${HIGGSFIELD_CONFIG:-{}}" > "$CFG_DIR/config.json"
chmod 600 "$CFG_DIR/credentials.json"

echo "[worker] login de Higgsfield escrito. Verificando cuenta…"
higgsfield account status --json || echo "[worker] aviso: no se pudo verificar la cuenta (sigo igual)."

echo "[worker] arrancando el loop…"
exec node /app/kitchen-worker.mjs
