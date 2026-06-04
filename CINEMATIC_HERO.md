# Hero cinemático — especificación de assets

Hero guiado por scroll que cuenta la transformación **rostro → maquillaje → outfit → locación**,
con una secuencia de frases. Construido con imágenes por capas + scroll (sin video).

## 1. Imágenes de etapa (lo más importante)

Genera **4 fotos de la MISMA chica**, una por etapa. El efecto depende de que el
**encuadre, la pose, la escala y la posición del rostro sean IDÉNTICOS** en las 4 —
solo debe cambiar el elemento de cada etapa. (Tip: misma semilla/pose en el generador,
editando solo maquillaje / ropa / fondo.)

| Archivo (en `/public`) | Etapa | Qué cambia | Mantener igual |
|---|---|---|---|
| `hero-stage-1.jpg` | Rostro base | Sin maquillaje, fondo neutro, look natural | encuadre / pose / rostro |
| `hero-stage-2.jpg` | + Maquillaje | Glam / styling de estudio | encuadre / pose / fondo |
| `hero-stage-3.jpg` | + Outfit | Cambio de ropa (editorial) | encuadre / pose / fondo |
| `hero-stage-4.jpg` | + Locación | Background de ensueño (Maldivas, etc.) | encuadre / pose |

### Specs técnicas
- **Orientación:** vertical (retrato), sujeto centrado.
- **Resolución:** mínimo 1080×1920 (9:16) o 1280×1600 (4:5). Recomendado 1440×1920.
- **Formato/peso:** JPG alta calidad, optimizado (~400–600 KB c/u).
- **Iluminación/exposición consistente** entre etapas (para que el fundido no "salte").
- Opcional: `hero-poster.jpg` (primer frame para mostrar mientras carga).

### Si no puedes clavar el mismo encuadre
No pasa nada: lo construyo con **fundidos cinematográficos tolerantes** (crossfade + ligero
zoom/parallax) que funcionan aunque las poses difieran un poco (como el comparador antes/después).
El efecto "aparece el maquillaje encima del mismo rostro" se ve mejor con encuadre clavado,
pero el crossfade entre composiciones distintas también luce premium.

## 2. Secuencia de frases (scroll)

**Recomendada (ES):**
1. `Empieza contigo.`  → aparece el rostro
2. `Sumamos el glam.`  → maquillaje
3. `Cambiamos el look.` → outfit
4. `Te llevamos a cualquier lugar.` → background
5. `Tu fotógrafo IA.` + CTA

**EN:** It starts with you. → Add the glam. → Switch the look. → Anywhere in the world. → Your AI photographer.

**Alternativa (corta/paralela):** `Tu rostro.` → `Tu estilo.` → `Tu mundo.` → `Tu fotógrafo IA.`

## 3. Cómo funcionará (técnico)
- Sección sticky alta (~300–400vh); el contenido queda pineado mientras se hace scroll.
- `useScroll` + `useTransform` (Framer Motion) → el progreso 0→1 dispara cada etapa.
- Cada frase entra/sale en su tramo; cada imagen se funde sobre la anterior.
- Etapa "maquillaje" se puede reforzar con grado de color (B/N→color, glow sutil).
- Respeta `prefers-reduced-motion`: muestra el estado final estático.

## 4. Multi-idioma
Las frases se cargarán por idioma (igual que el resto del sitio, 7 idiomas).

---

## 5. Prompts para Gemini (Nano Banana / Gemini 2.5 Flash Image)

**Truco clave:** NO generes las 4 por separado. Genera la **Etapa 1**, y para cada
etapa siguiente **sube la imagen anterior y pídele que la edite**. Editar la misma
imagen es lo que mantiene rostro + pose + encuadre idénticos.

> Formato: pide **9:16 vertical**. Si la salida es pequeña, súbela a ~1440×1920 con un
> upscaler antes de ponerla en `/public`. Prompts en inglés = mejores resultados.

### Etapa 1 — Rostro base (texto → imagen)
```
Photorealistic vertical 9:16 portrait of a 25-year-old woman, head-and-shoulders to
upper chest, centered in frame, facing the camera with a soft natural expression.
Bare skin, NO makeup, natural eyebrows, hair pulled back simply. Plain seamless
light-grey studio background. Soft even beauty lighting, 85mm lens, shallow depth of
field, ultra-detailed realistic skin texture, high resolution. Natural, casual look.
```

### Etapa 2 — + Maquillaje (sube la Etapa 1 y edita)
```
Using this exact image: keep the SAME woman — identical face, identity, pose, head
position, framing, crop and background. Add professional glam makeup: flawless
foundation, softly contoured cheeks, defined smokey eyes with long lashes, groomed
brows, glossy nude lips; lightly styled voluminous hair. Do NOT change her face shape,
features, pose, camera angle or background. Only add makeup and hair styling.
Photorealistic, high resolution, 9:16.
```

### Etapa 3 — + Outfit (sube la Etapa 2 y edita)
```
Using this exact image: keep the SAME woman — identical face, makeup, pose, framing
and background. Change ONLY her clothing into a chic editorial outfit (e.g. a
structured ivory blazer over a silk top). Keep identity, pose, crop, lighting and
background unchanged. Photorealistic, high resolution, 9:16.
```

### Etapa 4 — + Locación (sube la Etapa 3 y edita)
```
Using this exact image: keep the SAME woman — identical face, makeup, hair, outfit and
pose. Replace ONLY the plain studio background with a cinematic luxury location: an
overwater villa in the Maldives at golden hour, warm sunlight, soft ocean bokeh.
Subtly relight the subject so it blends with the new background. Keep her identity,
pose, framing and crop identical. Photorealistic, high resolution, 9:16.
```

### Tips
- Si algún rasgo "se mueve", re-genera añadiendo: `keep her face EXACTLY as in the reference image, do not alter identity`.
- Para un reveal más lento puedes dividir el maquillaje en micro-pasos (piel → ojos → labios).
- Cambia los detalles entre `[...]` (outfit, locación, rasgos) a tu gusto; mantén SIEMPRE las frases de "same woman / same pose / same framing".
- Guarda como `hero-stage-1.jpg … hero-stage-4.jpg` en `/public`.

