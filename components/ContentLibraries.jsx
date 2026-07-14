'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

const T = {
  es: {
    label: 'El sistema de enganche',
    libWord: 'bibliotecas de',
    highlight: 'contenido estratégico',
    sub: 'Cada una con escenas que cuentan una historia y mantienen al fan enganchado día a día. No son ideas sueltas — es un sistema.',
    statTail: 'listas para vender y enganchar',
    scenesWord: 'escenas',
    libraries: [
      { emoji: '🏋️', name: 'Gimnasio', scenes: ['Camino al gimnasio', 'Llegando al gimnasio', 'Terminando el entrenamiento', 'Descansando entre series', 'Comprando un batido', 'Regresando a casa'] },
      { emoji: '🍽️', name: 'Comida', scenes: ['Preparando desayuno', 'Almorzando', 'Cenando', 'Pidiendo comida', 'Cocinando', 'Probando un restaurante'] },
      { emoji: '🛍️', name: 'Compras', scenes: ['Comprando ropa', 'Comprando lencería', 'Haciendo supermercado', 'Comprando maquillaje', 'Comprando accesorios'] },
      { emoji: '💅', name: 'Belleza', scenes: ['Haciéndome las uñas', 'En el salón', 'Maquillándome', 'Rutina de skincare', 'Día de spa'] },
      { emoji: '✈️', name: 'Viajes', scenes: ['Camino al aeropuerto', 'Esperando el vuelo', 'En el avión', 'Llegando al hotel', 'Conociendo la ciudad'] },
      { emoji: '🚗', name: 'Transporte', scenes: ['En el carro', 'En Uber', 'En tráfico', 'Buscando parqueo'] },
      { emoji: '🏠', name: 'Casa', scenes: ['Recién despertando', 'Limpiando', 'Organizando el cuarto', 'Viendo una película', 'Preparándome para dormir'] },
      { emoji: '🎉', name: 'Vida social', scenes: ['Antes de salir', 'En una fiesta', 'Después de una fiesta', 'Con amigas'] },
      { emoji: '💼', name: 'Trabajo', scenes: ['Contestando mensajes', 'Grabando contenido', 'En una sesión de fotos', 'Editando contenido', 'Planeando la semana'] },
      { emoji: '❤️', name: 'Emociones', scenes: ['Hoy me siento enferma', 'Hoy estoy feliz', 'Tuve un día difícil', 'Estoy emocionada por algo', 'Necesitaba hablar con alguien'] },
      { emoji: '📅', name: 'Fechas especiales', scenes: ['Cumpleaños', 'Navidad', 'San Valentín', 'Halloween', 'Año Nuevo'] },
      { emoji: '☀️', name: 'Lifestyle', scenes: ['Día de piscina', 'Día de playa', 'Caminando con mi mascota', 'Leyendo un libro', 'Escuchando música'] },
      { emoji: '💌', name: 'Novia virtual (GFE)', scenes: ['Buenos días desde la cama', 'Antes de dormir', 'Te extrañé hoy', 'Pensando en ti', 'Ojalá estuvieras aquí', 'Nuestra cita de esta noche'] },
      { emoji: '🔥', name: 'Provocación', scenes: ['Nueva lencería', '¿Adivina qué llevo?', 'Cambio de outfit', 'Casi se me cae la toalla', 'Debajo del vestido', 'Justo antes de la ducha'] },
      { emoji: '🎭', name: 'POV / Fantasía', scenes: ['POV: llegaste a casa', 'POV: primera cita', 'POV: te desperté', 'Tu vecina traviesa', 'Rol de secretaria'] },
      { emoji: '🎲', name: 'Tú decides', scenes: ['Elige mi outfit', 'Verdad o reto', 'Rueda de la suerte', 'Encuesta picante', 'Tú mandas hoy'] },
      { emoji: '🔒', name: 'Solo para ti (VIP)', scenes: ['Esto no va a mi feed', 'Contenido exclusivo', 'Un secreto entre los dos', 'Regalo personalizado', 'Tu nombre en mi piel'] },
      { emoji: '⏳', name: 'Ofertas y urgencia', scenes: ['Drop de medianoche', 'Solo por hoy', 'Últimas horas', 'Combo especial', 'Descuento sorpresa'] },
      { emoji: '🛁', name: 'Rutina íntima', scenes: ['Saliendo de la ducha', 'Probándome ropa', 'En la cama', 'Bañera de burbujas', 'Relajándome'] },
      { emoji: '😏', name: 'Coqueteo', scenes: ['Mordiéndome el labio', 'Guiño para ti', 'Bailando para ti', 'Selfie al espejo', 'Nota de voz coqueta'] },
    ],
  },
  en: {
    label: 'The engagement system',
    libWord: 'libraries of',
    highlight: 'strategic content',
    sub: 'Each one packed with scenes that tell a story and keep the fan hooked, day after day. Not loose ideas — a system.',
    statTail: 'ready to sell and hook',
    scenesWord: 'scenes',
    libraries: [
      { emoji: '🏋️', name: 'Gym', scenes: ['On my way to the gym', 'Arriving at the gym', 'Finishing the workout', 'Resting between sets', 'Grabbing a shake', 'Heading back home'] },
      { emoji: '🍽️', name: 'Food', scenes: ['Making breakfast', 'Having lunch', 'Having dinner', 'Ordering in', 'Cooking', 'Trying a restaurant'] },
      { emoji: '🛍️', name: 'Shopping', scenes: ['Shopping for clothes', 'Shopping for lingerie', 'Grocery run', 'Buying makeup', 'Buying accessories'] },
      { emoji: '💅', name: 'Beauty', scenes: ['Getting my nails done', 'At the salon', 'Doing my makeup', 'Skincare routine', 'Spa day'] },
      { emoji: '✈️', name: 'Travel', scenes: ['On my way to the airport', 'Waiting for the flight', 'On the plane', 'Arriving at the hotel', 'Exploring the city'] },
      { emoji: '🚗', name: 'Transport', scenes: ['In the car', 'In an Uber', 'Stuck in traffic', 'Looking for parking'] },
      { emoji: '🏠', name: 'Home', scenes: ['Just waking up', 'Cleaning', 'Tidying my room', 'Watching a movie', 'Getting ready for bed'] },
      { emoji: '🎉', name: 'Social life', scenes: ['Before going out', 'At a party', 'After a party', 'With my girls'] },
      { emoji: '💼', name: 'Work', scenes: ['Answering messages', 'Filming content', 'At a photo shoot', 'Editing content', 'Planning the week'] },
      { emoji: '❤️', name: 'Emotions', scenes: ['Feeling sick today', 'Feeling happy today', 'Had a rough day', 'Excited about something', 'Needed to talk to someone'] },
      { emoji: '📅', name: 'Special dates', scenes: ['Birthday', 'Christmas', "Valentine's Day", 'Halloween', 'New Year'] },
      { emoji: '☀️', name: 'Lifestyle', scenes: ['Pool day', 'Beach day', 'Walking my pet', 'Reading a book', 'Listening to music'] },
      { emoji: '💌', name: 'Virtual girlfriend (GFE)', scenes: ['Good morning from bed', 'Before bed', 'Missed you today', 'Thinking of you', 'Wish you were here', 'Our date tonight'] },
      { emoji: '🔥', name: 'Teasing', scenes: ['New lingerie', 'Guess what I’m wearing', 'Outfit change', 'Towel almost slipped', 'Under the dress', 'Right before the shower'] },
      { emoji: '🎭', name: 'POV / Fantasy', scenes: ['POV: you got home', 'POV: first date', 'POV: I woke you up', 'Your naughty neighbor', 'Secretary roleplay'] },
      { emoji: '🎲', name: 'You decide', scenes: ['Pick my outfit', 'Truth or dare', 'Spin the wheel', 'Spicy poll', 'You’re in charge today'] },
      { emoji: '🔒', name: 'Just for you (VIP)', scenes: ['Not on my feed', 'Exclusive content', 'A secret between us', 'Personalized gift', 'Your name on my skin'] },
      { emoji: '⏳', name: 'Offers & urgency', scenes: ['Midnight drop', 'Today only', 'Final hours', 'Special combo', 'Surprise discount'] },
      { emoji: '🛁', name: 'Intimate routine', scenes: ['Fresh out of the shower', 'Trying on clothes', 'In bed', 'Bubble bath', 'Winding down'] },
      { emoji: '😏', name: 'Flirting', scenes: ['Biting my lip', 'A wink for you', 'Dancing for you', 'Mirror selfie', 'Flirty voice note'] },
    ],
  },
};

