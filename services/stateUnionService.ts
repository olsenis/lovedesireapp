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
  deleteField,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './statsService';
import { markFirstRitualIfUnset } from './coupleService';
import { excludeRecent } from './seed';

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
  // Set 0: the original baseline (do not reorder)
  [
    'What went well between us this week?',
    'What was hard for you this week?',
    'What is one thing you appreciated about me this week?',
    'What is one thing you would love more of from me?',
    'What are you looking forward to doing together?',
  ],
  // Set 1: care and needs
  [
    'What did I do this week that made you feel loved?',
    'What did you need this week but did not ask for?',
    'When did I really listen to you this week?',
    'What would make next week easier for you?',
    'What is one small thing I can do for you tomorrow?',
  ],
  // Set 2: growth
  [
    'What has been on your mind this week that you have not mentioned?',
    'What did we handle well as a team this week?',
    'What did you do this week that you are proud of?',
    'What is one thing you want us to do differently next week?',
    'What do you hope we are doing a year from now?',
  ],
  // Set 3: attention and rhythm
  [
    'When did we laugh together this week?',
    'Is there something from this week we should talk about but have not?',
    'What moment from this week do you want to remember?',
    'What do you wish I paid more attention to?',
    'What is going well for us right now that we should celebrate?',
  ],
  // Set 4: making up and being gentle
  [
    'When did you need a hug or a kind word this week?',
    'What did I say or do this week that you kept thinking about?',
    'Is there something from this week you would like us to talk through?',
    'How can we be gentler with each other next week?',
    'What is one thing you love about being with me?',
  ],
  // Set 5: rest and pace
  [
    'Was this week too fast, too slow, or about right for you?',
    'When were you most tired this week?',
    'Was there a moment this week when I helped you slow down?',
    'What would help you rest more next week?',
    'What small thing makes you feel properly rested?',
  ],
  // Set 6: sharing the chores
  [
    'What did one of us do this week that nobody said thank you for?',
    'What have you been taking care of alone without mentioning it?',
    'What is one thing I take care of that helps you the most?',
    'What is one chore we could share differently next week?',
    'What boring chore do you secretly enjoy?',
  ],
  // Set 7: money together
  [
    'What did we spend money on this week that was worth it?',
    'What is a money worry you have kept to yourself?',
    'When did I make you feel calmer about money lately?',
    'What would you be excited for us to save for?',
    'What small treat would make you happy right now?',
  ],
  // Set 8: friends
  [
    'Which friend or relative did you enjoy talking to this week?',
    'Which friend have you been missing lately?',
    'Which of my friends do you like spending time with?',
    'Who would you like us to see more of next month?',
    'Which friend of ours always makes you laugh?',
  ],
  // Set 9: family
  [
    'Did anything with your family take up your thoughts this week?',
    'What did you do this week that reminded you of someone in your family?',
    'What do you like about how I am with my family?',
    'What would you like us to do differently around family soon?',
    'What tradition from your family do you love having in our home?',
  ],
  // Set 10: big changes coming
  [
    'What change in our life have you been thinking about this week?',
    'What are you most unsure about right now?',
    'What did I say that made a coming change feel easier?',
    'What would you like to have decided before it happens?',
    'What are you most looking forward to once it is done?',
  ],
  // Set 11: since we met
  [
    'What did we do this week that felt like when we first met?',
    'What is something you used to do a lot that you miss doing?',
    'What is something I do now that surprised you when it started?',
    'What is one thing you would like us to start doing together?',
    'What is one thing about us that has never changed?',
  ],
  // Set 12: time alone and time together
  [
    'When was it good just to have me in the room this week?',
    'Was there a moment this week when you felt lonely, even with me nearby?',
    'What kind of time alone have you been needing lately?',
    'How could we get both time alone and time together next week?',
    'What is your favorite way for us to be quiet in the same room?',
  ],
  // Set 13: what we say and what we mean
  [
    'When did I understand you this week without you having to explain?',
    'Was there a time this week when I did not understand what you meant?',
    'What did you almost say this week but did not?',
    'What would make it easier to tell me something difficult next week?',
    'What word or phrase of ours would nobody else understand?',
  ],
  // Set 14: worries
  [
    'What small thing made you nervous this week?',
    'What is a worry you have not told me about yet?',
    'What could I say this week that would help you worry less?',
    'What is one worry you would like help with next week?',
    'When do you feel safest with me?',
  ],
  // Set 15: hope for us
  [
    'What happened this week that made you excited about our future?',
    'What is a hope for us that you have not said out loud yet?',
    'What do I do that makes you believe in our plans?',
    'What would you love us to try in the next few months?',
    'What is the best thing about us right now?',
  ],
  // Set 16: play and silliness
  [
    'What made you laugh hardest with me this week?',
    'When did you feel most playful this week, even on your own?',
    'What silly thing do I do that you love?',
    'What is one silly thing we could do together this weekend?',
    'What is our best inside joke right now?',
  ],
  // Set 17: body and health
  [
    'How has your body felt this week?',
    'What is your body telling you that you have been ignoring?',
    'How do I take care of you when you are tired or unwell?',
    'What is one small thing you could do next week to feel better physically?',
    'What cozy thing do we do together that you love?',
  ],
  // Set 18: goals and dreams
  [
    'What did you get done this week that you are proud of?',
    'What goal have you been quiet about lately?',
    'What are you hoping I succeed at right now?',
    'What is one goal you would like my help with next?',
    'What dream of yours makes you happy just thinking about it?',
  ],
  // Set 19: our habits
  [
    'Which habit of ours felt especially good this week?',
    'What good habit of yours have you been skipping lately?',
    'What small thing do I do every day that you would miss most?',
    'What is a new habit you would love us to start?',
    'What is your favorite tiny thing we always do together?',
  ],
  // Set 20: the little things
  [
    'What small thing this week made you feel loved?',
    'What small thing did you do for yourself this week that helped?',
    'What is one small thing I do that always makes you feel good?',
    'What small thing could I do for you next week?',
    'What tiny detail about us right now do you love?',
  ],
  // Set 21: being noticed
  [
    'When did I notice something about you this week that others missed?',
    'Where have you felt overlooked lately, even outside of us?',
    'What is one thing you wish I noticed more?',
    'What could I ask you about more often?',
    'What is one thing about you that I understand and most people do not?',
  ],
  // Set 22: giving way
  [
    'When did one of us give way or adjust for the other this week?',
    'Is there something you keep going along with that you have not mentioned?',
    'When did I change my plans for you lately?',
    'What is one thing you would like to give way on less often?',
    'What do we agree on so easily that it feels lucky?',
  ],
  // Set 23: home
  [
    'What made our home feel like home this week?',
    'Where else besides here do you feel most at home?',
    'What do I do that makes you feel at home?',
    'What small change to our home would feel good?',
    'What is your favorite corner of our home right now?',
  ],
  // Set 24: after a disagreement
  [
    'Did we have a disagreement this week that ended well?',
    'Is there something you are still upset about that you would like to be done with?',
    'What is one thing I could say that would help us move on?',
    'What is one thing you would like us to stop doing next week?',
    'What is one small way we are already good at making up?',
  ],
];

