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

### #5 Journal redesign (3-4h)
**Status:** Pending
**File:** `app/journal.tsx`
**Change:**
- **Rotating prompts** — ~20-30 prompt questions that cycle daily so the blank-page problem goes away
- **Weekly retro summary** — auto-generated 1st-of-week digest of entries from the past 7 days
- **3-day streak-lite** — subtle streak counter, encourages return without punishing skips
**Why:** Journal rated 6.0 as "please use this" problem — nothing pulls users back. Rotating prompts + retro + streak turns dead feature into weekly habit. Rating goal: 6.0 → 7.5.
**Caveats:** Streaks can feel gamified/childish in an intimate app — keep it subtle (colour dot on the button, no big numbers).

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

### H6 Fold "partner suggested" nudge into Together List row (~15 min)
**File:** `app/(tabs)/index.tsx`
**Change:** The Together List row already has a subtitle slot. When partner has suggested items pending, put the count there ("Ola suggested 2 items ✨") instead of firing a separate nudge card.
**Why:** Duplicate surface — the row is right there, the nudge card is redundant.

### H7 Semantic nudge palette (1-2h)
**File:** `app/(tabs)/index.tsx` + `constants/colors.ts` (add tokens)
**Change:** Currently nudge card backgrounds are 6 hardcoded pastel hex values (`#FFF9C4`, `#FFF3E0`, `#F3E5F5`, `#FAEEF2`, `#FFF0F3`, `#FFF4E8`) chosen ad-hoc. Move to a semantic system:
- **Urgent** (waiting for me, expiring): blush (`Colors.blush`)
- **Informational** (partner activity, ambient): cream (`Colors.white` or muted cream)
- **Celebratory** (matches, milestones): warm amber, once — not per row
Also rehabilitate On-this-day + Insight into the token palette (they're currently amber/tan outside the design system).
**Why:** Rainbow-stack effect — no semantic meaning behind colour differences. Palette tokens would make the stack readable at a glance.

### H8 Priority sort + cap the nudge stack (1-2h)
**File:** `app/(tabs)/index.tsx` nudge memo
**Change:** Add priority weights per nudge type. Sort descending. Cap at 4-5 visible with a "See N more" affordance if more exist.
- Priority tiers: incoming actions (P1) > partner-ahead (P2) > time-based (P3) > LDR ambient (P4)
**Why:** LDR + Sunday power-user can see 8+ nudges. Priority + cap keeps Home actionable, not overwhelming.

### H9 Polish Tonight's Picks copy (~15 min)
**File:** `app/(tabs)/index.tsx` Tonight's Picks tiles
**Change:** Rewrite subtitles benefit-first:
- Daily: "Fresh picks and questions every day" → "See what you both feel like tonight"
- Truth or Dare: "Two ways to play, one phone or two" → "Something soft, something bold"
- Fantasy Wishes: "Double-blind voting" → "Discover what you both secretly want"
**Why:** Current copy leads with mechanic. Benefit-first copy converts better.

### H10 Reserve emoji per surface (~30 min)
**File:** `app/(tabs)/index.tsx` nudge branches
**Change:** Give Async Dares its own emoji distinct from Care Package (both currently 🎁). Same for Together-List (✨) vs Fantasy Wishes matches (✨) vs Year in Review (✨). Assign unique icons per source so the stack reads clearly.
**Why:** Repeated icons in the stack collapse visual distinction. First fix: pair each nudge with a semantic icon.

### H11 Prune unused styles (~10 min)
**File:** `app/(tabs)/index.tsx` StyleSheet
**Change:** Remove dead styles: `ritualRow`, `dailyWishCard`, `moodSummaryCard`, `sparkBtn`, `flashBtn`, `name`, `moodSelected*`, `partnerMoodRow`, `sectionHeader`, `changeText`.
**Why:** Housekeeping. No behaviour change; cleaner file.

### H12 Warmer inactive-partner state (optional, ~30 min)
**File:** `app/(tabs)/index.tsx` couple card
**Change:** When partner has never opened the app (no `lastActive`, no mood, avatar shows `?`), add a subtle line under partner avatar: "Waiting for Ola to open Desire ✨" + a "Nudge them" button that sends a friendly reminder push.
**Why:** Half-populated Home looks broken. Explain why + give the user an action.

---

## Ongoing / behavioral

- Refer to the partner by NAME or "your partner" in app copy AND in Claude's conversation with the user — never they/them. Full convention in [CLAUDE.md](CLAUDE.md) under "Pronoun-free copy convention".
