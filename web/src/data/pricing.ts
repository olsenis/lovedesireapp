// Single source of truth for prices on the marketing site. MIRROR of
// constants/pricing.ts in the app; the site builds with web/ as its
// Vercel root and cannot import outside it, so keep both files identical
// and change them in the same commit.
//
// History: annual $59.99 (Aug 2026) -> $39.99 (Sep 13 2026, COMPETITORS.md).

export const PRICING = {
  monthlyUsd: 9.99,
  annualUsd: 39.99,
  trialDays: 7,
  introFirstMonthUsd: 4.99,
} as const;

export const fmtUsd = (n: number): string => `$${n.toFixed(2)}`;

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
