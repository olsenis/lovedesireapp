// Shared deterministic-randomness helpers. Anything that must produce the
// SAME result on both partners' phones without a server round-trip seeds
// from a string (typically `${weekId}::${coupleId}` or `${date}::${coupleId}`)
// and shuffles with these. Originally private to loveLanguageNudgeService;
// extracted Sep 2026 when Memory Lane became the fourth caller.
//
// NOTE: dailyQuestionsService and bingoService keep their own older LCG
// shuffles on purpose. Switching them here would change every couple's
// historical daily picks and deck layouts. New code should use this file.

// FNV-1a, 32-bit. Stable across platforms and JS engines.
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 32-bit non-cryptographic PRNG. Plenty for shuffling content pools.
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic Fisher-Yates. Same seed string, same order, every time.
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rng = mulberry32(hashString(seed));
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Seeded pick of `n` distinct items. Convenience over seededShuffle.
export function seededPick<T>(arr: T[], n: number, seed: string): T[] {
  return seededShuffle(arr, seed).slice(0, Math.max(0, Math.min(n, arr.length)));
}
