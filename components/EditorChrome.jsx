'use client';

// EditorChrome — fake AI photo-editor UI that frames the portrait during the
// hero edit phase. Adds tool sidebar (left), adjustments panel (right),
// layers/history panel, and a top toolbar. Tools change per stage to suggest
// real-time editing. All non-interactive (decorative).

import { AnimatePresence, motion } from 'framer-motion';
import {
  Wand2, Eye, Palette, Layers, Map, Shirt, Sparkles,
  Sliders, Sun, Contrast, Droplet, Aperture,
} from 'lucide-react';
import { useLang } from '@/app/providers';

// ── i18n dictionary ──────────────────────────────────────────────────────────
const I18N = {
  es: {
    brand: 'LetShoot · Editor IA',
    menus: ['Archivo', 'Editar', 'Vista', 'IA'],
    adjustmentsTitle: 'Ajustes',
    layersTitle: 'Capas',
    renderingStatus: 'IA · Renderizando',
    tools: { face: 'Rostro', makeup: 'Maquillaje', outfit: 'Outfit', location: 'Locación', final: 'Final' },
    stages: [
      {
        badge: 'Detección facial',
        layers: [{ name: 'Base · rostro' }],
        adjustments: [{ label: 'Suavizado' }, { label: 'Luminosidad' }, { label: 'Saturación' }],
      },
      {
        badge: 'Maquillaje IA',
        layers: [{ name: 'Base · rostro' }, { name: 'Glam · maquillaje' }],
        adjustments: [{ label: 'Smokey eye' }, { label: 'Labios nude' }, { label: 'Contorno' }],
      },
      {
        badge: 'Vestuario IA',
        layers: [{ name: 'Base · rostro' }, { name: 'Glam · maquillaje' }, { name: 'Outfit · blazer' }],
        adjustments: [{ label: 'Textura tejido' }, { label: 'Brillo seda' }, { label: 'Contraste' }],
      },
      {
        badge: 'Locación IA',
        layers: [{ name: 'Base · rostro' }, { name: 'Glam · maquillaje' }, { name: 'Outfit · blazer' }, { name: 'Locación · NYC' }],
        adjustments: [{ label: 'Profundidad' }, { label: 'Hora dorada' }, { label: 'Bokeh' }],
      },
      {
        badge: 'Renderizado final',
        layers: [{ name: 'Base · rostro' }, { name: 'Glam · maquillaje' }, { name: 'Outfit · top' }, { name: 'Locación · Maldivas' }, { name: 'Render · final' }],
        adjustments: [{ label: 'Calidad' }, { label: 'Color grading' }, { label: 'HDR' }],
      },
    ],
  },
  en: {
    brand: 'LetShoot · AI Editor',
    menus: ['File', 'Edit', 'View', 'AI'],
    adjustmentsTitle: 'Adjustments',
    layersTitle: 'Layers',
    renderingStatus: 'AI · Rendering',
    tools: { face: 'Face', makeup: 'Makeup', outfit: 'Outfit', location: 'Location', final: 'Final' },
    stages: [
      {
        badge: 'Face detection',
        layers: [{ name: 'Base · face' }],
        adjustments: [{ label: 'Smoothing' }, { label: 'Brightness' }, { label: 'Saturation' }],
      },
      {
        badge: 'AI makeup',
        layers: [{ name: 'Base · face' }, { name: 'Glam · makeup' }],
        adjustments: [{ label: 'Smokey eye' }, { label: 'Nude lips' }, { label: 'Contour' }],
      },
      {
        badge: 'AI wardrobe',
        layers: [{ name: 'Base · face' }, { name: 'Glam · makeup' }, { name: 'Outfit · blazer' }],
        adjustments: [{ label: 'Fabric texture' }, { label: 'Silk sheen' }, { label: 'Contrast' }],
      },
      {
        badge: 'AI location',
        layers: [{ name: 'Base · face' }, { name: 'Glam · makeup' }, { name: 'Outfit · blazer' }, { name: 'Location · NYC' }],
        adjustments: [{ label: 'Depth' }, { label: 'Golden hour' }, { label: 'Bokeh' }],
      },
      {
        badge: 'Final render',
        layers: [{ name: 'Base · face' }, { name: 'Glam · makeup' }, { name: 'Outfit · top' }, { name: 'Location · Maldives' }, { name: 'Render · final' }],
        adjustments: [{ label: 'Quality' }, { label: 'Color grading' }, { label: 'HDR' }],
      },
    ],
  },
  pt: {
    brand: 'LetShoot · Editor IA',
    menus: ['Ficheiro', 'Editar', 'Ver', 'IA'],
    adjustmentsTitle: 'Ajustes',
    layersTitle: 'Camadas',
    renderingStatus: 'IA · A renderizar',
    tools: { face: 'Rosto', makeup: 'Maquilhagem', outfit: 'Outfit', location: 'Localização', final: 'Final' },
    stages: [
      { badge: 'Deteção facial',  layers: [{ name: 'Base · rosto' }], adjustments: [{ label: 'Suavização' }, { label: 'Luminosidade' }, { label: 'Saturação' }] },
      { badge: 'Maquilhagem IA',  layers: [{ name: 'Base · rosto' }, { name: 'Glam · maquilhagem' }], adjustments: [{ label: 'Smokey eye' }, { label: 'Lábios nude' }, { label: 'Contorno' }] },
      { badge: 'Vestuário IA',    layers: [{ name: 'Base · rosto' }, { name: 'Glam · maquilhagem' }, { name: 'Outfit · blazer' }], adjustments: [{ label: 'Textura tecido' }, { label: 'Brilho seda' }, { label: 'Contraste' }] },
      { badge: 'Localização IA',  layers: [{ name: 'Base · rosto' }, { name: 'Glam · maquilhagem' }, { name: 'Outfit · blazer' }, { name: 'Localização · NYC' }], adjustments: [{ label: 'Profundidade' }, { label: 'Hora dourada' }, { label: 'Bokeh' }] },
      { badge: 'Render final',    layers: [{ name: 'Base · rosto' }, { name: 'Glam · maquilhagem' }, { name: 'Outfit · top' }, { name: 'Localização · Maldivas' }, { name: 'Render · final' }], adjustments: [{ label: 'Qualidade' }, { label: 'Color grading' }, { label: 'HDR' }] },
    ],
  },
  fr: {
    brand: 'LetShoot · Éditeur IA',
    menus: ['Fichier', 'Éditer', 'Affichage', 'IA'],
    adjustmentsTitle: 'Réglages',
    layersTitle: 'Calques',
    renderingStatus: 'IA · Rendu',
    tools: { face: 'Visage', makeup: 'Maquillage', outfit: 'Tenue', location: 'Lieu', final: 'Final' },
    stages: [
      { badge: 'Détection faciale', layers: [{ name: 'Base · visage' }], adjustments: [{ label: 'Lissage' }, { label: 'Luminosité' }, { label: 'Saturation' }] },
      { badge: 'Maquillage IA',     layers: [{ name: 'Base · visage' }, { name: 'Glam · maquillage' }], adjustments: [{ label: 'Smokey eye' }, { label: 'Lèvres nude' }, { label: 'Contour' }] },
      { badge: 'Tenue IA',          layers: [{ name: 'Base · visage' }, { name: 'Glam · maquillage' }, { name: 'Tenue · blazer' }], adjustments: [{ label: 'Texture tissu' }, { label: 'Brillant soie' }, { label: 'Contraste' }] },
      { badge: 'Lieu IA',           layers: [{ name: 'Base · visage' }, { name: 'Glam · maquillage' }, { name: 'Tenue · blazer' }, { name: 'Lieu · NYC' }], adjustments: [{ label: 'Profondeur' }, { label: 'Golden hour' }, { label: 'Bokeh' }] },
      { badge: 'Rendu final',       layers: [{ name: 'Base · visage' }, { name: 'Glam · maquillage' }, { name: 'Tenue · top' }, { name: 'Lieu · Maldives' }, { name: 'Rendu · final' }], adjustments: [{ label: 'Qualité' }, { label: 'Color grading' }, { label: 'HDR' }] },
    ],
  },
  de: {
    brand: 'LetShoot · KI-Editor',
    menus: ['Datei', 'Bearbeiten', 'Ansicht', 'KI'],
    adjustmentsTitle: 'Anpassungen',
    layersTitle: 'Ebenen',
    renderingStatus: 'KI · Rendering',
    tools: { face: 'Gesicht', makeup: 'Make-up', outfit: 'Outfit', location: 'Location', final: 'Final' },
    stages: [
      { badge: 'Gesichtserkennung', layers: [{ name: 'Basis · Gesicht' }], adjustments: [{ label: 'Glättung' }, { label: 'Helligkeit' }, { label: 'Sättigung' }] },
      { badge: 'KI-Make-up',        layers: [{ name: 'Basis · Gesicht' }, { name: 'Glam · Make-up' }], adjustments: [{ label: 'Smokey Eye' }, { label: 'Nude-Lippen' }, { label: 'Kontur' }] },
      { badge: 'KI-Garderobe',      layers: [{ name: 'Basis · Gesicht' }, { name: 'Glam · Make-up' }, { name: 'Outfit · Blazer' }], adjustments: [{ label: 'Stoffstruktur' }, { label: 'Seidenglanz' }, { label: 'Kontrast' }] },
      { badge: 'KI-Location',       layers: [{ name: 'Basis · Gesicht' }, { name: 'Glam · Make-up' }, { name: 'Outfit · Blazer' }, { name: 'Location · NYC' }], adjustments: [{ label: 'Tiefe' }, { label: 'Golden Hour' }, { label: 'Bokeh' }] },
      { badge: 'Final-Render',      layers: [{ name: 'Basis · Gesicht' }, { name: 'Glam · Make-up' }, { name: 'Outfit · Top' }, { name: 'Location · Malediven' }, { name: 'Render · Final' }], adjustments: [{ label: 'Qualität' }, { label: 'Color Grading' }, { label: 'HDR' }] },
    ],
  },
  it: {
    brand: 'LetShoot · Editor IA',
    menus: ['File', 'Modifica', 'Vista', 'IA'],
    adjustmentsTitle: 'Regolazioni',
    layersTitle: 'Livelli',
    renderingStatus: 'IA · Rendering',
    tools: { face: 'Volto', makeup: 'Trucco', outfit: 'Outfit', location: 'Località', final: 'Finale' },
    stages: [
      { badge: 'Rilevamento volto', layers: [{ name: 'Base · volto' }], adjustments: [{ label: 'Levigatura' }, { label: 'Luminosità' }, { label: 'Saturazione' }] },
      { badge: 'Trucco IA',         layers: [{ name: 'Base · volto' }, { name: 'Glam · trucco' }], adjustments: [{ label: 'Smokey eye' }, { label: 'Labbra nude' }, { label: 'Contouring' }] },
      { badge: 'Guardaroba IA',     layers: [{ name: 'Base · volto' }, { name: 'Glam · trucco' }, { name: 'Outfit · blazer' }], adjustments: [{ label: 'Texture tessuto' }, { label: 'Brillantezza seta' }, { label: 'Contrasto' }] },
      { badge: 'Location IA',       layers: [{ name: 'Base · volto' }, { name: 'Glam · trucco' }, { name: 'Outfit · blazer' }, { name: 'Location · NYC' }], adjustments: [{ label: 'Profondità' }, { label: 'Golden hour' }, { label: 'Bokeh' }] },
      { badge: 'Render finale',     layers: [{ name: 'Base · volto' }, { name: 'Glam · trucco' }, { name: 'Outfit · top' }, { name: 'Location · Maldive' }, { name: 'Render · finale' }], adjustments: [{ label: 'Qualità' }, { label: 'Color grading' }, { label: 'HDR' }] },
    ],
  },
  zh: {
    brand: 'LetShoot · AI 编辑器',
    menus: ['文件', '编辑', '视图', 'AI'],
    adjustmentsTitle: '调整',
    layersTitle: '图层',
    renderingStatus: 'AI · 渲染中',
    tools: { face: '人脸', makeup: '妆容', outfit: '服装', location: '位置', final: '完成' },
    stages: [
      { badge: '人脸检测', layers: [{ name: '基础 · 人脸' }], adjustments: [{ label: '平滑' }, { label: '亮度' }, { label: '饱和度' }] },
      { badge: 'AI 妆容',  layers: [{ name: '基础 · 人脸' }, { name: '魅力 · 妆容' }], adjustments: [{ label: '烟熏眼' }, { label: '裸色唇' }, { label: '修容' }] },
      { badge: 'AI 服装',  layers: [{ name: '基础 · 人脸' }, { name: '魅力 · 妆容' }, { name: '服装 · 西装' }], adjustments: [{ label: '面料质感' }, { label: '丝绸光泽' }, { label: '对比度' }] },
      { badge: 'AI 位置',  layers: [{ name: '基础 · 人脸' }, { name: '魅力 · 妆容' }, { name: '服装 · 西装' }, { name: '位置 · 纽约' }], adjustments: [{ label: '景深' }, { label: '黄金时刻' }, { label: '虚化' }] },
      { badge: '最终渲染', layers: [{ name: '基础 · 人脸' }, { name: '魅力 · 妆容' }, { name: '服装 · 上衣' }, { name: '位置 · 马尔代夫' }, { name: '渲染 · 最终' }], adjustments: [{ label: '质量' }, { label: '调色' }, { label: 'HDR' }] },
    ],
  },
};

