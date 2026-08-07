# Post-Launch Enhancement Ideas

Living document of feature ideas that made conceptual sense but were deferred past launch. Each entry captures: what, why deferred, effort estimate, decision criteria for revisiting.

Update rule: when an idea ships, move it out to CLAUDE.md / APP_MAP.md. When an idea gets rejected on reflection, delete it. Keep this file lean — deferred means "revisit later", not "graveyard".

---

## Rebalance Spicy tab count (raised August 2026)

### What

Daily's Spicy tab renders 13 items per day (10 actions + 3 questions), noticeably heavier than Playful (8) and Deep (8). Consider capping Spicy at 5 actions total so all three tabs match at 8 items.

### Why the imbalance exists

Historical: pre-merge Flirty was a free Daily Picks category. When Daily merged (July 2026) and Flirty moved to the paid tier as part of the free/paid split, both Flirty (5/day) and Spicy (5/day) subpools got mapped under the Spicy tab. Net: 10 actions/day instead of 5.

### Why deferred

Not a bug. Two defensible framings for keeping asymmetric:
- Paid users pay for more content → 13 vs 8 is a value differentiator
- Spicy pool is larger than Sweet/Deep (164 combined vs 60/30) so daily rotation stays fresh without repetition even at 10/day

Real users may or may not perceive the "wall of cards" feel. Wait for signal before cutting.

### Three options if we do act

- **B1:** Spicy 5 spicy + 0 flirty — Flirty content orphaned in daily rotation (still available if we surface it elsewhere)
- **B2:** Spicy 3 spicy + 2 flirty — mixed, both subpools rotate, all content still surfaces just less frequently
- **B3:** Merge Flirty items into Spicy pool permanently (rename category) — bigger refactor with data migration, cleanest long-term because the Flirty/Spicy distinction is invisible to users anyway (both paid, same tab)

### Decision criteria for revisiting

- Analytics show Spicy tab has high scroll depth but low completion rate (users feeling overwhelmed)
- Reviews mention Spicy being "too much" or "hard to get through"
- Session length on Spicy consistently longer than other tabs beyond what's expected

### Effort estimate

- B1 or B2: ~10 min (one-line change to DP_SOURCES or slice logic in daily.tsx rows builder)
- B3: ~30-45 min (content re-categorization + migration path for existing dailyWishes docs)

---

## Grow content pools (raised August 2026)

### What

Several content pools are thin enough that active couples will loop through them within a few weeks. Targets below are informed by looking at the level picker with question counts visible — small numbers made the app feel content-poor even though 60-70 is plenty for typical use.

Priority ranking (by likelihood of user hitting the loop point):

| Pool | Current | Target | Delta | Estimated hours |
|---|---|---|---|---|
| WYR Playful | 70 | 150 | +80 | ~4h |
| WYR Romantic | 60 | 120 | +60 | ~3h |
| WYR Spicy | 61 | 100 | +39 | ~2h (paid) |
| Activity Cards | 55 | 100 | +45 | ~2h (paid) |
| Daily Picks Sweet | 60 | 100 | +40 | ~2h |
| Daily Picks Flirty | 60 | 100 | +40 | ~2h (paid) |
| Daily Picks Deep | 30 | 60 | +30 | ~1.5h (paid) — MVP set landed Aug 2026, grow when analytics justify |
| Truth or Dare (all levels) | 141 | 250 | +109 | ~5h |

**Total content debt: ~20h of focused writing across all pools.**

### Why deferred

Not launch-blocking. Even the smallest pool (Activity Cards at 55) supports weeks of use before repetition. Descriptor labels ("Light and fun", "Intimate, X-rated") replaced raw counts in the WYR level picker so users no longer see "70 questions" and pre-conclude the app is thin.

### Decision criteria for revisiting

- User reviews mention "we finished all the questions" or "keep seeing the same ones"
- Retention data shows drop-off at week 3-4 when active users would naturally hit loop points
- A specific content area gets specifically requested (e.g. "more Playful WYR" feedback)

### How to add without touching code

All pools live in `constants/content.ts` as arrays. Adding items = append new entries. No code changes needed. Existing `discussion` field on WYR items is optional but adds real value — worth including on every new one.

### Non-goals for first content pass

