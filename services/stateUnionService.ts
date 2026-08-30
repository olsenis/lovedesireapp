import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

// Sunday Check-in question pool. Each set is 5 questions, one week per
// set. A deterministic per-couple picker (see pickWeeklyQuestionSet) means
// both partners see the same set each week, and the choice is stable
// across sessions. Aug 2026: expanded from a single hardcoded set of 5
// so the ritual doesn't stagnate at week 3-4 with repetition.
//
// Set 0 is the original 5. Legacy docs without a `questionSetId` field
// fall back to set 0, so pre-migration weeks render exactly as before.
// New sets append at the tail — never reorder existing sets, or a
// historical doc's questionSetId would map to different questions.
export const STATE_UNION_QUESTION_SETS: string[][] = [
  // Set 0 — the original Gottman-inspired baseline (do not reorder)
  [
    'What went well between us this week?',
    'What was hard for you this week?',
    "What's one thing I appreciate about you?",
    "What's one thing I'd love more of from you?",
    'What are we looking forward to together?',
  ],
  // Set 1 — care & needs
  [
    'What was one thing I did this week that felt like love to you?',
    "What is something you needed but didn't ask for?",
    'When did you feel most seen by me this week?',
    'What would make next week feel gentler for you?',
    'What is one small thing I can do for you tomorrow?',
  ],
  // Set 2 — growth & carrying
  [
    'What have you been carrying quietly this week?',
    'Where did we handle something well as a team?',
    "What is something you're proud of yourself for?",
    'What is one thing you want us to try differently next week?',
    'What are you looking forward to about the version of us a year from now?',
  ],
  // Set 3 — attention & rhythm
  [
    'When did we laugh together this week?',
    "What has felt off between us that we haven't named yet?",
    "What is one moment from this week you'd want to remember?",
    'What would you love more attention from me on?',
    'What is something you want to celebrate about us right now?',
  ],
  // Set 4 — repair & tenderness
  [
    'What is a moment this week where you needed reassurance?',
    'What is something I did that stayed with you, good or hard?',
    "What would feel like repair for something that's lingered?",
    'What is a way we can be tender with each other next week?',
    'What is one thing you love about being in this with me?',
  ],
  // Set 5 — rest & pace
  [
    'How did the pace of this week feel to you?',
    'When did you feel most depleted this week?',
    'Was there a moment I helped you slow down?',
    'What would help you feel more rested next week?',
    'What small comfort feels like real rest to you?',
  ],
  // Set 6 — sharing life admin
  [
    'What kept us running smoothly this week without anyone thanking it?',
    'What piece of life admin have you been quietly holding?',
    'What is one thing I take off your plate that helps most?',
    'What is one small task we could hand off differently next week?',
    'What is a boring shared chore you secretly enjoy?',
  ],
  // Set 7 — money together
  [
    'What did we spend money on this week that felt worth it?',
    'What is a money worry you have been carrying quietly?',
    'When have I made you feel safer about money lately?',
    'What is one thing we could save toward that would excite you?',
    'What is a small money treat that would feel like love right now?',
  ],
  // Set 8 — friendship outside the couple
  [
    'Who outside our couple did you feel connected to this week?',
    'What friendship of yours have you been missing lately?',
    'What is one friendship of mine you have noticed matters to me?',
    'Who would you love to make more time for next month?',
    'What friend of ours makes you laugh every time?',
  ],
  // Set 9 — family, chosen or given
  [
    'How has your family felt on your mind this week?',
    'What is one family pattern you have been noticing in yourself lately?',
    'What is one thing you love about how I am with my family?',
    'What would you love us to do differently around family soon?',
    'What small tradition from your family do you love bringing into ours?',
  ],
  // Set 10 — big changes on the horizon
  [
    'What big change have you been thinking about this week?',
    'What feels most uncertain to you right now?',
    'What is something I have said that made a coming change feel doable?',
    'What is one thing you would love to nail down before it arrives?',
    'What are you most looking forward to on the other side of it?',
  ],
  // Set 11 — what has changed since we met
  [
    'What did we do this week that reminded you of our early days?',
    'What version of yourself from years ago do you miss?',
    'What have I grown into that you did not see coming?',
    'What is a version of us you would love to grow toward?',
    'What is one thing about us that has never changed?',
  ],
  // Set 12 — being alone vs being together
  [
    'When did you feel most alone this week, even if we were near?',
    'What is a kind of alone time you have been quietly needing?',
    'When has my presence felt most restorative to you lately?',
    'How could we balance alone and together better this week?',
    'What is your favorite way to be quiet in the same room?',
  ],
  // Set 13 — what we say vs what we mean
  [
    'When this week did I not quite hear what you were really saying?',
    'What is something you almost said this week but held back?',
    'When have I picked up on what you meant without you spelling it out?',
    'What would help you say something hard next week?',
    'What phrase between us has become a shorthand only we understand?',
  ],
  // Set 14 — fear and reassurance
  [
    'What was one small thing this week that made you anxious?',
    'What fear have you been carrying that you have not put into words?',
    'What is one way I could reassure you that would actually land?',
    'What is one worry you would love to hand off next week?',
    'When do you feel safest with me?',
  ],
  // Set 15 — hope for us
  [
    'What happened this week that made the future feel closer?',
    'What is a hope for us you have not said out loud yet?',
    'What is something I do that makes the future feel possible to you?',
    'What is one thing you would love us to try in the next few months?',
    'What are you hopeful about between us right now?',
  ],
  // Set 16 — play and silliness
  [
    'What made you laugh with me hardest this week?',
    'When did you feel most playful with yourself this week?',
    'What is something silly I do that you love?',
    'What is one silly thing we could do together this weekend?',
    'What is our best inside joke right now?',
  ],
  // Set 17 — body and health
  [
    'How has your body felt this week?',
    'What is one thing you have been ignoring physically that you should not?',
    'What is one way I take care of you that your body notices?',
    'What is one small thing you could do next week to feel better in your body?',
    'What is a physical comfort we share that you love?',
  ],
  // Set 18 — ambition and drive
  [
    'What are you proud of pushing forward this week?',
    'What ambition have you been quiet about lately?',
    'What are you rooting for me on right now?',
    'What is one goal you would love my support with next?',
    'What is one dream of yours that lights you up when you think about it?',
  ],
  // Set 19 — rituals we have built
  [
    'What ritual of ours felt especially good this week?',
    'What is a habit of your own that has been slipping lately?',
    'What is one small thing I do daily that you would miss most?',
    'What is a new ritual you would love us to try?',
    'What is your favorite tiny thing we always do together?',
  ],
  // Set 20 — the little things
  [
    'What small thing this week made you feel loved?',
    'What is a tiny thing you did for yourself this week that helped?',
    'What is one small gesture from me that always lands?',
    'What small kindness could I offer you next week?',
    'What is a tiny detail about us right now that you love?',
  ],
  // Set 21 — being seen
  [
    'When this week did you feel most seen by me?',
    'Where have you been feeling invisible lately, even outside of us?',
    'What is one thing you wish I noticed more?',
    'What would help you feel more seen next week?',
    'What is one part of you I get right that others miss?',
  ],
  // Set 22 — compromise
  [
    'Where did one of us bend for the other this week?',
    'What is one compromise you have been quietly holding?',
    'When has my flexibility felt like love to you?',
    'What is one thing you would love to compromise less on soon?',
    'What is one thing we agree on so easily it feels lucky?',
  ],
  // Set 23 — what home means
  [
    'What made our home feel like home this week?',
    'Where else besides here do you feel most at home?',
    'What is one thing about me that feels like coming home?',
    'What is one small change to our home that would feel good?',
    'What is your favorite corner of our space right now?',
  ],
  // Set 24 — repair
  [
    'What small moment from this week could use a soft word between us?',
    'What have you been holding onto that you would love to put down?',
    'What is one thing I could say that would help something land right?',
    'What is one thing you would love us to leave behind next week?',
    'What is one small way we already repair things well?',
  ],
];

