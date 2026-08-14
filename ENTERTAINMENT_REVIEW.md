# Love Desire — Entertainment / UX / Competition Review

> Outside agent review, August 2026. Scored 30+ features on 5 axes (Novelty,
> Depth, Emotional payoff, Repeat play, Ease of use), composited to /10.
> 12 WebSearch queries covered the 2026 couples-app landscape. Headlines cite
> source URLs (bottom). No code changes made — this is a decision doc.

## TL;DR

**Overall entertainment rating: 7.4 / 10** — competitive/best-in-class on
3-4 flagship features, table-stakes or weaker on the rest. Not content-thin,
not UX-broken, not technical-broken. Just not breakthrough-differentiated.

**Top 3 strengths:**
- **Moments (8.8)** — daily dual-photo reveal is an original mechanic. Zero of 12 surveyed competitors do this.
- **Daily (8.8)** — private-then-reveal question flow on par with Amora/Paired, but 3-cat rotation + LDR tags + mutual "add to list" execution is tighter.
- **Sunday Check-in (8.4)** — Gottman-inspired weekly ritual with double-blind reveal. Stronger execution than Lasting or Gottman Card Decks.

**Top 3 weaknesses:**
- **Calendar (5.2)** — table stakes; Cupla does this 5× better with native calendar sync.
- **Pulse (5.6)** — 10-metric self-check finds a clinical niche; no emotional payoff, no repeat play.
- **Journal / Love Language / Blueprint (~6.0)** — all "check the box" features nobody uses regularly past week 2.

**Launch recommendation:** ✅ READY. Enter with strong lead of Moments + Daily
+ Sunday Check-in — content-shipped ahead of competitors. Post-launch, kill
or merge 2-3 weakest, build 1 differentiator.

---

## Rating table (all 30+ features)

