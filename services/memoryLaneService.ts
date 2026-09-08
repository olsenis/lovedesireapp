import {
  doc, collection, query, orderBy, limit, where, getDocs, onSnapshot, updateDoc, runTransaction, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './statsService';
import { seededShuffle, seededPick } from './seed';
import { personalise } from './personalise';
import { ALL_MOODS, MOOD_LABELS, MoodEmoji } from './moodService';
import {
  getAllCompletedSundayWeeks, getStateUnionEntry, PULSE_DIMENSION_KEYS, PulseDimensionKey, StateUnionEntry,
} from './stateUnionService';
import type { Question } from '../constants/content';

// ─── Memory Lane ("Manstu?") ─────────────────────────────────────────────
// Weekly 5-question quiz generated from the couple's OWN history: Moments,
// Daily answers, moods, milestones, Sunday Check-in pulses, Fantasy Wishes
// matches. The only game whose content pool grows with usage instead of
// depleting. Unlocks after 30 days of use (featureUnlockService).
//
// Doc: couples/{coupleId}/memoryLane/{weekId}
//   questions   { uid: MemoryQuestion[] } — ONE SET PER PARTNER. Three of
//               the six sources are partner-relative ("what did Eva say?",
//               "what was Eva's mood?"), so a single shared set would quiz
//               whoever opens second about themselves (Review #11 B1).
//               Whoever opens first generates BOTH perspectives from one
//               read of the sources and writes both sets in a transaction.
//               Legacy docs from Sep 8 2026 hold a plain array; readers go
//               through questionsFor().
//   answers     { uid: { qi: optionIndex } } — inherits the catch-all rules
//               guard for 'answers', so each partner can only write their key
//   completedAt { uid: ts } — per-uid map, guarded in rules like answers
//
// No mutual-seal: every answer is a fact from shared history both partners
// have already seen, so instant ✓/✗ is the right feel. Generation is
// seeded by `${weekId}::${coupleId}`, so the symmetric sources (milestone,
// sunday, fw, moment month) land the same questions in both sets and only
// the partner-relative ones differ.

export type MemorySource = 'moment' | 'daily' | 'mood' | 'milestone' | 'sunday' | 'fw';

export interface MemoryQuestion {
  id: string;
  source: MemorySource;
  prompt: string;
  options: string[];
  correctIndex: number;
  imageURL?: string;
}

export interface MemoryLaneDoc {
  weekId: string;
  generatedAt: number;
  generatedBy: string;
  questions: Record<string, MemoryQuestion[]> | MemoryQuestion[];
  answers: Record<string, Record<string, number>>;
  completedAt?: Record<string, number>;
}

export const MEMORY_LANE_QUESTIONS = 5;
const MAX_PER_SOURCE = 2;
const MIN_TO_PLAY = 3;
const OPTION_MAX_CHARS = 64;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthLabel(y: number, m: number): string {
  return `${MONTHS[m]} ${y}`;
}

function dateLabel(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

function clip(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length > OPTION_MAX_CHARS ? `${t.slice(0, OPTION_MAX_CHARS - 1)}…` : t;
}

// Put the correct answer at a seeded position so it is not always first.
function withShuffledOptions(
  base: Omit<MemoryQuestion, 'options' | 'correctIndex'>,
  correct: string,
  distractors: string[],
  seed: string,
): MemoryQuestion {
  const options = seededShuffle([correct, ...distractors], `${seed}::${base.id}`);
  return { ...base, options, correctIndex: options.indexOf(correct) };
}

// The set for one partner. Legacy docs (plain array) serve everyone the
// same set; that shape stops being written after Sep 8 2026.
export function questionsFor(d: MemoryLaneDoc | null, uid: string): MemoryQuestion[] {
  if (!d) return [];
  const q = d.questions;
  if (Array.isArray(q)) return q;
  return q?.[uid] ?? [];
}

// ─── Sources ─────────────────────────────────────────────────────────────
// Read once per generation, then both perspectives are built from the same
// in-memory data. A failing source yields an empty list, never a throw.

interface MomentSrc { date: string; photos: Record<string, { photoURL: string }> }
interface DailySrc { date: string; items: Question[]; answers: Record<string, Record<string, string>> }
interface MoodSrc { uid: string; emoji: MoodEmoji; createdAt: number }
interface MilestoneSrc { label: string; date: number; emoji?: string }
interface SundaySrc { weekId: string; entries: Record<string, StateUnionEntry | null> }
interface FwSrc { text: string; matchedAt: number }

interface Sources {
  moments: MomentSrc[];
  daily: DailySrc[];
  moods: MoodSrc[];
  milestones: MilestoneSrc[];
  sundays: SundaySrc[];
  fwMatches: FwSrc[];
}

async function safe<T>(p: Promise<T[]>): Promise<T[]> {
  try { return await p; } catch { return []; }
}

async function loadSources(coupleId: string, uidA: string, uidB: string): Promise<Sources> {
  const moments = safe((async (): Promise<MomentSrc[]> => {
    const snap = await getDocs(query(collection(db, 'couples', coupleId, 'moments'), orderBy('createdAt', 'desc'), limit(120)));
    // `date` is the document id, not a stored field (momentService writes
    // only createdAt + photos). Review #11 B3: reading d.data() alone left
    // every moment without a date and this source silently returned [].
    return snap.docs
      .map((d) => ({ date: d.id, ...(d.data() as { photos?: Record<string, { photoURL: string }> }) }))
      .filter((m): m is MomentSrc => !!m.date && !!m.photos && Object.keys(m.photos).length > 0);
  })());

  const daily = safe((async (): Promise<DailySrc[]> => {
    const snap = await getDocs(query(collection(db, 'couples', coupleId, 'dailyQuestions'), orderBy('date', 'desc'), limit(60)));
    return snap.docs
      .map((d) => d.data() as Partial<DailySrc>)
      .filter((d): d is DailySrc => !!d.date && Array.isArray(d.items) && !!d.answers);
  })());

  const moods = safe((async (): Promise<MoodSrc[]> => {
    const since = Date.now() - 60 * 86400000;
    const snap = await getDocs(query(collection(db, 'couples', coupleId, 'moods'), where('createdAt', '>=', since)));
    return snap.docs
      .map((d) => d.data() as MoodSrc)
      .filter((m) => (m.uid === uidA || m.uid === uidB) && ALL_MOODS.includes(m.emoji))
      .sort((a, b) => b.createdAt - a.createdAt);
  })());

  const milestones = safe((async (): Promise<MilestoneSrc[]> => {
    const snap = await getDocs(query(collection(db, 'couples', coupleId, 'milestones'), orderBy('date', 'asc')));
    return snap.docs.map((d) => d.data() as MilestoneSrc).filter((m) => !!m.label && !!m.date);
  })());

  const sundays = safe((async (): Promise<SundaySrc[]> => {
    // Both-completed weeks only (rules gate partner entries on that). All
    // entry reads in flight at once; the first version awaited each week
    // in turn and was the slowest part of first-open generation.
    const weeks = (await getAllCompletedSundayWeeks(coupleId, uidA, uidB)).slice(0, 12);
    const entries = await Promise.all(weeks.map((wk) => Promise.all([
      getStateUnionEntry(coupleId, wk.weekId, uidA),
      getStateUnionEntry(coupleId, wk.weekId, uidB),
    ])));
    return weeks.map((wk, i) => ({ weekId: wk.weekId, entries: { [uidA]: entries[i][0], [uidB]: entries[i][1] } }));
  })());

  const fwMatches = safe((async (): Promise<FwSrc[]> => {
    // Only matched items carry matchedAt. Single-field range query uses the
    // automatic index, so this fetches ~N matches instead of all ~394
    // preset docs the couple has loaded.
    const snap = await getDocs(query(collection(db, 'couples', coupleId, 'fantasyWishes'), where('matchedAt', '>', 0)));
    return snap.docs
      .map((d) => d.data() as { text?: string; matchedAt?: number })
      .filter((m): m is FwSrc => !!m.text && typeof m.matchedAt === 'number')
      .sort((a, b) => a.matchedAt - b.matchedAt);
  })());

  const [m, d, mo, mi, su, fw] = await Promise.all([moments, daily, moods, milestones, sundays, fwMatches]);
  return { moments: m, daily: d, moods: mo, milestones: mi, sundays: su, fwMatches: fw };
}

// ─── Generators ──────────────────────────────────────────────────────────
// Pure functions of (sources, view, seed). Each returns candidate
// questions; selection happens after. Each enforces its own cold-start
// minimum so a thin source yields nothing rather than a trivial question.

// Whose quiz this is. `uid` answers; questions ask about `partnerUid`.
interface View {
  uid: string;
  partnerUid: string;
  partnerName: string;
}

function fromMoments(s: Sources, view: View, seed: string): MemoryQuestion[] {
  const months = new Set(s.moments.map((m) => m.date.slice(0, 7)));
  if (s.moments.length < 3 || months.size < 2) return [];
  return s.moments.map((m) => {
    const [y, mo] = m.date.split('-').map(Number);
    const correct = monthLabel(y, mo - 1);
    // Three distinct nearby months, biased around the real one.
    const offsets = seededPick([-3, -2, -1, 1, 2, 3], 3, `${seed}::mo::${m.date}`);
    const distractors = offsets.map((o) => {
      const d = new Date(y, mo - 1 + o, 1);
      return monthLabel(d.getFullYear(), d.getMonth());
    });
    // Show the partner's photo when there is one: you are guessing about
    // a moment you shared, seen from the other side.
    const photo = m.photos[view.partnerUid]?.photoURL ?? m.photos[view.uid]?.photoURL ?? Object.values(m.photos)[0]?.photoURL;
    return withShuffledOptions(
      { id: `moment:${m.date}`, source: 'moment', prompt: 'Which month was this Moment from?', imageURL: photo },
      correct, distractors, seed,
    );
  });
}

function fromDaily(s: Sources, view: View, seed: string): MemoryQuestion[] {
  type Row = { date: string; gi: number; q: Question; partnerAnswer: string };
  const rows: Row[] = [];
  for (const d of s.daily) {
    const theirs = d.answers[view.partnerUid];
    const mine = d.answers[view.uid];
    if (!theirs) continue;
    d.items.forEach((q, gi) => {
      const a = theirs[String(gi)];
      // Review #11 B2: Daily reveals the partner's answer only once you have
      // answered too. Memory Lane must not leak answers to questions you
      // skipped, so a row needs BOTH answers. Distractors are drawn from
      // these rows, so they are gated by the same check.
      const own = mine?.[String(gi)];
      if (a && a.trim() && own && own.trim()) rows.push({ date: d.date, gi, q, partnerAnswer: a });
    });
  }
  const open = rows.filter((r) => (r.q.format ?? 'open') === 'open');
  const out: MemoryQuestion[] = [];
  for (const r of rows) {
    const format = r.q.format ?? 'open';
    const id = `daily:${r.date}:${r.gi}`;
    const prompt = `When asked "${personalise(r.q.text, view.partnerName)}", what did ${view.partnerName} say?`;
    if (format === 'binary' && r.q.options && r.q.options.includes(r.partnerAnswer)) {
      const other = r.q.options.find((o) => o !== r.partnerAnswer)!;
      out.push(withShuffledOptions({ id, source: 'daily', prompt }, r.partnerAnswer, [other], seed));
    } else if (format === 'scale') {
      const n = Number(r.partnerAnswer);
      if (!(n >= 1 && n <= 5)) continue;
      const others = seededPick(['1', '2', '3', '4', '5'].filter((v) => v !== String(n)), 3, `${seed}::sc::${id}`);
      out.push(withShuffledOptions({ id, source: 'daily', prompt }, String(n), others, seed));
    } else if (format === 'open') {
      // Distractors are the partner's REAL answers to other questions. This
      // is what makes the pool large: open text is ~90% of Daily history.
      const pool = open.filter((o) => o !== r && clip(o.partnerAnswer) !== clip(r.partnerAnswer)).map((o) => clip(o.partnerAnswer));
      const distinct = Array.from(new Set(pool));
      if (distinct.length < 3) continue;
      const distractors = seededPick(distinct, 3, `${seed}::op::${id}`);
      out.push(withShuffledOptions({ id, source: 'daily', prompt }, clip(r.partnerAnswer), distractors, seed));
    }
  }
  return out;
}

function fromMoods(s: Sources, view: View, seed: string): MemoryQuestion[] {
  const theirs = s.moods.filter((m) => m.uid === view.partnerUid);
  if (theirs.length < 5) return [];
  const label = (e: MoodEmoji) => `${e} ${MOOD_LABELS[e]}`;
  return theirs.map((m) => {
    const id = `mood:${m.uid}:${m.createdAt}`;
    const others = seededPick(ALL_MOODS.filter((e) => e !== m.emoji), 3, `${seed}::md::${id}`);
    return withShuffledOptions(
      { id, source: 'mood', prompt: `What was ${view.partnerName}'s mood on ${dateLabel(m.createdAt)}?` },
      label(m.emoji), others.map(label), seed,
    );
  });
}

function fromMilestones(s: Sources, _view: View, seed: string): MemoryQuestion[] {
  const ms = s.milestones;
  if (ms.length < 3) return [];
  const out: MemoryQuestion[] = [];
  // Adjacent-ish pairs with distinct dates; cap so this source cannot flood.
  for (let i = 0; i < ms.length - 1 && out.length < 6; i++) {
    const a = ms[i];
    const b = ms[i + 1 + ((i * 7) % Math.max(1, ms.length - i - 1))] ?? ms[i + 1];
    if (!b || a.date === b.date) continue;
    const first = a.date < b.date ? a : b;
    const second = first === a ? b : a;
    out.push(withShuffledOptions(
      { id: `milestone:${a.date}:${b.date}`, source: 'milestone', prompt: 'Which came first?' },
      `${first.emoji ? `${first.emoji} ` : ''}${clip(first.label)}`,
      [`${second.emoji ? `${second.emoji} ` : ''}${clip(second.label)}`],
      seed,
    ));
  }
  return out;
}

const PULSE_LABEL: Record<PulseDimensionKey, string> = {
  fun: 'Fun', communication: 'Communication', closeness: 'Closeness', sex: 'Sex', teamwork: 'Teamwork',
};

// ISO YYYY-WW -> the Monday of that week, local. Used for the prompt label.
function weekIdToMonday(weekId: string): Date {
  const [y, w] = weekId.split('-').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Dow = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Dow + 1 + (w - 1) * 7);
  return new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
}

function fromSunday(s: Sources, view: View, seed: string): MemoryQuestion[] {
  const out: MemoryQuestion[] = [];
  for (const wk of s.sundays) {
    const mine = wk.entries[view.uid];
    const theirs = wk.entries[view.partnerUid];
    if (!mine?.pulseScores || !theirs?.pulseScores) continue;
    const sums = PULSE_DIMENSION_KEYS.map((k) => ({ k, s: (mine.pulseScores?.[k] ?? 0) + (theirs.pulseScores?.[k] ?? 0) }));
    const top = Math.max(...sums.map((x) => x.s));
    const winners = sums.filter((x) => x.s === top);
    if (winners.length !== 1 || top === 0) continue; // ties are unfair to quiz
    const correct = PULSE_LABEL[winners[0].k];
    const others = seededPick(sums.filter((x) => x.s !== top).map((x) => PULSE_LABEL[x.k]), 3, `${seed}::su::${wk.weekId}`);
    if (others.length < 3) continue;
    out.push(withShuffledOptions(
      { id: `sunday:${wk.weekId}`, source: 'sunday', prompt: `Which did you both rate highest the week of ${dateLabel(weekIdToMonday(wk.weekId).getTime())}?` },
      correct, others, seed,
    ));
  }
  return out;
}

function fromFantasyWishes(s: Sources, _view: View, seed: string): MemoryQuestion[] {
  const matches = s.fwMatches;
  if (matches.length < 4) return [];
  // Up to three 4-sets; the earliest in each set is the answer.
  const out: MemoryQuestion[] = [];
  for (let n = 0; n < 3; n++) {
    const set = seededPick(matches, 4, `${seed}::fw::${n}`);
    if (set.length < 4) break;
    const first = set.reduce((a, b) => (a.matchedAt < b.matchedAt ? a : b));
    out.push(withShuffledOptions(
      { id: `fw:${n}:${first.matchedAt}`, source: 'fw', prompt: 'Which of these did you match on first in Fantasy Wishes?' },
      clip(first.text), set.filter((x) => x !== first).map((x) => clip(x.text)), seed,
    ));
  }
  return out;
}

// ─── Selection ───────────────────────────────────────────────────────────

function buildQuestions(s: Sources, view: View, seed: string): MemoryQuestion[] {
  const pool = [
    ...fromMoments(s, view, seed), ...fromDaily(s, view, seed), ...fromMoods(s, view, seed),
    ...fromMilestones(s, view, seed), ...fromSunday(s, view, seed), ...fromFantasyWishes(s, view, seed),
  ];
  if (pool.length < MIN_TO_PLAY) return [];
  const shuffled = seededShuffle(pool, seed);
  const perSource: Partial<Record<MemorySource, number>> = {};
  const picked: MemoryQuestion[] = [];
  for (const q of shuffled) {
    if (picked.length >= MEMORY_LANE_QUESTIONS) break;
    const n = perSource[q.source] ?? 0;
    if (n >= MAX_PER_SOURCE) continue;
    perSource[q.source] = n + 1;
    picked.push(q);
  }
  // If the per-source cap left us short, top up ignoring the cap.
  if (picked.length < MEMORY_LANE_QUESTIONS) {
    for (const q of shuffled) {
      if (picked.length >= MEMORY_LANE_QUESTIONS) break;
      if (!picked.includes(q)) picked.push(q);
    }
  }
  return picked.length >= MIN_TO_PLAY ? picked : [];
}

// ─── Firestore ───────────────────────────────────────────────────────────

export function subscribeMemoryLane(coupleId: string, weekId: string, onChange: (d: MemoryLaneDoc | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'couples', coupleId, 'memoryLane', weekId),
    (snap) => onChange(snap.exists() ? (snap.data() as MemoryLaneDoc) : null),
    () => onChange(null),
  );
}

