# Post-Launch Enhancement Ideas

Living document of feature ideas that made conceptual sense but were deferred past launch. Each entry captures: what, why deferred, effort estimate, decision criteria for revisiting.

Update rule: when an idea ships, move it out to CLAUDE.md / APP_MAP.md. When an idea gets rejected on reflection, delete it. Keep this file lean — deferred means "revisit later", not "graveyard".

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