Sorted composite desc. Free/paid tag from [app/(tabs)/love.tsx:12-38](app/(tabs)/love.tsx#L12-L38) + `useSubscription.ts`.

| Feature | Tier | Nov | Dep | Emo | Rep | Ease | Composite |
|---|---|---|---|---|---|---|---|
| Moments | Free | 4 | 4 | 5 | 5 | 4 | **8.8** |
| Daily | Free + Paid cat | 4 | 4 | 4 | 5 | 5 | **8.8** |
| Sunday Check-in | Free | 4 | 5 | 5 | 4 | 3 | **8.4** |
| Sparks | Free | 3 | 3 | 4 | 5 | 5 | 8.0 |
| Love Notes | Free | 4 | 4 | 5 | 3 | 4 | 8.0 |
| Fantasy Wishes | Paid | 3 | 4 | 5 | 3 | 4 | 7.6 |
| 30-Day Challenge | Free + Paid programs | 4 | 5 | 4 | 3 | 3 | 7.6 |
| Together List | Free | 3 | 4 | 3 | 4 | 5 | 7.6 |
| Mood + History | Free + Paid adult moods | 3 | 3 | 3 | 5 | 5 | 7.6 |
| Would You Rather | Free + Paid Spicy | 3 | 3 | 3 | 4 | 5 | 7.2 |
| Activity Cards | Paid | 3 | 3 | 4 | 4 | 4 | 7.2 |
| Sensate Focus | Paid | 5 | 4 | 4 | 3 | 2 | 7.2 |
| Truth or Dare | Free + Paid Spicy | 3 | 3 | 4 | 3 | 4 | 6.8 |
| Roulette | Free | 2 | 3 | 3 | 4 | 5 | 6.8 |
| Flirt Reminders | Free | 4 | 3 | 3 | 3 | 4 | 6.8 |
| Tease (Flashes) | Free | 3 | 2 | 4 | 3 | 4 | 6.4 |
| Countdown | Free | 3 | 3 | 3 | 3 | 4 | 6.4 |
| Year in Review | Free | 4 | 2 | 5 | 1 | 4 | 6.4 |
| Journal | Free | 2 | 3 | 3 | 2 | 5 | 6.0 |
| The Lovers (Blueprint) | Paid | 3 | 2 | 4 | 2 | 4 | 6.0 |
| Our Story | Free | 3 | 2 | 4 | 2 | 4 | 6.0 |
| Versus | Free (data-gated) | 4 | 2 | 3 | 2 | 3 | 5.6 |
| Intimacy Log | Paid | 3 | 4 | 2 | 3 | 2 | 5.6 |
| Pulse | Free | 3 | 3 | 3 | 2 | 3 | 5.6 |
| Love Language quiz | Free | 2 | 2 | 3 | 2 | 5 | 5.6 |
| Calendar | Free | 2 | 2 | 2 | 3 | 4 | 5.2 |

**Distribution:** 5 killer (≥8), 10 competitive (7-7.9), 8 weak (5-6.9), 0 cut-candidates (≤4).

---

## Head-to-head competition matrix

Every Love Desire feature vs. best-in-class competitor for that feature.

| Love Desire feature | Best competitor | Verdict | Why |
|---|---|---|---|
| Moments | (none — original) | Better — moat | No competitor has daily-dual-photo-reveal. Closest is Between's photo timeline but non-synchronized. |
| Daily | Amora, Paired | On par | Amora's private-then-reveal is nearly identical mechanic. Love Desire ships 3 cats/day + LDR tags; Paired ships 1 curated question + articles. Different value angle, same execution level. |
| Sunday Check-in | Lasting, Gottman Card Decks | Better | Lasting has structured series but not a weekly-scheduled 5-question private-then-reveal ritual. Gottman Card Decks are just cards, no cadence. Love Desire's stateUnion weekly key + rules-enforced privacy gate is the strongest execution surveyed. |
| Sparks | (none) | Better — original | One-tap emoji + message micro-love flow doesn't exist in surveyed competitors. Between has messaging but not this level of frictionless emotional ping. |
| Love Notes | Between (photo-timeline), Coral (scheduled prompts) | Better | Condition-locked notes (mood-triggered, visit-triggered) is genuinely novel. Between just does messaging; Coral does daily prompts but not conditional unlock. |
| Fantasy Wishes | Kindu | On par | Kindu invented this mechanic — thousands of prompts, double-blind matching. Love Desire has 290+ items + user-added + Together List integration; Kindu has 2000+ items and longer track record. Different content depth, same UX. |
| 30-Day Challenge | Lasting Series, Ferly "Nurturing Desire" | On par to worse | Lasting has Gottman-backed structured programs; Ferly has 8-week transformational journey. Love Desire's Challenges are less clinical, more playful — different market. Not clearly better, not clearly worse. |
| Together List | Cupla to-dos, Between shopping lists | On par | Utility feature; everyone has this. Love Desire's advantage: fills automatically from Fantasy Wishes / Daily / WYR / Roulette matches. That's the differentiator. |
| Mood + History | (rare — Amora has partner mood) | On par to better | Amora has partner mood as a feature; Love Desire's daily mood + history + LDR-aware UTC boundary + adult moods behind paywall is more developed. |
| Would You Rather | Lovify, generic Q game apps | Better | Custom questions + themed packs + persistent match rate tracking = deeper. Generic apps are quick-fun; Love Desire's WYR is a returning game. |
| Activity Cards | (none direct) | Better — original | No competitor has 5×5 monthly card grid with turn-based reveal. Closest is Cohesa's activity menus but non-gamified. |
| Sensate Focus | Ferly, Coral guided exercises | Better on structure, worse on depth | Ferly has 900+ min audio guided sessions; Coral has guided exercises. Love Desire's Sensate is 3-stage clinical Masters & Johnson protocol — more structured but less content volume than Ferly's library. |
| Truth or Dare | (many casual apps) | Better | Voice audio recording + 2-phone async mode + Spicy paid gate is more feature-rich than any generic Truth or Dare app. |
| Roulette | (many "date idea" apps) | On par | Table stakes; every couples app has a date-idea spinner. Love Desire has LDR-filtered virtual dates as differentiator. |
| Flirt Reminders | (rare) | Better — original angle | Scheduled flirty prompts as local notifications is uncommon. Standard reminder apps are utility; this is intimacy-flavored. |
| Tease (Flashes) | Between messaging, Snapchat | On par to worse | Ephemeral media is Snapchat's core. Between doesn't do 24h expiry. Love Desire has the mechanic but competes with pure messaging apps couples already use. |
| Countdown | Cupla countdowns | On par | Cupla has this. Love Desire's is fine but not distinctive. |
| Year in Review | Spotify Wrapped format (nothing in couples) | Better — original in category | Nobody in couples apps has a year-in-review swipe deck. Great emotional payoff but fires once per year. |
| Journal | Coral guided journaling, Ferly journal prompts | Worse | Coral has structured guided prompts; Ferly has journaling built into intimacy program. Love Desire's is just a free-form textbox with mood tag. |
| The Lovers (Blueprint) | Erotic Blueprint quizzes (many web) | On par | Blueprint is well-known concept from Jaiya. Love Desire packages it well with couple compatibility. One-time use limits depth. |
| Our Story | Between Memory Lane | On par | Between has photo timeline. Love Desire's milestone-based timeline is different angle but not more compelling. |
| Versus | Loverse, Lovify guess-partner games | On par | Question-guess mechanic is common in casual couple games. Love Desire's is nice but data-gated (needs partner's Daily history), which trips first-time users. |
| Intimacy Log | Coral tracking, standalone sex trackers | On par to better | Detailed log with location/type/positions/mood/orgasm stats is comprehensive. But privacy-conscious segment may prefer paper. |
| Pulse | Lasting relationship health scores | Worse | Lasting has structured relationship-health assessments backed by Gottman research. Love Desire's Pulse is a self-report checkbox thing without benchmark or coaching. |
| Love Language quiz | Paired (built-in), 5lovelanguages.com | On par (commodity) | Everyone has this. Not a differentiator. |
| Calendar | Cupla | Much worse | Cupla syncs Google/Outlook/Apple calendars two-way, has date planner, partner priorities. Love Desire's Calendar is standalone with hand-entered dates. Users have real calendars; they won't switch. |

