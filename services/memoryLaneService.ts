import {
  doc, collection, query, orderBy, limit, where, getDocs, onSnapshot, updateDoc, runTransaction, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './statsService';
import { seededShuffle, seededPick } from './seed';
import { personalise } from './personalise';
import { ALL_MOODS, MOOD_LABELS, MoodEmoji } from './moodService';
import { getAllCompletedSundayWeeks, getStateUnionEntry, PULSE_DIMENSION_KEYS, PulseDimensionKey } from './stateUnionService';
import type { Question } from '../constants/content';

// ─── Memory Lane ("Manstu?") ─────────────────────────────────────────────
// Weekly 5-question quiz generated from the couple's OWN history: Moments,
// Daily answers, moods, milestones, Sunday Check-in pulses, Fantasy Wishes
// matches. The only game whose content pool grows with usage instead of
// depleting. Unlocks at 30 days of pairing (featureUnlockService).
//
// Doc: couples/{coupleId}/memoryLane/{weekId}
//   questions   generated once per week by whoever opens first (transaction)
//   answers     { uid: { qi: optionIndex } } — inherits the catch-all rules
//               guard for 'answers', so each partner can only write their key
//   completedAt { uid: ts }
//
// No mutual-seal: every answer is a fact from shared history both partners
// have already seen, so instant ✓/✗ is the right feel. Generation is
// seeded by `${weekId}::${coupleId}` so both phones would produce the same
// doc from the same data; the transaction makes one of them win anyway.

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
  questions: MemoryQuestion[];
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

// ─── Generators ──────────────────────────────────────────────────────────
// Each returns candidate questions (possibly many). Selection happens
// after. Each enforces its own cold-start minimum so a thin source yields
// nothing rather than a trivial or repetitive question.

interface Ctx {
  coupleId: string;
  uid: string;
  partnerUid: string;
  partnerName: string;
  seed: string;
}

async function fromMoments(ctx: Ctx): Promise<MemoryQuestion[]> {
  const snap = await getDocs(query(collection(db, 'couples', ctx.coupleId, 'moments'), orderBy('createdAt', 'desc'), limit(120)));
  const moments = snap.docs
    .map((d) => d.data() as { date: string; photos?: Record<string, { photoURL: string }> })
    .filter((m) => m.date && m.photos && Object.keys(m.photos).length > 0);
  const months = new Set(moments.map((m) => m.date.slice(0, 7)));
  if (moments.length < 3 || months.size < 2) return [];
  return moments.map((m) => {
    const [y, mo] = m.date.split('-').map(Number);
    const correct = monthLabel(y, mo - 1);
    // Three distinct nearby months, biased around the real one.
    const offsets = seededPick([-3, -2, -1, 1, 2, 3], 3, `${ctx.seed}::mo::${m.date}`);
    const distractors = offsets.map((o) => {
      const d = new Date(y, mo - 1 + o, 1);
      return monthLabel(d.getFullYear(), d.getMonth());
    });
    const photo = m.photos![ctx.partnerUid]?.photoURL ?? m.photos![ctx.uid]?.photoURL ?? Object.values(m.photos!)[0]?.photoURL;
    return withShuffledOptions(
      { id: `moment:${m.date}`, source: 'moment', prompt: 'Which month was this Moment from?', imageURL: photo },
      correct, distractors, ctx.seed,
    );
  });
}

async function fromDaily(ctx: Ctx): Promise<MemoryQuestion[]> {
  const snap = await getDocs(query(collection(db, 'couples', ctx.coupleId, 'dailyQuestions'), orderBy('date', 'desc'), limit(60)));
  type Row = { date: string; gi: number; q: Question; partnerAnswer: string };
  const rows: Row[] = [];
  for (const d of snap.docs) {
    const data = d.data() as { date: string; items?: Question[]; answers?: Record<string, Record<string, string>> };
    const mine = data.answers?.[ctx.partnerUid];
    if (!data.items || !mine) continue;
    data.items.forEach((q, gi) => {
      const a = mine[String(gi)];
      if (a && a.trim()) rows.push({ date: data.date, gi, q, partnerAnswer: a });
    });
  }
  const open = rows.filter((r) => (r.q.format ?? 'open') === 'open');
  const out: MemoryQuestion[] = [];
  for (const r of rows) {
    const format = r.q.format ?? 'open';
    const id = `daily:${r.date}:${r.gi}`;
    const prompt = `When asked "${personalise(r.q.text, ctx.partnerName)}", what did ${ctx.partnerName} say?`;
    if (format === 'binary' && r.q.options && r.q.options.includes(r.partnerAnswer)) {
      const other = r.q.options.find((o) => o !== r.partnerAnswer)!;
      out.push(withShuffledOptions({ id, source: 'daily', prompt }, r.partnerAnswer, [other], ctx.seed));
    } else if (format === 'scale') {
      const n = Number(r.partnerAnswer);
      if (!(n >= 1 && n <= 5)) continue;
      const others = seededPick(['1', '2', '3', '4', '5'].filter((v) => v !== String(n)), 3, `${ctx.seed}::sc::${id}`);
      out.push(withShuffledOptions({ id, source: 'daily', prompt }, String(n), others, ctx.seed));
    } else if (format === 'open') {
      // Distractors are the partner's REAL answers to other questions. This
      // is what makes the pool large: open text is ~90% of Daily history.
      const pool = open.filter((o) => o !== r && clip(o.partnerAnswer) !== clip(r.partnerAnswer)).map((o) => clip(o.partnerAnswer));
      const distinct = Array.from(new Set(pool));
      if (distinct.length < 3) continue;
      const distractors = seededPick(distinct, 3, `${ctx.seed}::op::${id}`);
      out.push(withShuffledOptions({ id, source: 'daily', prompt }, clip(r.partnerAnswer), distractors, ctx.seed));
    }
  }
  return out;
}

async function fromMoods(ctx: Ctx): Promise<MemoryQuestion[]> {
  const since = Date.now() - 60 * 86400000;
  const snap = await getDocs(query(collection(db, 'couples', ctx.coupleId, 'moods'), where('createdAt', '>=', since)));
  const theirs = snap.docs
    .map((d) => d.data() as { uid: string; emoji: MoodEmoji; createdAt: number })
    .filter((m) => m.uid === ctx.partnerUid && ALL_MOODS.includes(m.emoji))
    .sort((a, b) => b.createdAt - a.createdAt);
  if (theirs.length < 5) return [];
  const label = (e: MoodEmoji) => `${e} ${MOOD_LABELS[e]}`;
  return theirs.map((m) => {
    const id = `mood:${m.createdAt}`;
    const others = seededPick(ALL_MOODS.filter((e) => e !== m.emoji), 3, `${ctx.seed}::md::${id}`);
    return withShuffledOptions(
      { id, source: 'mood', prompt: `What was ${ctx.partnerName}'s mood on ${dateLabel(m.createdAt)}?` },
      label(m.emoji), others.map(label), ctx.seed,
    );
  });
}

async function fromMilestones(ctx: Ctx): Promise<MemoryQuestion[]> {
  const snap = await getDocs(query(collection(db, 'couples', ctx.coupleId, 'milestones'), orderBy('date', 'asc')));
  const ms = snap.docs.map((d) => d.data() as { label: string; date: number; emoji?: string }).filter((m) => m.label && m.date);
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
      ctx.seed,
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

async function fromSunday(ctx: Ctx): Promise<MemoryQuestion[]> {
  const weeks = await getAllCompletedSundayWeeks(ctx.coupleId, ctx.uid, ctx.partnerUid);
  const out: MemoryQuestion[] = [];
  for (const wk of weeks.slice(0, 12)) {
    const [mine, theirs] = await Promise.all([
      getStateUnionEntry(ctx.coupleId, wk.weekId, ctx.uid),
      getStateUnionEntry(ctx.coupleId, wk.weekId, ctx.partnerUid),
    ]);
    if (!mine?.pulseScores || !theirs?.pulseScores) continue;
    const sums = PULSE_DIMENSION_KEYS.map((k) => ({ k, s: (mine.pulseScores?.[k] ?? 0) + (theirs.pulseScores?.[k] ?? 0) }));
    const top = Math.max(...sums.map((x) => x.s));
    const winners = sums.filter((x) => x.s === top);
    if (winners.length !== 1 || top === 0) continue; // ties are unfair to quiz
    const correct = PULSE_LABEL[winners[0].k];
    const others = seededPick(sums.filter((x) => x.s !== top).map((x) => PULSE_LABEL[x.k]), 3, `${ctx.seed}::su::${wk.weekId}`);
    if (others.length < 3) continue;
    out.push(withShuffledOptions(
      { id: `sunday:${wk.weekId}`, source: 'sunday', prompt: `Which did you both rate highest the week of ${dateLabel(weekIdToMonday(wk.weekId).getTime())}?` },
      correct, others, ctx.seed,
    ));
  }
  return out;
}

async function fromFantasyWishes(ctx: Ctx): Promise<MemoryQuestion[]> {
  const snap = await getDocs(collection(db, 'couples', ctx.coupleId, 'fantasyWishes'));
  const matches = snap.docs
    .map((d) => d.data() as { text: string; matchedAt?: number })
    .filter((m) => m.text && typeof m.matchedAt === 'number')
    .sort((a, b) => a.matchedAt! - b.matchedAt!);
  if (matches.length < 4) return [];
  // Up to three 4-sets; the earliest in each set is the answer.
  const out: MemoryQuestion[] = [];
  for (let n = 0; n < 3; n++) {
    const set = seededPick(matches, 4, `${ctx.seed}::fw::${n}`);
    if (set.length < 4) break;
    const first = set.reduce((a, b) => (a.matchedAt! < b.matchedAt! ? a : b));
    out.push(withShuffledOptions(
      { id: `fw:${n}:${first.matchedAt}`, source: 'fw', prompt: 'Which of these did you match on first in Fantasy Wishes?' },
      clip(first.text), set.filter((s) => s !== first).map((s) => clip(s.text)), ctx.seed,
    ));
  }
  return out;
}

// ─── Selection ───────────────────────────────────────────────────────────

async function generateQuestions(ctx: Ctx): Promise<MemoryQuestion[]> {
  const settled = await Promise.allSettled([
    fromMoments(ctx), fromDaily(ctx), fromMoods(ctx), fromMilestones(ctx), fromSunday(ctx), fromFantasyWishes(ctx),
  ]);
  const pool = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  if (pool.length < MIN_TO_PLAY) return [];
  const shuffled = seededShuffle(pool, ctx.seed);
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

// Creates this week's doc if missing. Generation reads ~6 collections,
// so it runs BEFORE the transaction and the transaction only guards the
// create. Second opener finds the doc and returns without generating.
export async function ensureMemoryLaneWeek(
  coupleId: string,
  weekId: string,
  uid: string,
  partnerUid: string,
  partnerName: string,
): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'memoryLane', weekId);
  const questions = await generateQuestions({ coupleId, uid, partnerUid, partnerName, seed: `${weekId}::${coupleId}` });
  const fresh: MemoryLaneDoc = { weekId, generatedAt: Date.now(), generatedBy: uid, questions, answers: {}, completedAt: {} };
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
  if (!d) return { correct: 0, answered: 0, total: 0 };
  const mine = d.answers?.[uid] ?? {};
  let correct = 0;
  let answered = 0;
  d.questions.forEach((q, i) => {
    const a = mine[String(i)];
    if (typeof a === 'number') {
      answered++;
      if (a === q.correctIndex) correct++;
    }
  });
  return { correct, answered, total: d.questions.length };
}
