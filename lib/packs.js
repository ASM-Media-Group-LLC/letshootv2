// SINGLE SOURCE OF TRUTH for the content packs — used by the public pricing
// section, onboarding checkout, and the Manual Sales package preselect. If a
// price changes, change it HERE and it updates everywhere. Prices are the
// per-month price for each billing period (m = monthly, q = quarterly, a = annual).
export const PACKS = [
  { key: 'test', name: 'Test Pack', was: 500,  m: 249, q: 219, a: 179, photos: 20, videos: 1 },
  { key: 'core', name: 'Core Pack', was: 1000, m: 499, q: 439, a: 359, photos: 45, videos: 2, popular: true },
  { key: 'pro',  name: 'Pro Pack',  was: 2000, m: 899, q: 789, a: 649, photos: 90, videos: 4 },
];

// Billing periods: months billed + discount vs monthly (for the toggle badge).
export const PERIODS = [
  { key: 'm', months: 1,  off: 0 },
  { key: 'q', months: 3,  off: 12 },
  { key: 'a', months: 12, off: 28 },
];
