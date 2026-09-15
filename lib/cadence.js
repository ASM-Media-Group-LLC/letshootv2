// Cadencia de entrega por creadora — compartido entre el admin (ficha + lista de
// Creadoras) y Propuestas (vista Entregas). `days` = tope de días sin entrega
// antes de marcar atraso.
export const CADENCIAS = [
  { id: 'daily', label: 'Diaria', short: 'Diaria', days: 1 },
  { id: 'thrice_week', label: '2-3 / semana', short: '2-3/sem', days: 3 },
  { id: 'weekly', label: 'Semanal', short: 'Semanal', days: 7 },
  { id: 'biweekly', label: 'Quincenal', short: 'Quincenal', days: 14 },
  { id: 'monthly', label: 'Mensual', short: 'Mensual', days: 30 },
];

export function cadenceLabel(id) {
  return CADENCIAS.find((c) => c.id === id)?.short || null;
}

// Estado de entrega según cadencia + última entrega (assets.created_at).
// Devuelve null si no hay cadencia definida.
export function deliveryState(cadenceId, lastDeliveryAt) {
  const c = CADENCIAS.find((x) => x.id === cadenceId);
  if (!c) return null;
  if (!lastDeliveryAt) return { tone: 'warn', label: 'Sin entregas aún', due: true };
  const gapDays = (Date.now() - new Date(lastDeliveryAt).getTime()) / 86400000;
  if (gapDays > c.days) return { tone: 'bad', label: `Atrasada · hace ${Math.floor(gapDays)}d`, due: true };
  return { tone: 'ok', label: 'Al día', due: false };
}

// PRÓXIMA entrega (con fecha) según cadencia + última entrega. Se recalcula sola:
// al registrarse una entrega nueva (assets), la fecha salta a la siguiente.
// Sin última entrega → la primera se debe ya (hoy). Devuelve null si no hay cadencia.
export function nextDelivery(cadenceId, lastDeliveryAt) {
  const c = CADENCIAS.find((x) => x.id === cadenceId);
  if (!c) return null;
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const today = startOfDay(new Date());
  const first = !lastDeliveryAt;
  const dueAt = first ? today : new Date(new Date(lastDeliveryAt).getTime() + c.days * 86400000);
  const dueDay = startOfDay(dueAt);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  let tone, label;
  if (first) { tone = 'warn'; label = 'Primera entrega pendiente'; }
  else if (diffDays < 0) { tone = 'bad'; label = `Atrasada · vencía hace ${Math.abs(diffDays)} d`; }
  else if (diffDays === 0) { tone = 'warn'; label = 'Entrega hoy'; }
  else if (diffDays === 1) { tone = 'warn'; label = 'Entrega mañana'; }
  else { tone = 'ok'; label = `Faltan ${diffDays} d`; }
  return { dueAt, dueDay, diffDays, tone, label, first, overdue: !first && diffDays < 0, due: diffDays <= 0 };
}
