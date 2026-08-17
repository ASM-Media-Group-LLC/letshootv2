'use client';

// /cobropdf — molde de recibo LetShoot. Estética alineada con la home:
// Poppins display, Inter body, tracking apretado, restraint total. No es un
// flyer de descuento; es un statement editorial. El monto no grita, la
// composición sí. Print-ready (Letter, print-color-adjust: exact global).

const CSS = `
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  box-sizing: border-box;
}

.cobro {
  --paper: #FFFFFF;
  --desk:  #F5F6F8;
  --ink:   #14171C;
  --muted: #6E7480;
  --dim:   #A2A7B0;
  --rule:  #EAECF0;
  --rule-soft: #F1F3F6;
  --accent:      #00B1F6;
  --accent-deep: #007FB4;
  --accent-soft: #EEF9FF;

  background: var(--desk);
  color: var(--ink);
  font-family: var(--font-inter), "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 48px 16px 96px;
  min-height: 100vh;
}
.cobro .display {
  font-family: var(--font-poppins), "Poppins", -apple-system, "Helvetica Neue", Arial, sans-serif;
}
.cobro .mono {
  font-family: var(--font-mono), "JetBrains Mono", ui-monospace, Menlo, monospace;
}
.cobro .tabular { font-variant-numeric: tabular-nums; }

/* Barra flotante */
.cobro .toolbar {
  position: sticky; top: 12px;
  margin: 0 auto 32px;
  max-width: 780px;
  display: flex; justify-content: flex-end;
}
.cobro .btn {
  appearance: none; border: 0; cursor: pointer; font: inherit;
  font-weight: 600; font-size: 13px;
  padding: 10px 18px; border-radius: 999px;
  background: var(--ink); color: var(--paper);
  box-shadow: 0 8px 20px -10px rgba(20,23,28,0.35);
  transition: transform .15s ease;
}
.cobro .btn:hover { transform: translateY(-1px); }

/* La hoja */
.cobro .paper {
  max-width: 780px;
  margin: 0 auto;
  background: var(--paper);
  position: relative;
  border-radius: 3px;
  box-shadow:
    0 1px 0 rgba(20,23,28,0.02),
    0 24px 48px -28px rgba(20,23,28,0.20),
    0 60px 100px -50px rgba(20,23,28,0.14);
  padding: 72px 76px 56px;
}

/* ── Header: logo grande + tira meta discreta ────────────────────── */
.cobro .header {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 40px;
  padding-bottom: 48px;
}
.cobro .brand { display: flex; align-items: center; gap: 14px; }
.cobro .brand-mark {
  width: 42px; height: 42px;
  border-radius: 11px;
  background: var(--ink);
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cobro .brand-mark svg { width: 21px; height: 21px; display: block; }
.cobro .brand-word {
  font-family: var(--font-poppins), "Poppins", -apple-system, sans-serif;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.028em;
  color: var(--ink);
  line-height: 1;
}
.cobro .brand-word span { color: var(--accent); font-weight: 600; }
.cobro .brand-tag {
  margin-top: 5px;
  font-size: 10.5px;
  color: var(--muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 500;
}

.cobro .meta {
  text-align: right;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 500;
  line-height: 1.7;
}
.cobro .meta .k { color: var(--dim); }
.cobro .meta .v { color: var(--ink); font-weight: 500; }

/* ── Statement: párrafo editorial arriba ─────────────────────────── */
.cobro .statement {
  padding-top: 44px;
  border-top: 1px solid var(--rule);
}
.cobro .statement .kicker {
  font-family: var(--font-poppins), "Poppins", -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--accent-deep);
  margin-bottom: 14px;
}
.cobro .statement h1 {
  margin: 0;
  font-family: var(--font-poppins), "Poppins", -apple-system, sans-serif;
  font-size: 28px;
  font-weight: 500;
  letter-spacing: -0.024em;
  line-height: 1.25;
  color: var(--ink);
  max-width: 520px;
}
.cobro .statement h1 em {
  font-style: normal;
  color: var(--accent-deep);
  font-weight: 600;
}

/* ── Item ─────────────────────────────────────────────────────────── */
.cobro .item {
  margin-top: 52px;
  padding: 22px 0 22px;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 20px;
  align-items: baseline;
}
.cobro .item .desc .title {
  font-size: 15.5px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.005em;
}
.cobro .item .desc .sub {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--muted);
}
.cobro .item .price {
  font-family: var(--font-poppins), "Poppins", -apple-system, sans-serif;
  font-size: 17px;
  font-weight: 500;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

/* ── Total: sobrio, alineado derecha, sin gritar ─────────────────── */
.cobro .total {
  margin-top: 20px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: baseline;
}
.cobro .total .row {
  display: flex; justify-content: flex-end; align-items: baseline;
  gap: 40px;
  font-size: 13px;
  color: var(--muted);
  padding: 4px 0;
}
.cobro .total .rows { grid-column: 1 / -1; }
.cobro .total .row .v {
  color: var(--ink);
  font-weight: 500;
  min-width: 88px; text-align: right;
  font-variant-numeric: tabular-nums;
}
.cobro .total .grand {
  grid-column: 1 / -1;
  margin-top: 14px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 20px;
}
.cobro .total .grand .label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--muted);
}
.cobro .total .grand .right {
  display: inline-flex; align-items: baseline; gap: 14px;
}
.cobro .total .grand .paid {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  transform: translateY(-3px);
}
.cobro .total .grand .paid .dot {
  width: 6px; height: 6px; border-radius: 999px;
  background: var(--accent);
}
.cobro .total .grand .val {
  font-family: var(--font-poppins), "Poppins", -apple-system, sans-serif;
  font-size: 36px;
  font-weight: 500;
  letter-spacing: -0.028em;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.cobro .total .grand .val .cur {
  font-weight: 400;
  color: var(--muted);
  margin-right: 3px;
}

/* ── Meta abajo en 3 columnas sutiles ────────────────────────────── */
.cobro .meta-grid {
  margin-top: 44px;
  padding-top: 28px;
  border-top: 1px solid var(--rule);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 32px;
}
.cobro .meta-grid .field .label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--dim);
  margin-bottom: 10px;
}
.cobro .meta-grid .field .name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.35;
}
.cobro .meta-grid .field .line {
  font-size: 12.5px;
  color: var(--muted);
  margin-top: 3px;
  line-height: 1.55;
}

/* ── Notas y footer ───────────────────────────────────────────────── */
.cobro .fine {
  margin-top: 40px;
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.7;
  max-width: 620px;
}
.cobro .foot {
  margin-top: 40px;
  padding-top: 22px;
  border-top: 1px solid var(--rule);
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 20px;
  font-size: 11px;
  color: var(--dim);
  letter-spacing: 0.04em;
}
.cobro .foot .thanks {
  color: var(--muted);
  font-weight: 500;
}
.cobro .foot a { color: var(--muted); text-decoration: none; }
.cobro .foot a:hover { color: var(--accent-deep); }

/* Responsive */
@media (max-width: 720px) {
  .cobro { padding: 20px 10px 60px; }
  .cobro .paper { padding: 40px 28px; border-radius: 2px; }
  .cobro .header { flex-direction: column; gap: 20px; }
  .cobro .meta { text-align: left; }
  .cobro .statement h1 { font-size: 22px; }
  .cobro .item { grid-template-columns: 1fr; }
  .cobro .item .price { justify-self: end; }
  .cobro .total .grand { flex-direction: column; align-items: flex-start; }
  .cobro .total .grand .right { align-self: flex-end; }
  .cobro .total .grand .val { font-size: 30px; }
  .cobro .meta-grid { grid-template-columns: 1fr; gap: 20px; }
  .cobro .foot { flex-direction: column; gap: 8px; align-items: flex-start; }
}

/* Print */
@page { size: Letter; margin: 0.5in; }
@media print {
  html, body {
    background: #fff !important;
    padding: 0 !important; margin: 0 !important;
    min-height: 0 !important;
  }
  .cobro { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
  .cobro .toolbar { display: none !important; }
  .cobro .paper {
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    overflow: visible !important;
  }
  .cobro .statement h1 { font-size: 24px !important; }
  .cobro .total .grand .val { font-size: 32px !important; }
  a { color: inherit !important; text-decoration: none !important; }
  .cobro .header,
  .cobro .statement,
  .cobro .item,
  .cobro .total,
  .cobro .meta-grid,
  .cobro .fine,
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
          {/* Header: logo + meta */}
          <header className="header">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" style={{ color: '#FFFFFF' }}>{BOLT}</span>
              <div>
                <div className="brand-word">Let<span>S</span>hoot</div>
                <div className="brand-tag">Tu fotógrafo IA</div>
              </div>
            </div>
            <div className="meta">
              <div><span className="k">Recibo</span> &nbsp; <span className="v mono">LS-2026-0817</span></div>
              <div><span className="k">Fecha</span> &nbsp; <span className="v">17 Ago 2026</span></div>
              <div><span className="k">Cliente</span> &nbsp; <span className="v mono">JP-4014</span></div>
            </div>
          </header>

          {/* Statement editorial */}
          <section className="statement">
            <div className="kicker">Pago recibido</div>
            <h1>
              Gracias, Julia. Tu <em>Pro Pack</em> queda activo hasta el 31 de agosto de 2026.
            </h1>
          </section>

          {/* Item */}
          <section className="item">
            <div className="desc">
              <div className="title">Pro Pack · Suscripción mensual</div>
              <div className="sub">Clon con IA · 90 fotos + 4 videos · período 1 – 31 ago 2026</div>
            </div>
            <div className="price tabular">$899.00</div>
          </section>

          {/* Total sobrio */}
          <section className="total">
            <div className="rows">
              <div className="row"><span>Subtotal</span><span className="v">$899.00</span></div>
              <div className="row"><span>Impuestos</span><span className="v">$0.00</span></div>
            </div>
            <div className="grand">
              <span className="label">Total pagado</span>
              <span className="right">
                <span className="paid" aria-label="Estado: pagado">
                  <span className="dot" aria-hidden="true"></span>
                  Pagado
                </span>
                <span className="val tabular"><span className="cur">$</span>899.00</span>
              </span>
            </div>
          </section>

          {/* Meta grid */}
          <section className="meta-grid">
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

          {/* Notas finas */}
          <p className="fine">
            Tu plan se renueva mensualmente. Puedes cancelar cuando quieras desde tu panel — el acceso queda activo hasta el final del período pagado. Todos los cargos son en dólares estadounidenses (USD).
          </p>

          {/* Footer */}
          <footer className="foot">
            <span className="thanks">Gracias por confiar en LetShoot.</span>
            <span>letshoot.ai &nbsp;·&nbsp; <a href="mailto:soporte@letshoot.ai">soporte@letshoot.ai</a></span>
          </footer>
        </article>
      </div>
    </>
  );
}
