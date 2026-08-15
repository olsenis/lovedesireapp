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

### #7 Intimacy Log narrative — Phase 1 ✅ shipped (next commit); Phase 2+3 deferred
**File:** `services/intimacyService.ts` + `app/intimacy-tracker.tsx` + `app/(tabs)/index.tsx`
**Change:** Pure client-side monthly narrative surface + Home discoverability nudge.
- New helpers: `generateMonthlyNarrative(entries, monthDate)`, `computeMonthlyDelta(entries, monthDate)`, `previousMonthDate()`
- New NarrativeCard at top of Stats tab, past-month only (≥3 entries threshold), rose-stripe blush card. 2-4 warm sentences + Pulse-style delta pill (up/down/flat) + optional reflection prompt when Disconnected entries exist.
- New Home nudge: days 1-7 of new month, prev-month ≥3 entries → `✨ Your {month} in intimacy · N moments · read the story →` routing to `/intimacy-tracker?tab=stats`
- Deep-link `?tab=stats` support added to intimacy-tracker mount
**Deferred (Phase 2):** ties to Sensate + Daily via one-tap "want to log this?" prompts on stage completion / spicy pick vote. Requires suppressing `notifyPartner` side-effect for auto-logged entries.
**Deferred (Phase 3):** anonymised cross-couple benchmark ("couples in year 3 log an average of 6/month"). Requires scheduled Cloud Function writing anonymised aggregates + opt-in settings toggle + Privacy Policy addendum.

### Deferred
- **#2 Emotional Weather** — needs historical data before it can pattern-match. Revisit post-launch.
- **#4b Versus starter pool** — cold-start fix. Revisit if user reports post-launch.

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

### H17 T-or-D ↔ Dare Log unified via top-tab pair — ✅ shipped (next commit)
**Files:** `app/truth-dare.tsx`, `app/dares.tsx`
**Change:**
- Added a `[Play] [Dare Log]` segmented control to both screen headers. Play = /truth-dare, Dare Log = /dares. Tabs use `router.replace` (not push) so nav history stays flat — neither screen stacks under the other. User perception: tab flip. Mechanism: route swap. This is Phase 1 of the merge — Phase 2 (true state-preserving inline via component extraction) deferred to post-launch if state loss on tab-swap becomes an actual pain point.
- Play tab only rendered on T-or-D picker (not during active game phases) so mid-round swap cannot visually abandon a session.
- T-or-D "Send a Dare" mode card now routes to `/dares?compose=true` — dares.tsx auto-opens compose modal on mount when that param is present. Meaningful distinction: Send-a-Dare mode card = compose immediately, Dare Log tab = browse pending + sent history.
- CLAUDE.md updated with the new picker header shape + tab semantics.
**Why:** User caught during Bug bash Round 2 that `/dares` was a black box only reachable via transient Home nudges or the T-or-D Send-a-Dare mode card. The async dare history — a valuable relationship artifact — had no discoverable entry from any tab. User's stated ask: "flipi history eða eitthvað álíka" (tab history or similar).

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
