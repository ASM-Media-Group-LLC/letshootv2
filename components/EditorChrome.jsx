'use client';

// EditorChrome — fake AI photo-editor UI that frames the portrait during the
// hero edit phase. Adds tool sidebar (left), adjustments panel (right),
// layers/history panel, and a top toolbar. Tools change per stage to suggest
// real-time editing. All non-interactive (decorative).

import { AnimatePresence, motion } from 'framer-motion';
import {
  Crop, Wand2, Eye, Palette, Layers, Image as ImageIcon, Map, Shirt, Sparkles,
  Sliders, Sun, Contrast, Droplet, Aperture, ChevronRight,
} from 'lucide-react';

// Per-stage active tool, layers, label
const STAGE_DATA = [
  {
    activeTool: 'face',
    badge: 'Detección facial',
    layers: [
      { name: 'Base · rostro',          color: '#7FE0FF', active: true },
    ],
    adjustments: [
      { label: 'Suavizado',   value: 0,  icon: 'droplet' },
      { label: 'Luminosidad', value: 0,  icon: 'sun' },
      { label: 'Saturación',  value: 0,  icon: 'palette' },
    ],
  },
  {
    activeTool: 'makeup',
    badge: 'Maquillaje IA',
    layers: [
      { name: 'Base · rostro',          color: '#7FE0FF', active: false },
      { name: 'Glam · maquillaje',      color: '#FF3D7F', active: true  },
    ],
    adjustments: [
      { label: 'Smokey eye',   value: 78, icon: 'palette' },
      { label: 'Labios nude',  value: 64, icon: 'droplet' },
      { label: 'Contorno',     value: 52, icon: 'sun' },
    ],
  },
  {
    activeTool: 'outfit',
    badge: 'Vestuario IA',
    layers: [
      { name: 'Base · rostro',          color: '#7FE0FF', active: false },
      { name: 'Glam · maquillaje',      color: '#FF3D7F', active: false },
      { name: 'Outfit · blazer',        color: '#9D5BFF', active: true  },
    ],
    adjustments: [
      { label: 'Textura tejido', value: 88, icon: 'droplet' },
      { label: 'Brillo seda',    value: 70, icon: 'sun' },
      { label: 'Contraste',      value: 60, icon: 'contrast' },
    ],
  },
  {
    activeTool: 'location',
    badge: 'Locación IA',
    layers: [
      { name: 'Base · rostro',          color: '#7FE0FF', active: false },
      { name: 'Glam · maquillaje',      color: '#FF3D7F', active: false },
      { name: 'Outfit · blazer',        color: '#9D5BFF', active: false },
      { name: 'Locación · NYC',         color: '#00B1F6', active: true  },
    ],
    adjustments: [
      { label: 'Profundidad',  value: 92, icon: 'sliders' },
      { label: 'Hora dorada',  value: 84, icon: 'sun' },
      { label: 'Bokeh',        value: 70, icon: 'aperture' },
    ],
  },
  {
    activeTool: 'final',
    badge: 'Renderizado final',
    layers: [
      { name: 'Base · rostro',          color: '#7FE0FF', active: false },
      { name: 'Glam · maquillaje',      color: '#FF3D7F', active: false },
      { name: 'Outfit · top',           color: '#9D5BFF', active: false },
      { name: 'Locación · Maldivas',    color: '#00B1F6', active: true  },
      { name: 'Render · final',         color: '#3DDC97', active: true  },
    ],
    adjustments: [
      { label: 'Calidad',      value: 100, icon: 'sliders' },
      { label: 'Color grading',value: 100, icon: 'palette' },
      { label: 'HDR',          value: 100, icon: 'sun' },
    ],
  },
];

const ICONS = {
  sliders: Sliders, sun: Sun, palette: Palette, droplet: Droplet,
  contrast: Contrast, aperture: Aperture,
};

const TOOLS = [
  { id: 'face',     icon: Eye,        label: 'Rostro' },
  { id: 'makeup',   icon: Wand2,      label: 'Maquillaje' },
  { id: 'outfit',   icon: Shirt,      label: 'Outfit' },
  { id: 'location', icon: Map,        label: 'Locación' },
  { id: 'final',    icon: Sparkles,   label: 'Final' },
];

const ease = [0.22, 1, 0.36, 1];

