// ─────────────────────────────────────────────────────────────────────────
// StatusDot — pill/estado universal estilo Linear/Notion.
//
// Un puntito de color a la izquierda + texto neutro. Sin fondo, sin borde
// outline, sin gradientes tinturados. Elegante, no grita.
//
// Uso:
//   <StatusDot tone="bad">Vencida</StatusDot>
//   <StatusDot tone="warn" size="sm">4d · 3 sept</StatusDot>
//   <StatusDot tone="brand">Activa</StatusDot>
//
// Tonos: brand (azul) · warn (ámbar) · bad (rojo) · ok (verde) · zinc (neutral)
// Sizes: sm · md
//
// Reemplaza en toda la plataforma el viejo patrón:
//   `border-X/40 bg-X/10 text-X-300 rounded-full px-2.5 py-0.5`
// que se veía como plantilla starter.
// ─────────────────────────────────────────────────────────────────────────

const DOT = {
  brand: 'bg-brand',
  warn:  'bg-amber-400',
  bad:   'bg-rose-500',
  ok:    'bg-emerald-400',
  zinc:  'bg-paper-mute',
};
const TEXT = {
  brand: 'text-paper',
  warn:  'text-paper',
  bad:   'text-paper',
  ok:    'text-paper',
  zinc:  'text-paper-mute',
};
const SIZE = {
  sm: 'gap-1.5 text-[11px] px-0 py-0',
  md: 'gap-2 text-xs px-0 py-0',
};

export default function StatusDot({ tone = 'zinc', size = 'sm', pulse = false, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap font-medium ${SIZE[size]} ${TEXT[tone]} ${className}`}
    >
      <span className="relative flex shrink-0">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
        {pulse && (
          <span className={`absolute inset-0 rounded-full ${DOT[tone]} animate-ping opacity-60`} />
        )}
      </span>
      {children}
    </span>
  );
}

// Variante para SECCIÓN/banner grande (VENCIDAS, "1 en producción"). Misma
// filosofía: sin borde outline tinto, sin fondo tinto. Solo el dot de color
// grande a la izquierda + jerarquía tipográfica y una separación vertical
// con la línea sutil.
export function StatusBanner({ tone = 'zinc', icon: Icon, title, subtitle, action, onClick, href }) {
  const Comp = onClick ? 'button' : href ? 'a' : 'div';
  const props = onClick ? { onClick, type: 'button' } : href ? { href } : {};
  return (
    <Comp
      {...props}
      className={`card3d group flex w-full items-center gap-4 rounded-2xl border border-line bg-card p-4 text-left transition-colors hover:border-hair`}
    >
      <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hair/5 ${TEXT[tone]}`}>
        {Icon && <Icon size={17} />}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${DOT[tone]}`} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-mute">{title}</div>
        {subtitle && <div className="mt-0.5 text-sm text-paper">{subtitle}</div>}
      </div>
      {action && (
        <span className="shrink-0 text-xs font-semibold text-paper-mute transition-colors group-hover:text-brand">
          {action}
        </span>
      )}
    </Comp>
  );
}