// Back-compat: legacy call sites still import STATE_UNION_QUESTIONS
// and expect the original 5. Keep the export as a shortcut to set 0
// so anything that hasn't migrated to getWeekQuestions() keeps working.
export const STATE_UNION_QUESTIONS: string[] = STATE_UNION_QUESTION_SETS[0];

// Deterministic per-couple-per-week set picker. Same shuffle-hash pattern
// used by daily-questions (services/dailyQuestionsService.ts): both
// partners see the same set on a given week, and the choice never drifts.
// Returns an index into STATE_UNION_QUESTION_SETS.
export function pickWeeklyQuestionSet(weekId: string, coupleId: string): number {
  const seed = `${weekId}::${coupleId}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % STATE_UNION_QUESTION_SETS.length;
  return idx;
}

// Resolve the 5 questions for a specific week's doc. Uses the doc's
// stored questionSetId when present (any week written after the Aug 2026
// rotation ship). Legacy docs without the field fall back to set 0 —
// the same 5 they were originally answered against.
export function getWeekQuestions(suDoc: StateUnionDoc | null): string[] {
  const idx = suDoc?.questionSetId ?? 0;
  return STATE_UNION_QUESTION_SETS[idx] ?? STATE_UNION_QUESTION_SETS[0];
}

// Parent doc — both partners can always read this. Tracks completion only.
export interface StateUnionDoc {
  weekId: string;
  startedAt: number;
  // completedAt is the gate — until BOTH uids have a timestamp here,
  // each partner's entries subdoc is hidden from the other (firestore rules).
  completedAt?: Record<string, number>;
  // Optional progress counter so the partner can see "they're answering"
  // without seeing the answers themselves.
  answeredCount?: Record<string, number>;
  // Which question set was drawn for this week. Assigned on doc creation
  // via pickWeeklyQuestionSet (deterministic per weekId + coupleId).
  // Legacy docs without this field render set 0 (the original 5) so
  // historical answers stay aligned with their questions.
  questionSetId?: number;
}

// Per-user entries subdoc — readable by owner always, by partner only after both completed.
export interface StateUnionEntry {
  answers: Record<string, string>; // questionIndex -> answer text
  // Added Aug 2026 when standalone /pulse was merged into Sunday Check-in.
  // 5 dimensions, 1-5 each. Optional so weeks predating the merge still
  // render — reveal card only shows the pulse comparison block when BOTH
  // entries carry pulseScores. Same rules-gated privacy as answers.
  pulseScores?: {
    fun?: number;
    communication?: number;
    closeness?: number;
    sex?: number;
    teamwork?: number;
  };
  updatedAt: number;
}

export const PULSE_DIMENSION_KEYS = ['fun', 'communication', 'closeness', 'sex', 'teamwork'] as const;
export type PulseDimensionKey = typeof PULSE_DIMENSION_KEYS[number];

export function getCurrentWeekId(d: Date = new Date()): string {
  // ISO 8601 week number, YYYY-WW
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-${String(weekNum).padStart(2, '0')}`;
}