// Layer colors (language-independent, matched by index)
const LAYER_COLORS = [
  ['#7FE0FF'],
  ['#7FE0FF', '#FF3D7F'],
  ['#7FE0FF', '#FF3D7F', '#9D5BFF'],
  ['#7FE0FF', '#FF3D7F', '#9D5BFF', '#00B1F6'],
  ['#7FE0FF', '#FF3D7F', '#9D5BFF', '#00B1F6', '#3DDC97'],
];

// Adjustment values per stage (language-independent)
const ADJ_VALUES = [
  [0, 0, 0],
  [78, 64, 52],
  [88, 70, 60],
  [92, 84, 70],
  [100, 100, 100],
];

// Per-stage active tool id (language-independent, matches TOOLS keys)
const ACTIVE_TOOL = ['face', 'makeup', 'outfit', 'location', 'final'];

// Adjustment icons per stage (language-independent)
const ADJ_ICONS = [
  ['droplet', 'sun', 'palette'],
  ['palette', 'droplet', 'sun'],
  ['droplet', 'sun', 'contrast'],
  ['sliders', 'sun', 'aperture'],
  ['sliders', 'palette', 'sun'],
];

const ICONS = {
  sliders: Sliders, sun: Sun, palette: Palette, droplet: Droplet,
  contrast: Contrast, aperture: Aperture,
};

