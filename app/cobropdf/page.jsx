'use client';

// /cobropdf — molde de recibo LetShoot listo para PDF/print. Página pública
// (sin auth) para iterar el diseño rápido. Botón «Descargar / Imprimir»
// dispara window.print(); el CSS de @page + @media print lo deja como PDF
// limpio en Letter con márgenes 0.5in.

const CSS = `
/* Colores forzados en TODO (impresión de fondos y colores) */
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  box-sizing: border-box;
}

.cobro {
  --paper: #FFFFFF;
  --desk: #F2F5F9;
  --ink: #0A0F14;
  --muted: #5E6874;
  --dim: #98A0AB;
  --rule: #E5E9EF;
  --rule-soft: #EFF2F6;
  --accent: #00B1F6;
  --accent-deep: #0090CC;
  --accent-soft: #E8F7FE;

  background: var(--desk);
  color: var(--ink);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 40px 16px 80px;
  min-height: 100vh;
}
.cobro .tabular { font-variant-numeric: tabular-nums; }
.cobro .mono {
  font-family: "Courier New", ui-monospace, Menlo, monospace;
}

/* Barra flotante */
.cobro .toolbar {
  position: sticky; top: 12px;
  margin: 0 auto 24px;
  max-width: 760px;
  display: flex; justify-content: flex-end; gap: 8px;
}
.cobro .btn {
  appearance: none; border: 0; cursor: pointer; font: inherit;
  font-weight: 600; font-size: 13.5px;
  padding: 10px 18px; border-radius: 999px;
  background: var(--ink); color: var(--paper);
  box-shadow: 0 8px 18px -8px rgba(10,15,20,0.4);
  transition: transform .15s ease;
}
.cobro .btn:hover { transform: translateY(-1px); }

/* La hoja */
.cobro .paper {
  max-width: 760px;
  margin: 0 auto;
  background: var(--paper);
  position: relative;
  overflow: hidden;
  border-radius: 3px;
  box-shadow:
    0 1px 0 rgba(10,15,20,0.02),
    0 20px 40px -24px rgba(10,15,20,0.22),
    0 60px 100px -50px rgba(10,15,20,0.16);
  padding: 56px 60px 48px;
}
.cobro .paper::before {
  content: ""; position: absolute; inset: 0 0 auto 0;
  height: 4px;
  background: var(--accent);
}

/* Marca de agua — solo pantalla */
.cobro .watermark {
  position: absolute;
  right: -70px; bottom: -70px;
  width: 380px; height: 380px;
  pointer-events: none;
  opacity: 0.06;
  transform: rotate(-8deg);
  z-index: 0;
}
.cobro .watermark svg { width: 100%; height: 100%; display: block; }
.cobro .paper > *:not(.watermark) { position: relative; z-index: 1; }

/* Tira superior */
.cobro .topbar {
  display: flex; justify-content: space-between; align-items: center;
  gap: 24px;
  padding-bottom: 40px;
}
.cobro .brand { display: flex; align-items: center; gap: 12px; }
.cobro .brand-mark {
  width: 40px; height: 40px;
  border-radius: 10px;
  background: var(--accent);
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cobro .brand-mark svg { width: 20px; height: 20px; display: block; }
.cobro .brand-word {
  font-size: 22px; font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink); line-height: 1;
}
.cobro .brand-word span { color: var(--accent); font-weight: 700; }
.cobro .brand-sub {
  margin-top: 4px;
  font-size: 10.5px;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cobro .stripe {
  display: inline-flex; align-items: center; gap: 14px;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
}
.cobro .stripe .num { color: var(--ink); letter-spacing: 0.06em; }
.cobro .stripe .sep {
  width: 4px; height: 4px; border-radius: 999px;
  background: var(--dim);
  display: inline-block;
}

/* Hero */
.cobro .hero {
  padding: 12px 0 40px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 32px;
  align-items: end;
  border-bottom: 1px solid var(--rule);
}
.cobro .hero-lead { display: flex; flex-direction: column; gap: 14px; }
.cobro .hero-eyebrow {
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--accent-deep);
}
.cobro .hero-status {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 14px 8px 12px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-weight: 700; font-size: 11.5px;
  letter-spacing: 0.14em; text-transform: uppercase;
  align-self: flex-start;
}
.cobro .hero-status .dot {
  width: 8px; height: 8px; border-radius: 999px;
  background: var(--accent);
}
.cobro .hero-amount {
  font-weight: 700;
  font-size: 76px; line-height: 1;
  letter-spacing: -0.035em;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.cobro .hero-amount .cents { color: var(--muted); font-weight: 700; }
.cobro .hero-caption {
  font-size: 14px;
  color: var(--muted);
  max-width: 380px;
  line-height: 1.55;
  margin: 0;
}
.cobro .hero-caption .paid {
  font-style: italic;
  color: var(--ink);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 15.5px;
  font-weight: 400;
}
.cobro .hero-caption .item { color: var(--ink); font-weight: 700; }

/* Concepto */
.cobro .concept {
  padding: 28px 0;
  border-bottom: 1px solid var(--rule);
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 18px;
  align-items: center;
}
.cobro .concept .glyph {
  width: 44px; height: 44px;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 12px; letter-spacing: 0.06em;
}
.cobro .concept .title {
  font-size: 15px; font-weight: 700;
  color: var(--ink); letter-spacing: -0.005em;
}
.cobro .concept .sub {
  margin-top: 3px; font-size: 12.5px; color: var(--muted);
}
.cobro .concept .amt {
  font-size: 20px; font-weight: 700;
  color: var(--ink); font-variant-numeric: tabular-nums;
}

/* Detalles */
.cobro .details {
  padding: 28px 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 28px;
  border-bottom: 1px solid var(--rule);
}
.cobro .field .label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--dim); margin-bottom: 10px;
}
.cobro .field .name {
  font-size: 14px; font-weight: 700;
  color: var(--ink); line-height: 1.35;
}
.cobro .field .line {
  font-size: 12.5px; color: var(--muted);
  margin-top: 3px; line-height: 1.5;
}

/* Notas */
.cobro .notes {
  padding: 22px 0 8px;
  font-size: 12px; color: var(--muted);
  line-height: 1.7; max-width: 620px;
}
.cobro .notes .h {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--dim); margin-bottom: 8px;
}

/* Footer */
.cobro .foot {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--rule);
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 20px;
  font-size: 11px; color: var(--dim);
}
.cobro .foot .thanks {
  color: var(--ink); font-weight: 400;
  font-family: Georgia, "Times New Roman", serif;
  font-style: italic; font-size: 13px; letter-spacing: 0;
}
.cobro .foot a { color: var(--muted); text-decoration: none; }

/* Responsive */
@media (max-width: 700px) {
  .cobro { padding: 20px 10px 60px; }
  .cobro .paper { padding: 36px 24px; border-radius: 2px; }
  .cobro .topbar { flex-direction: column; align-items: flex-start; gap: 14px; }
  .cobro .hero { grid-template-columns: 1fr; gap: 18px; padding-bottom: 28px; }
  .cobro .hero-amount { font-size: 56px; }
  .cobro .details { grid-template-columns: 1fr; gap: 18px; }
  .cobro .concept { grid-template-columns: 44px 1fr; row-gap: 10px; }
  .cobro .concept .amt { grid-column: 2; text-align: right; }
  .cobro .foot { flex-direction: column; gap: 8px; align-items: flex-start; }
  .cobro .watermark { width: 260px; height: 260px; right: -60px; bottom: -60px; }
}

/* PRINT — el PDF final */
@page { size: Letter; margin: 0.5in; }
@media print {
  html, body {
    background: #fff !important;
    padding: 0 !important; margin: 0 !important;
    min-height: 0 !important;
  }
  .cobro { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
  .cobro .toolbar, .cobro .watermark { display: none !important; }
  .cobro .paper {
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    overflow: visible !important;
  }
  .cobro .paper::before { display: none !important; }
  .cobro .hero-amount { font-size: 68px !important; }
  a { color: inherit !important; text-decoration: none !important; }
  .cobro .hero,
  .cobro .concept,
  .cobro .details,
  .cobro .notes,
  .cobro .foot { break-inside: avoid; }
}
`;

