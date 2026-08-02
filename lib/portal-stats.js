// Shared month analytics for the creator + agency panels (client-safe helpers).

export const ymOf = (d) => (d || '').slice(0, 7); // 'YYYY-MM-DD' -> 'YYYY-MM'

export function ymLabel(ym, locale = 'es-US') {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shiftYm(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function aggregate(assets) {
  return (assets || []).reduce((a, x) => ({
    delivered: a.delivered + 1,
    sales: a.sales + (x.sales_count || 0),
    revenue: a.revenue + Number(x.revenue || 0),
    reach: a.reach + (x.reach || 0),
    interactions: a.interactions + (x.interactions || 0),
  }), { delivered: 0, sales: 0, revenue: 0, reach: 0, interactions: 0 });
}

// % change vs previous (null when previous is 0 → "new").
export function pct(cur, prev) {
  if (!prev) return cur ? null : 0;
  return Math.round(((cur - prev) / prev) * 100);
}