// Tool icons (language-independent)
const TOOL_ICONS = [
  { id: 'face',     icon: Eye },
  { id: 'makeup',   icon: Wand2 },
  { id: 'outfit',   icon: Shirt },
  { id: 'location', icon: Map },
  { id: 'final',    icon: Sparkles },
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
  const { lang } = useLang();
  const t = I18N[lang] || I18N.es;
  const data = t.stages[stage] || t.stages[0];
  const activeTool = ACTIVE_TOOL[stage] || 'face';
  const colors = LAYER_COLORS[stage] || LAYER_COLORS[0];
  const adjValues = ADJ_VALUES[stage] || ADJ_VALUES[0];
  const adjIcons = ADJ_ICONS[stage] || ADJ_ICONS[0];
  // active layer = always the last one for non-base stages; for stage 4 (final) the last two are active
  const isLayerActive = (idx) => idx === data.layers.length - 1 || (stage === 4 && idx === data.layers.length - 2);

  return (
    <>
      {/* ── TOP TOOLBAR ────────────────────────────────────────────────────── */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-3 py-3 sm:px-8">
        {/* Left: file menu mock + brand */}
        <div className="flex items-center gap-3">
          <div className="glass-ios flex items-center gap-2 rounded-lg px-3 py-1.5">
            <Aperture size={13} className="text-brand" strokeWidth={2.4} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-paper">{t.brand}</span>
          </div>
          <div className="hidden gap-1 sm:flex">
            {t.menus.map((m) => (
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
          {TOOL_ICONS.map(({ id, icon: Icon }) => {
            const isActive = id === activeTool;
            const label = t.tools[id];
            return (
              <div
                key={id}
                className={`group relative grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                  isActive ? 'bg-brand text-on-accent' : 'text-paper-mute'
                }`}
              >
                <Icon size={16} strokeWidth={2} aria-hidden />
                <span className="pointer-events-none absolute left-12 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white opacity-0 transition-opacity">
                  {label}
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
            <span className="font-mono text-[9px] uppercase tracking-widest text-paper-mute">{t.adjustmentsTitle}</span>
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
              {data.adjustments.map((adj, ai) => {
                const Icon = ICONS[adjIcons[ai]] || Sliders;
                const value = adjValues[ai] ?? 0;
                return (
                  <div key={adj.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-paper-mute">
                        <Icon size={9} aria-hidden />
                        {adj.label}
                      </span>
                      <span className="font-mono text-[9px] text-brand">{value}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-hair/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-sky"
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
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
            <span className="font-mono text-[9px] uppercase tracking-widest text-paper-mute">{t.layersTitle}</span>
          </div>
          <div className="space-y-1.5">
            <AnimatePresence>
              {data.layers.map((layer, idx) => {
                const active = isLayerActive(idx);
                const color = colors[idx];
                return (
                  <motion.div
                    key={layer.name}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease, delay: idx * 0.05 }}
                    className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 ${active ? 'bg-hair/6' : ''}`}
                  >
                    <div
                      className="h-2 w-2 shrink-0 rounded-sm ring-1 ring-hair/20"
                      style={{ background: color }}
                    />
                    <span className={`flex-1 font-mono text-[9px] ${active ? 'text-paper' : 'text-paper-dim'}`}>
                      {layer.name}
                    </span>
                    {active && <span className="h-1 w-1 animate-pulse rounded-full bg-brand" />}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: AI scan progress + render status ───────────────────────── */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
        <div className="glass-ios flex items-center gap-3 rounded-full px-4 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-paper">{t.renderingStatus}</span>
          </div>
          <div className="h-3 w-px bg-hair/10" />
          <div className="flex items-center gap-1">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-hair/10">
              <motion.div
                className="h-full bg-gradient-to-r from-brand via-sky to-brand-deep"
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
