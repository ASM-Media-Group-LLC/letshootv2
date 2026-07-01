'use client';

import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

// Section header with staggered entrance:
//  - Label pill: scales up
//  - Title: rises from below with blur reveal
//  - Highlighted gradient fragment: clip-path wipe (preserves gradient)
//  - Sub: fades in last
const HUES = {
  brand: 'text-brand',
  sky: 'text-sky',
  iris: 'text-iris',
  gradient: 'text-rainbow',
};

export default function SectionHeading({ label, titleA, highlight, sub, align = 'left', hue = 'brand' }) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const hl = HUES[hue] || HUES.brand;
  const isGradient = hue === 'gradient';

  return (
    <div className={`flex flex-col ${alignment}`}>
      {label && (
        <motion.span
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease }}
          className="mb-4 inline-block rounded-full border border-line bg-hair/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-paper-mute"
        >
          {label}
        </motion.span>
      )}

      <h2 className="headline max-w-3xl text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.06] text-paper [text-wrap:balance]">
        <motion.span
          initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease, delay: 0.08 }}
          className="inline"
        >
          {titleA}{' '}
        </motion.span>

        {highlight && (
          isGradient ? (
            // Gradient highlight — wipe reveal with vertical overflow margin so
            // diacritics/descenders aren't clipped.
            <motion.span
              initial={{ clipPath: 'inset(-20% 100% -20% 0)', opacity: 0 }}
              whileInView={{ clipPath: 'inset(-20% 0% -20% 0)', opacity: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                clipPath: { duration: 1.0, ease: [0.7, 0, 0.2, 1], delay: 0.35 },
                opacity:  { duration: 0.3, ease, delay: 0.3 },
              }}
              className={`inline-block ${hl}`}
              style={{ willChange: 'clip-path', paddingBlock: '0.1em' }}
            >
              {highlight}
            </motion.span>
          ) : (
            // Solid highlight — blur reveal
            <motion.span
              initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease, delay: 0.25 }}
              className={`inline ${hl}`}
            >
              {highlight}
            </motion.span>
          )
        )}
      </h2>

      {sub && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease, delay: 0.4 }}
          className="mt-5 max-w-xl text-lg leading-relaxed text-paper-mute [text-wrap:balance]"
        >
          {sub}
        </motion.p>
      )}
    </div>
  );
}