const BOLT = (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2 5 13h6l-2 9 10-13h-7l2-7Z" fill="currentColor" />
  </svg>
);

export default function CobroPdfPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cobro">
        <div className="toolbar">
          <button className="btn" onClick={() => typeof window !== 'undefined' && window.print()}>
            Descargar / Imprimir
          </button>
        </div>

        <article className="paper" role="document" aria-label="Recibo LetShoot">
          {/* Marca de agua — solo pantalla */}
          <div className="watermark" aria-hidden="true" style={{ color: '#00B1F6' }}>{BOLT}</div>

          {/* Tira superior */}
          <div className="topbar">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" style={{ color: '#FFFFFF' }}>{BOLT}</span>
              <div>
                <div className="brand-word">Let<span>S</span>hoot</div>
                <div className="brand-sub">Tu fotógrafo IA</div>
              </div>
            </div>
            <div className="stripe">
              <span>Recibo</span>
              <span className="sep" aria-hidden="true"></span>
              <span className="num mono">LS-2026-0817</span>
              <span className="sep" aria-hidden="true"></span>
              <span className="num">17 ago 2026</span>
            </div>
          </div>

          {/* Hero: monto */}
          <section className="hero">
            <div className="hero-lead">
              <div className="hero-eyebrow">Pago recibido</div>
              <div className="hero-amount tabular">$899<span className="cents">.00</span></div>
              <p className="hero-caption">
                <span className="paid">Pagado.</span> Gracias, Julia — tu <span className="item">Pro Pack</span> ya está activo hasta el 31 de agosto de 2026.
              </p>
            </div>
            <div>
              <span className="hero-status" aria-label="Estado: pagado">
                <span className="dot" aria-hidden="true"></span>
                Pagado
              </span>
            </div>
          </section>

          {/* Concepto */}
          <section className="concept">
            <div className="glyph" aria-hidden="true">PRO</div>
            <div>
              <div className="title">Pro Pack · Suscripción mensual</div>
              <div className="sub">Clon con IA · 90 fotos + 4 videos · período 1 – 31 ago 2026</div>
            </div>
            <div className="amt tabular">$899.00</div>
          </section>

          {/* Detalles */}
          <section className="details">
            <div className="field">
              <div className="label">A nombre de</div>
              <div className="name">Julia Parker</div>
              <div className="line">@juliaparker</div>
              <div className="line">julia.parker@ejemplo.com</div>
            </div>
            <div className="field">
              <div className="label">Método de pago</div>
              <div className="name">Zelle</div>
              <div className="line">Ref. <span className="mono">ZE-2508171742</span></div>
              <div className="line">Confirmado el 15 ago 2026</div>
            </div>
            <div className="field">
              <div className="label">Emitido por</div>
              <div className="name">ASM Media Group LLC</div>
              <div className="line">Miami, FL · EE. UU.</div>
              <div className="line">soporte@letshoot.ai</div>
            </div>
          </section>

          {/* Notas */}
          <section className="notes">
            <div className="h">Qué incluye</div>
            Acceso a tu clon IA entrenado con tus fotos, entrega diaria de fotos y videos listos para vender en tu portal, y soporte por correo. Tu plan se renueva mensualmente — cancelas cuando quieras desde tu panel y el acceso queda activo hasta el final del período pagado. Cargos en dólares estadounidenses (USD).
          </section>

          {/* Footer */}
          <footer className="foot">
            <span className="thanks">Gracias por confiar en LetShoot.</span>
            <span>letshoot.ai · <a href="mailto:soporte@letshoot.ai">soporte@letshoot.ai</a></span>
          </footer>
        </article>
      </div>
    </>
  );
}
