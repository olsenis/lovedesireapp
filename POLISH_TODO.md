# Polish TODO

Consolidated list of pending polish + roadmap items from the entertainment review and the Aug 2026 Home screen audit. Each item has notes on what to change and any caveats. Ship in order of the sequence below unless we decide otherwise.

Update rule: when an item ships, mark it ✅ with the commit hash, keep it in the list for a couple of weeks, then move history into ENTERTAINMENT_REVIEW.md or CLAUDE.md as appropriate.

---

## Entertainment roadmap — pending

### #9 Calendar reposition — ✅ shipped (fa7c365) + Countdowns merged (next commit)
**Status:** Shipped as ledger; Countdowns duplicate feature merged into Special Days
**Follow-up:** Ported the secret-date toggle from Countdowns → Special Days modal, deleted `app/countdown.tsx`, updated 4 Home nudge routes + 1 Profile row from `/countdown` to `/calendar`.
---
**Original notes below (kept for history):**
**File:** `app/calendar.tsx` (screen title already renamed to "Special Days" but screen is still a calendar grid)
**Change:**
- **Remove** the month grid (7-column day-cell layout + prev/next month arrows + weekday header + dot indicators)
- **Keep + expand** the "Upcoming" section as the primary content
- **Restructure** into a pure ledger: chronological list of all special days grouped by "This month" / "Next 3 months" / "Later" — or a single flat list with each entry showing `emoji · label · date · in N days`
- **Include auto-dates** (Valentine's, partner birthday) inline in the ledger, not just hidden as calendar dots
- **Add "+ Add" button** to the header (like other list screens with add functionality) — no longer tap-a-day-to-add
- **Empty state:** keep the ledger copy ("Nothing on the ledger yet. Tap + Add for anniversaries, birthdays, or first-times worth remembering.")
- **Delete/edit:** preserve existing swipe-to-delete or × affordance per row
**Why:** Users already have Google/Apple Calendar. Duplicating a month grid signals "we're a mediocre calendar". A pure ledger signals "we hold the dates that matter, not every meeting". Rating goal: 5.2 → 6.4 per review.
**Caveats:**
- The auto-date system currently only inlines Valentine's + partner birthday. Consider whether to include anniversary from `couple.startDate` too — probably yes.
- If we want to allow scrolling forward through future years' entries, the sort needs to handle the year-rollover logic that the current Upcoming section already does (moves past dates to next year).

### #10 /upgrade copy reorder — ✅ shipped (801ed02, previous session)
**Status:** Shipped
**Notes:** FEATURES array already leads with Fantasy Wishes + Sensate + Fire & Desire per the review. Was landed in an earlier session (Aug 2026) but the roadmap doc wasn't updated. No further work needed — the file's own comment (lines 8-13) documents the ordering rationale.
---
**Original notes below (kept for history):**
**File:** `app/upgrade.tsx`
**Change:**
- Reorder the FEATURES array so **Fantasy Wishes**, **Sensate Focus**, and **Fire + Desire challenge programs** are the top three items
- Blueprint (The Lovers) and adult moods (kinky/horny) drop to secondary
- Copy tweaks per item — lead with benefit / experience, not mechanic
**Why:** FW + Sensate + Fire are the most flagship-worthy premium features. The upgrade screen should sell those first, not "5-type intimacy quiz".
**Caveats:** Order shift may need a corresponding icon/color tweak per feature card so the top three still feel balanced.

### #5 Journal redesign — ✅ shipped (next commit)
**File:** `app/journal.tsx` + new `constants/journalPrompts.ts` + new `services/journalPromptsService.ts`
**Change:**
- **Rotating prompts** — 25 curated reflective prompts, one per (week × couple) via deterministic seed (same helpers pattern as Love Language nudge). Rose-tinted prompt card at top of Journal screen. "Reflect on it →" opens compose modal with prompt as placeholder text.
- **Weekly retrospective** — Sunday-only card between prompt and entries. Shows my count + partner count + dominant journal moods + partner's mood-log emojis side-by-side. Disposable — appears Sunday, vanishes Monday.
- **Streak-lite** — small `🔥 N-day streak` pill in the header when streak ≥ 3. Client-derived from the entry stream (no Firestore writes, no schema change). Breaks silently on missed day — no shame, no punishment.
**Deferred:** no Home nudge (Journal is low-frequency; adding it would compete with actual waiting-for-you signals). No push notification. No per-prompt storage on entries. No prompt customization. No retro archive.

### #7 Intimacy Log narrative — Phase 1 ✅ shipped; Phase 2 ✅ shipping now; Phase 3 deferred
**Phase 1 (shipped earlier):** Monthly narrative + NarrativeCard + Home nudge + `?tab=stats` deep-link. See original block below for detail.
**Phase 2 (this commit):** Reframe + cross-flow toast prompts (H24 below merges the full scope).
**Deferred (Phase 3):** anonymised cross-couple benchmark ("couples in year 3 log an average of 6/month"). Requires scheduled Cloud Function writing anonymised aggregates + opt-in settings toggle + Privacy Policy addendum.

---
**Phase 1 detail (kept for history):**
**File:** `services/intimacyService.ts` + `app/intimacy-tracker.tsx` + `app/(tabs)/index.tsx`
**Change:** Pure client-side monthly narrative surface + Home discoverability nudge.
- New helpers: `generateMonthlyNarrative(entries, monthDate)`, `computeMonthlyDelta(entries, monthDate)`, `previousMonthDate()`
- New NarrativeCard at top of Stats tab, past-month only (≥3 entries threshold), rose-stripe blush card. 2-4 warm sentences + Pulse-style delta pill (up/down/flat) + optional reflection prompt when Disconnected entries exist.
- New Home nudge: days 1-7 of new month, prev-month ≥3 entries → `✨ Your {month} in intimacy · N moments · read the story →` routing to `/intimacy-tracker?tab=stats`
- Deep-link `?tab=stats` support added to intimacy-tracker mount

### Deferred
- **#2 Emotional Weather** — needs historical data before it can pattern-match. Revisit post-launch.
- ~~**#4b Versus starter pool**~~ — obsolete Aug 2026, Versus merged into Daily (see H23 below).

### H26 delta 2 · Remove FW cross-flow toast + prefill Note for Daily Spicy — ✅ shipping now
**Files:** `app/fantasy-wishes.tsx`, `app/intimacy-tracker.tsx`, `app/daily.tsx`
**Change:**
- **Remove FW cross-flow toast:** the second toast ("Did you try this? Log the moment") that fired ~3.6s after a FW mutual match is deleted. Celebratory "It's a Match! ✨" toast unchanged. `fantasy` preset removed from `PREFILL_PRESETS` (dead route after toast removal).
- **Daily Spicy Note prefill:** the picked action text now passes to the composer via `?prefill=daily-spicy&note={encodedPickText}`. Composer opens with the pick visible in the Note field so user knows which moment they're logging.
- **DetailSheet extension:** added optional `initialNote` prop, seeded into `note` state on visibility open (same effect pattern as initiatedBy/types/mood seeding).
- **Screen extension:** `useLocalSearchParams` reads `note` param, clamped to 200 chars (Note field max), threaded into DetailSheet only when `prefill` is present.
**Why:** During 5C verification user surfaced two adjacent issues. (1) FW matches are aspirational ("someday we'd like to try this"), not action moments — the "Did you try this?" prompt ~4s after a match reads the moment wrong. The +Add to Together List button on match cards is the correct hand-off for planning; manual Intimacy Log entry stays the correct path if user later acts on the wish. (2) The Daily Spicy toast opened the composer with generic defaults — no reference to which pick was matched, so user couldn't remember what they were logging. Passing the pick text as a Note prefill fixes it in-context.
**Deferred:**
- Note prefill for Sensate — cycle context is self-explanatory (user just saw the cycle-completion overlay), no per-instance context needed.
- Retrospective Together List cross-flow from FW matches — the manual +Add button covers this today. Automating would need a "was this the plan we made?" prompt that adds complexity for uncertain benefit.

### H26 Sensate stage re-entry + auto-scroll — ✅ shipping now
**Files:** `app/sensate.tsx` (single file)
**Change:**
- **Re-entry hydration:** on entering a stage, if `progress.currentCycleStages.stage{N}` is true for the current cycle, seed local `marked = true` (skips timer, jumps straight to takeaway + reflection card). `accumulatedMs` set to full stage duration so the timer displays 0:00 instead of a confusing untouched state. Reflection card branches (`bothReflected` / `mine && !theirs` / input) all work unchanged — just needed a `marked === true` entry point.
- **Auto-scroll on Mark complete:** ScrollView ref + Y-position ref on takeaway banner + effect on `marked → true` that scrolls the view to the takeaway. Fires on BOTH first completion (linear flow) and re-entry hydration (jump-into-completion state). ~200ms delay so layout settles before the scroll fires.
- **"Do this stage again" button:** subtle text link below reflection card, gated on `wasReEntry === true`. Resets local state to pre-timer so user can practice again in same cycle. Firestore stage completion + reflection stay intact. Not shown on first completion — keeps the linear ritual arc clean.
- **Zero schema/service/rules changes.** Reads existing `progress.currentCycleStages` (already tracked by `completeStage` transaction). No new writes.
**Why:** During Round 5A H25 verification, user found two adjacent UX gaps on Presence: (1) after Mark complete only "✓ Session saved" was visible on-screen; the takeaway + reflection card fell below the fold so user's read was "I see Saved, what do I do?" (2) re-entering a completed-this-cycle stage showed only pre-timer state, no hint the stage was done, no way to see the reflection they saved. Both are discoverability failures, not correctness bugs — persisted data was intact, but the post-completion arc wasn't reachable. H26 makes the arc visible on first go (auto-scroll) and resumable on re-entry (hydration).
**Deferred:**
- Reflection history view (see reflections from prior cycles) — post-launch if requested. Not building without demand.
- Auto-scroll on Skip — Skip is a fast dismissal path, no scroll needed.
- Persistent "you completed X of 4 stages this cycle" header inside the active-stage view — cycle progress already visible on the stage list.

### H25 Intimacy Log reframe + cross-flow toast prompts (H7 Phase 2) — ✅ shipping now
**Files:** NEW `components/Toast.tsx`, `app/(tabs)/love.tsx`, `app/profile.tsx`, `app/intimacy-tracker.tsx`, `app/sensate.tsx`, `app/fantasy-wishes.tsx`, `app/daily.tsx`, `app/bingo.tsx`
**Change:**
- **A. Rename + reframe (subtitle only):** Us tab card subtitle changed from `"Log and reflect on your intimate moments"` → `"Your shared story of closeness"`. Profile toggle hint tightened to `"A private record of what you build together"`. Screen name unchanged — full rename would churn users who already know the feature.
- **D. Reflection field polish:** composer's "Note" field renamed to `"One thing memorable about this?"` with warmer placeholder `"A word or a sentence."`. Same 200-char cap, same schema — copy-only shift from data-entry framing to reflection framing. Entry-detail modal keeps "Note" label (reads clean as past-tense noun).
- **C.1 Shared Toast component:** extracted the fantasy-wishes inline animated toast into `components/Toast.tsx` — `useToast()` hook returns `{ toast, showToast, dismiss }` with two visual variants (`default` cream+burgundy, `emphasis` burgundy fill) + optional tap callback. Migrated fantasy-wishes.tsx and bingo.tsx to the shared version at the same time (de-dupes ~30 lines of animation code between the two).
- **C.2 Prefill deep-link:** `/intimacy-tracker?prefill=<source>` opens the composer automatically with contextual defaults. `PREFILL_PRESETS` table inline in intimacy-tracker.tsx: `sensate` → both / foreplay-only / amazing (connected mood), `daily-spicy` → both / [] / good (playful mood), `fantasy` → both / [] / amazing. User can override any field before Save. Ref-gated so re-renders don't re-open the sheet after the user closes it. DetailSheet gained an optional `prefill` prop + a `useEffect` that seeds state on visibility open.
- **C.3 Three cross-flow hooks, all gated on `profile?.features?.intimacyLog === true`:**
  - **Sensate cycle complete** (`app/sensate.tsx` handleMarkComplete): after `cycleJustCompleted === true`, toast `"Log this cycle in Intimacy?"` fires ~1.4s after the cycle overlay animates in. Tap → `/intimacy-tracker?prefill=sensate`. Mini sessions early-return above, so mini flow never triggers.
  - **Fantasy Wishes match** (`app/fantasy-wishes.tsx` existing freshMatchIds effect): after the celebratory `"It's a Match! ✨"` toast, a second toast `"Did you try this? Log the moment"` fires ~3.6s later. Tap → `/intimacy-tracker?prefill=fantasy`. Feature off → celebratory toast only, no second toast.
  - **Daily Spicy Picks match** (`app/daily.tsx` new fresh-match ref pattern mirroring FW's): watches `wishDoc.items` for fresh mutual-yes on Spicy category items (via `DP_SOURCES.spicy`). Toast `"You both want this. Log it if you tried it"`. Non-Spicy matches (Sweet/Deep) never trigger — those aren't intimate. First-snapshot silent so historical matches from prior sessions don't fire.
- **Zero schema changes.** `IntimacyEntry` type unchanged. Prefill lives entirely in route params. Firestore rules unchanged.
**Why:** Intimacy Log scored 5.6 on entertainment axes — but user's own analysis identified the rating was misapplied: this is a *reflection* feature, not entertainment. Right response is reframe + polish. H7 Phase 1 (monthly narrative surface + Home nudge) shipped earlier and did the big lift. This closes out Phase 2 (deferred cross-flow prompts) by hooking the three concrete intimate-adjacent moments (Sensate cycle, Daily Spicy match, FW match) into a low-friction hand-off. Expected 5.6 → ~7.2 for the self-selected opt-in user base.
**Deferred:**
- H7 Phase 3 (anonymised cross-couple benchmark) still deferred — needs Cloud Function + opt-in toggle + Privacy Policy addendum.
- No `source: 'sensate'|'daily-spicy'|'fantasy'` field added to `IntimacyEntry` schema. Route param carries prefill; nothing writes source to Firestore. Add later if stats aggregation ever needs attribution.
- No cross-flow prompts for Truth or Dare (dares span wholesome-to-sexy, no clean signal), Mood pick (too many hooks already), Sunday Check-in (self-reflective, different territory).
- Full "Intimacy Reflection" / "Our Intimacy Story" rename still on table; revisit if reframed subtitle doesn't shift feel enough post-launch.

### H24 Pulse merged into Sunday Check-in — ✅ Commit A shipped (7a7748b), Commit B shipping now
**Files:** `services/stateUnionService.ts`, `app/state-union.tsx`, `app/pulse.tsx`, `app/profile.tsx`, `app/(tabs)/love.tsx`, `app/(tabs)/index.tsx`, `services/yearInReviewService.ts`, deleted: `services/pulseService.ts`
**Change:**
- 5-dimension pulse (fun / communication / closeness / sex / teamwork, 1-5 each) now runs as a quick pre-step BEFORE the existing 5 Gottman text questions inside Sunday Check-in. Both sets land on the same per-user `entries/{uid}` doc via `submitStateUnionPulse` (batched, one write for all 5 dims).
- Zero Firestore rules changes — entries subcollection already enforces owner-only writes + gated reads until both completedAt. Same privacy as text answers.
- Reveal card gets a Quick pulse comparison block prepended above the text stack: per-dimension `You N · Ola M` + ✓ (gap ≤ 1) or ↕ (gap ≥ 2). Number-vs-number IS the interpretation — no copy needed. Only renders when BOTH entries carry pulseScores, so legacy weeks render text-only.
- `ComposeStep = 'pulse' | number` state machine. Default step='pulse'; `pulseSeededRef` effect jumps returning users straight to text step 0 if all 5 pulseScores already saved this week. Back button on text step 0 navigates to pulse step (scores preserved).
- Commit B cleanup: `/pulse` route replaced with redirect stub → `/state-union`. `services/pulseService.ts` deleted entirely (was only used by app/pulse.tsx + Home). Home Pulse 28-day nudge removed (Sunday CI has its own weekly cadence). Home closeness-dip nudge migrated to read from stateUnion entry `pulseScores.closeness` + `updatedAt` instead of pulse subcollection. Profile row `🌡️ Relationship Pulse` removed from Reminders & tools. Us tab Sunday CI subtitle updated to `"Quick pulse + 5 questions, private then reveal together"`. `yearInReviewService.pulseLatestScore` field + `hita/latest` read deleted (dead data path — no writer existed). Docs updated in CLAUDE.md, APP_MAP.md, ENTERTAINMENT_REVIEW.md.
**Why:** Standalone Pulse scored 5.6 in entertainment review. Root causes: on-demand cadence in a cadence-native app, individual not shared (no mutual reveal), raw numbers without interpretation, duplicated Sunday Check-in's emotional territory. Merge solves every weakness — natural weekly cadence, mutual reveal built in, number-vs-number IS the interpretation. Flagship Sunday CI (composite 8.4) lifts to ~9.0 while one weak feature dies. Same mechanic-transplant pattern as H23 Versus → Daily.
**Deferred:**
- Trend delta ("was 3 last week, now 4 ↑") in reveal — v2. Requires one extra Firestore read per partner per reveal. Ship after v1 proves the base merge feels right.
- Legacy `couples/{id}/pulse/{autoId}` docs not migrated. Old trend history not shown in the new UI. Trend continues from first Sunday post-merge (same treatment as H23 Versus retro-guessing).
- Per-dimension "talk about this?" deep-link on gap rows — post-launch polish once we see which gaps generate conversation.
- Pulse suggestion-action routing (`fun→/roulette`, `communication→/state-union`, etc.) not preserved — that whole surface is gone.
- `pulse_submitted` telemetry event replaced by the existing `sunday_checkin_submitted`. Add `sunday_pulse_submitted` if pulse-specific analytics needed later.
- TEST_CHECKLIST.md / TEST_LAUNCH.md still contain "10-question" pulse test cases — cleanup pass deferred to next test-doc sweep, harmless in the meantime.

### H23 Versus merged into Daily — ✅ Commit A shipped (fe97f75), Commit B shipping now
**Files:** `firestore.rules`, `services/dailyQuestionsService.ts`, `app/daily.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/discover.tsx`, `constants/content.ts`, deleted: `app/versus.tsx` + `services/versusService.ts` + `services/featureUnlockService.ts`
**Change:**
- Guess-partner-answer mechanic (formerly standalone `/versus`) now fires inline inside Daily's binary-Q reveal flow. After user submits their own binary answer, a bottom-sheet appears: "Wanna guess Ola's pick first?" with two big option buttons + a "Just show me" skip link.
- Reveal is gated on guess-or-skip. Three reveal states: correct (🎯 + streak pill), wrong (🌱 + [💬 Ask why] deep-links to `/(tabs)?openSpark=1`), skipped (normal answers side-by-side, no guess row).
- Weekly hit-rate stat added to Home's Daily row via new `getWeeklyGuessStats(coupleId, myUid, partnerUid)` helper. Displays only when `total > 0`, subtitle style, format: `you knew {partner} X/Y this week`.
- New `guesses: Record<uid, Record<globalIndex, optionText>>` map on `couples/{id}/dailyQuestions/{date}`. Rules-guarded per-uid via existing `hasOnly([request.auth.uid])` diff pattern used for `answers`/`votes`/`discussed`.
- Commit B cleanup: standalone Versus screen deleted, `versusService` deleted, `featureUnlockService` deleted (only had Versus data), `VERSUS_STARTER_POOL` + `VersusStarterItem` type deleted from `constants/content.ts`, `memory/versus_starter_prompt.md` deleted + MEMORY.md index entry removed, Versus row removed from Discover tab, `APP_MAP.md` + `ENTERTAINMENT_REVIEW.md` updated.
**Why:** Standalone Versus scored 5.6 in two entertainment reviews. Root causes were structural: parasitic on Daily, cold-start data gate, solo mechanic broke mutual-reveal DNA. Merge solves every weakness (no gate, real data day 1, bilateral, discoverable via Daily traffic) with no new content pipeline.
**Deferred:**
- Ask-why doesn't yet pre-fill the Sparks compose body with question + guess context — small Sparks extension needed. Post-launch polish.
- Sunday Check-in weekly summary (`app/state-union.tsx`) — planned but deferred: the reveal card already carries enough weight, adding another data block clutters it. Revisit if Sunday reveal feels thin.
- `/versus` deep-link redirect to `/daily` — deferred since versus was pre-launch, no external links exist yet.
- Category-level scores ("You know Ola's Playful side 85%") — post-launch, needs 30+ days of data to be meaningful.

---

## Home screen polish (from Aug 2026 Home audit)

Ordered roughly by impact / effort ratio (best first).

### H1 Personalize greeting — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx`
**Change:** `getGreeting()` now accepts an optional `name` arg and returns `${base}, ${firstName}` when profile.name is set. Falls back to bare greeting during onboarding.
**Why:** Warmest possible first impression, cheapest possible fix.

### H2 Sunday Love-Language Home card — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx` nudge system
**Change:** New nudge branch that unshifts on Sundays when partner has a `loveLanguage`. Also hides the daily insight card on Sundays (same-theme collision — Sunday nudge owns the LL surface).
**Deferred:** per-Sunday dismissal after tap. Card stays visible all Sunday for now — if that turns out annoying, easy to add `ll_sunday_seen_week` AsyncStorage flag using the same pattern as the insight card's `insight_dismissed_date`.

### H3 Deduplicate Fantasy Wishes nudges — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx` nudge branches
**Change:** Partner-ahead FW nudge now suppressed when the matches nudge fires (both route to same screen, both use ✨). Matches wins because it's the higher-value specific-reward signal.

### H4 Fix Insight eyebrow label — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx` insight card render
**Change:** Imported `LOVE_LANGUAGE_LABELS`, mapped raw key → human label, dropped "FOR YOU" for a tighter eyebrow: `INSIGHT · WORDS OF AFFIRMATION`.

### H5 Async Dares launcher tile — ✅ shipped, then ↩️ reversed by H14 (Aug 2026)
Tile added, then removed 2 days later when async dares got consolidated into Truth or Dare's mode picker. Reason: after H5 landed, Home + Discover + Home-nudge stack all surfaced "Dares" independently of "Truth or Dare", creating a naming/brand collision. H14 fixes the collision; the discoverability gap that H5 was solving is now covered by the T-or-D tile → Send a Dare mode. Home nudges for in-flight dares still deep-link to /dares.

### H22 Pairing accept/decline flow — ✅ shipped (next commit)
**Files:** `services/coupleService.ts` (Couple interface + acceptPairing / declinePairing / cancelPairingRequest), `services/authService.ts` (UserProfile.pendingCoupleId), `functions/src/index.ts` (rateLimitedJoin writes pending fields + fires push), `firestore.rules` (read + update gates for pending), `app/(auth)/pairing.tsx` (waiting sub-view + resume logic), `app/_layout.tsx` (root-level accept modal)
**Change:**
- Old flow: Ola scans code → server fills `partner2Uid` instantly → both paired silently. Inviter (Óli) had no consent moment; anyone with the 8-char code could join without approval.
- New flow: Ola submits code → server writes `pendingPartner2Uid` + `pendingPartner2Name` + `pendingPartner2At` on couple doc AND `pendingCoupleId` on Ola's user profile. Fires Expo Push to Óli. Ola sees full-screen waiting sub-view (spinner + "Waiting for {name} to accept…" + Cancel button). Óli sees root-level accept modal on any screen ("🤝 Ola wants to pair with you" + Accept + Decline).
- Accept path: `acceptPairing` service moves `pendingPartner2Uid` → whichever slot is empty (partner2 in initial pairing, partner1 in re-pair after disconnect), clears pending fields. Ola's snapshot detects `partner2Uid === her.uid` → writes coupleId to her profile + routes to Home.
- Decline path: `declinePairing` clears pending fields, keeps couple + invite code intact for a re-try. Ola's snapshot detects pending cleared + slot still empty → shows "Óli didn't accept this time" + "Back to pair entry" button.
- Cancel path: Ola taps Cancel → `cancelPairingRequest` clears pending fields → Óli's modal auto-dismisses via snapshot.
- Resume path: Ola force-quits + reopens → pairing.tsx hydrates from `profile.pendingCoupleId` → waiting sub-view rendered immediately.
- Firestore rules: read gate extended to include `pendingPartner2Uid == request.auth.uid` (so Ola's waiting screen can subscribe). Update gate: existing members can update as before; pending party can only clear their own pending fields (cancel); non-member slot-fill removed (server writes pending only).
- rateLimitedJoin also implements idempotency for same-user re-request (returns success with same coupleId instead of `taken`).
**Deploy sequence:** Firestore rules + Cloud Functions must be deployed BEFORE the Vercel client build lands, otherwise clients hit new logic against old backends. Run `firebase deploy --only firestore:rules,functions --account lovedesireapp@gmail.com --project lovedesireapp-8c7f2 FUNCTIONS_DISCOVERY_TIMEOUT=60` first.
**Why:** User caught during Bug bash Round 2 auth test that Ola sees "you're paired with Óli" but Óli gets zero acknowledgment. Security angle: any leaked invite code let anyone silently pair. Accept flow adds explicit inviter consent + clear confirmation on both sides.

### H21 WYR daily cap (5/day free, "Draw 5 more" paid) — ✅ shipped (next commit)
**Files:** `services/wyrService.ts` (interface + constants + answerWYR mod + drawMoreWYR), `app/would-you-rather.tsx` (derive + DoneState render + styles), `CLAUDE.md` (WYR docs)
**Change:**
- WYR had no daily cap — pool wrapped infinitely via modulo, content burned out fast, no pacing. User asked for the Daily Picks bonus-draw pattern applied to WYR.
- Extended `WYRSession` interface with three optional fields: `dayKey`, `answeredToday`, `bonusDraws`. Exports three new constants: `WYR_DAILY_CAP = 5`, `WYR_BONUS_PER_DRAW = 5`, `WYR_MAX_BONUS_DRAWS = 3` (mirrors dailyWishService's `MAX_BONUS_DRAWS = 3`).
- `answerWYR` transaction now increments `answeredToday` on fresh reveal only (guards against duplicate-tap flip), with a day-rollover check that resets the counter + bonusDraws when `live.dayKey !== today`. Zero destructive migration — existing sessions with no `dayKey` treat their next reveal as a rollover.
- New `drawMoreWYR(coupleId)` service function — atomic increment of `bonusDraws` bounded by `WYR_MAX_BONUS_DRAWS`. Ships `wyr_draw_more` stat event.
- `would-you-rather.tsx` reveal state: when `capReached = answeredToday >= dailyCap`, the Next Question button is replaced by an inline DoneState (mirrors daily.tsx's DoneState in shape). Paid users see "+ Draw 5 more" button + hint "{N} of 3 draws left today"; free users see burgundy upsell card routing to `/upgrade`. Tail line: "Come back tomorrow for a fresh set ✨" / "Fresh set every morning ✨" / "You've drawn everything today, fresh set tomorrow ✨" depending on tier + draws-left state.
- `handleDrawMore` bumps bonusDraws AND immediately advances to next question (user tapped Draw More from the DoneState → implicitly done with current reveal).
**Why:** User caught during Bug bash Round 2 that WYR looped infinitely with no pacing. Same shape as the Daily pattern users already know — one less mental model to learn.

### H20 Truth or Dare Home nudges — ✅ shipped (next commit)
**Files:** `app/(tabs)/index.tsx`, `CLAUDE.md`
**Change:**
- T-or-D live game had zero Home nudges (unlike WYR, Bingo, Daily, FW). If Óli picked a card and sent it to Ola, Ola had no Home cue that a live card was waiting — she had to manually navigate to `/truth-dare` to see it. Same gap when the turn transitioned back to Ola in `picking` phase.
- Added subscription to `truthDareSession` via `subscribeTruthDare` in Home (u18).
- Two mutually-exclusive nudge branches after the WYR nudge:
  - **`phase='answering' && turnUid !== uid && card && !dareConfirmed.includes(uid) && !answeredBy`** → `🎯 {partner} sent you a Truth/Dare` with card-text preview (first 60 chars, personalise'd with `profile.name` so `{partner}` tokens resolve to my own name since I'm the doer)
  - **`phase='picking' && turnUid === uid`** → `🎯 Your turn in Truth or Dare` with subtitle "{partner} is waiting for you to pick a card"
- Preview snippet routes through `personalise(text, profile?.name)` — the pool text is authored from doer's POV and I (the target) am the picker's opposite, so `{partner}` should render as my own name.
**Why:** User caught during Bug bash Round 2 that T-or-D was invisible on Home despite being turn-based just like WYR + Bingo. The other multiplayer sessions surface as nudges — T-or-D shouldn't be an exception.

### H19 Async dares deleted entirely, manual T-or-D authoring added in live game — ✅ shipped (next commit)
**Files:** DELETE `components/AsyncDaresPanel.tsx`, `services/dareService.ts`; MOD `app/truth-dare.tsx`, `app/(tabs)/index.tsx`, `services/storageService.ts` (drop `uploadDareProof`)
**Change:**
- Deleted the async-dares feature top-to-bottom. Gone: `dareService.ts` (createDare / accept / decline / complete / withdraw / subscribeDares), `AsyncDaresPanel.tsx`, `uploadDareProof` in storage service, the `couples/{id}/dares/*` Firestore collection subscription in Home, the pendingDaresForMe + freshlyCompletedFromPartner nudge branches, the `dares` state on Home, and every route into `/dares`. Firestore data itself lives on (no destructive migration) but the app never reads it again.
- Replaced with manual authoring in the live T-or-D game flow. In Wherever You Are picking phase, when it's your turn to pick a card, you now see two rows: draw random from pool (top: [🤔 Truth] [🔥 Dare]) OR write your own (bottom, dashed border: [✏️ Truth] [✏️ Dare]). Manual tap opens an inline authoring card with a TextInput → Send to {partner} → same `playCard` service call as pool-drawn cards, just with custom `text`. Partner's answering / dare-completed flow is unchanged since a card is a card regardless of origin.
- Total deletion: ~700 lines across component + service + storage function + Home hookups.
**Why:** Async dares had accumulated three consecutive attempts to make it work (H14 mode-card, H17 tab-pair, H18 inline panel) plus a stream of bugs (list not updating, wrong-phone nudge, stale-doc completion, /dares navigation confusion). The core user value — custom-authored dare content — is delivered more simply by letting either partner type their own card inside the live game. Deadline pressure and proof photo were rarely-used cute mechanics that added a lot of surface complexity. Cutting the feature simplifies the app's dare story: one live surface, two content sources (pool + manual). LDR couples still get custom content over video-call via manual authoring in Wherever You Are.

### H18 AsyncDaresPanel folded into T-or-D picker (deletes /dares route) — ⏸️ superseded by H19 (Aug 2026)
Same-day supersede. The AsyncDaresPanel inline embed shipped, but by end of day the underlying async-dares feature was cut entirely (H19) after three attempts to make it fit failed to land cleanly. See H19 for the replacement design (manual live-game authoring).

### H17 T-or-D ↔ Dare Log unified via top-tab pair — ⏸️ superseded by H18 (Aug 2026)
Same-day supersede. The route-swap tab pair (added, then removed) proved too disconnected — user perceived two separate screens pretending to be tabs, not a unified hub. H18 deletes both the tab pair and the /dares route, folding async dares into the T-or-D picker as an inline panel component instead.

### H16 3-way dare context (ldr / either / physical) — ✅ shipped (next commit)
**Files:** `constants/content.ts` (Dare interface + all 111 previously-marked dares), `app/truth-dare.tsx` (filter update)
**Change:**
- Replaced boolean `remote?: true` with 3-way `context?: 'ldr' | 'either' | 'physical'` enum. Reason: boolean lumped hybrid dares (e.g. "send a song", "coordinated candle") in with the remote-only pool AND let them leak into the non-LDR pool. Non-LDR couples were drawing "Video-call {partner} and slowly take off two things" while sitting next to each other.
- Agent classified all 111 previously-marked-remote dares into `ldr` vs `either`. Split: 67 `ldr` + 44 `either`. Physical dares (163) stay implicit-default; no marker required.
- Filter now symmetric: LDR mode sees `ldr + either`, non-LDR sees `physical + either`. Only `ldr` is exclusive to LDR view, only `physical` exclusive to in-person. Both modes see hybrid `either` dares — those are by definition context-agnostic (curated artifact / coordinated ritual).
- Per-level split: Sweet 8 ldr + 30 either, Flirty 31 ldr + 7 either, Spicy 28 ldr + 7 either.
- Per-mode pool: LDR on → Sweet 38 · Flirty 38 · Spicy 35. LDR off → Sweet 62 · Flirty 50 · Spicy 95.
**Why:** User caught the leak in Bug bash Round 2 — asked "does LDR content also work for non-LDR?" and pointed out that the non-LDR pool included video-call and sexting dares that don't make sense when partner is 3 feet away. 3-way classification is the correct model: hybrid dares are neither remote nor physical, they're both.

### H15 LDR dare filter + 85 remote-safe dares authored — ✅ shipped (next commit)
**Files:** `constants/content.ts` (Dare interface + 85 new dares), `app/truth-dare.tsx` (filter logic), CLAUDE.md (DARES content section)
**Change:**
- Added `remote?: boolean` to the `Dare` interface. `true` = LDR-safe (voice memo, video call, camera, text/sext, photograph, coordinated ritual, solo-and-report-back). Unset/false = requires physical proximity.
- Tagged the pre-existing 189 dares (agent pass): 13 Sweet, 3 Flirty, 10 Spicy marked as remote-safe. Flirty at 3 was unplayable — LDR user would see the same 3 dares repeat within 3 rounds.
- Authored 85 new remote-safe dares via 3 parallel agents (25 Sweet + 35 Flirty + 25 Spicy) with detailed briefs (character voice + tone bible references + 10+ rules + test rubric + 5+ positive + 7-8 negative examples per level). Post-merge pool: **Sweet 38, Flirty 38, Spicy 35** remote-safe out of Sweet 70, Flirty 81, Spicy 123 total.
- Added filter in `truth-dare.tsx`: `const daresPool = isLDR ? DARES.filter(d => d.remote) : DARES;` derived at the top, all 4 DARES read sites (solo + multi × handleChoose + handleRedraw) flow through it. Truths need no filter since all verbal/typed/audio.
- Agent prompts saved in `scratchpad/agent-prompt-{sweet,flirty,spicy}-remote.md` as audit trail. Per-agent output files retained in scratchpad for spot-check verification.
**Why:** User caught the mismatch during Bug bash Round 2 — "Wherever You Are" mode name promised LDR support but dare content pool was near-100% physical-together. LDR couples were seeing "Kiss their neck for 30 seconds" and hitting a dead end. Filter + content investment makes the mode brand honest across all three levels.

### H14 Merge Async Dares under Truth or Dare + single-tap dare confirm — ✅ shipped (next commit)
**Files:** `app/truth-dare.tsx`, `services/truthDareService.ts`, `app/(tabs)/discover.tsx`, `app/(tabs)/index.tsx`
**Change (surface merge):**
- Truth or Dare picker now shows 3 mode cards instead of 2: Solo Spin / Play Together (featured) / Send a Dare (async → routes to /dares)
- Discover: standalone `🎁 Dares` card removed — T-or-D card now owns every dare interaction in the app
- Home Tonight's Picks: H5 async-dares tile removed (reversed) — T-or-D tile already leads users into the Send a Dare mode
- `/dares` screen + service + Firestore collection all UNCHANGED — this is a surface consolidation, not a code merge. Home nudges for pending/completed dares continue to deep-link to /dares directly.

**Change (single-tap confirm):**
- Removed the double-confirmation on dares in Wherever You Are mode. Old flow: challenged partner taps "Dare completed" → picker sees "confirm they did it" button → picker taps → phase='done'. New flow: challenged tap alone moves the round to done.
- `truthDareService.confirmDare` now sets `phase: 'done'` on any single confirmation with an idempotent guard. UI dead branches (picker's confirm button + challenged's waiting-for-picker banner) removed. DoneCard banner text updated from "✓ Both confirmed!" → "✓ Dare completed!".
**Why:** User caught both during Bug bash Round 2 — the two Dare surfaces read as duplicate features, and the double-confirm added a click for zero trust value in a playful game between partners who already share everything.


**File:** `app/(tabs)/index.tsx` Tonight's Picks section
**Change:** Added 4th tile between Fantasy Wishes and "See all games" row: `🎁 Dares · Send a challenge, watch it get done` → `/dares`.

### H6 Fold "partner suggested" nudge into Together List row — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx`
**Change:** The Together List row already surfaces `N suggestions waiting · N open` in its subtitle when partner has pending suggestions. The parallel Waiting-for-you nudge was pure duplicate — removed. Row keeps doing the work.

### H7 Semantic nudge palette — ⏸️ deferred to POST_LAUNCH
Rainbow-stack fix. Nice cosmetic polish but not launch-blocker — most users see 2-4 nudges per open. See [POST_LAUNCH.md](POST_LAUNCH.md) "Home nudge stack".

### H8 Priority sort + cap the nudge stack — ⏸️ deferred to POST_LAUNCH
Priority tier system + "See N more" cap. Edge-case impact (8+ nudge scenario hits paired LDR power-users on Sundays only). Revisit if analytics show broad impact. See [POST_LAUNCH.md](POST_LAUNCH.md) "Home nudge stack".

### H9 Polish Tonight's Picks copy — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx` Tonight's Picks tiles
**Change:** Daily / T-or-D / Fantasy Wishes subtitles rewritten benefit-first per the plan. Dares already benefit-first from H5. Lock badge appended after new copy for free-tier Fantasy Wishes.

### H10 Reserve emoji per surface — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx` nudge branches
**Change:**
- LDR Care Package 🎁 → 📦 (literal package, no collision with Async Dares)
- Year in Review ✨ → 🎊 (year-end feel, distinctive from ambient FW/LDR ✨)
- LDR pre-visit day 4 (tease) 📸 → 🔥 (matches "teaser of what's coming" subtitle)
- LDR pre-visit day 6 (surprise) 🎁 → 🌟 (something special, no gift-emoji collision)
- Together List suggested ✨ removed via H6 (no longer competes)
Remaining shared ✨: FW matches + FW partner-ahead (mutually exclusive via H3 dedupe), LDR post-visit day 1, LDR pre-visit day 2, monthly narrative — these fire in different scenarios, rare same-Home collision. Acceptable.
Remaining shared 📸: Moments daily prompt + incoming Flash — both photo-related, rare same-Home collision. Acceptable.

### H11 Prune unused styles — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx` StyleSheet
**Change:** Removed 27 dead styles across 6 families: `ritual*` (6), `dailyWish*` (6), `moodSummary*` (4), `sparkBtn*` (3), `flashBtn*` (2), `moodSelected*` + `partnerMood*` (5), plus stray `name`, `sectionHeader`, `changeText`. Zero usages confirmed by grep before removal.

### H13 Daily matches Home nudge — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx` nudge branches
**Change:** Added dedicated `✨ N Daily match(es)` nudge that fires when both partners voted yes on a Daily pick today AND user hasn't pressed "Add to Together List" yet. Suppresses the existing partner-ahead "💫 Daily is waiting" branch when it fires (same route, matches is the specific-reward signal). Mirrors the Fantasy Wishes matches nudge shape/palette so both features feel of a piece.
**Why:** User caught the gap during Bug bash Round 2 — FW fires a match nudge, Daily didn't, so users who matched but hadn't opened Daily since had no Home cue to save the item to Together List.

### H12 Warmer inactive-partner state — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx` between couple hero card and insight card
**Change:** When `isConnected && !partner?.name?.trim()` (paired via invite but partner never set their name), a warm blush hint appears: "Waiting for your partner to open Desire ✨" + sub "Their avatar and name will appear here once they set them." Vanishes the moment partner sets name in Profile. Signal-only — no "Nudge them" button because we have no reliable push channel for a partner who hasn't opened the app enough to grant notification permission.

---

## Ongoing / behavioral

- Refer to the partner by NAME or "your partner" in app copy AND in Claude's conversation with the user — never they/them. Full convention in [CLAUDE.md](CLAUDE.md) under "Pronoun-free copy convention".
