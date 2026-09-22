'use client';

import Link from 'next/link';
import { Home, LogIn, Images, Sparkles, ShieldCheck, Map as MapIcon, ArrowUpRight, Plug, Send, Package, Building2, UserCheck, Crown, FileText, Mail, UserPlus, KeyRound, ClipboardList, User, ChefHat } from 'lucide-react';
import Logo from '@/components/Logo';

const SECTIONS = [
  {
    title: 'Público',
    desc: 'Lo que ve cualquiera, sin login.',
    routes: [
      { path: '/', name: 'Home', icon: Home, role: '—', desc: 'Página de ventas (marketing, se abre en el idioma del visitante).', status: 'listo' },
      { path: '/contacto', name: 'Contacto', icon: Mail, role: '—', desc: 'Formulario para escribir al equipo.', status: 'listo' },
      { path: '/signup', name: 'Crear cuenta', icon: UserPlus, role: '—', desc: 'Alta de una creadora nueva.', status: 'listo' },
    ],
  },
  {
    title: 'Acceso',
    desc: 'Entrar, registrarse y recuperar la clave.',
    routes: [
      { path: '/login', name: 'Entrar', icon: LogIn, role: 'Todos', desc: 'Login con correo y contraseña.', status: 'listo' },
      { path: '/forgot', name: 'Olvidé mi clave', icon: KeyRound, role: 'Todos', desc: 'Pide el correo y manda link para poner clave nueva.', status: 'listo' },
      { path: '/onboarding', name: 'Onboarding', icon: ClipboardList, role: 'Creadora', desc: 'Planilla de datos + permisos cuando la creadora se registra.', status: 'listo' },
    ],
  },
  {
    title: 'Creadora',
    desc: 'La modelo / usuaria.',
    routes: [
      { path: '/panel', name: 'Mi contenido', icon: Images, role: 'Creadora', desc: 'Ve sus entregas por carpetas y deja feedback (like / rechazo / nota).', status: 'listo' },
      { path: '/biblioteca', name: 'Biblioteca (clon/LoRA)', icon: Sparkles, role: 'Creadora', desc: 'Sube sus fotos reales por categorías para entrenar su clon IA.', status: 'listo' },
      { path: '/cuenta', name: 'Mi cuenta', icon: User, role: 'Creadora', desc: 'Sus datos, correo y ajustes.', status: 'listo' },
    ],
  },
  {
    title: 'Equipo — operación',
    desc: 'El día a día del contenido.',
    routes: [
      { path: '/admin', name: 'Administración', icon: ShieldCheck, role: 'Admin / Supervisor', desc: 'El centro de todo: Propuestas, Creadoras, Equipo, Agencias, Métricas, Verificaciones, Conexión.', status: 'listo' },
      { path: '/propuestas', name: 'Armar propuesta', icon: Send, role: 'Admin / Supervisor', desc: 'Wizard: destinatario → molde → fotos (baúl por creadora) → enviar. Copia al equipo o a afuera.', status: 'listo' },
      { path: '/conexion', name: 'Conexión · Motor de imágenes', icon: Plug, role: 'Admin / Supervisor', desc: 'Higgsfield: guardar la llave, verificar, foto de prueba y crear la identidad de Julia. Acá se generan las fotos por IA.', status: 'nuevo' },
      { path: '/kitchen', name: 'Kitchen · Cocina de contenido', icon: ChefHat, role: 'Admin / Supervisor', desc: 'Elegís modelo + una foto viral de referencia → recrea SU versión → revisás y aprobás. Con contador de créditos gastados.', status: 'nuevo' },
      { path: '/trabajo', name: 'Trabajo / Almacén', icon: Package, role: 'Equipo', desc: 'Almacén de entregables y ventas manuales.', status: 'listo' },
    ],
  },
  {
    title: 'Agencia',
    desc: 'Agencias y agentes que traen creadoras.',
    routes: [
      { path: '/agencia', name: 'Panel de agencia', icon: Building2, role: 'Agencia', desc: 'Sus creadoras y su tablero.', status: 'listo' },
      { path: '/agente', name: 'Panel de agente', icon: UserCheck, role: 'Agente', desc: 'Tablero del agente.', status: 'listo' },
    ],
  },
  {
    title: 'Dueño',
    desc: 'Solo vos.',
    routes: [
      { path: '/owner', name: 'Owner (dev)', icon: Crown, role: 'Dueño', desc: 'Herramientas del dueño (solo desarrollo).', status: 'listo' },
    ],
  },
  {
    title: 'Legal',
    desc: 'Términos y políticas (públicas).',
    routes: [
      { path: '/terms', name: 'Términos', icon: FileText, role: '—', desc: 'Términos de servicio.', status: 'listo' },
      { path: '/privacy', name: 'Privacidad', icon: FileText, role: '—', desc: 'Política de privacidad.', status: 'listo' },
      { path: '/dmca', name: 'DMCA', icon: FileText, role: '—', desc: 'Política de bajada de contenido (DMCA).', status: 'listo' },
      { path: '/usc2257', name: '18 U.S.C. § 2257', icon: FileText, role: '—', desc: 'Cumplimiento de registros 2257.', status: 'listo' },
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
  nuevo: { label: 'Nuevo', cls: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' },
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
                    <div className={`group flex h-full items-start gap-3.5 rounded-2xl border border-line bg-card p-4 transition-colors ${r.status !== 'proximo' ? 'hover:border-brand/40' : 'opacity-70'}`}>
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
                          {r.status !== 'proximo' && <ArrowUpRight size={13} className="text-paper-dim opacity-0 transition-opacity group-hover:opacity-100" />}
                        </div>
                        <p className="mt-1.5 text-[13px] leading-snug text-paper-mute">{r.desc}</p>
                      </div>
                    </div>
                  );
                  return r.status !== 'proximo'
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
