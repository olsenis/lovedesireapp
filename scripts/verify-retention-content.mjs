// Standalone verification for the Aug 27 retention batch: Sunday CI
// rotation content + seasonal WYR packs + upgrade re-frame static config.
//
// Aim: catch content-authoring regressions (rule violations, wrong
// counts, missing metadata) before they land in production. The three
// shipped surfaces this script covers all live entirely in constants +
// pure functions, so a text-level check on the source files plus
// inlined copies of the two pure functions (marked "KEEP IN SYNC")
// gives full coverage without spinning up Firebase or Expo.
//
// Usage (from project root):
//   node scripts/verify-retention-content.mjs
//
// Exits 0 if all checks pass; 1 with a summary of failures otherwise.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const stateUnionSrc = readFileSync(join(root, 'services', 'stateUnionService.ts'), 'utf8');
const contentSrc = readFileSync(join(root, 'constants', 'content.ts'), 'utf8');
const upgradeSrc = readFileSync(join(root, 'app', 'upgrade.tsx'), 'utf8');

let passes = 0;
let failures = [];

function check(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      passes++;
      console.log(`  ok  ${name}`);
    } else {
      failures.push({ name, reason: String(result) });
      console.log(`  FAIL ${name}: ${result}`);
    }
  } catch (e) {
    failures.push({ name, reason: e.message });
    console.log(`  FAIL ${name}: ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Sunday Check-in rotation (Retention #1)
// ─────────────────────────────────────────────────────────────
console.log('\nSunday Check-in question sets');

// Extract STATE_UNION_QUESTION_SETS array as raw source between the
// opening `[` and its matching closing `];`. We can't safely eval() the
// block (Set N comments would break) so we count sets by counting the
// `// Set N` header comments and questions by counting quoted strings.
const setsBlock = (() => {
  const start = stateUnionSrc.indexOf('export const STATE_UNION_QUESTION_SETS');
  const end = stateUnionSrc.indexOf('];', start);
  if (start < 0 || end < 0) throw new Error('STATE_UNION_QUESTION_SETS not found');
  return stateUnionSrc.slice(start, end + 2);
})();

check('25 sets defined', () => {
  const matches = setsBlock.match(/^\s*\/\/ Set \d+/gm) ?? [];
  return matches.length === 25 || `expected 25, got ${matches.length}`;
});

check('all set indices 0..24 present', () => {
  const missing = [];
  for (let i = 0; i < 25; i++) {
    if (!setsBlock.includes(`// Set ${i}`)) missing.push(i);
  }
  return missing.length === 0 || `missing set indices: ${missing.join(',')}`;
});

// Extract every question string. Both single and double quoted strings
// appear (the content mixes them because some questions carry apostrophes
// and are wrapped in the other quote type). Use two separate regexes so
// an apostrophe inside a double-quoted string is not misread as a
// single-quote boundary (the source of an earlier false-positive
// splitting "didn't ask for?" into a partial).
const questionStrings = (() => {
  const strs = [];
  let m;
  const dq = /"([^"\n]+\?)"/g;
  while ((m = dq.exec(setsBlock))) strs.push(m[1]);
  const sq = /'([^'\n]+\?)'/g;
  while ((m = sq.exec(setsBlock))) strs.push(m[1]);
  return strs;
})();

check('125 questions extracted (25 sets × 5)', () => {
  return questionStrings.length === 125 || `got ${questionStrings.length}`;
});

check('no they/them/their/themselves in question strings', () => {
  const bad = questionStrings.filter(s => /\b(they|them|their|themselves)\b/i.test(s));
  return bad.length === 0 || `${bad.length} question(s) use pronoun: ${JSON.stringify(bad.slice(0, 3))}`;
});

check('no em dashes in question strings', () => {
  const bad = questionStrings.filter(s => s.includes('—'));
  return bad.length === 0 || `${bad.length} question(s) contain em dash`;
});

check('no {partner} token in question strings', () => {
  const bad = questionStrings.filter(s => s.includes('{partner}'));
  return bad.length === 0 || `${bad.length} question(s) contain {partner}`;
});

check('every question ends with ?', () => {
  const bad = questionStrings.filter(s => !s.endsWith('?'));
  return bad.length === 0 || `${bad.length} question(s) do not end with ?`;
});

check('question length 6-18 words each', () => {
  const bad = questionStrings.filter(s => {
    const words = s.replace('?', '').trim().split(/\s+/).length;
    return words < 6 || words > 18;
  });
  return bad.length === 0 || `${bad.length} question(s) outside 6-18 words: ${JSON.stringify(bad.slice(0, 3))}`;
});

