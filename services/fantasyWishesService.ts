import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, deleteField, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './statsService';
import { FANTASY_WISHES_PRESETS, FW_CATEGORY_ORDER, FantasyWishesCategory } from '../constants/content';
import { hashString } from './seed';

// ─── Storage model (Sep 19 2026) ─────────────────────────────────────────────
// Fantasy Wishes is stored like Daily: the CONTENT lives in the app
// (FANTASY_WISHES_PRESETS) and Firestore holds only what the couple did.
//
//   couples/{id}/fwState/main        one doc per couple, see FWState
//   couples/{id}/fantasyWishes/{id}  couple-written wishes only (text, createdBy)
//
// Until this date every preset was COPIED into each couple's collection (394
// docs) with votes on each doc. That meant a loading screen for a new couple,
// 394 reads on every open of Home / Our Story / this screen, and no way for a
// couple that had started to ever receive new or corrected presets. Now a new
// couple sees the first card at once, every open is one read, and the deck is
// simply "the app's list minus what I have voted on".
//
// A preset is addressed by a fixed id derived from its text. Rewording a
// preset therefore makes it a new card; a match keeps the text it was made
// with (FWState.matched snapshots it), so nothing is ever orphaned.
//
// Privacy, unchanged and deliberate to state: both partners' votes sit in a
// doc both can read, so "double-blind" is a promise of the UI, not of the
// database. Making it cryptographically true needs private per-user vote docs
// and a server function that computes matches (POST_LAUNCH).

export type FWVote = 'yes' | 'maybe' | 'no';

// Every per-person map is keyed by uid at the TOP level, so the per-uid rules
// guard (own key only) applies exactly as it does to Daily's answers.
export interface FWState {
  votes?: Record<string, Record<string, FWVote>>;          // uid -> itemId -> vote
  matched?: Record<string, { at: number; text: string }>;  // itemId -> when, and the text it was matched with
  addToList?: Record<string, Record<string, true>>;        // uid -> itemId
  reactions?: Record<string, Record<string, true>>;        // uid -> itemId   (C2)
  replies?: Record<string, Record<string, string>>;        // uid -> itemId -> one line (C2)
  replyAt?: Record<string, Record<string, number>>;        // uid -> itemId -> when first written (earlier reply shows on top)
}

export interface CustomWish {
  id: string;
  text: string;
  createdAt: number;
  createdBy?: string;
  // Present only on a LEGACY copied doc from before Sep 19 2026.
  votes?: unknown;
  category?: FantasyWishesCategory;
}

// The per-item view the screens render. Same shape as before the storage
// change, composed from the state doc instead of read from an item doc.
export interface FantasyWishesItem {
  id: string;
  text: string;
  votes: Record<string, FWVote>;
  addToList?: string[]; // uids who pressed "Add to Together List"
  createdAt: number;
  matchedAt?: number;
  category?: FantasyWishesCategory;
  level?: 1 | 2 | 3;   // intensity of a preset; drives the deck order, never shown
  reactions?: Record<string, true>;
  replies?: Record<string, string>;
  replyAt?: Record<string, number>;
  custom?: boolean;   // couple-written
  retired?: boolean;  // matched once, no longer in the pool: shown in Matches, never dealt
}

export const presetId = (text: string) => `preset-${hashString(text).toString(36)}`;

// Built once. `order` keeps the authored order inside a category.
const PRESET_INDEX = FANTASY_WISHES_PRESETS.map((p, order) => ({ id: presetId(p.text), text: p.text, category: p.category, level: p.level, order }));
const PRESET_BY_ID = new Map(PRESET_INDEX.map((p) => [p.id, p]));
const PRESET_TEXTS = new Set(FANTASY_WISHES_PRESETS.map((p) => p.text));

const stateRef = (coupleId: string) => doc(db, 'couples', coupleId, 'fwState', 'main');