// Standalone background component — must wrap the editor view so it
// covers the MeshGradient. Use <EditorBg /> separately from <EditorChrome />.
export function EditorBg() {
  return (
    <>
      {/* Solid editor background — dark navy in dark mode, near-white in light.
          Covers the MeshGradient so the editor feels like a real app workspace. */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background: 'radial-gradient(ellipse 120% 100% at 50% 50%, rgb(var(--surface)) 0%, rgb(var(--bg)) 75%)',
        }}
      />
      {/* Editor app-style dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: 'radial-gradient(rgb(var(--overlay) / 0.10) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />
      {/* Subtle vignette to focus the canvas */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: 'radial-gradient(ellipse 70% 65% at 50% 50%, transparent 40%, rgb(var(--bg) / 0.6) 100%)',
        }}
      />
    </>
  );
}

export default function EditorChrome({ stage = 0, scanProgress = 0 }) {
  const data = STAGE_DATA[stage] || STAGE_DATA[0];

  return (
    <>

      {/* ── TOP TOOLBAR ────────────────────────────────────────────────────── */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-3 sm:px-8">
        {/* Left: file menu mock + brand */}
        <div className="flex items-center gap-3">
          <div className="glass-ios flex items-center gap-2 rounded-lg px-3 py-1.5">
            <Aperture size={13} className="text-brand" strokeWidth={2.4} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-paper">LetShoot · Editor IA</span>
          </div>
          <div className="hidden gap-1 sm:flex">
            {['Archivo', 'Editar', 'Vista', 'IA'].map((m) => (
              <span key={m} className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Right: stage badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`badge-${stage}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease }}
            className="glass-ios flex items-center gap-2 rounded-full px-3 py-1.5"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-paper">{data.badge}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── LEFT TOOLBAR (icon rail) ──────────────────────────────────────── */}
      <div className="absolute left-3 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
        <div className="glass-ios flex flex-col items-center gap-1 rounded-2xl p-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = tool.id === data.activeTool;
            return (
              <div
                key={tool.id}
                className={`group relative grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                  isActive ? 'bg-brand text-on-accent' : 'text-paper-mute'
                }`}
              >
                <Icon size={16} strokeWidth={2} aria-hidden />
                <span className="pointer-events-none absolute left-12 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white opacity-0 transition-opacity">
                  {tool.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL — Adjustments + Layers ─────────────────────────────── */}
      <div className="absolute right-3 top-1/2 z-30 hidden w-[200px] -translate-y-1/2 flex-col gap-3 lg:flex">
        {/* Adjustments */}
        <div className="glass-ios rounded-2xl p-3">
          <div className="mb-3 flex items-center gap-1.5">
            <Sliders size={11} className="text-brand" aria-hidden />
            <span className="font-mono text-[9px] uppercase tracking-widest text-paper-mute">Ajustes</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`adj-${stage}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2.5"
            >
              {data.adjustments.map((adj) => {
                const Icon = ICONS[adj.icon] || Sliders;
                return (
                  <div key={adj.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-paper-mute">
                        <Icon size={9} aria-hidden />
                        {adj.label}
                      </span>
                      <span className="font-mono text-[9px] text-brand">{adj.value}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-sky"
                        initial={{ width: 0 }}
                        animate={{ width: `${adj.value}%` }}
                        transition={{ duration: 0.8, ease, delay: 0.1 }}
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Layers */}
        <div className="glass-ios rounded-2xl p-3">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Layers size={11} className="text-brand" aria-hidden />
            <span className="font-mono text-[9px] uppercase tracking-widest text-paper-mute">Capas</span>
          </div>
          <div className="space-y-1.5">
            <AnimatePresence>
              {data.layers.map((layer, idx) => (
                <motion.div
                  key={layer.name}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease, delay: idx * 0.05 }}
                  className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 ${
                    layer.active ? 'bg-white/6' : ''
                  }`}
                >
                  <div
                    className="h-2 w-2 shrink-0 rounded-sm ring-1 ring-white/20"
                    style={{ background: layer.color }}
                  />
                  <span className={`flex-1 font-mono text-[9px] ${layer.active ? 'text-paper' : 'text-paper-dim'}`}>
                    {layer.name}
                  </span>
                  {layer.active && <span className="h-1 w-1 animate-pulse rounded-full bg-brand" />}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: AI scan progress + render status ───────────────────────── */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
        <div className="glass-ios flex items-center gap-3 rounded-full px-4 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-paper">IA · Renderizando</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-brand via-sky to-pink"
                style={{ width: `${Math.round(scanProgress * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[9px] text-paper-mute">{Math.round(scanProgress * 100)}%</span>
          </div>
        </div>
      </div>
    </>
  );
}
