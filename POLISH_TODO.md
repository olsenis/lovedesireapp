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

### H5 Async Dares launcher tile — ✅ shipped (next commit)
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

### H12 Warmer inactive-partner state — ✅ shipped (next commit)
**File:** `app/(tabs)/index.tsx` between couple hero card and insight card
**Change:** When `isConnected && !partner?.name?.trim()` (paired via invite but partner never set their name), a warm blush hint appears: "Waiting for your partner to open Desire ✨" + sub "Their avatar and name will appear here once they set them." Vanishes the moment partner sets name in Profile. Signal-only — no "Nudge them" button because we have no reliable push channel for a partner who hasn't opened the app enough to grant notification permission.

---

## Ongoing / behavioral

- Refer to the partner by NAME or "your partner" in app copy AND in Claude's conversation with the user — never they/them. Full convention in [CLAUDE.md](CLAUDE.md) under "Pronoun-free copy convention".