- No new categories or level types (keep 3 levels per pool for now)
- No user-generated content (would need moderation flow, big scope)
- No AI-generated content (quality variance, brand-tone risk — see ai_research.md in memory)

---

## More WYR themed packs (raised August 2026)

### What

WYR themed packs shipped with 2 sample packs (Getting to know you, Friday night). The mechanic supports N packs — adding more is content-only work. Queued pack ideas ranked by likely appeal:

1. **First fight aftermath** (Romantic-heavy) — questions for the "we just had a fight, let's not pretend everything is fine" moment
2. **Fantasy night** (Spicy, paid) — 10 curated Spicy questions with a slow escalation arc
3. **Weekend planning** (Playful) — "what do we want this weekend to feel like" — practical + emotional
4. **Values check** (Romantic-heavy) — money, family, boundaries, ambitions
5. **Long-distance edition** (Romantic + LDR-tagged) — questions only surfaced when isLongDistance is on
6. **New relationship** (Playful/Romantic mix) — for couples in first 6 months, discover basics
7. **Long-term couple** (Romantic/Deep-adjacent) — for couples past year 3, deeper reflection

### Why deferred

Content authoring, not code. Each pack = ~10 hand-curated WYRQuestion objects sequenced into a narrative arc. Realistic budget: **~1h per pack** to draft + review + tune the sequence for flow. 5 more packs = 5h focused writing. Not a launch blocker — 2 packs demonstrate the mechanic.

### Decision criteria for revisiting

- Real users spend time in themed mode (analytics: session-with-packId count)
- Reviews mention "we finished the packs, want more"
- Content backlog has spare bandwidth (competes with Daily/Truth pool growth)

### Effort estimate

- Per pack: ~1h (draft + copyedit + sequence tuning)
- All 5 queued: ~5h focused authoring session
- No code changes required — just add entries to `WYR_PACKS` in `constants/content.ts`

---

## Home screen widgets (Android + iOS) (raised July 2026)

### What

Native OS home-screen widgets that pull live data from the app without opening it. Turns Desire into a "present-in-daily-life" surface rather than a destination the user has to consciously visit. Candidate widgets, ranked by likely engagement lift:

1. **Partner mood** (small square) — big emoji + note ("Ola: 😊 Playful · 2h ago"). Sits on home screen so user sees partner's current state every time they unlock the phone. Highest signal-to-effort ratio.
2. **Daily nudge** (medium rectangle) — "Ola is ahead by 2 picks + 1 question today · Tap to catch up". Deep-links to `/daily`. Mirrors the existing Home nudge but skips the app-open step.
3. **LDR countdown** (small square) — "127 days together · 5 days until visit". Only relevant if `couple.isLongDistance`.
4. **Latest match** (medium rectangle) — most recent Fantasy Wishes or Daily action match with a "Tap to view" CTA. Emotional payoff surface.
5. **Quick spark** (small tappable) — one-tap sends a heart/spark to partner from the widget itself. Requires background-task capability (deep link with query param that fires spark on cold launch).

### Why deferred

Expo Managed workflow does not support native widgets out of the box. Options:

- **`react-native-android-widget`** — third-party Android-only lib + Expo config plugin. Roughly 2-3 days to wire up one widget end-to-end (widget XML layout, Kotlin update service, RN bridge to fetch data from Firestore, refresh scheduling).
- **Custom Expo config plugin with native Swift/Kotlin** — full control, both platforms. 5-7 days for the first widget; each additional widget adds a day or so.
- **Eject to Bare workflow** — biggest lift, breaks the current EAS build flow, hard to reverse.

iOS is even heavier because WidgetKit requires SwiftUI code and iOS 14+ Widget Extensions. Live Activities (iOS 16+) for the daily nudge would be a separate integration.

Beyond the initial build, widgets have real-world quirks that only surface in device testing:

- Refresh cycles are OS-controlled and rate-limited (Android throttles background updates; iOS has a strict WidgetKit timeline budget).
- Image caching for partner avatars / mood emoji needs a widget-local cache, not the app's memory cache.
- Firestore auth in a widget process differs from the app process — needs careful token handling.
- Widget layout scales poorly across manufacturer skins (Samsung One UI, MIUI, Pixel Launcher all render differently).

Also competes for engineering time with launch blockers (RevenueCat integration, App Store submission, remaining security testing).

