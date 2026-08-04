// Exact money math for the Manual Sales ledger. All sums happen in INTEGER
// CENTS so floating point can never drift a total (0.1 + 0.2 problems).
// Postgres stores amounts as numeric(12,2); we convert once on read.

export const centsOf = (v) => Math.round(Number(v || 0) * 100);

export const sumCents = (rows, pick) =>
  (rows || []).reduce((s, r) => s + centsOf(pick ? pick(r) : r), 0);

// "$1,250" for whole amounts, "$1,250.50" when there are cents — accounting-clean.
export const moneyCents = (c) => {
  const whole = c % 100 === 0;
  return '$' + (c / 100).toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
};