// Creates this week's doc if missing, with one question set per partner.
// Sources are read once; the transaction only guards the create, so the
// second opener finds the doc and returns without generating. When the
// history is too thin for either partner, nothing is written (Review #11
// B5) so the next open tries again instead of pinning an empty week.
export async function ensureMemoryLaneWeek(
  coupleId: string,
  weekId: string,
  uid: string,
  partnerUid: string,
  myName: string,
  partnerName: string,
): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'memoryLane', weekId);
  const sources = await loadSources(coupleId, uid, partnerUid);
  const seed = `${weekId}::${coupleId}`;
  const mine = buildQuestions(sources, { uid, partnerUid, partnerName }, seed);
  const theirs = buildQuestions(sources, { uid: partnerUid, partnerUid: uid, partnerName: myName }, seed);
  if (mine.length === 0 && theirs.length === 0) return;
  const fresh: MemoryLaneDoc = {
    weekId,
    generatedAt: Date.now(),
    generatedBy: uid,
    questions: { [uid]: mine, [partnerUid]: theirs },
    answers: {},
    completedAt: {},
  };
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;
    tx.set(ref, fresh);
  });
}

export async function answerMemoryQuestion(
  coupleId: string,
  weekId: string,
  uid: string,
  qi: number,
  optionIndex: number,
  correct: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'memoryLane', weekId), {
    [`answers.${uid}.${qi}`]: optionIndex,
  });
  if (qi === 0) trackEvent('memory_lane_started');
  trackEvent('memory_lane_answered');
  if (correct) trackEvent('memory_lane_correct');
}

export async function completeMemoryLane(coupleId: string, weekId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'memoryLane', weekId), {
    [`completedAt.${uid}`]: Date.now(),
  });
  trackEvent('memory_lane_completed');
}

export function memoryLaneScore(d: MemoryLaneDoc | null, uid: string): { correct: number; answered: number; total: number } {
  const qs = questionsFor(d, uid);
  const mine = d?.answers?.[uid] ?? {};
  let correct = 0;
  let answered = 0;
  qs.forEach((q, i) => {
    const a = mine[String(i)];
    if (typeof a === 'number') {
      answered++;
      if (a === q.correctIndex) correct++;
    }
  });
  return { correct, answered, total: qs.length };
}
