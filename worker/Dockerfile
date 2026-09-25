# Worker de cocina (/kitchen) para correr 24/7 en la nube (Railway/Render) — NO en la Mac del dueño.
# Instala el CLI de Higgsfield + corre el loop del worker. El login de Higgsfield se inyecta
# por variables de entorno (el dueño las pega en Railway; nunca viven en el repo).
FROM node:20-slim

# git no hace falta; sí certificados para HTTPS.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

# CLI de Higgsfield (lo que usa el worker para generar).
RUN npm install -g @higgsfield/cli

WORKDIR /app
COPY scripts/kitchen-worker.mjs ./kitchen-worker.mjs
COPY worker/start.sh ./start.sh
RUN chmod +x ./start.sh

# Arranca: reconstruye el login de Higgsfield desde las env vars y lanza el worker.
CMD ["./start.sh"]
