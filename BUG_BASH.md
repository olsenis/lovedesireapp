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

## ⏳ Pending — Bug bash Round 2 remainder

- [x] **#7 T-or-D Truth flow** — ✅ PASSED. Text answer path + audio recording path (record → upload → reveal on both phones) + score bump + next turn. Send-my-answer button padding polish fix landed same session.
- [x] **#7 T-or-D Skip flow** — ✅ PASSED. Picker redraw (max 2) + doer skip (turn switches, no score change, `skipsUsed` increments per uid).
- [x] **#7 WYR full flow** — ✅ PASSED. Includes H21 daily cap (5/day free, "Draw 5 more" paid up to 3 packs = 20/day max), 56 discussion prompt rewrites for A/B-flavored bugs, 6 role-flipped question rewrites to symmetric shared-preference form, summary modal "Continue later" copy. Post-launch item added to POST_LAUNCH.md: WYR saved-matches overview + stats page.
- [x] **#7 Bingo full flow** — ✅ PASSED across multiple commits: activity reciprocity rewording (`d46dabc`), "Tonight's Activity" / "picked for us" copy (`7bd6210`), sender-picks-again on skip B logic (`0e937c1`), in-app passed-try-another status text (`6b54798`). Includes Bingo activities render partner name (personalise fix from `d830fed` verified in-flow).
- [x] **#9 Auth flows** — ✅ PASSED. Register (18+ checkbox + consent write) + login + pairing (invite code generation + entry) + couple-connect + password reset. H22 accept/decline shipped over `aa358b3` → `e03f766` → `36a39dd` → `c7341b5` (final: accepter always leaves /pairing after successful accept, sensible fallback if onboarding lookup fails).

## ⏳ Pending — Manual content read-through (user, self-paced)

- [ ] **Read every content-pool text by hand** — the automated sweeps caught structural issues (em dashes, `{partner}` tokens, first-position pronouns, POV substitution) but only a human can catch tone / typos / awkward phrasing / anything that "reads off" in context. Scope: DARES (274) · TRUTHS (310) · QUESTIONS (474) · DAILY_WISH_ITEMS (254) · FANTASY_WISHES_PRESETS (294) · BINGO_ACTIVITIES (55). Approach: read a category at a time, flag any that need rewriting, batch-fix. Estimate ~2-3h across several sessions.

## ⏳ Pending — Bug bash Round 5 (tail sweep)

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
- [ ] **Unpaid user coverage** — flip `couples/{id}.isPremium = false` on QA couple in Firebase Console → verify gates on Discover / Us / paywalled screens / category gates in Daily + WYR + T-or-D + Challenge.

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