function viewOf(id: string, base: { text: string; category?: FantasyWishesCategory; level?: 1 | 2 | 3; createdAt: number; custom?: boolean; retired?: boolean }, state: FWState): FantasyWishesItem {
  const votes: Record<string, FWVote> = {};
  for (const [u, m] of Object.entries(state.votes ?? {})) if (m?.[id]) votes[u] = m[id];
  const addToList = Object.entries(state.addToList ?? {}).filter(([, m]) => m?.[id]).map(([u]) => u);
  const reactions: Record<string, true> = {};
  for (const [u, m] of Object.entries(state.reactions ?? {})) if (m?.[id]) reactions[u] = true;
  const replies: Record<string, string> = {};
  for (const [u, m] of Object.entries(state.replies ?? {})) if (m?.[id]) replies[u] = m[id];
  const replyAt: Record<string, number> = {};
  for (const [u, m] of Object.entries(state.replyAt ?? {})) if (m?.[id]) replyAt[u] = m[id];
  return { id, ...base, votes, addToList, matchedAt: state.matched?.[id]?.at, reactions, replies, replyAt };
}

// Everything the Fantasy Wishes screen shows: the whole pool, the couple's own
// wishes, and any match whose card has since left the pool.
export function composeFWItems(state: FWState | null, customs: CustomWish[]): FantasyWishesItem[] {
  const s = state ?? {};
  const out: FantasyWishesItem[] = PRESET_INDEX.map((p) => viewOf(p.id, { text: p.text, category: p.category, level: p.level, createdAt: p.order }, s));
  const known = new Set(PRESET_INDEX.map((p) => p.id));
  for (const c of customs) {
    if (c.votes !== undefined) continue; // legacy copy, cleaned up by cleanupLegacyFantasyWishes
    known.add(c.id);
    out.push(viewOf(c.id, { text: c.text, createdAt: c.createdAt, custom: true }, s));
  }
  for (const [id, m] of Object.entries(s.matched ?? {})) {
    if (!known.has(id)) out.push(viewOf(id, { text: m.text, createdAt: m.at, retired: true }, s));
  }
  return out;
}

// ─── Deck order: starts gentle, mixes categories, builds (Sep 19 2026) ───────
// A RAMP, not strict waves. Each intensity level is spread over its own
// stretch of the deck and the stretches overlap, so the first twenty or so
// cards are all gentle, level 2 then starts to mix in, and level 3 only
// appears past the middle. (Strict waves put the first level-2 card at
// position 159 of 394: the old "fifty Sensual cards in a row" problem again.)
// Every (category, level) pile is spread EVENLY over its level's stretch, so
// the categories mix by themselves (longest run of one category: about 4).
//
// Deterministic from the content alone, on purpose: both partners get the
// same order, so they vote on the same cards the same evening and matches
// come early. No per-person shuffle, ever. Computed over whatever is passed
// in, so a category switched off in the ☰ sheet drops out and the ramp
// re-forms. Items without a level (couple-written) come last.
const LEVEL_SPAN: Record<1 | 2 | 3, [number, number]> = { 1: [0, 0.6], 2: [0.08, 0.9], 3: [0.5, 1] };

export function orderFWDeck(items: FantasyWishesItem[]): FantasyWishesItem[] {
  const catRank = (c?: FantasyWishesCategory) => (c ? FW_CATEGORY_ORDER.indexOf(c) : FW_CATEGORY_ORDER.length);
  const piles = new Map<string, FantasyWishesItem[]>();
  const tail: FantasyWishesItem[] = [];
  for (const it of [...items].sort((a, b) => a.createdAt - b.createdAt)) {
    if (!it.level) { tail.push(it); continue; }
    const key = `${it.category ?? ''}|${it.level}`;
    const pile = piles.get(key);
    if (pile) pile.push(it); else piles.set(key, [it]);
  }
  const scored: { pos: number; cat: number; order: number; item: FantasyWishesItem }[] = [];
  for (const pile of piles.values()) {
    pile.forEach((item, r) => {
      const [lo, hi] = LEVEL_SPAN[item.level as 1 | 2 | 3];
      scored.push({ pos: lo + ((r + 0.5) / pile.length) * (hi - lo), cat: catRank(item.category), order: item.createdAt, item });
    });
  }
  scored.sort((a, b) => a.pos - b.pos || a.cat - b.cat || a.order - b.order);
  return [...scored.map((x) => x.item), ...tail];
}