### Decision criteria for revisiting

Ship a first widget post-launch if any of these hit:

- **Daily-open rate is high but session duration is short** — analytics signal that users open just to "check partner" and leave. A widget removes the open step entirely and reinforces that habit.
- **Reviews mention "want to see partner without opening"** — direct request signal.
- **Retention drops off after week 2-3** — widgets can rebuild the "always there" feeling without asking the user to remember to open the app.
- **A specific competitor gains traction with widgets** (Paired, Between, etc.) — market pressure.

Order to ship: **Partner mood → Daily nudge → LDR countdown → Quick spark → Latest match**. Partner mood is highest ROI (proven Between/Paired pattern) with simplest data flow (single Firestore doc read, no interactions).

### Effort estimate (per widget)

- **First widget on Android via react-native-android-widget**: 2-3 days (setup + data flow + refresh + design + QA on 2-3 launchers)
- **First widget on iOS via WidgetKit**: 3-4 days (Swift extension + timeline provider + design + QA)
- **Each additional widget**: ~1-1.5 days per platform, assuming shared data-fetch layer
- **Live Activities (iOS 16+) for daily nudge**: separate 2-day integration on top

Realistic first pass = Partner mood widget on both platforms = **1 week of focused work + QA**. Full 5-widget suite on both platforms = **3-4 weeks**.

### Non-goals for the first pass

- No interactive widgets on iOS pre-iOS 17 (limited by WidgetKit)
- No configurable widgets (pick which stat to show) — ship one clear layout per widget type
- No cross-couple widgets ("all your friends' moods") — this is a 1:1 app, don't drift into social

---

## Dark mode (system-auto, no theme picker) (raised July 2026)

### What

Respect the device's system dark mode via React Native's `useColorScheme()` hook. When phone is in dark mode, the app switches to a dark-tinted palette (deep burgundy backgrounds, cream text, adjusted card contrast). No user-facing theme picker — the setting comes from the OS, matching what iOS/Android users expect from every other native app.

### Why deferred

Reviewer flagged the app is light-only. Real work involved:
- Duplicate `Colors` palette with dark variants
- Wrap every screen with a `useTheme()` hook or theme-aware color accessor
- Sweep 30+ screens for contrast bugs, unreadable buttons, hardcoded hex values
- QA every mood/emoji/gradient surface

Honest estimate: **1-2 days of focused work** plus surprise UI bugs in dozens of places.

Launch-time rule of thumb: most couples apps in this category launch light-only and add dark mode based on real user demand rather than one reviewer note. Doing this pre-launch competes with real launch blockers (RevenueCat, App Store submission, security audit).

### Decision criteria for revisiting

Ship after launch if any of these hit:
- App Store review comments ask for dark mode (not just "would be nice", but "makes it hard to use at night")
- Real users request it in support/feedback more than once
- The user themselves reports discomfort using the app in dark rooms

### Effort estimate

- Palette + theme accessor scaffolding: 3-4 hours
- Sweep every screen: 6-8 hours (this is where hidden bugs live)
- QA on both platforms + accessibility contrast check: 2 hours
- **Total: 1-1.5 days**

Explicit non-goal for the first pass: no theme picker (light/dark/rose/midnight). System-auto only. Custom themes can be a separate follow-up if analytics justify it.

---

## Enhanced item view for paid subscribers (raised July 2026)

### What

Each Together List item currently shows just title + Mark as done + Remove in the bottom sheet. Enhance the sheet **for paid subscribers only** with:

- **📖 HOW** — 3-4 quick execution bullets ("Do the dough 2h ahead", "Split it: one shapes, one tops", "Set a timer and eat before it cools")
- **💡 DID YOU KNOW** — one line of Gottman/psychology-backed fact ("Couples who cook together report 20% higher satisfaction with communication")
- **⏱ duration hint** — "~90 min" or "5 min quick"

Total read time ~10 seconds. Not an essay, not a recipe card — a glance.

### Where the content lives

Optional fields added to existing item interfaces (`DailyWishItem`, `FantasyWishesItem`, `DateIdea`, presets):

```typescript
howTo?: string[];
funFact?: string;
duration?: string;
```

Absent fields → bottom sheet renders unchanged (no null lines, no "coming soon" placeholders). Frees us to enrich items incrementally without breaking anything.

