# Hola — bienvenido a LetShoot

Alvaro te está pasando el proyecto. Léelo TODO antes de tocar nada. Toma 15 minutos.

---

## 1) Los 3 archivos que tenés que leer, en este orden

1. **`HANDOFF.md`** (en la raíz de este repo `letshootv2`) — resumen ejecutivo, accesos, estado, roadmap.
2. **`HANDOFF.md`** del otro repo (`letshoot-internal`) — motor de generación y el blocker de la LoRA de Julia.
3. **`README.md`** de cada repo — detalle técnico.

Si algo no está claro después de leer estos 3, preguntale a Alvaro (rusin24@gmail.com).

---

## 2) Los primeros 3 pasos apenas tengas acceso

1. **Rotá los secretos** (§2 del `HANDOFF.md` — punto crítico de seguridad).
2. **Bajá los 2 repos** y corré `npm install && npm run dev` en cada uno para confirmar que compilan.
3. **Leé el último `git log --oneline -30`** de cada repo. Los commits cuentan la historia real de decisiones.

---

## 3) Lo que NO hacer

- ❌ NO desactivar RLS en Supabase (si algo falla, es RLS — hay que agregar política, no quitarla).
- ❌ NO commitear archivos `.env*` (están gitignored por algo).
- ❌ NO cambiar la familia de color de marca (siempre azul cyan `#00B1F6`).
- ❌ NO borrar cuentas "que parecen demo" (hay 6 reales, están listadas en §7 del `HANDOFF.md`).
- ❌ NO deployar sin `npx next build` local pasando.

---

## 4) Lo que sí hacer

- ✅ Usar los componentes compartidos: `<PortalHeader>` para top bars, `<StatusDot>` / `<StatusBanner>` para estados.
- ✅ Usar los tokens de diseño (`ink`, `paper`, `brand`, etc.) — no colores raw.
- ✅ Migrar la base con `drizzle-kit` (en el interno) o SQL migrations en `supabase/migrations/` (en el principal).
- ✅ Commitear en chunks lógicos con mensajes en español (mirar los commits pasados).

---

## 5) Los accesos que te mandó Alvaro

Vas a recibir invitación por email a:
1. GitHub — org `ASM-Media-Group-LLC` (repos `letshootv2` + `letshoot-internal`).
2. Vercel — team de la org (proyecto `letshootv2` en producción).
3. Supabase — proyecto ref `grbvkwolcjcqxfsiytox`.
4. GoDaddy — dominio `letshoot.ai` (para DNS).
5. Resend — cuenta de emails.
6. Higgsfield — credenciales para la cuenta actual (`rusin24@gmail.com`).
7. (opcional) fal.ai + muapi.ai — solo si vas a resolver el blocker de la LoRA.

Alvaro también te pasa un archivo `.env.production.gpg` cifrado por otro canal (WhatsApp/Signal) con la contraseña. Ese archivo tiene las env vars actuales de producción — te sirve para reproducir el entorno local. **Después de usarlo, borralo.**

---

## 6) Al final del día 1

Vas a saber:
- Qué es LetShoot (portal + motor interno).
- Qué está en producción y qué no (todo lo de `letshoot-internal` NO está deployado).
- El blocker de negocio de la LoRA de Julia y las 4 rutas para desbloquearlo.
- Qué está pendiente priorizado (§9 del `HANDOFF.md`).

Cualquier duda antes → Alvaro. **Suerte.**