export default function ContentLibraries() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  const libCount = t.libraries.length;
  const totalScenes = t.libraries.reduce((n, l) => n + l.scenes.length, 0);
  const titleA = `${libCount} ${t.libWord}`;
  const stat = `${totalScenes} ${t.scenesWord} ${t.statTail}`;

  return (
    <section id="concepts" className="relative scroll-mt-24 overflow-hidden bg-ink-2 py-24 sm:py-28">
      <div className="blob left-1/2 top-10 h-[380px] w-[560px] -translate-x-1/2 bg-brand/10" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 font-mono text-xs font-semibold text-brand">
            {stat}
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.libraries.map((lib, i) => (
            <motion.div
              key={lib.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, ease, delay: (i % 3) * 0.06 }}
              className="rounded-2xl border border-line bg-gradient-to-b from-card to-ink-2/50 p-5 transition-colors hover:border-brand/30"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-hair/5 text-2xl ring-1 ring-line" aria-hidden>
                  {lib.emoji}
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold text-paper">{lib.name}</h3>
                  <span className="font-mono text-[11px] text-paper-dim">{lib.scenes.length} {t.scenesWord}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {lib.scenes.map((s) => (
                  <span key={s} className="rounded-full border border-line bg-ink-2/70 px-2.5 py-1 text-xs text-paper-mute">
                    {s}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