// For Home and Our Story: only the items the couple has touched, from ONE
// read. Text comes from the pool, or from the match snapshot.
function touchedItems(state: FWState | null): FantasyWishesItem[] {
  const s = state ?? {};
  const ids = new Set<string>(Object.keys(s.matched ?? {}));
  for (const m of Object.values(s.votes ?? {})) for (const id of Object.keys(m ?? {})) ids.add(id);
  return [...ids].map((id) => {
    const p = PRESET_BY_ID.get(id);
    return viewOf(id, { text: s.matched?.[id]?.text ?? p?.text ?? '', category: p?.category, createdAt: s.matched?.[id]?.at ?? p?.order ?? 0 }, s);
  });
}

export function subscribeFWState(coupleId: string, onChange: (state: FWState | null) => void): Unsubscribe {
  return onSnapshot(stateRef(coupleId), (snap) => onChange(snap.exists() ? (snap.data() as FWState) : null));
}

// Kept under its old name for Home and Our Story, which only filter on votes
// and matches. One document read instead of the whole copied pool.
export function subscribeFantasyWishes(coupleId: string, onChange: (items: FantasyWishesItem[]) => void): Unsubscribe {
  return subscribeFWState(coupleId, (state) => onChange(touchedItems(state)));
}

export function subscribeCustomWishes(coupleId: string, onChange: (items: CustomWish[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'fantasyWishes'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomWish))));
}

// One-shot for Memory Lane and Year in Review.
export async function getFWMatches(coupleId: string, uid1: string, uid2: string): Promise<{ id: string; text: string; matchedAt: number }[]> {
  const snap = await getDoc(stateRef(coupleId));
  if (!snap.exists()) return [];
  return touchedItems(snap.data() as FWState)
    .filter((i) => isFWMatch(i, uid1, uid2) && typeof i.matchedAt === 'number' && !!i.text)
    .map((i) => ({ id: i.id, text: i.text, matchedAt: i.matchedAt as number }))
    .sort((a, b) => a.matchedAt - b.matchedAt);
}

// A couple-written wish. Its votes live in the state doc like any other card.
export async function addFantasyWishesItem(coupleId: string, text: string, uid: string): Promise<string> {
  const ref = await addDoc(collection(db, 'couples', coupleId, 'fantasyWishes'), {
    text,
    createdBy: uid,
    createdAt: Date.now(),
  });
  return ref.id;
}

// Per-couple category choice lives on the couple doc (couples/{id}.fwCategories,
// absent = on) so both phones filter on the same value through the couple
// subscription they already hold. Either partner may change it.
export async function setFWCategory(coupleId: string, category: FantasyWishesCategory, on: boolean): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), { [`fwCategories.${category}`]: on });
}

// One transaction on the state doc. The vote that completes a mutual Yes
// stamps `matched` once, with the text as it read then. Returns whether this
// vote made a new match.
export async function voteOnFantasyWish(
  coupleId: string,
  item: { id: string; text: string },
  uid: string,
  vote: FWVote,
  partnerId?: string,
): Promise<{ newMatch: boolean }> {
  const ref = stateRef(coupleId);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = (snap.exists() ? snap.data() : {}) as FWState;
    const partnerYes = !!partnerId && data.votes?.[partnerId]?.[item.id] === 'yes';
    const newMatch = vote === 'yes' && partnerYes && !data.matched?.[item.id];
    if (!snap.exists()) {
      // First vote this couple ever casts. Only my own key (rules enforce it).
      tx.set(ref, { votes: { [uid]: { [item.id]: vote } } });
    } else {
      tx.update(ref, {
        [`votes.${uid}.${item.id}`]: vote,
        ...(newMatch ? { [`matched.${item.id}`]: { at: Date.now(), text: item.text } } : {}),
      });
    }
    return { newMatch };
  });
  trackEvent('fantasy_wish_voted');
  return result;
}

// A heart and one line on a match (USER_VOICE C2).
export async function reactToFantasyWish(coupleId: string, uid: string, itemId: string, on: boolean): Promise<void> {
  await updateDoc(stateRef(coupleId), { [`reactions.${uid}.${itemId}`]: on ? true : deleteField() });
  if (on) trackEvent('reaction_sent');
}