// KEEP IN SYNC with services/stateUnionService.ts pickWeeklyQuestionSet
function pickWeeklyQuestionSet(weekId, coupleId, poolSize = 25) {
  const seed = `${weekId}::${coupleId}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % poolSize;
}

check('pickWeeklyQuestionSet returns integer in [0, 25)', () => {
  const bad = [];
  for (let i = 0; i < 100; i++) {
    const week = `2026-${String((i % 52) + 1).padStart(2, '0')}`;
    const couple = `couple${i}`;
    const idx = pickWeeklyQuestionSet(week, couple, 25);
    if (!Number.isInteger(idx) || idx < 0 || idx >= 25) bad.push({ week, couple, idx });
  }
  return bad.length === 0 || `${bad.length} bad picks`;
});

check('pickWeeklyQuestionSet deterministic for same inputs', () => {
  const a = pickWeeklyQuestionSet('2026-35', 'abc123');
  const b = pickWeeklyQuestionSet('2026-35', 'abc123');
  return a === b || `not deterministic: ${a} vs ${b}`;
});

check('pickWeeklyQuestionSet spreads across the pool', () => {
  const seen = new Set();
  // Sample 500 (weekId, coupleId) pairs, expect > 20 unique set ids reached
  for (let w = 1; w <= 50; w++) {
    for (let c = 0; c < 10; c++) {
      seen.add(pickWeeklyQuestionSet(`2026-${String(w).padStart(2, '0')}`, `couple${c}`));
    }
  }
  return seen.size >= 20 || `only ${seen.size} distinct sets reached in 500 samples`;
});

// ─────────────────────────────────────────────────────────────
// Seasonal WYR packs (Retention #5)
// ─────────────────────────────────────────────────────────────
console.log('\nSeasonal WYR packs');

const seasonalPacks = [
  { name: 'Fall Reflections', seasonKey: 'fall', seasonYear: 2026, emoji: '🍂' },
  { name: 'Winter Reflections', seasonKey: 'winter', seasonYear: 2026, emoji: '❄️' },
  { name: 'Spring Awakening', seasonKey: 'spring', seasonYear: 2027, emoji: '🌱' },
  { name: 'Summer Nights', seasonKey: 'summer', seasonYear: 2027, emoji: '☀️' },
];

for (const p of seasonalPacks) {
  check(`pack "${p.name}" is present`, () => {
    return contentSrc.includes(`name: '${p.name}'`) || 'missing';
  });
  check(`pack "${p.name}" has seasonKey: '${p.seasonKey}'`, () => {
    // Look for the seasonKey line within a small window after the name line
    const nameIdx = contentSrc.indexOf(`name: '${p.name}'`);
    if (nameIdx < 0) return 'name not found';
    const window = contentSrc.slice(nameIdx, nameIdx + 400);
    return window.includes(`seasonKey: '${p.seasonKey}'`) || 'seasonKey missing or wrong';
  });
  check(`pack "${p.name}" has seasonYear: ${p.seasonYear}`, () => {
    const nameIdx = contentSrc.indexOf(`name: '${p.name}'`);
    if (nameIdx < 0) return 'name not found';
    const window = contentSrc.slice(nameIdx, nameIdx + 400);
    return window.includes(`seasonYear: ${p.seasonYear}`) || 'seasonYear missing or wrong';
  });
}

// Extract every seasonal pack's questions[] block. Each pack has 10
// entries — count { level: ... a: ... b: ... discussion } object literals.
for (const p of seasonalPacks) {
  const nameIdx = contentSrc.indexOf(`name: '${p.name}'`);
  const closeIdx = contentSrc.indexOf('    ],', nameIdx); // end of questions array
  const body = contentSrc.slice(nameIdx, closeIdx);

  check(`pack "${p.name}" has 10 question objects`, () => {
    const matches = body.match(/\{ level: /g) ?? [];
    return matches.length === 10 || `expected 10, got ${matches.length}`;
  });

  // Extract A / B / discussion strings from the body
  const strs = [];
  const re = /['"]([^'"\n]+)['"]/g;
  let m;
  while ((m = re.exec(body))) strs.push(m[1]);

  check(`pack "${p.name}" no they/them/their in question strings`, () => {
    // Filter out non-question strings (level values, seasonKey values) —
    // they're 1-word tokens. Real content is longer.
    const contentStrs = strs.filter(s => s.split(/\s+/).length > 1);
    const bad = contentStrs.filter(s => /\b(they|them|their|themselves)\b/i.test(s));
    return bad.length === 0 || `${bad.length} string(s) use pronoun: ${JSON.stringify(bad.slice(0, 2))}`;
  });

  check(`pack "${p.name}" no em dashes`, () => {
    const contentStrs = strs.filter(s => s.split(/\s+/).length > 1);
    const bad = contentStrs.filter(s => s.includes('—'));
    return bad.length === 0 || `${bad.length} string(s) contain em dash`;
  });

  check(`pack "${p.name}" paid: false`, () => {
    const nameIdx2 = contentSrc.indexOf(`name: '${p.name}'`);
    const window = contentSrc.slice(nameIdx2, nameIdx2 + 400);
    return window.includes('paid: false') || 'not paid: false';
  });
}

// KEEP IN SYNC with constants/content.ts getCurrentSeason
function getCurrentSeason(now) {
  const m = now.getMonth();
  if (m === 11 || m <= 1) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'fall';
}

// KEEP IN SYNC with constants/content.ts getSeasonYear (internal, non-exported)
function getSeasonYear(now) {
  const m = now.getMonth();
  return m <= 1 ? now.getFullYear() - 1 : now.getFullYear();
}

check('getCurrentSeason maps months correctly', () => {
  const cases = [
    [new Date(2026, 0, 15), 'winter'],   // Jan
    [new Date(2026, 1, 15), 'winter'],   // Feb
    [new Date(2026, 2, 15), 'spring'],   // Mar
    [new Date(2026, 4, 15), 'spring'],   // May
    [new Date(2026, 5, 15), 'summer'],   // Jun
    [new Date(2026, 7, 15), 'summer'],   // Aug
    [new Date(2026, 8, 15), 'fall'],     // Sep
    [new Date(2026, 10, 15), 'fall'],    // Nov
    [new Date(2026, 11, 15), 'winter'],  // Dec
  ];
  for (const [d, expected] of cases) {
    const got = getCurrentSeason(d);
    if (got !== expected) return `${d.toISOString()}: expected ${expected}, got ${got}`;
  }
});

check('getSeasonYear normalises Jan-Feb to previous year', () => {
  const jan2027 = getSeasonYear(new Date(2027, 0, 15));
  const feb2027 = getSeasonYear(new Date(2027, 1, 28));
  const dec2026 = getSeasonYear(new Date(2026, 11, 15));
  const mar2027 = getSeasonYear(new Date(2027, 2, 1));
  if (jan2027 !== 2026) return `Jan 2027 got ${jan2027}, expected 2026`;
  if (feb2027 !== 2026) return `Feb 2027 got ${feb2027}, expected 2026`;
  if (dec2026 !== 2026) return `Dec 2026 got ${dec2026}, expected 2026`;
  if (mar2027 !== 2027) return `Mar 2027 got ${mar2027}, expected 2027`;
});

check('Winter pack spans Dec 2026 through Feb 2027 as one season', () => {
  const dec = { season: getCurrentSeason(new Date(2026, 11, 15)), year: getSeasonYear(new Date(2026, 11, 15)) };
  const jan = { season: getCurrentSeason(new Date(2027, 0, 15)), year: getSeasonYear(new Date(2027, 0, 15)) };
  const feb = { season: getCurrentSeason(new Date(2027, 1, 15)), year: getSeasonYear(new Date(2027, 1, 15)) };
  const same = dec.season === 'winter' && dec.year === 2026
    && jan.season === 'winter' && jan.year === 2026
    && feb.season === 'winter' && feb.year === 2026;
  return same || `not all three map to winter 2026: dec=${JSON.stringify(dec)}, jan=${JSON.stringify(jan)}, feb=${JSON.stringify(feb)}`;
});

// ─────────────────────────────────────────────────────────────
// Upgrade screen re-frame (Retention #3)
// ─────────────────────────────────────────────────────────────
console.log('\nUpgrade screen re-frame');

check('FLAGSHIP_FEATURES defined', () => {
  return upgradeSrc.includes('const FLAGSHIP_FEATURES') || 'not found';
});

check('ACCESSORY_FEATURES defined', () => {
  return upgradeSrc.includes('const ACCESSORY_FEATURES') || 'not found';
});

check('FLAGSHIP_FEATURES contains Fantasy Wishes, Sensate, Fire & Desire', () => {
  const idx = upgradeSrc.indexOf('const FLAGSHIP_FEATURES');
  const end = upgradeSrc.indexOf('];', idx);
  const body = upgradeSrc.slice(idx, end);
  const missing = ['Fantasy Wishes', 'Sensate Focus', 'Fire & Desire'].filter(name => !body.includes(name));
  return missing.length === 0 || `missing: ${missing.join(', ')}`;
});

check('ACCESSORY_FEATURES contains Tease, Activity Cards, Spicy, The Lovers', () => {
  const idx = upgradeSrc.indexOf('const ACCESSORY_FEATURES');
  const end = upgradeSrc.indexOf('];', idx);
  const body = upgradeSrc.slice(idx, end);
  const missing = ['Tease', 'Activity Cards', 'Spicy content everywhere', 'The Lovers']
    .filter(name => !body.includes(name));
  return missing.length === 0 || `missing: ${missing.join(', ')}`;
});

check('upgrade screen has two-section headers', () => {
  const has1 = upgradeSrc.includes('The three deep features');
  const has2 = upgradeSrc.includes('And everything else that comes with it');
  return (has1 && has2) || `flagship header:${has1}, accessory header:${has2}`;
});

// ─────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────
console.log(`\n${passes} passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ${f.name}: ${f.reason}`);
  process.exit(1);
}
process.exit(0);
