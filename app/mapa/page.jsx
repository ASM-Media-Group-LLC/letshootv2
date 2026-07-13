'use client';

import Link from 'next/link';
import { Home, LogIn, Images, Sparkles, MessageSquarePlus, UploadCloud, ShieldCheck, Map as MapIcon, ArrowUpRight } from 'lucide-react';
import Logo from '@/components/Logo';

const SECTIONS = [
  {
    title: 'Público',
    desc: 'Lo que ve cualquiera.',
    routes: [
      { path: '/', name: 'Home', icon: Home, role: '—', desc: 'Página de ventas (marketing).', status: 'listo' },
    ],
  },
  {
    title: 'Acceso',
    desc: 'Entrada al portal.',
    routes: [
      { path: '/login', name: 'Entrar', icon: LogIn, role: 'Todos', desc: 'Login con correo y contraseña (con ojito para ver/ocultar).', status: 'listo' },
    ],
  },
  {
    title: 'Creadora',
    desc: 'La modelo / usuaria.',
    routes: [
      { path: '/panel', name: 'Mi contenido', icon: Images, role: 'Creadora', desc: 'Ve su contenido entregado por carpetas + deja feedback.', status: 'listo' },
      { path: '/lora', name: 'Mis 80 fotos (clon/LoRA)', icon: Sparkles, role: 'Creadora', desc: 'Sube sus fotos para crear su clon IA, guiada por categorías.', status: 'listo' },
    ],
  },
  {
    title: 'Equipo',
    desc: 'Empleados que operan el contenido.',
    routes: [
      { path: '/request', name: 'Crear pedido', icon: MessageSquarePlus, role: 'Chatter', desc: 'Elige creadora asignada y pide el contenido que necesita vender.', status: 'proximo' },
      { path: '/producer', name: 'Producción', icon: UploadCloud, role: 'Productor', desc: 'Recibe pedidos, produce, sube y entrega a la creadora.', status: 'proximo' },
      { path: '/admin', name: 'Administración', icon: ShieldCheck, role: 'Admin', desc: 'Usuarios, roles, pedidos, calendario de entregas y subir LoRA.', status: 'listo' },
    ],
  },
  {
    title: 'Utilidad',
    desc: '',
    routes: [
      { path: '/mapa', name: 'Mapa (esta página)', icon: MapIcon, role: '—', desc: 'Índice de todas las rutas de la plataforma.', status: 'listo' },
    ],
  },
];

const STATUS = {
  listo: { label: 'Listo', cls: 'border-brand/40 bg-brand/10 text-brand' },
  proximo: { label: 'En construcción', cls: 'border-line bg-hair/10 text-paper-dim' },
};

export default function MapaPage() {
  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Logo size="sm" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-paper-dim">Mapa del portal</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="font-display text-3xl font-semibold">Todas las rutas</h1>
        <p className="mt-2 text-paper-mute">Cada sección es un <span className="font-mono text-brand">/slash</span>. Así no nos confundimos.</p>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((sec) => (
            <section key={sec.title}>
              <div className="mb-4 flex items-baseline gap-3">
                <h2 className="font-display text-lg font-semibold text-paper">{sec.title}</h2>
                {sec.desc && <span className="text-sm text-paper-dim">{sec.desc}</span>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {sec.routes.map((r) => {
                  const Icon = r.icon;
                  const st = STATUS[r.status];
                  const inner = (
                    <div className={`group flex h-full items-start gap-3.5 rounded-2xl border border-line bg-card p-4 transition-colors ${r.status === 'listo' ? 'hover:border-brand/40' : 'opacity-70'}`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand ring-1 ring-brand/20">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-paper">{r.name}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <code className="font-mono text-xs text-brand">{r.path}</code>
                          <span className="text-[11px] text-paper-dim">· {r.role}</span>
                          {r.status === 'listo' && <ArrowUpRight size={13} className="text-paper-dim opacity-0 transition-opacity group-hover:opacity-100" />}
                        </div>
                        <p className="mt-1.5 text-[13px] leading-snug text-paper-mute">{r.desc}</p>
                      </div>
                    </div>
                  );
                  return r.status === 'listo'
                    ? <Link key={r.path} href={r.path}>{inner}</Link>
                    : <div key={r.path}>{inner}</div>;
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
