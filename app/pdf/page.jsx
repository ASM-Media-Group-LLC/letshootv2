'use client';

import { Printer, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

function Field({ label, wide }) {
  return (
    <span className={`inline-flex items-baseline gap-1 ${wide ? 'min-w-[16rem]' : 'min-w-[10rem]'}`}>
      <span className="whitespace-nowrap text-neutral-500">{label}</span>
      <input
        type="text"
        className="min-w-0 flex-1 border-b border-neutral-400 bg-transparent px-1 text-neutral-900 outline-none focus:border-neutral-900 print:border-neutral-500"
      />
    </span>
  );
}

const SECTIONS = [
  {
    n: '1', title: 'Objeto',
    body: [
      'El Colaborador prestará servicios para la Empresa y, en ese marco, tendrá acceso a información y contenido altamente confidenciales de la Empresa y de sus creadoras y clientes. Este Acuerdo regula el manejo, la confidencialidad y la protección de dicha información, y protege por igual a la Empresa, a las creadoras y a los clientes.',
    ],
  },
  {
    n: '2', title: 'Información Confidencial',
    body: ['Se considera Información Confidencial, de forma enunciativa y no limitativa:'],
    list: [
      'Identidad, datos personales, fotografías y videos de las creadoras y de los clientes.',
      'Todo el contenido producido, editado o entregado: fotos, videos, sets de entrenamiento (LoRA) y material de cualquier tipo.',
      'Conversaciones y mensajes con creadoras, con clientes (fans) y entre miembros del equipo.',
      'Guiones de chat, estrategias de venta y de enganche, y listas de clientes o clientes VIP.',
      'Precios, procesos, herramientas, modelos de IA, credenciales y cualquier dato del portal o de la operación.',
      'Cualquier información marcada como confidencial o que, por su naturaleza, deba entenderse como tal.',
    ],
  },
  {
    n: '3', title: 'Obligaciones del Colaborador',
    list: [
      'Mantener estricta y total confidencialidad sobre la Información Confidencial y no divulgarla a ningún tercero.',
      'Usar la Información Confidencial únicamente para cumplir sus funciones para la Empresa.',
      'No copiar, descargar, almacenar ni conservar contenido en dispositivos, nubes o cuentas personales.',
      'No compartir, publicar, revender ni distribuir el contenido de las creadoras en ningún medio, dentro o fuera de línea.',
      'No contactar a las creadoras ni a los clientes fuera de los canales oficiales de la Empresa.',
      'No revelar la identidad real de ninguna creadora bajo ninguna circunstancia.',
      'Tratar toda comunicación (con creadoras, con clientes y entre el equipo) como estrictamente privada.',
    ],
  },
  {
    n: '4', title: 'Propiedad Intelectual',
    body: [
      'Todo el contenido, material y trabajo producido por el Colaborador en el marco de sus funciones es propiedad exclusiva de la Empresa y/o de la creadora correspondiente. El Colaborador cede a la Empresa cualquier derecho que pudiera corresponderle sobre dicho material y no adquiere ningún derecho de uso personal sobre el mismo.',
    ],
  },
  {
    n: '5', title: 'Seguridad y credenciales',
    body: [
      'El Colaborador usará las credenciales y accesos otorgados exclusivamente para su trabajo, no los compartirá con nadie y notificará de inmediato a la Empresa cualquier pérdida, acceso indebido o brecha de seguridad.',
    ],
  },
  {
    n: '6', title: 'Conducta profesional',
    body: [
      'El Colaborador tratará a las creadoras y a los clientes con respeto y profesionalismo. Queda prohibido cualquier acoso, uso indebido de la información o conducta que perjudique a la Empresa, a las creadoras o a los clientes.',
    ],
  },
  {
    n: '7', title: 'Devolución y eliminación',
    body: [
      'Al terminar la relación laboral o de colaboración, por cualquier causa, el Colaborador devolverá o eliminará de forma permanente toda la Información Confidencial en su poder y no conservará copia alguna.',
    ],
  },
  {
    n: '8', title: 'Vigencia',
    body: [
      'Las obligaciones de confidencialidad de este Acuerdo permanecen vigentes de forma indefinida y continúan aun después de terminada la relación entre las partes.',
    ],
  },
  {
    n: '9', title: 'Incumplimiento y acciones de la Empresa',
    body: [
      'Ante cualquier incumplimiento, la Empresa podrá dar por terminada la relación de forma inmediata y ejercer, en cualquier jurisdicción, todas las acciones civiles, penales y administrativas que correspondan, así como reclamar los daños y perjuicios ocasionados a la Empresa, a las creadoras o a los clientes. Estas acciones son acumulativas y no excluyen ningún otro derecho o remedio.',
    ],
  },
  {
    n: '10', title: 'Indemnización',
    body: [
      'El Colaborador mantendrá indemne y libre de responsabilidad a la Empresa, a las creadoras y a los clientes frente a cualquier reclamo, daño, pérdida, sanción o gasto —incluidos honorarios de abogados y costas— que se derive, directa o indirectamente, del incumplimiento de este Acuerdo por parte del Colaborador.',
    ],
  },
  {
    n: '11', title: 'Daños liquidados (penalidad)',
    body: [
      'Dado que el daño causado por la divulgación o el uso indebido de contenido o Información Confidencial es difícil de cuantificar, las partes acuerdan que el Colaborador pagará a la Empresa, como pena convencional, la cantidad de USD ____________ (o su equivalente en moneda local) por cada incumplimiento, sin perjuicio de los daños adicionales que la Empresa pueda probar y reclamar.',
    ],
  },
  {
    n: '12', title: 'Medidas cautelares',
    body: [
      'El Colaborador reconoce que cualquier incumplimiento de este Acuerdo puede causar un daño irreparable a la Empresa, a las creadoras o a los clientes, y que la Empresa tendrá derecho a solicitar y obtener medidas cautelares o precautorias inmediatas (incluyendo órdenes de cese) ante los tribunales o árbitros competentes, además de cualquier otro remedio disponible, sin necesidad de otorgar fianza.',
    ],
  },
  {
    n: '13', title: 'No solicitación',
    body: [
      'Durante la relación y por un período de doce (12) meses posteriores a su terminación, el Colaborador no desviará, solicitará ni intentará llevarse a creadoras o clientes de la Empresa para beneficio propio o de terceros.',
    ],
  },
  {
    n: '14', title: 'Resolución de controversias — Arbitraje internacional',
    body: [
      'Toda controversia derivada de este Acuerdo se resolverá de forma definitiva mediante arbitraje administrado conforme a las reglas de ____________________, con sede en ____________________ y en idioma ____________. El laudo será definitivo, vinculante y ejecutable internacionalmente conforme a la Convención de Nueva York de 1958 sobre el Reconocimiento y la Ejecución de las Sentencias Arbitrales Extranjeras. Lo anterior no impide a la Empresa acudir a cualquier tribunal competente para solicitar medidas cautelares.',
    ],
  },
  {
    n: '15', title: 'Divisibilidad y acuerdo íntegro',
    body: [
      'Si alguna disposición de este Acuerdo fuera declarada inválida o inejecutable, las demás continuarán en pleno vigor. Este documento constituye el acuerdo íntegro entre las partes sobre la materia y reemplaza cualquier entendimiento previo. Sus obligaciones vinculan a los sucesores y cesionarios del Colaborador.',
    ],
  },
  {
    n: '16', title: 'Ley aplicable y jurisdicción',
    body: [
      'Este Acuerdo se rige e interpreta conforme a las leyes de ____________________. Para todo lo no sometido a arbitraje, las partes se someten a la jurisdicción de los tribunales de ____________________, renunciando a cualquier otro fuero.',
    ],
  },
];

export default function ContractPdfPage() {
  const router = useRouter();
  return (
    <div className="min-h-[100svh] bg-neutral-800 py-8 print:bg-white print:py-0">
      {/* Toolbar (screen only) */}
      <div className="mx-auto mb-6 flex max-w-[820px] items-center justify-between px-5 print:hidden">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-full border border-neutral-600 px-4 py-2 text-sm text-neutral-200 transition-colors hover:bg-neutral-700">
          <ArrowLeft size={16} /> Volver
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
          <Printer size={16} /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* Document */}
      <article className="mx-auto max-w-[820px] bg-white px-10 py-12 text-[13.5px] leading-relaxed text-neutral-900 shadow-2xl print:max-w-none print:px-0 print:py-0 print:shadow-none sm:px-14 sm:py-16">
        <header className="mb-8 border-b border-neutral-300 pb-6 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">LetShoot</div>
          <h1 className="mt-2 text-2xl font-bold text-neutral-900">
            Acuerdo de Confidencialidad y Protección de Información
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Empleados y colaboradores</p>
        </header>

        {/* Parties */}
        <section className="mb-7 space-y-3">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-3">
            Entre <Field label="la Empresa (razón social):" wide />, en adelante “la Empresa”,
          </p>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-3">
            y <Field label="el/la Colaborador(a):" wide />, con documento <Field label="N.º" />, en adelante “el Colaborador”.
          </p>
          <p className="text-neutral-700">Ambas partes acuerdan lo siguiente:</p>
        </section>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.n} className="break-inside-avoid">
              <h2 className="mb-1.5 text-[15px] font-bold text-neutral-900">{s.n}. {s.title}</h2>
              {s.body?.map((p, i) => (
                <p key={i} className="mb-2 text-neutral-800">{p}</p>
              ))}
              {s.list && (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-800">
                  {s.list.map((li, i) => <li key={i}>{li}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* Acceptance */}
        <section className="mt-8 break-inside-avoid border-t border-neutral-300 pt-6">
          <h2 className="mb-4 text-[15px] font-bold text-neutral-900">17. Aceptación y firma</h2>
          <p className="mb-8 text-neutral-800">
            El Colaborador declara haber leído y comprendido este Acuerdo, y lo acepta y firma de forma libre y voluntaria.
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-3">
            <Field label="Lugar:" /> <Field label="Fecha:" />
          </div>
          <div className="mt-12 grid grid-cols-2 gap-10">
            <div className="border-t border-neutral-500 pt-2 text-center text-sm text-neutral-600">
              Firma del Colaborador
              <div className="mt-1 text-[11px] text-neutral-400">Nombre y documento</div>
            </div>
            <div className="border-t border-neutral-500 pt-2 text-center text-sm text-neutral-600">
              Por la Empresa
              <div className="mt-1 text-[11px] text-neutral-400">Nombre y cargo</div>
            </div>
          </div>
        </section>

        {/* Notarization */}
        <section className="mt-8 break-inside-avoid rounded-md border-2 border-neutral-400 p-5">
          <h2 className="mb-3 text-[15px] font-bold text-neutral-900">18. Reconocimiento ante notario</h2>
          <p className="mb-4 text-neutral-800">
            Ante mí, Notario(a) Público(a), comparecieron las partes identificadas en este documento, acreditaron su
            identidad con documento oficial, y ratificaron y firmaron el presente Acuerdo de forma libre y voluntaria.
            Doy fe.
          </p>
          <div className="space-y-3">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-3"><Field label="Notario(a) Público(a):" wide /></p>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-3"><Field label="Notaría N.º:" /> <Field label="Ciudad / País:" /></p>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-3"><Field label="Fecha:" /> <Field label="N.º de acta / protocolo:" /></p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-10">
            <div className="border-t border-neutral-500 pt-2 text-center text-sm text-neutral-600">Firma del Notario</div>
            <div className="pt-2 text-center text-sm text-neutral-400">Sello notarial</div>
          </div>
          <p className="mt-5 text-[11px] leading-relaxed text-neutral-500">
            Para uso internacional, este documento puede legalizarse mediante apostilla conforme a la Convención de La Haya
            de 1961, o mediante legalización consular cuando el país no sea parte de dicha Convención.
          </p>
        </section>

        {/* Disclaimer */}
        <p className="mt-10 rounded border border-neutral-300 bg-neutral-50 p-3 text-[11px] leading-relaxed text-neutral-500 print:bg-white">
          Documento modelo con fines informativos. No constituye asesoría legal. Recomendamos que un abogado lo revise y lo
          adapte a la jurisdicción correspondiente antes de su uso.
        </p>
      </article>

      <style>{`@media print { @page { margin: 18mm; } }`}</style>
    </div>
  );
}