### Free vs paid split

- **Free tier:** title + Mark as done + Remove (unchanged)
- **Paid tier:** title + HOW + FACT + duration + Mark as done + Remove
- Manually-added todos (user typed their own) never get enhanced view — only presets have curated content

### Why deferred

1. **Content authoring is a real project.** 30 items = 4-6h of hand-written prose. 200+ items = a week. Cheap alternatives (category-templated tips, AI bulk generate) feel formulaic and users notice.

2. **Doesn't drive subscription conversion.** Users pay for Fantasy Wishes (394 items), Erotic Blueprint, Sensate Focus, Activity Cards, Fire/Desire challenges, Spicy content. "How to" annotations are polish for existing subscribers, not a hook for new ones.

3. **Effort competes with real launch blockers.** Same 4-6h could go toward RevenueCat integration (actual launch blocker) or content pool expansion (Daily Picks 224 vs 300 target, Activity Cards thin at 55).

4. **Free tier looks weaker by contrast.** If paid users see rich detail everywhere, the free surface starts feeling empty — could hurt free-tier engagement without moving paid conversion.

5. **Cringe risk on "Did you know" facts.** Easily slides into Pinterest-infographic territory. Avoiding that needs careful selection, which is more authoring work.

### Decision criteria for revisiting

Revisit **after 1 month of production analytics** with these signals:

- **Item-open frequency data:** which 15-20 items get opened most? Enrich those first, based on real user behaviour, not guessed priorities.
- **Session duration on Together List:** are paid users spending less time here than expected? Enhanced items could improve engagement.
- **Subscription retention gap:** are paid subscribers churning at similar rates to free users? Depth-adding features could help retention (unlike pure content-volume adds).

If any two of these signal "yes", enrich top-15 items handwritten (2-3h). Ship. A/B test time-on-item vs. control. Scale up only if metrics move.

### Related considerations

- **Tone:** if we ship this, tone must be Gottman-adjacent (science-backed, warm, not cheesy). Avoid "sexy trivia" energy.
- **Bespoke > templated:** if authoring, must be per-item. Category-templated tips ("all intimacy items get same 3 tips") feels lazy on the second read.
- **AI hybrid pattern:** Claude API on-demand with cache could work if we accept quality variance. Not first choice — bespoke curation matches brand better.

### Effort estimate (for revisit)

- Top-15 items handwritten: 2-3h authoring + 1h user review + 30 min UI wiring = **~4h total**
- Full 60 items: **~10h total**
- Full 200+: **~1 week**

---

## Sex Ed section for paid subscribers (raised August 2026)

### What

Dedicated in-app library of short educational tips on intimacy, communication, and sexual wellbeing — paid tier only. Sits as a new section on the Us tab. Users browse by category, read short tips (40-70 words), tap to see a slightly longer detail view with source attribution back to the original creator.

Content sourced from public educational material (YouTube channels, podcasts, published books) but ALWAYS paraphrased into the developer's own words — verbatim transcripts never ship. Fair-use pattern with mandatory credit to the original creator on every tip.

### Content vault (already set up)

Live at `sex-ed/` in the repo, alongside the Obsidian vault so raw research and publish-ready tips share the same workspace:

```
sex-ed/
├── README.md              curation rules, format, copyright policy
├── transcripts/           GITIGNORED — raw research (copyright)
├── drafts/                GITIGNORED — WIP tip writing
└── tips/{category}/*.md   COMMITTED — publish-ready tips
```

**Categories (working set of 8):**

1. `understanding-pleasure/` — physiology, arousal, how bodies respond
2. `presence-mindset/` — in body / out of head, less pressure
3. `communication/` — talking about sex, needs, boundaries
4. `techniques-touch/` — physical approach, what to try
5. `overcoming-blocks/` — past experiences, tension, trust, healing
6. `long-distance/` — LDR-specific
7. `emotional-intimacy/` — connection outside/alongside sex
8. `sexual-health/` — wellbeing, cycles, medical

Tip files carry YAML frontmatter (`id`, `title`, `category`, `tags`, `sourceInspiration`, `sourceUrl`, `publish`, `createdAt`) + markdown body. See `sex-ed/README.md` for the full format spec and 5 seeded example tips (from an Alexey Welsh transcript on female orgasm suppressors).