// Parent metadata subscription — always allowed.
export function subscribeStateUnion(
  coupleId: string,
  weekId: string,
  onChange: (doc: StateUnionDoc | null) => void,
): Unsubscribe {
  const ref = doc(db, 'couples', coupleId, 'stateUnion', weekId);
  return onSnapshot(ref, (snap) => {
    onChange(snap.exists() ? (snap.data() as StateUnionDoc) : null);
  });
}

// Subscribe to a SPECIFIC user's entries doc. Firestore will return an error
// if the requester isn't allowed (i.e. partner trying to read partner's draft
// before both have completed). The caller should only subscribe to:
//   - their own (always allowed), OR
//   - partner's (only after bothCompleted is true).
export function subscribeStateUnionEntry(
  coupleId: string,
  weekId: string,
  uid: string,
  onChange: (entry: StateUnionEntry | null) => void,
): Unsubscribe {
  const ref = doc(db, 'couples', coupleId, 'stateUnion', weekId, 'entries', uid);
  return onSnapshot(
    ref,
    (snap) => onChange(snap.exists() ? (snap.data() as StateUnionEntry) : null),
    () => onChange(null), // permission-denied is expected before both completed
  );
}

// One-shot fetch of a user's entries doc — used by the history view when the
// user expands a past week. Returns null if not found or permission denied.
export async function getStateUnionEntry(
  coupleId: string,
  weekId: string,
  uid: string,
): Promise<StateUnionEntry | null> {
  try {
    const snap = await getDoc(doc(db, 'couples', coupleId, 'stateUnion', weekId, 'entries', uid));
    return snap.exists() ? (snap.data() as StateUnionEntry) : null;
  } catch {
    return null;
  }
}

export async function ensureStateUnionDoc(coupleId: string, weekId: string): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'stateUnion', weekId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const questionSetId = pickWeeklyQuestionSet(weekId, coupleId);
    await setDoc(ref, { weekId, startedAt: Date.now(), completedAt: {}, answeredCount: {}, questionSetId });
  }
}

