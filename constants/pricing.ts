// Single source of truth for prices quoted in copy (legal text, help
// screens, anything that prints a number). The paywall itself shows live
// localized prices from RevenueCat, never these constants.
//
// Mirror: web/src/data/pricing.ts must hold the same numbers. The
// marketing site builds on Vercel with web/ as its root and cannot import
// files outside it, so the two files are kept in sync by hand; change
// both in the same commit. Docs (APP_STORE_SUBMISSION, MARKETING,
// LAUNCH_STATUS) quote these numbers and say so.
//
// History: annual $59.99 (Aug 2026) -> $39.99 (Sep 13 2026, COMPETITORS.md).

export const PRICING = {
  monthlyUsd: 9.99,
  annualUsd: 39.99,
  trialDays: 7,
  introFirstMonthUsd: 4.99,
} as const;

export const fmtUsd = (n: number): string => `$${n.toFixed(2)}`;

// Derived, so copy like "save $80" and "~67% off" never drifts.
export const annualPerMonthUsd = PRICING.annualUsd / 12;
export const annualSavingsUsd = Math.round(PRICING.monthlyUsd * 12 - PRICING.annualUsd);
export const annualDiscountPct = Math.round((1 - annualPerMonthUsd / PRICING.monthlyUsd) * 100);

// "Free until 21 September": the trial end date the paywall and the site
// print next to the price (USER_VOICE A3). Day and month only; the year is
// implied and a wrong year would look like a bug.
export const trialEndLabel = (days: number = PRICING.trialDays, from: Date = new Date()): string => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
};