export async function replyToFantasyWish(coupleId: string, uid: string, itemId: string, text: string, keepTime = false): Promise<void> {
  const clean = text.trim().slice(0, 200);
  await updateDoc(stateRef(coupleId), {
    [`replies.${uid}.${itemId}`]: clean ? clean : deleteField(),
    ...(clean ? (keepTime ? {} : { [`replyAt.${uid}.${itemId}`]: Date.now() }) : { [`replyAt.${uid}.${itemId}`]: deleteField() }),
  });
  if (clean) trackEvent('reply_sent');
}

export function isFWMatch(item: FantasyWishesItem, uid1: string, uid2: string): boolean {
  return item.votes[uid1] === 'yes' && item.votes[uid2] === 'yes';
}

// Atomic "I want this on our Together List". completedNow is true ONLY for the
// caller whose write completed the pair, so exactly one phone creates the todo
// even when both press within the same second.
export async function markFWAddToListAtomic(
  coupleId: string,
  uid: string,
  partnerId: string | undefined,
  itemId: string,
): Promise<{ completedNow: boolean }> {
  const ref = stateRef(coupleId);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { completedNow: false };
    const data = snap.data() as FWState;
    if (data.addToList?.[uid]?.[itemId]) return { completedNow: false }; // idempotent
    tx.update(ref, { [`addToList.${uid}.${itemId}`]: true });
    return { completedNow: !!partnerId && !!data.addToList?.[partnerId]?.[itemId] };
  });
  if (result.completedNow) trackEvent('fantasy_wish_match');
  return result;
}

export function fwBothWantToAdd(item: FantasyWishesItem, uid1: string, uid2: string): boolean {
  return (item.addToList ?? []).includes(uid1) && (item.addToList ?? []).includes(uid2);
}

// "Start over": both partners' votes, matches, hearts and lines go; the
// couple's own wishes stay.
export async function resetFantasyWishes(coupleId: string): Promise<void> {
  await deleteDoc(stateRef(coupleId));
}

// Removes the copied preset docs of the old model. A legacy doc is one in
// `fantasyWishes` that still carries a `votes` field. Copies of presets are
// deleted; a couple-written wish keeps its doc and loses the old per-doc
// fields. Pre-launch there were only test couples, so old votes are not
// carried over. Idempotent; safe for both phones to run.
//
// NOT a batched write, on purpose: a batch (or a transaction) gets 20 rules
// get() calls in TOTAL, and the wildcard rule spends one per write on
// isMemberOfCouple, so a batch of more than about 15 couple-subcollection
// writes is rejected as a whole. Single writes in parallel chunks instead.
export async function cleanupLegacyFantasyWishes(coupleId: string): Promise<void> {
  const col = collection(db, 'couples', coupleId, 'fantasyWishes');
  const snap = await getDocs(col);
  const legacy = snap.docs
    .map((d) => ({ ref: d.ref, data: d.data() as { text?: string; category?: string; createdBy?: string; createdAt?: number; votes?: unknown } }))
    .filter((d) => d.data.votes !== undefined);
  // The old seeding wrote the whole pool in one burst, so copies share a
  // createdAt within a second or two. That catches a copy whose text has
  // since been reworded and that predates categories.
  const stamps = legacy.map((d) => d.data.createdAt ?? 0).sort((x, y) => x - y);
  const inBurst = (t: number) => stamps.filter((x) => Math.abs(x - t) <= 2000).length >= 10;
  const isPresetCopy = (d: typeof legacy[number]) =>
    !d.data.createdBy && (!!d.data.category || (!!d.data.text && PRESET_TEXTS.has(d.data.text)) || inBurst(d.data.createdAt ?? 0));
  for (let start = 0; start < legacy.length; start += 25) {
    await Promise.all(legacy.slice(start, start + 25).map((d) =>
      isPresetCopy(d)
        ? deleteDoc(d.ref)
        : updateDoc(d.ref, {
            votes: deleteField(), addToList: deleteField(), matchedAt: deleteField(),
            reactions: deleteField(), replies: deleteField(),
          }),
    ));
  }
}
