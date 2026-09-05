# Invitar a Brayan — 6 servicios, click por click

**Email de Brayan:** `brayan.castano@unlok.me`

Copiá-pegá el email en cada uno. Son 30 seg cada uno.

---

## 1) GitHub — 2 formas, elegí una

**Forma A — Rápida (dashboard):**
1. Abrí: **https://github.com/orgs/ASM-Media-Group-LLC/people**
2. Botón **"Invite member"** (arriba a la derecha)
3. Pegá `brayan.castano@unlok.me` → Send Invite
4. En **https://github.com/orgs/ASM-Media-Group-LLC/teams** crea (o abrí) un team `dev` y agregalo con acceso a los 2 repos: `letshootv2` y `letshoot-internal`

**Forma B — Terminal (si preferís, 1 comando):**
```bash
gh auth refresh -h github.com -s admin:org
gh api -X POST /orgs/ASM-Media-Group-LLC/invitations -f email='brayan.castano@unlok.me' -f role='direct_member'
```

---

## 2) Vercel — ⚠️ requiere upgrade

Tu team `acm-tech` está en **Plan Hobby** — no permite invitar miembros.

**Opciones:**
- **A)** Upgrade a **Pro** ($20/mes por miembro) en **https://vercel.com/teams/acm-tech/settings/billing** → después invitá a `brayan.castano@unlok.me` en **https://vercel.com/teams/acm-tech/settings/members**
- **B)** Transferir el proyecto `letshootv2` a la cuenta personal de Brayan (más simple, sin costo). En Vercel → Project `letshootv2` → Settings → **Transfer Project** → pegá su email.
- **C)** Dejarlo por ahora — mientras Brayan estudia el código no necesita Vercel; el deploy lo podés seguir haciendo vos hasta que decida.

**Mi voto:** empieza con **C** hasta que Brayan te confirme que va a manejar deploys. Cuando eso pase, hacé **B** (más simple, cero costo).

---

## 3) Supabase

1. Abrí: **https://supabase.com/dashboard/project/grbvkwolcjcqxfsiytox/settings/team**
2. Botón **"Invite a member"**
3. Pegá `brayan.castano@unlok.me`
4. Rol: **Owner** (para que pueda hacer migraciones y ver secretos) o **Developer** (más restringido)

---

## 4) GoDaddy — dominio letshoot.ai

1. Abrí: **https://sso.godaddy.com/account/access**
2. Botón **"Invite to access"**
3. Pegá `brayan.castano@unlok.me`
4. Nivel: **"Products, Domains & Purchase"** (para que pueda editar DNS del dominio)

---

## 5) Resend — envío de emails

1. Abrí: **https://resend.com/settings/team**
2. Botón **"Invite team member"**
3. Pegá `brayan.castano@unlok.me`
4. Rol: **Admin** (para que pueda crear/rotar API keys)

---

## 6) Higgsfield — generación de imágenes

Higgsfield no tiene "invitar miembro" — es cuenta personal. **Tres opciones:**

**A) Le compartís la tuya** (más rápido, menos seguro):
- Le mandás tu email + contraseña actual de `higgsfield.ai` (rusin24@gmail.com) por WhatsApp/Signal
- Él ingresa, cambia la contraseña, y listo
- Perdés acceso vos — asumí que ya no la usás

**B) Le hacés cuenta nueva y le pasás créditos** (recomendado):
- Que él cree su cuenta en `cloud.higgsfield.ai` con su email
- Vos le pasás $10-20 de crédito para que arranque (Stripe en cloud.higgsfield.ai/billing)

**C) Le pasás sólo la API key** (si él solo va a hacer llamadas API):
- Vas a **cloud.higgsfield.ai/api-keys** → creá una nueva key "brayan-dev"
- Se la mandás por canal seguro (Signal, mail cifrado)
- Ojo: comparte los créditos con la tuya

---

## Verificación al terminar

Después de mandar las 6, escribile a Brayan por WhatsApp/email:

> Ya te mandé invitaciones a los 6 servicios con tu correo brayan.castano@unlok.me. Revisá tu bandeja (y spam) — deberías tener mails de:
> • GitHub (invitación a org ASM-Media-Group-LLC)
> • Supabase
> • GoDaddy
> • Resend
> • Higgsfield (usuario/pass o API key según lo que hayamos decidido)
> Confirmame cuando puedas entrar a los 5. Vercel lo vemos después.

---

## Mensaje final para Brayan (después de mandar todas las invitaciones)

```
Hola Brayan,

Te paso LetShoot. Todo está documentado — no tenés que adivinar nada.

TU PUNTO DE ENTRADA:
1. Aceptá la invitación a github.com/ASM-Media-Group-LLC (te llegó por mail).
2. Cloná los 2 repos:
   • github.com/ASM-Media-Group-LLC/letshootv2 (sitio principal, en Vercel)
   • github.com/ASM-Media-Group-LLC/letshoot-internal (motor generación, aún NO deployado)
3. Abrí PARA-EL-NUEVO-DEV.md en la raíz de letshootv2. Ahí te digo:
   • Los 3 archivos que tenés que leer (15 min)
   • Los 3 pasos apenas tengas acceso
   • Qué NO hacer y qué SÍ hacer
   • Los 6 accesos que te mandé

Adjunto (en este mensaje o el siguiente):
• .env.production.gpg  →  env vars de producción cifradas
• Contraseña de descifrado: Hr7FswGqUlhK6TaSRldeSVlE
  (te la mando por otro canal por seguridad; si acá va todo junto, borrala del historial al terminar)

En 15-30 min de lectura tenés el panorama completo. Cualquier duda de negocio, historia del proyecto o "por qué esto es así", escribime.

Ah, un blocker que vas a ver documentado: la LoRA de Julia Parker no es accesible por API de Higgsfield (está en su cuenta de web, no en la de developers). En HANDOFF.md sección §5 explico las 4 alternativas — cuando lo veas, decime cuál te parece.

Alvaro
rusin24@gmail.com
```

---

## Recordatorio: día siguiente

- **Rotá los secretos que estuvieron en tu Mac** (Higgsfield key + Supabase service_role → actualizala en Vercel Env Vars → Redeploy).
- **Borrá** `.env.production.gpg` y `.handoff-passphrase.txt` de tu Mac cuando Brayan confirme que los recibió.