export async function submitStateUnionAnswer(
  coupleId: string,
  weekId: string,
  uid: string,
  questionIndex: number,
  answer: string,
): Promise<void> {
  // Write the answer to the user's own entries doc — Firestore rules prevent
  // partner from reading this until both have completed.
  // NOTE: setDoc({merge: true}) treats dot-notation keys as literal field names
  // (unlike updateDoc which parses them as field paths). Use a nested object so
  // merge deep-merges into `answers` instead of creating a literal 'answers.0'
  // top-level field. Downstream code reads `data.answers[i]` and would see
  // `undefined` on every read otherwise.
  const entryRef = doc(db, 'couples', coupleId, 'stateUnion', weekId, 'entries', uid);
  await setDoc(
    entryRef,
    {
      answers: { [questionIndex]: answer },
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  // Mirror the progress count on the parent doc so the partner can see
  // "they've answered N/5" without seeing the answer text itself.
  const parentRef = doc(db, 'couples', coupleId, 'stateUnion', weekId);
  const entrySnap = await getDoc(entryRef);
  const count = entrySnap.exists()
    ? Object.values(((entrySnap.data() as StateUnionEntry).answers ?? {}))
        .filter((s) => s && s.trim().length > 0).length
    : 0;
  await updateDoc(parentRef, { [`answeredCount.${uid}`]: count });
}

// One-shot write of the 5 pulse dimensions to the caller's own entries doc.
// Same setDoc({merge:true}) + nested-object pattern as submitStateUnionAnswer
// to avoid the dot-notation-literal-key gotcha. All 5 batched — pulse UX
// asks user to fill all before advancing, so single write is the right shape.
export async function submitStateUnionPulse(
  coupleId: string,
  weekId: string,
  uid: string,
  scores: Record<PulseDimensionKey, number>,
): Promise<void> {
  const entryRef = doc(db, 'couples', coupleId, 'stateUnion', weekId, 'entries', uid);
  await setDoc(
    entryRef,
    {
      pulseScores: scores,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function markStateUnionCompleted(
  coupleId: string,
  weekId: string,
  uid: string,
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'stateUnion', weekId), {
    [`completedAt.${uid}`]: Date.now(),
  });
}

export function answeredCount(suDoc: StateUnionDoc | null, uid: string): number {
  if (!suDoc) return 0;
  return suDoc.answeredCount?.[uid] ?? 0;
}

export function hasUserCompleted(suDoc: StateUnionDoc | null, uid: string): boolean {
  if (!suDoc) return false;
  return !!suDoc.completedAt?.[uid];
}

export function bothCompleted(suDoc: StateUnionDoc | null, uid1: string, uid2: string): boolean {
  return hasUserCompleted(suDoc, uid1) && hasUserCompleted(suDoc, uid2);
}

// Lifetime count of weeks where both partners have a completedAt
// timestamp on the parent stateUnion doc. Used by the Our Story
// matches archive so the couple can see how many Sunday reflections
// they have stacked up together over the whole life of the relationship
// (subscribeStateUnionHistory only surfaces the most recent 12).
export async function getCompletedSundayCount(
  coupleId: string,
  uid1: string,
  uid2: string,
): Promise<number> {
  const snap = await getDocs(collection(db, 'couples', coupleId, 'stateUnion'));
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data() as StateUnionDoc;
    if (data.completedAt?.[uid1] && data.completedAt?.[uid2]) count++;
  }
  return count;
}

// Lifetime list of every completed Sunday Check-in week. Same one-shot
// scan as the count helper but returns the parent docs so the Our
// Story archive modal can render a browsable history and tap into
// individual weeks' reveals (per-user entries fetched on demand via
// getStateUnionEntry). Sorted newest first via startedAt.
export async function getAllCompletedSundayWeeks(
  coupleId: string,
  uid1: string,
  uid2: string,
): Promise<StateUnionDoc[]> {
  const snap = await getDocs(collection(db, 'couples', coupleId, 'stateUnion'));
  const rows: StateUnionDoc[] = [];
  for (const d of snap.docs) {
    const data = d.data() as StateUnionDoc;
    if (data.completedAt?.[uid1] && data.completedAt?.[uid2]) rows.push(data);
  }
  return rows.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
}

export function subscribeStateUnionHistory(
  coupleId: string,
  onChange: (history: StateUnionDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'couples', coupleId, 'stateUnion'),
    orderBy('startedAt', 'desc'),
    limit(12),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => d.data() as StateUnionDoc));
  });
}