### Sync script (planned, not built)

`scripts/sync-sexed.ts`:

1. Recursively scan `sex-ed/tips/**/*.md`
2. Parse YAML frontmatter with `gray-matter` (add to devDependencies)
3. Filter items where `publish: true`
4. Validate schema (all required fields present, category matches folder, id is unique)
5. Sort by category then id
6. Emit `constants/sexEd.ts`:

```ts
export interface SexEdTip {
  id: string;
  title: string;
  category: SexEdCategory;
  tags: string[];
  body: string;              // markdown body from the .md file
  sourceInspiration?: string;
  sourceUrl?: string;
}

export type SexEdCategory = 'understanding-pleasure' | 'presence-mindset' | ...;

export const SEX_ED_TIPS: SexEdTip[] = [...];
export const SEX_ED_CATEGORY_CONFIG: Record<SexEdCategory, { label, emoji, description }> = {...};
```

Add `npm run sync-sexed` script alias. Run manually before commit; add to `predeploy` if we want it enforced.

### In-app screens (planned, not built)

- `app/sex-ed.tsx` — top-level list of categories with counts (e.g. `Understanding pleasure · 34 tips`)
- `app/sex-ed/[category].tsx` — list of tip cards in the category (title + first sentence preview)
- `app/sex-ed/tip/[id].tsx` — detail view with markdown-rendered body + "Inspired by [creator]" link at the bottom (tappable → opens sourceUrl externally)

**Us tab addition** ([app/(tabs)/love.tsx](app/(tabs)/love.tsx)) — new section under Nurture:

```
Us tab
├── Rituals
├── Nurture (Intimacy Log, The Lovers, Sensate Focus, Sex Ed ← NEW)
└── Discover yourselves
```

Card: `📚 Sex Ed — Short reads on connection, intimacy, and wellbeing`. Paid gate on tap (routes to `/upgrade` for free users).

### MVP scope for first ship

- 1 fully-populated category (e.g. `understanding-pleasure` with 15-20 tips)
- Sync script + typed constants
- 3 screens (index, category, detail)
- Paid gate
- Markdown rendering via `react-native-markdown-display` (add dep) or a small subset of markdown handled inline (bold, italic, paragraph breaks) to avoid the dep

Ship this shape first, observe usage, then bulk-write remaining 7 categories.

### Copyright / fair use guardrails

Documented in `sex-ed/README.md`. Enforced by:
- `.gitignore` blocking transcripts and drafts from ever reaching the repo
- Tip file schema requiring `sourceInspiration` (creator name) on every tip
- App UI surfacing that credit on every tip detail view
- Never using paid course content (course terms typically forbid derivative work)

### Why deferred

- Not a launch differentiator. The paid tier already carries The Lovers, Sensate Focus, Fantasy Wishes, Activity Cards, Spicy Daily, Fire/Desire challenges. Sex Ed is depth polish, not a conversion hook.
- Content authoring is real work — 200-500 tips is ~40-80h of focused writing + curation from source material.
- The Obsidian workflow needs to be lived-in before we tune it. Better to fill up 20-30 real tips through the process first, then design the sync script + screens against real content shapes, not hypothetical ones.
- Aligns with [feedback_defer_content_authoring.md](../memory/feedback_defer_content_authoring.md) principle: ship clean, enrich from analytics + user behaviour.

### Decision criteria for revisiting

Ship the MVP scope after launch if any of these hit:

- Users specifically request "learn more" content in reviews or support
- The Lovers / Sensate Focus paid features have high open rates, suggesting appetite for reflective content
- Retention analytics show paid subscribers wanting more depth beyond games
- The developer's content vault reaches ≥ 100 publish-ready tips across 3+ categories (means the workflow is proven and the content debt is manageable)

If none of those hit within 3 months of launch, leave in deferred state and revisit only if content vault continues to grow (signalling the developer wants to ship it eventually).

### Effort estimate (for MVP revisit)

- Sync script + typed constants: **2h**
- 3 screens + navigation: **4h**
- Markdown rendering setup: **1h** (with lib) or **2h** (inline subset)
- Paid gate + Us tab card: **30 min**
- Testing + polish: **1-2h**
- **Total dev time: ~8-10h** once content is ready

