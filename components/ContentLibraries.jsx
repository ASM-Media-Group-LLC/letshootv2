'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

const T = {
  es: {
    label: 'El sistema de enganche',
    titleA: '12 bibliotecas de',
    highlight: 'contenido estratégico',
    sub: 'Cada una con escenas que cuentan una historia y mantienen al fan enganchado día a día. No son ideas sueltas — es un sistema.',
    stat: '60 escenas listas para vender',
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
    ],
  },
  en: {
    label: 'The engagement system',
    titleA: '12 libraries of',
    highlight: 'strategic content',
    sub: 'Each one packed with scenes that tell a story and keep the fan hooked, day after day. Not loose ideas — a system.',
    stat: '60 scenes ready to sell',
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
    ],
  },
};

export default function ContentLibraries() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  return (
    <section id="concepts" className="relative scroll-mt-24 overflow-hidden bg-ink-2 py-24 sm:py-28">
      <div className="blob left-1/2 top-10 h-[380px] w-[560px] -translate-x-1/2 bg-brand/10" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 font-mono text-xs font-semibold text-brand">
            {t.stat}
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