// Back-compat: legacy call sites still import STATE_UNION_QUESTIONS
// and expect the original 5. Keep the export as a shortcut to set 0
// so anything that hasn't migrated to getWeekQuestions() keeps working.
export const STATE_UNION_QUESTIONS: string[] = STATE_UNION_QUESTION_SETS[0];

// Depth of each set, by index (Sep 2026). 1 = light and warm, 2 = the
// middle, 3 = the heavy ones (repair, fear, money, family, feeling unseen).
// A couple's first check-ins come from tier 1 only; the heavy sets wait
// until the ritual is a habit. Review mining: couples leave when an app
// gets heavy before it has earned it. A new set MUST get a tier here. Tier 0 = retired: never picked, kept only
// so old weeks still render in History.
//
// THE BAR for every question (Sep 19 2026, after Óli met "When has my
// flexibility felt like love to you?" and asked what it was for):
//   1. Ten seconds, one memory: answerable with a moment, a thing, a place or
//      a person, never a self-analysis.
//   2. The answer tells the partner something new.
//   3. A friend could ask it: no therapy words, no abstractions as subjects
//      (flexibility, patterns, presence, versions of yourself), no idioms.
// Voice: the partner is asking. "you" answers, "I" / "me" reads the answer.
// Tiers 1 and 2 hold at most one hard question per set and never in slot 1;
// every set closes light. The pool was rewritten in place while pre-launch.
// AFTER LAUNCH a question whose meaning changes ships as a NEW set and the
// old set goes to tier 0; editing in place would relabel real answers.
export const STATE_UNION_SET_TIER: (0 | 1 | 2 | 3)[] = [
  1, // 0  the original baseline (do not reorder)
  2, // 1  care and needs
  2, // 2  growth
  2, // 3  attention and rhythm
  3, // 4  making up and being gentle
  1, // 5  rest and pace
  2, // 6  sharing the chores
  3, // 7  money together
  1, // 8  friends
  2, // 9  family
  2, // 10  big changes coming
  2, // 11  since we met
  3, // 12  time alone and time together
  3, // 13  what we say and what we mean
  3, // 14  worries
  2, // 15  hope for us
  1, // 16  play and silliness
  2, // 17  body and health
  2, // 18  goals and dreams
  1, // 19  our habits
  1, // 20  the little things
  3, // 21  being noticed
  2, // 22  giving way
  1, // 23  home
  3, // 24  after a disagreement
];
// Check-ins 1 to 3: tier 1 only. 4 to 8: tiers 1 and 2. From 9: everything.
export const SUNDAY_LIGHT_WEEKS = 3;
export const SUNDAY_MIDDLE_WEEKS = 8;

