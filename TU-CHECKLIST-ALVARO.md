# Tu checklist — para pasarle todo al nuevo dev

Alvaro, seguí estos 5 pasos en orden. Nada más.

---

## Paso 1 — Committea y pusheá lo que tenés local (5 min)

Tenés 20 archivos modificados que están solo en tu Mac. Si no los pusheás, se pierden.

```bash
cd '/Users/alvaropro/Lets Shoot new'
git add -A
git commit -m "handoff: rediseño 3D azul, PortalHeader, StatusDot, módulo propuestas, i18n, bugfixes"
git push origin main
```

Y lo mismo en el otro repo:
```bash
cd ~/letshoot-internal
git add -A
git commit -m "handoff: HANDOFF.md + docs finales"
git push origin main
```

Después de esto, el nuevo dev al clonar ve TODO.

---

## Paso 2 — Copiá las env vars de producción (2 min)

```bash
cd '/Users/alvaropro/Lets Shoot new'
npx vercel env pull .env.production
gpg -c .env.production      # te pide una contraseña, elegí una fuerte
rm .env.production           # borrá la sin cifrar
```

Te queda `.env.production.gpg`. Esa es la que le mandás al dev por WhatsApp/Signal. La contraseña se la mandás por OTRO canal (email si el otro fue WhatsApp).

---

## Paso 3 — Mandá las 6 invitaciones (10 min)

Con el email del nuevo dev, invitalo a:

| Dónde | Cómo |
|---|---|
| **GitHub** — org `ASM-Media-Group-LLC` | github.com/orgs/ASM-Media-Group-LLC/people → Invite member (team dev) |
| **Vercel** — team de la org | vercel.com → Settings → Members → Invite |
| **Supabase** — proyecto `grbvkwolcjcqxfsiytox` | supabase.com → Project → Settings → Team → Invite |
| **GoDaddy** — dominio letshoot.ai | godaddy.com → Account Settings → Delegate Access |
| **Resend** — cuenta de emails | resend.com → Team → Invite |
| **Higgsfield** — cuenta actual | cambiá el email de la cuenta al del dev, o creale una nueva y mandale el pago |

Higgsfield es el más manual — probablemente lo más simple es que el nuevo dev use su propio email en una cuenta nueva y le agregás $10-20 de crédito.

---

## Paso 4 — Mandale este mensaje (copiá-pegá tal cual)

```
Hola,

Te paso LetShoot. Todo está documentado — no tenés que adivinar nada.

TU PUNTO DE ENTRADA:
Cloná el repo y abrí PARA-EL-NUEVO-DEV.md en la raíz. Ahí te digo:
- Los 3 archivos que tenés que leer (15 min)
- Los 3 pasos apenas tengas acceso
- Qué NO hacer
- Qué SÍ hacer
- Los 6 accesos que ya te mandé

Después de eso, si algo no está claro, preguntame.

Adjunto: .env.production.gpg (contraseña por otro canal en un ratito).

Repos:
- github.com/ASM-Media-Group-LLC/letshootv2 (sitio principal — está en Vercel)
- github.com/ASM-Media-Group-LLC/letshoot-internal (motor de generación — no está deployado)

Cualquier duda de negocio o historia del proyecto, escribime.

Alvaro
rusin24@gmail.com
```

Si querés hacer una call de 20 min con él para pasarle el contexto de negocio (por qué Julia, la relación con Kash Agency, el blocker de Higgsfield), ese mensaje ya lo dice.

---

## Paso 5 — Al día siguiente, rotá vos los secretos que estuvieron en tu Mac (10 min)

Esto es solo por precaución — la Mac va a cambiar de dueño técnico.

1. **Higgsfield** — `cloud.higgsfield.ai/api-keys` → borrar la key "letshoot-internal" (que estaba en `~/letshoot-internal/.env`).
2. **Supabase** — Project Settings → API → **Reset service_role secret** → actualizalo en Vercel (Settings → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY`) → redeploy.
3. **Resend** — API Keys → borrar la que uses local si la tuviste en `.env.local`.

**No borres los `.env` locales de la Mac** — que el nuevo dev los use como referencia si necesita. Ya están cifrados por vos en el `.gpg` del paso 2.

---

## Eso es todo

5 pasos. Con eso el nuevo dev tiene absolutamente todo lo que necesita: código, contexto, credenciales, decisiones, historia, roadmap. Y vos quedás protegido.

Si te trabás en algún paso, decime cuál y te lo hago yo o te lo explico más simple.