Content authoring is separate and paced by the developer:
- MVP category (15-20 tips): ~5-8h focused writing
- Full 200-500 pool: **~40-80h** spread over months

### Non-goals for MVP

- No search / filter (defer)
- No favorites / saved tips (defer)
- No user-generated tips (never — moderation cost, wrong direction for a couples app)
- No AI-generated tips (quality variance + brand tone risk, see [ai_research.md](../memory/ai_research.md))
- No video/audio embeds (adds hosting cost, links to source is sufficient)

---

## Full LDR audit + LDR-safe daily action items (raised August 2026)

### What

Two content passes for LDR pairs:

1. **Full LDR audit of existing content pools:** review every entry in `DAILY_WISH_ITEMS` (254), `TRUTHS` (310), `DARES` (~141), `FANTASY_WISHES_PRESETS` (394), `WYR_QUESTIONS` (191), `BINGO_ACTIVITIES` (55), and `CHALLENGE_PROGRAMS` (120) and tag every item that inherently requires being in the same room with `inPerson: true`. Currently only the most obvious ~20 Sweet Daily items are tagged.

2. **Write 40-60 LDR-safe daily action items:** the current pool is ~90% co-located by nature (cook together, share a bath, blanket fort, etc.). Even with the IN-PERSON pill informing LDR users, they see mostly items to save for later. Add new items that work at distance: sync-play episodes, video-dinner rituals, timed voice notes, shared playlists, letter-writing swaps, morning spark chains. Target ~15 items per Daily category (Sweet, Flirty, Deep) so LDR pairs have enough do-able-today content in each tab.

### Why deferred

- Same authoring rule as [feedback_defer_content_authoring.md](../memory/feedback_defer_content_authoring.md): ship-clean-then-enrich-top-N-from-analytics.
- Full audit of ~1400 items = ~6-8h focused review just to tag; writing new content is another ~4-6h.
- Current shipped state: `inPerson?: boolean` field on DailyWishItem, ~20 obvious Sweet items tagged, LDR banner at top of Daily explains save-to-list flow. LDR pairs can vote Yes → save match → do on next visit. Not broken, just not optimal.

### Decision criteria for revisiting

