# Bug bash + launch-prep tracker

Live tracker of pending tests, roadmap items, and shipped-since-last-launch work. Different from:
- [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md) — per-feature comprehensive checklist (walk through every feature with 2 phones)
- [`POLISH_TODO.md`](POLISH_TODO.md) — polish-item history (H-series, entertainment roadmap items)

**Update rule:** as items ship / pass / block, move them between sections. Keep completed items for a couple of days as history, then trim to `POLISH_TODO.md` shipped notes or delete.

---

## 🟡 In progress

_(none — Round 2 fully cleared, Round 3 LDR + unpaid coverage still pending)_

## ⏳ Pending — regression tests for recent commits

- [x] **Together List (todo screen) partner name** — ✅ PASSED. Items saved via Activity Cards "Save to Together List for later" render partner name in the todo screen (d830fed verified in-flow).
- [x] **T-or-D `{partner}` POV substitution** — ✅ PASSED across Sweet / Flirty / Spicy after hard-refresh + Vercel deploy landed (`9c4d6b1`).
- [x] **New manual T-or-D mode** — ✅ PASSED. Wherever You Are picker shows draw-random + write-your-own rows, TextInput opens, Send flows through playCard (`fafc46a`).

### Pre-launch retention build (Sep 8, Review #10) — device round 1 done Sep 8 (Android, phone A)

Test affordances: `DEV_IGNORE_WEEKDAY_GATES` (constants/devFlags.ts) and `MEMORY_LANE_DEV_UNLOCK` (featureUnlockService). Both flipped on for the round, both back to `false` in HEAD.

