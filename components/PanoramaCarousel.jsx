'use client';

// Smooth, premium auto-scrolling gallery (infinite marquee). Replaces the old
// 3D coverflow. Images glide left in a seamless loop and pause on hover.
export default function PanoramaCarousel({ images }) {
  const loop = [...images, ...images]; // duplicated for a seamless loop

  return (
    <div
      className="group relative h-full w-full overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div className="flex h-full w-max items-center will-change-transform animate-[ls-marquee_45s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {loop.map((src, i) => (
          <div
            key={i}
            className="relative mr-3 aspect-[3/4] h-48 shrink-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 sm:mr-4 sm:h-[clamp(300px,52vh,540px)] sm:rounded-3xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: '50% 22%' }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      <style>{`@keyframes ls-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
