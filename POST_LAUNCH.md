# Post-Launch Enhancement Ideas

Living document of feature ideas that made conceptual sense but were deferred past launch. Each entry captures: what, why deferred, effort estimate, decision criteria for revisiting.

Update rule: when an idea ships, move it out to CLAUDE.md / APP_MAP.md. When an idea gets rejected on reflection, delete it. Keep this file lean — deferred means "revisit later", not "graveyard".

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
