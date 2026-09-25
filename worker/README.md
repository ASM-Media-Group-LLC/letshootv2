# Worker de cocina 24/7 (fuera de tu Mac)

El **worker** agarra cada foto de la cola de `/kitchen` y le dice a Higgsfield que la haga.
Hoy corre en tu Mac (si se cierra, se cuelga). Esto lo mueve a un **servidor en la nube que
está siempre prendido** (Railway) — tu Mac deja de importar.

Corre solo para siempre porque el login de Higgsfield trae un **refresh_token** que se renueva solo.

## Pasos (una sola vez, ~10 min)

### 1) Copiá tu login de Higgsfield (en tu Mac)
En la Terminal, corré estos dos comandos y guardá cada resultado (⚠️ tienen tu token —
péguenlos SOLO en Railway, en secreto; nunca en el repo ni en un chat):

```bash
cat ~/.config/higgsfield/credentials.json
cat ~/.config/higgsfield/config.json
```

Si `credentials.json` no existe, primero: `higgsfield auth login`.

### 2) Creá el servicio en Railway
1. Entrá a railway.app → **New Project** → **Deploy from GitHub repo** → elegí este repo.
2. En **Settings → Build**: poné **Dockerfile Path** = `worker/Dockerfile`.
   (Railway construye desde la raíz del repo; el Dockerfile toma `scripts/kitchen-worker.mjs`.)
3. Este servicio NO necesita puerto ni dominio (es un worker, no una web).

### 3) Variables de entorno (Railway → Variables)
| Variable | Valor |
|---|---|
| `SB_URL` | `https://grbvkwolcjcqxfsiytox.supabase.co` |
| `SB_ANON` | tu Supabase **anon key** (está en `.env.local` como `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `WORKER_SECRET` | el valor de `WORKER_SECRET` en `scripts/.worker.env` |
| `HIGGSFIELD_CREDENTIALS` | lo que salió de `cat ~/.config/higgsfield/credentials.json` |
| `HIGGSFIELD_CONFIG` | lo que salió de `cat ~/.config/higgsfield/config.json` |

### 4) Deploy
Railway construye y arranca. En los **logs** deberías ver:
`[worker] arrancando el loop…` y `cola vacía, esperando…`. Listo — cocina 24/7.

## Notas
- Cuando cocines desde la app, el worker de la nube toma el trabajo (no tu Mac). Podés cerrar la Mac.
- Si algún día se desloguea después de un redeploy, volvé a pegar un `credentials.json` fresco
  (paso 1) — el refresh_token pudo haber rotado.
- **Apagá el worker de tu Mac** para que no corran dos a la vez (uno en la nube alcanza).
- Render también sirve (Background Worker, mismo Dockerfile); Railway es el más simple.