- [ ] **Moments archive-peek threshold** back to ≥8 (`b04034d`) — not explicitly verified; card was absent on Home Sep 8, moments count not checked.
- [ ] **Sunday history Thursday card** (`a286d66`) — NOT testable yet: needs 2+ weeks where both completed Sunday Check-in. Eva has not finished week 37 on phone B. Re-check Thursday Sep 17 or with the weekday flag once week 2 is both-complete.
- [x] **WYR Wednesday author nudge** — ✅ PASSED after fix. Found: modal was only mounted in the level-picker view, so `?author=1` did nothing mid-session (had to reset the round); and the keyboard covered Level + Save. Both fixed `dbf23cf` (modal rendered in all views, KeyboardAvoidingView + ScrollView). Re-test confirmed modal opens over the live game, Save works, nudge disappears.
- [x] **WhileYouWait** — ✅ PASSED on Memory Lane and Activity Cards. Feedback "only 2 chips, center it, bigger" → `afc50c1`: added contextual Mood + Daily chips (live, hidden once done today), centered, larger. Confirmed chips drop off as actions complete.
- [ ] **Presence `?mini=1`** (`2a326cd`) — NOT testable: 7-day nudge absent (Presence used recently). Will surface naturally; code path is 10 lines.
- [x] **Activity Cards custom** — ✅ PASSED after fix. Found: every button in the "New deck?" sheet rendered as an empty pill — `confirmBtn`/`cancelBtn` carry `flex: 1` for the undo row and RN 0.86 Yoga collapses them when stacked in a column (old Yoga let the label overflow). Fixed `e7ee5ca` with `stackedBtn { flex: 0 }`; same latent bug in Sunday "Save verdicts" fixed `6af191a`. Audit of all other flex:1 buttons: all in rows. Custom cards: add 2 → ↺ New → "Includes 2 of your own cards" → found in deck.
- [x] **Sunday predictions, week 1** — ✅ PASSED. Q5 "Next →" → Call it → Finish → Done! Waiting + WhileYouWait. **Week 2 grading still pending** (Eva finishes week 37 on B, then next Sunday A grades). Grading model changed in `aba5ba7` (see Review #11 below) so week-2 also verifies the look-back path.
- [x] **Memory Lane** — ✅ PASSED on phone A with dev unlock. Locked state also verified: Discover pill said "18d" (couple.createdAt is 12 days old), toast on tap. Unlocked: NEW badge, 5 questions, instant ✓/✗, score 2/5, "Eva has not played this week yet", WhileYouWait. First open was slow (generation) → `384ce3f` parallelised the Sunday entry reads and filtered Fantasy Wishes to matched items. **Pending:** phone B plays → partner score line; Thursday Home nudge (weekday flag showed it would render but Memory Lane was already completed by then). ⚠️ Round-1 pass was single-phone and hid B1/B2/B3 below; week 37 doc was deleted after the fix so both phones regenerate it in the new shape (Óli replays).

Also fixed in this round, unrelated to the build: Firestore transport warning was not actually addressed by `2e59e6e` (auto-detect is the SDK default) → `d98a73c` forces long-polling, `e513747` hides the recovered-retry warning from the dev overlay. Known-harmless dev warnings triaged and left alone: expo-router "state update on unmounted" ([expo/expo#35224](https://github.com/expo/expo/issues/35224)), `Response.blob()` perf hint (needs `expo-blob`, not in Expo Go → POST_LAUNCH SDK57-1).

### Review #11 fixes (Sep 8) — code review of the retention build, all 7 main findings confirmed real

Plan: `plans/` (shimmying-badger). Four code commits + rules deploy. None of B1/B2/B3 were visible in round 1 because only one phone played.

| # | Finding | Fix | Commit |
|---|---|---|---|
| B1 | Memory Lane generated ONE question set from the first opener's perspective; the second opener got a quiz about themselves under their own name | Per-uid sets: `questions: { [uid]: [...] }`, built from one shared `loadSources` read via pure `buildQuestions(sources, view, seed)`; `questionsFor(doc, uid)` reads legacy array docs too | `52e529e` |
| B2 | Daily source quizzed you on partner answers to questions you had NOT answered (broke Daily's mutual-reveal promise) | `fromDaily` requires both `answers[partner][gi]` and `answers[me][gi]` | `52e529e` |
| B3 | Moments source always empty: `d.data()` has no `date` (it is the doc id) | `({ date: d.id, ...d.data() })` | `52e529e` |
| B4 | Rules let either partner write the other's `completedAt` key on memoryLane, and rewrite `questions` | Wildcard update: `completedAt` map diff `hasOnly([uid])` (guarded `is map`, blueprints has scalar), `questions` immutable. **Deployed** | `4c6500e` |
| B5 | Empty week wrote a permanent 0-question doc | `ensureMemoryLaneWeek` returns before the transaction when both sets are empty; 🌱 copy "then come back" | `52e529e` |
| B6 | Sunday predictions were graded on "weekId minus 1" only; one skipped week orphaned them forever | `verdictsOnPartner` lives on the SAME week as the predictions; screen looks back up to 3 both-completed weeks, eyebrow "Last week / Two weeks ago / Three weeks ago" | `aba5ba7` |
| B7 | WYR Wednesday authoring jumped `questionIndex` mid-round and wiped the partner's in-flight answer | Jump only when nobody has answered the current question; otherwise the custom lands at index 0 of the next session | `6228da3` |
| B8 | `markMemoryLaneUnlocked` cached the unlock before the Firestore write, so a failed write never retried | Cache only after successful `setDoc` | `52e529e` |
| B9 | Copy promised "Sealed until next Sunday" (never true, reveal needs the next both-completed check-in) | "Hidden until the next check-in you both finish" | `aba5ba7` |
| B10 | Two near-identical custom Activity Cards could both land in one deck | Case-insensitive dedupe before the 5-cap | `6228da3` |
| Gate | Memory Lane 30-day gate anchored on pairing date, so a couple that paired and did nothing got a NEW badge on an empty week | Anchor = `max(couple.createdAt, couple.firstRitualCompletedAt)` | `52e529e` |

B11 (bingoCustom.text rules validation), B12 (weekday dev flag misses Sun/Mon cards), B13 (weekId memoised over midnight) → POST_LAUNCH R11.

**Round-2 repro table (device):**

| Test | Phones | Setup | Expect |
|---|---|---|---|
| B1 | A + B | `MEMORY_LANE_DEV_UNLOCK` on both. A opens Memory Lane first, then B | B's Daily/mood questions say "what did Óli say" / "Óli's mood", never B's own name. Both scores side by side when both done |
| B2 | A + B | Eva answers a Daily question Óli skips | That question never appears in Óli's Memory Lane |
| B3 | A | ≥3 Moments across ≥2 calendar months (QA couple is 12 days old, so likely next month) | A "which month was this photo" question appears |
| B5 | A | Fresh test couple, dev unlock on | 🌱 state, no `memoryLane/{week}` doc in Firestore console; after adding history and reopening → quiz |
| B6 | A + B | Needs a Sunday: both finish week N with predictions, skip week N+1, both finish N+2 | Week N+2 screen grades week N under "Two weeks ago" |
| B7 | A + B | Eva mid-WYR on Q3, Óli authors a question | Eva's answer survives; custom shows up next session, not mid-round |
| B4 | dev console | `updateDoc(memoryLane/{week}, {'completedAt.<partnerUid>': 1})` | permission-denied; The Lovers quiz (scalar `completedAt` under the same wildcard) still saves |

## ⏳ Pending — Bug bash Round 2 remainder

- [x] **#7 T-or-D Truth flow** — ✅ PASSED. Text answer path + audio recording path (record → upload → reveal on both phones) + score bump + next turn. Send-my-answer button padding polish fix landed same session.
- [x] **#7 T-or-D Skip flow** — ✅ PASSED. Picker redraw (max 2) + doer skip (turn switches, no score change, `skipsUsed` increments per uid).
- [x] **#7 WYR full flow** — ✅ PASSED. Includes H21 daily cap (5/day free, "Draw 5 more" paid up to 3 packs = 20/day max), 56 discussion prompt rewrites for A/B-flavored bugs, 6 role-flipped question rewrites to symmetric shared-preference form, summary modal "Continue later" copy. Post-launch item added to POST_LAUNCH.md: WYR saved-matches overview + stats page.
- [x] **#7 Bingo full flow** — ✅ PASSED across multiple commits: activity reciprocity rewording (`d46dabc`), "Tonight's Activity" / "picked for us" copy (`7bd6210`), sender-picks-again on skip B logic (`0e937c1`), in-app passed-try-another status text (`6b54798`). Includes Bingo activities render partner name (personalise fix from `d830fed` verified in-flow).
- [x] **#9 Auth flows** — ✅ PASSED. Register (18+ checkbox + consent write) + login + pairing (invite code generation + entry) + couple-connect + password reset. H22 accept/decline shipped over `aa358b3` → `e03f766` → `36a39dd` → `c7341b5` (final: accepter always leaves /pairing after successful accept, sensible fallback if onboarding lookup fails).

## ⏳ Pending — Manual content read-through (user, self-paced)

- [ ] **Read every content-pool text by hand** — the automated sweeps caught structural issues (em dashes, `{partner}` tokens, first-position pronouns, POV substitution) but only a human can catch tone / typos / awkward phrasing / anything that "reads off" in context. Scope: DARES (274) · TRUTHS (310) · QUESTIONS (474) · DAILY_WISH_ITEMS (254) · FANTASY_WISHES_PRESETS (294) · BINGO_ACTIVITIES (55). Approach: read a category at a time, flag any that need rewriting, batch-fix. Estimate ~2-3h across several sessions.

## ✅ Bug bash Round 5 (tail sweep) — COMPLETE (Aug 19)

All five sub-rounds passed. Fixes shipped in-flight: H26 Sensate re-entry
+ auto-scroll (00c3dac + c541331), H26 delta 2 FW toast removal + Daily
Spicy Note prefill (f0eabd3), menu flicker v1-v4 + pre-mount HTML splash
+ static output (af29581 → d554def → 92bc32f), Profile plan pill (892c4fa),
manifest.json PWA tweaks (d489080), 5D fixes: Roulette LDR filter both
directions + Flirt Reminders time picker + Memory Wall doc cleanup
(f182fce). Splash wordmark redesign deferred as design task.



Systematic walkthrough of features that Rounds 1-4 didn't cover — standalone
screens, home-nudge remainder, profile, and regression checks for the
Aug 2026 H23 / H24 / H25 shipments (Versus merge, Pulse merge, Intimacy
Log reframe). Ordered by freshness of shipped code (freshest = smallest
context switch to verify).

### 5A · H23/H24/H25 regression checks (freshest — do first)

**H23 Versus merged into Daily** (fe97f75 + 36acbfd, shipped Aug 17)
- [ ] Binary Q in Daily → answer → guess bottom-sheet appears with partner's option preview
- [ ] Tap guess → reveal shows correct (🎯 + streak pill) or wrong (🌱 + Ask why → routes to Home spark modal)
- [ ] "Just show me" skip → normal reveal, no guess row
- [ ] Open-text and scale Qs → no guess bottom-sheet
- [ ] Home Daily row shows `you knew {partner} X/Y this week` after guessing
- [ ] Discover tab has NO Versus card
- [ ] Direct navigate to `/versus` → no error, either 404 or falls through

**H24 Pulse merged into Sunday Check-in** (7a7748b + 71aa34b, shipped Aug 18)
- [ ] Sunday Check-in opens with pulse step first (5 dims × 1-5 buttons)
- [ ] All 5 dims required before Save enables
- [ ] Save advances to text Q1
- [ ] Back button from text Q1 goes back to pulse (scores preserved)
- [ ] Complete both → reveal shows Quick pulse comparison block (You N · {partner} M + ✓ or ↕) above text
- [ ] Legacy weeks in history: text-only reveal, no pulse block (no crash)
- [ ] `/pulse` redirects to `/state-union`
- [ ] Profile → Reminders & tools has NO Relationship Pulse row
- [ ] Home Pulse 28-day nudge gone; Sunday nudges unaffected
- [ ] Closeness ≤ 2 in Sunday CI pulse + no intimacy since → 💗 "Closeness dipped" nudge fires

**H25 Intimacy Log reframe + cross-flow toasts** (4ecfec3, shipped Aug 18)
- [ ] Us tab Intimacy Log card subtitle reads "Your shared story of closeness"
- [ ] Profile toggle hint reads "A private record of what you build together"
- [ ] Composer's Note field labeled "One thing memorable about this?" with "A word or a sentence." placeholder
- [ ] Direct navigate to `/intimacy-tracker?prefill=sensate` opens composer with initiatedBy=both + types=foreplay_only + mood=amazing
- [ ] Sensate cycle complete (all 4 stages) → toast "Log this cycle in Intimacy?" ~1.4s after cycle overlay. Tap → composer opens prefilled
- [ ] Sensate mini session complete → NO toast
- [ ] FW fresh mutual-yes match → "It's a Match! ✨" toast fires, then "Did you try this? Log the moment" ~3.6s later. Tap second → composer opens prefilled
- [ ] Daily Spicy Pick fresh mutual-yes → toast "You both want this. Log it if you tried it". Tap → composer opens prefilled
- [ ] Daily Sweet OR Deep mutual-yes → NO toast
- [ ] Toggle `profile.features.intimacyLog = false` in Profile → NO cross-flow toasts fire anywhere (Sensate cycle, FW match, Daily Spicy)
- [ ] Bingo Save-for-later toast still works after shared Toast migration (tap → routes to /todo)
- [ ] FW celebratory match toast still tappable (tap → routes to Matches tab)

### 5B · Home nudges remainder verification

- [ ] Fantasy Wishes match dedupe — partner-ahead FW nudge suppressed when matches nudge fires (both routes to `/fantasy-wishes`, both ✨)
- [ ] Sunday Love-Language nudge — unshifts on Sundays when partner has loveLanguage set
- [ ] Insight daily-rotating card — hidden on Sundays when LL nudge fires
- [ ] Personalized greeting — "Good morning, {firstName}" when profile.name set
- [ ] Presence 14-day inactivity nudge — fires after 14 days since last sensate stage AND cyclesCompleted ≥ 1
- [ ] Weekly Daily-guess mini stat — "you knew {partner} X/Y this week" only when total > 0
- [ ] Migrated closeness-dip nudge — verified in 5A above via Sunday CI pulseScores

### 5C · Fantasy Wishes (Aug 2026 refactor)

Deferred earlier. Verify the one-card-at-a-time deck refactor and the Aug session-pacing.

- [ ] Deck: one card at a time from unvoted set (createdAt order), skipped moves to back
- [ ] Yes/No auto-advances after Firestore round-trip
- [ ] Skip does NOT count toward SESSION_BATCH (8)
- [ ] After 8 Yes/No votes → friendly "Load 8 more / Save for later" prompt (not hard cap)
- [ ] "Save for later" → parked state with "change my mind" link
- [ ] Progress bar hides denominator (394 items too overwhelming)
- [ ] Reset clears skip set + returns to full deck
- [ ] Preset reload from FANTASY_WISHES_PRESETS still works
- [ ] Match celebration is subtle (toast + inline highlight), not full-screen modal

### 5D · Standalone screens sweep

Screens that didn't get their own round.

- [ ] **Tonight's Date (Roulette)** — spin, LDR virtual filter, save-to-list
- [ ] **Special Days (Calendar ledger)** — add, edit, delete, secret dates, auto-Valentine/birthday/anniversary rendering
- [ ] **Flirt Reminders** — add, edit, delete, day-of-week schedule, local notification test (EAS build required for real push)
- [x] ~~**Memory Wall**~~ — feature removed (renamed to Moments in c649e3f). Only legacy `memoryService.subscribeMemories` read on Home for memory-of-the-day card. No standalone screen. Skip.
- [ ] **Mood + Mood History** — daily pick, Kinky/Horny paid gate, history view, timezone edges
- [ ] **Sparks** — pick emoji + message, send flow, incoming spark card

### 5E · Profile screen

- [ ] Name + photo edit
- [ ] Password change
- [ ] Notifications toggle
- [ ] Relationship date change
- [ ] Explicit-content toggle (adult moods + Spicy category visibility)
- [ ] Intimacy Log toggle (already flipped in 5A)
- [ ] LDR toggle (already tested in Round 3)
- [ ] Sign out
- [ ] Delete account (destructive path — dry-run only, don't actually delete QA account)
- [ ] Legal document links (Privacy Policy, Terms of Service) open correctly

---

## ⏳ Pending — Bug bash Round 3

- [x] **Copy sweep** across all screens — ✅ shipped `b1bb14a`. Round 3 agent audit found 8 lingering issues + 1 defensive opportunity. All fixed: challenge.tsx error message (leaked "Permission denied, check Firebase rules"), profile.tsx pairing error fallback (leaked reason codes), inactive-partner hint on Home, T-or-D sent-truth banner, Us tab "Speak their language" card, state-union wait hint, 2 sensate guided prompts, T-or-D mode picker sub. Also defensive-wrapped `versus.tsx` question text in personalise(). **Zero em dashes** and **zero unwrapped `{partner}` tokens** confirmed clean across app/ and components/.
- [x] **LDR mode toggle test** — ✅ PASSED. Profile toggle flips filters cleanly: T-or-D pool switches between `ldr + either` and `physical + either`, Home ritual copy adapts, Notes / Countdowns / Roulette LDR variants surface.
- [x] **Unpaid user coverage** — PASSED Aug 2026. Flipped `couples/{id}.isPremium = false` on QA couple. Verified: Profile plan pill → Free, Discover lock icons on Fantasy Wishes + Activity Cards, Us Nurture lock icons on Intimacy Log + The Lovers + Presence, deep-link paywall gates redirect (/fantasy-wishes, /sensate, /blueprint, /intimacy-tracker, /bingo → /upgrade), Daily Deep + Spicy category locks, WYR + TorD Spicy level locks (both solo + multiplayer modes), 30-Day Challenge Fire + Desire locks, Mood picker Kinky + Horny greyed locks. TorD "Write your own" naturally gated by Spicy level redirect — no separate gate needed.

## ⏳ Launch-prep chain (after bug bash passes)

- [ ] **RevenueCat integration** + webhook writes `couples/{id}.isPremium` — client cannot write these two fields, verified in `firestore.rules`. Need RevenueCat project + product SKUs + StoreKit config on Apple side + webhook endpoint (Firebase Function).
- [ ] **Cloudflare Email routing** for `support@lovedesireapp` (or chosen domain) — needed for App Store submission contact + user support inbox
- [ ] **Apple Developer enrollment** ($99/year) + EAS build (production profile) + TestFlight submission + App Review (age rating 17+, in-app 18+ attestation)

---

## ✅ Shipped this session (Aug 2026)

- `ec07482` — Challenge drag-to-reorder via react-native-sortables (Reanimated 4-compat drag library, replaces broken draggable-flatlist attempt + HTML5 hack + arrows fallback). Works on web + native. **User-tested PASS.**
- `2086517` — Challenge: unlimited edits for paid tier (server-side isPremium in editTask transaction, UI shows "Unlimited edits, premium" + always-on edit pencil).
- `5182649` + `9095387` — Challenge Edit modal: Save button resize + 🔄 Suggest another button + 150 alternate tasks authored (30 per program via 5 parallel agents against memory/challenge_alternates_prompt.md).
- `c7341b5` — H22 pairing: accepter always leaves /pairing after successful accept (was silently stuck when `ob.completed` was true or lookup threw). **User-tested PASS.**
- `36a39dd` — H22 pairing: route accepter to /onboarding-tour after successful accept (mirror joiner-side routing).
- `e03f766` — H22 pairing: fix accept-side stuck-on-pairing race — `justAccepted` flag + useEffect watches `profile.coupleId` before routing.
- `aa358b3` — H22 pairing accept/decline flow — Óli approves Ola's pair request before couple confirmed. Server writes pending fields, root modal on any screen, waiting screen + Cancel for joiner, snapshot-driven cancel/decline.
- `6b54798` — Bingo: in-app "partner passed, try another" signal on picker's turn indicator (derived from `receiverPasses` counter, no new schema field). **User-tested PASS.**
- `0e937c1` — Bingo skip B logic: turn stays with sender on skip (they pick another), 3-consecutive-skip safeguard flips to receiver. **User-tested PASS.**
- `7bd6210` — Bingo copy: "Tonight's Activity" (picker) + "picked activity card for us" (receiver) + "Send this to {partner}" CTA — reframe from solo-challenge to joint activity. **User-tested PASS.**
- `d46dabc` — Bingo: reword 3 asymmetric activities to reciprocal ("Send each other voice notes..."). **User-tested PASS.**
- `332daaf` — WYR: reverted the Reset text link (Change chip already handles quit-and-restart). Kept the "Continue later" summary modal copy from 9282f2c.
- `9282f2c` — WYR: summary modal right button "Continue later" (was "Reset with something Playful?") + short-lived Reset link (reverted next commit).
- `c84223e` — WYR: 6 role-flipped questions rewritten to symmetric shared-preference form ("Watch partner / Be watched by partner" → "One of you performs while the other watches / Both stay fully focused"). Bug where impossible-to-match structure fired "You differ!" on couples who structurally agreed.
- `d56a2a7` — H21 WYR daily cap (5/day free tier, "Draw 5 more" paid up to 3 packs = 20/day max). Mirrors Daily Picks bonus-draws pattern. **User-tested PASS.**
- `d59e25d` — WYR: 56 discussion prompt rewrites (agent audit) to fix A/B-flavored bug where discussion assumed one option won. Playful 21 + Romantic 21 + Spicy 14 rewrites, 135 kept as-is.
- `d2068f2` — H20 Truth or Dare Home "Waiting for you" nudges (2 mutually-exclusive branches: answering-waiting + picking-fresh-turn). **User-tested PASS.**
- `b1bb14a` — Round 3 copy sweep: 9 findings fixed (leaked internal errors, bare pronouns on Home + T-or-D + love hub + state-union + sensate + profile) + defensive personalise() on versus
- `b10c986` — CLAUDE.md companion-docs index (so future sessions know BUG_BASH / POLISH_TODO / TEST_CHECKLIST / etc. exist)
- `51dedba` — Created BUG_BASH.md (this file)
- `d830fed` — Bingo + Together List `personalise()` fix for literal `{partner}` render
- `9c4d6b1` — T-or-D targetName fix (`{partner}` substitutes with picker's name from both phones' viewpoint)
- `fafc46a` — H19: Delete async dares entirely + add manual truth/dare authoring in Wherever You Are
- `bf1d830` — Async Dares setSending state reset on success (silent-noop fix — superseded by H19 deletion)
- `95cf706` — H18: AsyncDaresPanel folded into T-or-D picker (superseded by H19)
- `c02cc62` — Home nudge completed-dare deep-links to `/dares?tab=sent` (superseded by H19)
- `6ffa204` — T-or-D stale pre-H14 dare session unblock (guard on `phase === 'done'` not `dareConfirmed.includes(uid)`)
- `ff2099a` — H17: [Play] [Dare Log] top-tab pair (superseded by H19)
- `3a99c23` — H16: 3-way dare context (`ldr` / `either` / `physical`) replaces boolean `remote?`
- `704a560` — H15: LDR filter + 85 new remote-safe dares authored via 3 parallel agents
- `9e7664e` — H14: T-or-D merge (fold `/dares` into picker) + single-tap dare confirmation
- `0287c49` — Content: rotating-role rewrites in DARES + FANTASY_WISHES to remove "them/their" where role is rotating (not partner-specific)
- `243a895` — H13: Daily matches Home nudge (fires when both voted yes on today's pick but user hasn't saved it) + full DARES pronoun sweep (198 first-position pronoun conversions across DARES/CHALLENGE/DAILY_WISH/WYR/FW/BINGO/QUESTIONS)
- `bf8fa4b` — Em dash sweep (34 replacements across 17 user-visible files)
- `a70d732` — UI framing pronoun sweep (inline "your partner" → partner name)
- `e8fb2cb` — Full content-pool pronoun sweep + wire `personalise()` everywhere
- `#6 Daily flow` — Bug bash Round 2 item — PASSED