// Deterministic per-couple-per-week set picker: both partners compute the
// same set from the same inputs, and the result is frozen on the week doc.
// `history` = the questionSetIds of the couple's EARLIER check-in weeks,
// oldest first. It decides how deep this week may go (by count, so a couple
// that skips weeks is not pushed ahead) and keeps recently used sets out
// (the window shrinks until something is left, like Daily's no-repeat).
export function pickWeeklyQuestionSet(weekId: string, coupleId: string, history: number[] = []): number {
  const n = history.length + 1;
  const maxTier = n <= SUNDAY_LIGHT_WEEKS ? 1 : n <= SUNDAY_MIDDLE_WEEKS ? 2 : 3;
  const allowed = STATE_UNION_QUESTION_SETS
    .map((_, i) => i)
    .filter((i) => { const t = STATE_UNION_SET_TIER[i] ?? 2; return t >= 1 && t <= maxTier; });
  const recent = [...history].reverse().map((id) => [String(id)]);
  const pool = excludeRecent(allowed, (i) => String(i), recent, 1);
  const seed = `${weekId}::${coupleId}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length] ?? 0;
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
  // Predictions (Sep 2026). Optional final step of the check-in: up to
  // three predictions about the partner for the coming week.
  //
  // Grading lives on the SAME week: on week W, `verdictsOnPartner` on my
  // entry holds my verdicts (index -> came true) on the partner's week-W
  // `predictions`. Everything about week W stays in week W, so a skipped
  // week does not orphan anything (Review #11 B6): the grading screen
  // looks back up to three weeks for the newest both-completed week that
  // still has ungraded partner predictions. Both fields live on the entry,
  // never the parent doc, so they inherit the owner-write /
  // read-after-both-complete rules with no rules change. Owner-write has
  // no week restriction, which is what lets a later week grade an
  // earlier one.
  predictions?: string[];
  verdictsOnPartner?: Record<string, boolean>;
  // My heart / one line on the PARTNER's answer to question qi (Sep 2026,
  // USER_VOICE C2). On my entry, so it inherits owner-write and the
  // read-after-both-complete gate: the partner sees it exactly when the
  // reveal is open. Never on the parent doc.
  reactionsOnPartner?: Record<string, true>;
  repliesOnPartner?: Record<string, string>;
  updatedAt: number;
}

export const PULSE_DIMENSION_KEYS = ['fun', 'communication', 'closeness', 'sex', 'teamwork'] as const;
export type PulseDimensionKey = typeof PULSE_DIMENSION_KEYS[number];
export const MAX_PREDICTIONS = 3;

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
    // Earlier weeks decide how deep this one may go and which sets to skip.
    // One read per new week; ids are zero-padded YYYY-WW, so they sort.
    let history: number[] = [];
    try {
      const all = await getDocs(collection(db, 'couples', coupleId, 'stateUnion'));
      history = all.docs
        .filter((d) => d.id < weekId)
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map((d) => (d.data() as StateUnionDoc).questionSetId ?? 0);
    } catch {
      // No history readable: treated as a first check-in, which is the safe side.
    }
    const questionSetId = pickWeeklyQuestionSet(weekId, coupleId, history);
    await setDoc(ref, { weekId, startedAt: Date.now(), completedAt: {}, answeredCount: {}, questionSetId });
    // Retention analytics — fires when a week's stateUnion doc is
    // newly created (i.e. the couple has started the check-in for
    // this week). Paired with sunday_checkin_submitted so completion
    // rate = submitted / started.
    trackEvent('sunday_checkin_started');
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
  // Retention funnel — first_ritual_completed fires exactly once per
  // couple, first time any ritual is done. Idempotent (transaction
  // inside markFirstRitualIfUnset).
  markFirstRitualIfUnset(coupleId);
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

// ISO week id `weeksBack` weeks before `d`. getCurrentWeekId handles the
// year boundary, so this is safe on week 1.
export function getPreviousWeekId(d: Date = new Date(), weeksBack = 1): string {
  return getCurrentWeekId(new Date(d.getTime() - weeksBack * 7 * 86400000));
}

// A heart / one line on the partner's answer (USER_VOICE C2). Nested
// merge so other keys of the map survive; deleteField inside a merge
// removes just this qi.
export async function reactOnPartnerAnswer(coupleId: string, weekId: string, uid: string, qi: number, on: boolean): Promise<void> {
  const entryRef = doc(db, 'couples', coupleId, 'stateUnion', weekId, 'entries', uid);
  await setDoc(entryRef, { reactionsOnPartner: { [String(qi)]: on ? true : deleteField() }, updatedAt: Date.now() }, { merge: true });
  if (on) trackEvent('reaction_sent');
}

export async function replyOnPartnerAnswer(coupleId: string, weekId: string, uid: string, qi: number, text: string): Promise<void> {
  const clean = text.trim().slice(0, 200);
  const entryRef = doc(db, 'couples', coupleId, 'stateUnion', weekId, 'entries', uid);
  await setDoc(entryRef, { repliesOnPartner: { [String(qi)]: clean ? clean : deleteField() }, updatedAt: Date.now() }, { merge: true });
  if (clean) trackEvent('reply_sent');
}

// How far back the grading screen looks for ungraded partner predictions.
export const PREDICTION_LOOKBACK_WEEKS = 3;

// Whole-array write: predictions are authored once at the end of the
// check-in, never edited piecemeal, so no dotted-path merge needed.
export async function submitPredictions(
  coupleId: string,
  weekId: string,
  uid: string,
  predictions: string[],
): Promise<void> {
  const clean = predictions.map((p) => p.trim()).filter(Boolean).slice(0, MAX_PREDICTIONS);
  if (clean.length === 0) return;
  const entryRef = doc(db, 'couples', coupleId, 'stateUnion', weekId, 'entries', uid);
  await setDoc(entryRef, { predictions: clean, updatedAt: Date.now() }, { merge: true });
  trackEvent('sunday_predictions_added');
}

// Grades the PARTNER's predictions from week `targetWeekId`. Stored on MY
// entry for that same week, keyed by the prediction index. Full map each
// time. Writing an older week's entry is allowed: entries are owner-write
// with no week restriction.
export async function submitVerdictsOnPartner(
  coupleId: string,
  targetWeekId: string,
  uid: string,
  verdicts: Record<string, boolean>,
): Promise<void> {
  const entryRef = doc(db, 'couples', coupleId, 'stateUnion', targetWeekId, 'entries', uid);
  await setDoc(entryRef, { verdictsOnPartner: verdicts, updatedAt: Date.now() }, { merge: true });
  trackEvent('sunday_predictions_graded');
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