- LDR pair segment ≥ 15% of active couples
- Reviews from LDR users specifically mention "everything is written for people living together"
- Together List analytics show LDR pairs accumulating high match counts but low completion rate (they're saving for visits and never getting to them)

### Effort estimate

- Full inPerson tagging pass across pools: ~6-8h
- 40-60 new LDR-safe daily items: ~4-6h focused writing
- **Total content pass: ~10-14h**

---

## LDR-tagged content across more games (raised August 2026)

### What

Extend LDR-specific content into games where it currently doesn't exist:

- **Would You Rather** — LDR-tagged questions like "Would you rather visit 3x/year for 2 weeks, or 12x/year for 3 days?", "Would you rather move to their city, or have them move to yours?"
- **Truth or Dare** — LDR truths ("What do you miss most about being in the same room?", "When was the last time you cried missing me?"). Dares are inherently in-person so LDR would need "video-call dares" as a distinct sub-mode.
- **Fantasy Wishes** — LDR-flavoured entries around "next time we're together" or "over video" scenarios.
- **Sunday Check-in** — swap or supplement 1-2 of the 5 questions for LDR-specific ones when isLongDistance is on (e.g. "What was the hardest thing about being apart this week?").

Currently LDR pairs get: 42 LDR-tagged Daily questions, 28 virtual date ideas, 3 extra Note occasions, Distance program in 30-Day Challenge. That covers 4 of ~10 content-driven surfaces.

### Why deferred

Aligns with [feedback_defer_content_authoring.md](../memory/feedback_defer_content_authoring.md): ship-clean-then-enrich-top-N from analytics. Writing quality LDR-specific content across 3-4 more games = ~4-6h of focused authoring for ~50-100 items to feel meaningful — and we don't yet know which games LDR pairs actually open.

Some of these are also design-question, not just content:
- Video-call dares as a Truth or Dare sub-mode is a UX design task, not just writing
- Fantasy Wishes for LDR raises the "when? next time we're together?" temporal question
- Sunday Check-in question swap risks breaking the fixed-5 shared identity that both partners recognise

Ship the current LDR feature set, observe post-launch which games LDR pairs use, then invest content authoring in the games they actually engage with.

### Decision criteria for revisiting

- LDR pair segment ≥ 15% of active couples AND their session breakdown shows they open a game with no LDR content (WYR, Truth or Dare, Fantasy Wishes)
- Reviews from LDR users specifically mention "feels made for co-located couples"
- A specific game gets requested by name ("more LDR questions in WYR")

### Effort estimate (for revisit)

- WYR LDR items: ~1.5h for 20-30 items
- Truth or Dare LDR truths: ~1.5h for 20-30 truths
- Video-call dares (design + 15-20 items): ~3h
- Fantasy Wishes LDR flavour: ~2h for 20-30 items
- Sunday Check-in LDR variant (5 questions): ~30 min + design decision on how to gate
- **Total content pass: ~8-10h, spread across passes**

---

## LDR distance banner on Home (raised July 2026)

### What

City-based distance calculation shown on the Home screen for LDR couples.
Not GPS — user picks their city from a small type-ahead once, we store the
coordinates, and compute km with a haversine formula on the client.

Example banner:

```
Reykjavík ⟷ New York
3,584 km apart, choosing each other every day
```

Emotional wrapper with 5 rotating variations of the second line:

- "3,584 km apart, choosing each other every day"
- "The space between us doesn't measure how we feel"
- "An ocean between us, still hearts aligned"
- "Wherever you are, that's where home is"
- "Different time zones, same heart"

### Where the data lives

Add two fields to `UserProfile`:

```typescript
city?: string;              // e.g. "Reykjavík"
cityCoords?: [number, number]; // [lat, lng]
```

Cities dataset embedded as `constants/cities.ts` (~200 world cities, ~50 KB).
Selection persists once; nothing streams live.

### Trigger conditions

Banner is visible ONLY when:
1. `couple.isLongDistance === true`
2. Both partners have `cityCoords` set
3. Cities are not the same (if same → different banner: "Same city, right now")

### Why deferred

1. **Not a launch differentiator.** Existing LDR features (partner timezone
   clock, next visit countdown, pre/post-visit rotating tips, care package
   reminder) already carry the emotional load of "we're connected despite
   distance." Adding km numbers is icing, not cake.

2. **Content coverage matters more.** Same authoring rule as the enhanced
   item view: a nice-to-have feature doesn't move subscription conversion
   or reduce churn. Better to launch clean and add flourishes based on
   post-launch analytics.

3. **City dataset choice needs care.** 200 cities is enough for coverage
   but leaves smaller places out ("what if my partner lives in Selfoss?").
   Type-ahead + fallback to nearest city + user-typed override is the right
   pattern, but that's more design than 2h.

4. **User rejected GPS route.** GPS-based version was proposed and shut
   down (privacy + App Store review risk). The city-based path is the
   accepted compromise but stands better on its own once we're not
   racing launch.

### Decision criteria for revisiting

Revisit if any of these hit post-launch:

- **LDR user segment > 20% of active couples** — the feature earns
  investment if a meaningful share of couples are actually LDR.
- **Retention gap between LDR and co-located couples** — LDR churn higher
  than co-located suggests the LDR narrative isn't strong enough; distance
  banner could help.
- **Users complain in reviews** about missing "distance-aware" feel —
  concrete signal from real usage.

If none of those hit within 3 months of launch, park indefinitely.

### Open design questions (deferred with the feature)

- **Copy voice** — pure info ("3,584 km apart") vs. poetic ("choosing each
  other every day"). Draft picked the combined form (info line + italic
  poetic line).
- **Same message for both partners on the same day?** Yes — sync via
  date-seeded rotation so both phones show identical text.
- **Units** — km always, no user preference. Simpler and internationally
  readable.
- **Placement** — above the partner hero card or beneath the timezone
  pills. Home layout will have moved by revisit time; decide then.

### Effort estimate (for revisit)

- Cities dataset embedded: **30 min**
- Profile field + type-ahead: **30 min**
- Haversine + banner: **30 min**
- Copy variations + date-seeded rotation: **15 min**
- **Total: ~1.5-2h**

---

## Template for future entries

```
## <Idea name> (raised YYYY-MM)

### What
### Why deferred
### Decision criteria for revisiting
### Effort estimate (for revisit)
```

Keep entries tight. If the entry stops making sense on re-read six months later, delete it.