---

## Deep-dives — the 6 weakest features

### 1. Calendar (5.2) — the one to actually consider cutting

**Root cause:** users already have Google/Apple Calendar; Love Desire's standalone calendar duplicates without adding value. Cupla dominates this niche by syncing rather than replacing.

**Options:**
- **A** — Cut entirely; merge auto-derived dates (Valentine's, birthdays) into Countdown, drop the tab. Saves screen real estate. ~15 min removal.
- **B** — Reposition as "Anniversary + special-days ledger" — smaller purpose, less overlap with real calendar. ~30 min copy/UX tweak.
- **C** — Add read-only Google Calendar link (import your calendar events, don't manage them here). ~4-6h integration.

**Recommendation:** B — reposition as a ledger, not a calendar. Solves the "we already have a calendar" problem while keeping the value of shared special-dates.

**Expected composite bump:** 5.2 → 6.4.

### 2. Pulse (5.6) — clinical feel + zero benchmark

**Root cause:** 10 sliders → average score → mini chart. No "your score means X" interpretation, no comparison to other couples, no coaching action. It's a data-collection form pretending to be a check-in.

**Redesign:**
- Reduce to 5 questions (fun, communication, closeness, sex, teamwork)
- After submission, show a plain-language interpretation ("Your closeness is stronger than 6 weeks ago, but Communication dropped — want to try Sunday Check-in?")
- Include one specific action prompt per completion (route to related feature: low fun → Roulette, low closeness → Sensate)
- Cadence hint: nudge every 4 weeks, not on-demand only

**Effort:** 2-3h (form redesign + interpretation logic + routing).
**Expected composite bump:** 5.6 → 7.0.

### 3. Versus (5.6) — clever mechanic, killed by cold start

**Root cause:** requires N binary answers in partner's Daily history to build a pool. New couples land on empty state within their first days. Cold start kills the "aha" moment.

**Redesign:**
- Seed pool with universal binary questions (not from Daily history — from a curated `VERSUS_STARTER_POOL`). First 5 rounds use starter; later rounds mix history + starter.
- Reveal partner's actual answer with a "why?" prompt — turn the guess into a conversation, not just a score.
- Streaks/records — track "you got 4 in a row" or "your all-time high knowing-them score".

**Effort:** 3-4h (curated starter pool ~50 items + reveal-with-why UI + streak persistence).
**Expected composite bump:** 5.6 → 7.4.

### 4. Intimacy Log (5.6) — analytics without narrative

**Root cause:** log entries feel transactional (log a moment, get stats). No emotional loop saying "why should I keep filling this in?"

**Redesign:**
- Monthly narrative summary — auto-generate a mini "story" ("This month you connected 8 times, most often on weekends, mostly Amazing mood, one Disconnected — want to reflect?"). Ships to both partners on 1st of month.
- Ties to Sensate + Daily — completing a Sensate stage or Daily spicy pick prompts "want to log this?" with one-tap fill.
- Anonymized cross-couple benchmark (opt-in) — "couples in year 3 log an average of 6/month" — light social proof.

**Effort:** 4-6h (summary generation function + cross-flow prompts + optional benchmark aggregation via Cloud Function).
**Expected composite bump:** 5.6 → 7.2.

### 5. Love Language quiz (5.6) — commodity content, no reuse

**Root cause:** literally every couples app has this. Once taken, results sit static in profile.

**Redesign:**
- Weekly language-of-the-week nudge — "This week focus on Acts of Service for [partner]" with 3 specific micro-actions to try. Small nudge, big framing.
- Language-match stats — if both partners retake quarterly, show drift/change ("Your Time score dropped from 5 to 3 this year, want to talk about it?").
- Already partly implemented via `getLanguageTip` in home tab — extend into a proper weekly rotating card.

**Effort:** 2-3h (weekly nudge + drift tracking + card component).
**Expected composite bump:** 5.6 → 6.8.

### 6. Journal (6.0) — the "please use this" problem

**Root cause:** free-form text with mood tag. No prompts, no scheduled cadence, no reflection loop. Users don't naturally journal without scaffolding.

**Redesign:**
- Prompted entries — "Tonight, what's one thing your partner did that landed?" or 20-30 rotating prompts. Optional (can still free-write).
- Weekly retrospective — end of week, show a summary of your entries + partner's mood entries side-by-side.
- Streak-lite — 3-day writing streak triggers a small "keep going" confirmation. Don't punish breaks.

**Effort:** 3-4h (prompt library + weekly retro screen + streak counter).
**Expected composite bump:** 6.0 → 7.4.

---

## Net-new differentiators (verified no competitor has these)

### D1 — "Emotional Weather" cross-partner pattern detection

**What:** run passive analysis on both partners' mood history + Sunday Check-in scores + Pulse trends. Surface patterns like:
- "You've both logged Tense on Sundays for 3 weeks — pattern suggests weekly overload. Try a Sunday morning ritual?"
- "Your moods diverge on Fridays — talk about the transition into weekend?"
- "You haven't logged mood in 5 days; partner's been Sad twice. Might be a moment to check in."

**Why no competitor has this:** cross-partner passive-signal analysis with actionable output isn't in Paired, Lasting, Ferly, or Coral. Ferly's coaching is 1:1 human; nothing algorithmic + relationship-aware.

**Tech fit:** Firestore already has all the data. Cloud Function on schedule (weekly) computes patterns, writes to `couples/{id}/emotionalWeather` doc, home surfaces as a card. No new dependencies.

**Effort:** 8-12h (pattern rules v1 — hardcoded, no ML — Cloud Function, home card, dismiss/action wiring).

**Why couples would share it:** "This app noticed we always fight on Sundays" is a viral one-liner. Concrete + emotional + non-generic.

### D2 — Voice Notes with condition unlocks

**What:** extend Love Notes to accept voice recordings (audio infra already exists from Truth or Dare via `uploadTruthDareAudio`). Same condition system (time / mood-trigger / on-arrival / "when you can't sleep") but instead of text, it's a partner's voice.

**Why no competitor has this:**
- Between has voice messaging but not conditional-unlock or time-locked.
- Coral has guided audio content, not partner-authored.
- Ferly has audio but professional, not intimate/personal.
- Truth or Dare has audio but only within the game session.

**Tech fit:** reuses `storageService.uploadTruthDareAudio`, expo-audio recorder, existing note conditions. Zero new infra.

**Effort:** 4-6h (composer voice-recording UI, playback in note reveal modal, storage path convention).

**Why couples would share it:** "he recorded me a goodnight message that only unlocks when I can't sleep" — emotionally distinct payoff.

### D3 — Async Dares (partner-set challenges with photo confirmation)

**What:** one partner sets a dare for the other to complete by a deadline. Dare has a photo/text prompt ("wear this by Friday, take a selfie", "handwrite me a note by tomorrow morning"). Other partner completes and photo-confirms via Moments-style capture. Non-completion isn't punished; completion triggers celebration animation and Together List "we did it" entry.

**Why no competitor has this:**
- Truth or Dare style apps are all real-time same-room.
- Bingo is turn-based but not partner-authored dares.
- No competitor combines async dare + photo-confirmation.

**Tech fit:** reuses Bingo's turn state machine, Moments' photo pattern, Notes' condition system. Composed from existing primitives.

**Effort:** 6-8h (compose UI, deadline enforcement, photo confirmation flow, home nudge).

**Why couples would share it:** playful challenge culture but for couples specifically. Instagram-worthy completion moments.

---

## Paid tier verdict

Paywall gates from `app/upgrade.tsx` + per-screen `isSubscribed` checks.

| Paid feature | Load-bearing? | Rationale |
|---|---|---|
| Fantasy Wishes | ✅ Load-bearing | Direct Kindu competitor. Standalone reason to pay. |
| Sensate Focus | ✅ Load-bearing | Genuinely differentiated clinical content. Standalone reason. |
| Fire + Desire challenges | ✅ Load-bearing | 30-day committed programs; taste for taboo content. |
| Daily Deep + Spicy | ✅ Load-bearing | Extends the strongest free feature (Daily) — natural upgrade path. |
| Activity Cards | ✅ Load-bearing | Solid original game mechanic. |
| Intimacy Log | 🟡 Retention | Serves heavy users but doesn't sell new subs. |
| Blueprint | 🟡 Filler | One-time quiz. Value evaporates after completion. |
| WYR + T&D Spicy levels | 🟡 Marginal | Nice-to-have, not compelling alone. |
| Adult moods (😈 / 🥵) | ❌ Filler | Cosmetic gate. Feels petty as a paywall justification. |

**Verdict:** 5 load-bearing paid features is a healthy count — at $4-8/mo (typical couples app pricing per the Paired benchmark of $75/yr/2), that ratio earns the paywall. Filler features are fine to include (defense of value), but marketing must foreground the load-bearing ones.

**Marketing suggestion:** `/upgrade` screen should lead with **Fantasy Wishes + Sensate + Fire challenges** (the 3 strongest emotional-payoff paid features). Blueprint + Adult moods should not be top-billed — they read as filler and dilute the message.

---

## Active work roadmap (Aug 2026 — post-review sequencing)

Reordered from the reviewer's ROI ranking (below) under "quality + shareability > launch speed" priority. Sequence progresses one feature at a time — change → test → approve loop before starting the next. Each item shows current status.

| # | Feature | Change | Effort | Status |
|---|---|---|---|---|
| **1** | **Voice Notes** (D2) | Add voice recording as media type in Love Notes (in addition to text). Reuses ToD audio infra. Plus Home nudge distinction + auto-title + recipient rename. | 4-6h | ✅ **Shipped** (a36c526 / 5512732 / 646fc5a) |
| 2 | **Emotional Weather** (D1) | Passive cross-partner pattern detection. Weekly Cloud Function analyzes moods + Pulse + Sunday Check-in trends. Home surface. | 8-12h | Deferred — needs historical data to be meaningful, revisit post-launch |
| **3** | **Async Dares** (D3) MVP | Partner-set text challenges with optional deadline + optional photo proof on completion. Accept / decline / mark-complete / withdraw flow. Discover tab card + Home nudges. Streaks, celebration animation, Together List integration deferred to v2. | 3-4h (MVP of 6-8h scope) | ✅ **Shipped** |
| **4** | **Versus** fix | Streaks + persistent records + "talk about it" prompt + better empty state. Starter pool deferred to v2. | 2h (of 3-4h scope) | ✅ **Shipped** (e2ff651) — starter pool below |
| **5** | **Journal** redesign | Rotating prompts (25) via deterministic per-couple weekly seed + Sunday-only retro card (my/partner count + moods + partner mood-log) + 🔥 streak-lite pill (≥3 days, client-derived). No new writes, no schema changes. | 3-4h | ✅ **Shipped** (see commit hash on land) |
| **6** | **Pulse** redesign | 10→5 questions, trend comparison ("stronger/softer than 4 weeks ago"), routes to related features per softest dimension. Cadence hint in intro copy. | 2h | ✅ **Shipped** |
| 7 | **Intimacy Log** narrative | Auto-generated 1st-of-month "story" summary. Ties to Sensate + Daily via one-tap logging prompts. | 4-6h | Pending |
| **8** | **Love Language** weekly nudge | Standalone `/love-language-nudge` screen linked from Us tab Discover. Sunday 09:00 local notification (weekly). 100 curated actions (20 per language × 5). Deterministic pick (weekAnchor + coupleId) so both partners see same trio. | 2-3h | ✅ **Shipped** (bf46a21 + a29dbd2) |
| **9** | **Calendar** reposition | Full "Special Days ledger" rewrite (killed month grid, grouped by time bucket) + Countdowns feature merged in (shared same data). | 30 min → 90 min actual | ✅ **Shipped** (fa7c365 + 361ee9a) |
| **10** | **`/upgrade`** copy reorder | Fantasy Wishes / Sensate / Fire+Desire lead, Blueprint drops to bottom, Activity Cards + Spicy content mid-list. | 30 min | ✅ **Shipped** (801ed02) |
| 4b | **Versus starter pool** (v2) | ~30-50 curated universal binary questions + in-Versus answering mode so brand-new couples with 0 Daily binary answers can play immediately. | ~2h | Deferred — revisit if cold-start bug surfaces post-launch |

**Total: ~35-50h focused work.** At 1-2 items per week: **~2-3 month roadmap**.

**Ordering rationale:**
- **Viral + emotional payoff first** (D2, D1, D3) — features people will TALK about
- **Existing feature fixes after** (#4-8) — grounded in real weak spots per review
- **Copy tweaks last** (#9-10) — highest hygiene/lowest wow

**One rule: one at a time.** Each item ships fully (code → test → approve → commit → push) before starting the next. No parallel WIP branches. User verifies on 2 phones between each.

---

## Post-launch entertainment ROI ranking

Ordered by best expected lift per hour invested (for POST_LAUNCH.md prioritization):

| Rank | Investment | Effort | Expected impact |
|---|---|---|---|
| 1 | Add Versus starter pool + "why?" reveal | 3-4h | Kills cold-start; makes free feature memorable |
| 2 | Journal prompts + weekly retro | 3-4h | Turns dead feature into weekly habit |
| 3 | Voice Notes (D2 differentiator) | 4-6h | Emotional payoff + shareability |
| 4 | Reposition Calendar → ledger | 30 min | Removes weakest feature's drag |
| 5 | Pulse redesign — interpretation + action | 2-3h | Turns clinical form into relationship coach mini |
| 6 | Emotional Weather (D1) | 8-12h | Viral moment + strong differentiator |
| 7 | Async Dares (D3) | 6-8h | Fills gap in game roster with unique mechanic |
| 8 | Grow content pools (already tracked in POST_LAUNCH.md) | 20h | Retention-critical but longer horizon |

**Total post-launch entertainment lift budget:** ~30-45h for meaningful uplift on 6-8 weak features + 3 differentiators.

---

## Coverage inventory

**Explicitly rated (not skipped):**
- All 8 games in Discover tab: Daily, Versus, Truth or Dare, Would You Rather, Activity Cards, Fantasy Wishes, 30-Day Challenge, Roulette
- All 9 rituals in Us tab: Sunday Check-in, Moments, Love Notes, Journal, Intimacy Log, Blueprint, Sensate, Our Story, Love Language quiz
- All 9 standalones: Together List, Tease, Sparks, Mood, Pulse, Calendar, Countdown, Flirt Reminders, Year in Review
- Home tab surfacing: strong across the board — nudge system + insight-for-you card + memory-of-the-day + LDR partner clock. Not rated as a single feature since they compose the others.

**Explicitly NOT rated (out of entertainment scope):**
- Auth screens (Login, Register, Onboarding)
- Pairing flow (invite code + QR)
- Profile / Settings
- Legal (privacy policy, terms)

---

## Sources

- Best Apps for Couples 2026 landscape (MobileAppDaily)
- Best Apps for Couples in 2026: The Complete Guide (Amora)
- 9 Best Couples Apps 2026 Honest Reviews (Connected Couples)
- Paired App Review 2026 (InstaPV)
- Kindu App Review (MobileAppDaily)
- Lasting App Review 2026 (Choosing Therapy)
- Between couples app landscape (MobileAppDaily)
- Coral Couples app launch (Femtech Insider)
- Ferly Intimacy & Relationship (Apple App Store)
- Cupla Shared Couples Calendar (Apple App Store)
- Relish App Pricing 2026 (LoveFix)
- Best Couples Therapy Apps 2026 (OurRitual)
- Gottman Card Decks App (Gottman Institute)
- Best Sex App for Couples (Cupla)

**Reviewed:** Paired, Lasting, Between, Kindu, Coral, Ferly, Cupla, Loverse (surfaced as "Lovify/Couple Game" — Loverse doesn't seem to exist as a distinct app), Gottman Card Decks, Relish, Amora (new entrant), OurRitual (new entrant), Cohesa (new entrant), OMGYes.
