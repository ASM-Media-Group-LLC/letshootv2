// Cadencia de entrega por creadora — compartido entre el admin (ficha + lista de
// Creadoras) y Propuestas (vista Entregas). `days` = tope de días sin entrega
// antes de marcar atraso.
export const CADENCIAS = [
  { id: 'daily', label: 'Diaria', short: 'Diaria', days: 1 },
  { id: 'thrice_week', label: '2-3 / semana', short: '2-3/sem', days: 3 },
  { id: 'weekly', label: 'Semanal', short: 'Semanal', days: 7 },
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
