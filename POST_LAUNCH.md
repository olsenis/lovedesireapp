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

## Moments deep history (pagination + FlatList refactor)

### What

The Moments grid currently loads the last 120 daily docs (bumped from 30 in Aug 2026). Beyond 4 months, older moments are in Firestore but not surfaced. For couples using the app past a year, this becomes noticeable — the "photo album" metaphor implies you should be able to keep scrolling back.

### Why deferred

- 120 covers the vast majority of first-year use
- Any real solution needs UX design (infinite scroll vs "See older →" button vs month-grouped accordion) plus a `FlatList` refactor for virtualization once the grid reaches ~200+ image cells (each cell renders 2 `<Image>`s)
- Rendering all history in a plain `<ScrollView>` + `.map()` starts to bite memory on lower-end Android above ~300 concurrent image mounts
- No user has asked; ship at 120 and observe

### Options if we revisit

- **B (flat 365-day bump):** simplest step up but pushes ScrollView + Image render past comfortable limits without FlatList
- **C (Load-more button):** paged `where('createdAt', '<', earliestSeenAt)` follow-up query, appends a batch of 60-120 to the state. Simple UX, low code cost, works with either ScrollView or FlatList.
- **D (month-grouped timeline):** group by YYYY-MM header, collapsed by default, expand to see that month's grid. Prettiest, needs the most design work.

### Decision criteria for revisiting

- User feedback mentions missing older moments
- Couples that hit 4+ months of active use churn or complain
- Analytics show high scroll-depth on the Past moments section (users looking for more)

### Effort estimate

- Option C (Load-more + FlatList): **~2-3h** (state + query + button + virtualization migration)
- Option D (month-grouped): **~4-5h** (design + section list + collapse UX)

---

## Deferred code-review findings from review #5 (raised August 2026)

Three real findings from an outside code review that are correctness/cost concerns worth fixing, but not launch-blockers. Priority ordered.

### N7 — Flashes leak Firestore docs + Storage blobs after expiry

`flashService.ts` sets `expiresAt: now + 86400000` and the client filters expired ones out in `subscribeFlashes`, but nothing actually deletes them. Firestore docs and Storage blobs accumulate forever.

- **Impact:** cost leak + GDPR concern (user expected the content to disappear; it didn't). ~365 stale docs + 365 stale blobs per active couple per year.
- **Fix:** Scheduled Cloud Function (`onSchedule('every 24 hours')`) that queries `flashes` where `expiresAt < now`, deletes doc + associated Storage blob at `couples/{coupleId}/flashes/{ts}_{uid}.{ext}`.
- **Effort:** 1–2h — new cloud function, deployment, verify one couple's data cleans up correctly. Also add same cleanup pass for old Moments if we want an ephemeral tier for those.
- **Revisit trigger:** any GDPR user request, or Firebase cost approaching free-tier ceiling.

### N3 — updateWYRRecordIfBest read-then-write without transaction

`wyrService.ts:154-176` reads current best, compares, writes. Two partners saving best-scores on the same tick could both see the same "old best" and last-write-wins the lower one. Very rare (needs simultaneous separate WYR sessions in the same couple).

- **Impact:** low. Best-of-record for gamification, not data loss for anything important.
- **Fix:** wrap the read+compare+write in `runTransaction` following the same pattern used in `answerWYR` / `saveMatchToList` / `voteOnFantasyWish` — the utility is already imported.
- **Effort:** 15 min.
- **Revisit trigger:** any user reports "my best score reverted" or comes up in analytics.

### N6 — Home tab spawns 15 concurrent Firestore listeners on mount

`app/(tabs)/index.tsx` subscribes to challenge, notes, fantasyWishes, dailyQuestions, dailyWishes, wyr, intimacyLog, sparks, memories, flashes, moments, stateUnion, activityCards, todos, sensate — all as `onSnapshot` on Home mount. Per-user cost: ~15 doc-reads on every cold-open. A busy user opening/closing the app 20 times a day burns ~300 reads/day just on Home.

- **Impact:** cost concern that scales with user base. Not a bug — Home renders "Waiting for you" nudges from all these subscriptions and needs the data.
- **Fix options:**
  - Group listeners by AppState (unsub while backgrounded, resub on foreground)
  - Lazy-load below-fold flow cards
  - Merge multiple couple subcollections into a single "home summary" doc updated by a cloud function
- **Effort:** 2–3h for AppState refactor, more for cloud function summary doc.
- **Revisit trigger:** Firestore read count approaches free-tier ceiling in a given day, or reviewer/user notices Home tab cold-start latency.

Rejected findings from the same review (documented so we don't re-litigate):
- **N8 mood dedup** — misread; mood history is a designed feature, not a duplicate-write bug
- **N9 delete without owner check** — deliberate design decision for 1:1 opt-in trust model
- **N10 pairing 2500ms magic number** — no longer present in codebase (reviewer flagged stale code)
- **N4 useCouple dead-code** — real code smell, not a bug; single-line cleanup if we ever touch that file
- **N11 momentService createdAt overwrite** — cosmetic ordering nit with no functional impact
- **N12 versusService over-fetch of 45 docs** — over-fetch not a bug; 45 is fine at current scale

---

## UGC moderation infrastructure (deferred, revisit if App Store flags 1.2)

### What

App Store Guideline 1.2 says apps with user-generated content need filtering, reporting, blocking, and published contact. Our app has ~15 UGC surfaces where partners write free text to each other (Fantasy Wishes +Add, WYR custom questions, Journal entries, Love Notes, Together List, Countdowns, Milestones, etc.). None of them run through a content filter today. Full moderation build-out (client-side wordlist + Report button on partner content + `reports/{id}` Firestore collection + rules) is ~5h dev.

### Why deferred

The app is 1:1 opt-in: the only person who can send you UGC is a partner you personally invited via an out-of-band 6-digit code. There is no discovery, no public feed, no strangers. Apple's 1.2 rules were written for platforms where any user can push content at any other user; in a 1:1 pair-by-code app, the "block abusive user" primitive already exists as `disconnectFromCouple` in [services/authService.ts](services/authService.ts) (one tap in Profile).

Reasoning:
- Small couples apps in the same category (Paired, Between, Cover) ship with variable moderation depending on whether they have free-form messaging or curated prompts. Ours has both preset content (paywalled explicit stuff is scripted) and light UGC (mostly item names, reminders, etc.).
- WhatsApp / Signal / iMessage all pass review despite being 1:1 or small-group — their block primitive is essentially the same as our disconnect.
- Building a full Report button + queue creates operational obligation (someone has to actually watch the queue) that we can't honor pre-launch. Ships hollow compliance rather than real safety.

### Plan if Apple flags 1.2

Track B from the launch prep plan file (`~/.claude/plans/g-v-ri-til-shimmying-badger.md`): ship a client-side wordlist filter as `services/moderationService.ts` (~40 lines) + one-line gate on all ~15 UGC handlers. ~2h turnaround, resubmit within 24h of rejection. This is the "yes we heard you" move that satisfies reasonable readings of 1.2.

If Apple STILL pushes back after Track B, escalate to Track C: add `<ReportButton>` on partner-created items in 5 highest-visibility renderers (Fantasy Wishes, WYR custom, Love Notes, Journal, Together List) + `reports/{id}` Firestore collection + admin-console review workflow. ~5h + ongoing manual review load.

### Reviewer notes shipped at first submission

App Store Connect submission form gets this text in "Notes for the reviewer" — pre-empts the 1.2 flag by explaining the architecture:

> This app is a 1:1 couples experience — pairing requires a 6-digit invite code that partners share out-of-band (SMS, in person). There is no public feed, no discovery, no way for a stranger to send content to any user. The "block abusive user" primitive Guideline 1.2 requires exists as "Disconnect from partner" in Profile (one tap, immediate). Explicit content is behind a mandatory 18+ age attestation (declined = account deleted) plus paid subscription — non-subscribers cannot access any explicit content. All content is text-only, no visual pornography.

### Decision criteria for revisiting

- **App Store rejection citing 1.2** — build Track B immediately, resubmit
- **User support requests for a Report flow** — genuine demand signal (probably won't happen in a 1:1 pair-by-code app, but if it does, build Track C)
- **Growth beyond 1:1 pairing model** — e.g. if we ever add group features or public content, moderation becomes mandatory

### Effort estimate (for revisit)

- Track B (wordlist floor): **~2h**
- Track C (Report + queue + rules): **~5h + ongoing review load**

Full details of both tracks in `~/.claude/plans/g-v-ri-til-shimmying-badger.md`.

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

### Three design problems settled in the Aug 2026 discussion

**1. The source stash is one-directional.** All 28 transcripts in `transcript/`
teach a man how to please or attract a woman. Building the MVP straight off it
would leave half the user base out, and both partners see the same screens.
Resolution: every tip is written second-person about "your partner", never
"her"/"him", and no category ships more than 60% tipped toward one anatomy.
Full triage in `sex-ed/drafts/SOURCE_TRIAGE.md`.

**2. The app does not know who is reading.** `UserProfile` has no gender field
and must not gain one — gender and sexual orientation are special-category data
under GDPR Art. 9 and would drag the privacy policy and our data-minimisation
posture with them. Resolution: tips carry an `anatomy: any | vulva | penis` tag,
the reader picks a display preference locally, and nothing is written to
Firestore or shared with the partner. Default and strong preference is `any`.

**3. Blanket attribution is a brand risk.** "Always credit the creator" reads as
the safe policy, but it puts source names inside the product. "Inspired by Talk
Sex With Annette" is fine; "Inspired by STOIC ICON" is not. Resolution: credit
named experts (clinicians, educators, authors) only; for established concepts
cite the originating researcher rather than the channel that restated it; never
credit a Tier 3 source, and if a tip can only be attributed to one, it does not
ship. Legally this is also the stronger position — ideas are not copyrightable,
wording is.

### Delivery phases (revised — embedded surfaces before library)

The original plan was library-first: browse by category, read. That is the right
home for the content but the wrong front door — the user has to decide to go to
the classroom. Reordered so the content meets people inside features they
already use.

**Phase 1 — embedded tips (~25-30 tips, no new navigation).**

Tips surface inside existing features at the moment they apply:

- Sensate Focus stage 2 → "more intensity isn't more pleasure"
- The Lovers result → 3 reads per type (`lovers-feeling`, `lovers-sexual`, …).
  The quiz already computes 5 types and 25 compatibility pairs; this makes the
  result keep paying out, and no competitor appears to personalise this way.
- Fantasy Wishes → asking for something new without it landing as a verdict on
  what you have been doing
- Daily Spicy → pacing

Per-feature authoring (8 features × 3-5 tips), **not** the per-item authoring
warned about earlier in this file. Also validates the Obsidian workflow against
real content before the sync script is designed around hypothetical shapes.

**Phase 2 — the library** (screens as originally specced below) once the pool
passes ~60 tips and browsing is actually worth doing.

**Phase 3 — "Try this" actions.** Each tip detail gets a deep link that turns
the read into use: add to Together List, open Sensate, start a Daily category.
This is the real differentiator. Anyone can publish an article library; Desire
already owns the activities the article should push you into.

**Phase 4 — weekly read on Home.** One rotating tip card, weekly not daily.
Daily already carries three categories and two dimensions; do not add a fourth.

### Library screens (Phase 2)

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

Markdown rendering via `react-native-markdown-display` (add dep) or a small subset handled inline (bold, italic, paragraph breaks) to avoid the dep.

### Realistic content volume

The existing stash yields **50-80 tips**, not the 200-500 sketched below, and
they cluster in `understanding-pleasure` + `techniques-touch`. Four categories
(`communication`, `long-distance`, `emotional-intimacy`, `sexual-health`) have
no usable source material yet — `sexual-health` in particular needs clinical
sources only. Plan sourcing for those separately rather than assuming the stash
covers the map.

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

Note that the phase split changes this calculus: **Phase 1 does not need any of
these triggers**. 25-30 tips embedded into features that already ship is a small
enough bet to take on its own, and it produces the usage signal that decides
whether Phase 2 is worth building. The triggers above now gate Phase 2 (the
library), not the feature as a whole.

If none of those hit within 3 months of launch, leave in deferred state and revisit only if content vault continues to grow (signalling the developer wants to ship it eventually).

### Effort estimate

**Phase 1 (embedded tips):**
- Sync script + typed constants: **2h**
- Inline tip component (reused across surfaces): **2h**
- Wiring into 4 surfaces (Sensate, Lovers result, Fantasy Wishes, Daily Spicy): **2-3h**
- Anatomy display preference (local only, no Firestore): **1h**
- **Total: ~7-8h**, no new routes, no paid-gate work (all four surfaces are already gated)

**Phase 2 (library) — original estimate:**

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

## E2EE ephemeral chat between partners (raised August 2026)

### What

True end-to-end encrypted ephemeral chat surface between paired partners. Not another messaging tab that duplicates WhatsApp — a privacy-first intimate content channel positioned like Just Between Us. Messages exist client-side only; Firestore relays encrypted blobs that we cannot read. Screenshot detection with partner notification. Content-less push notifications (payload wakes the app, decrypted body renders locally). Ephemeral by default with 24h auto-delete. App lock (Face ID / PIN) as an optional layer. Panic mode for quick local wipe.

Positioning is the differentiation, not the messaging itself:

- **1:1 pair-only** — no risk of sending to the wrong person (Just Between Us pitch)
- **Integrated with existing Desire surfaces** — chat can reference moods / question answers / sparks contextually
- **Ephemeral by default** — not opt-in like WhatsApp's disappearing messages
- **Cryptographically enforced privacy** — real E2EE, honest marketing, not "encrypted at rest" theatre

### Why deferred

Two independent reasons stack:

1. **Scope pushes launch too far.** Signal-Protocol integration (via `react-native-libsignal-protocol` or a Matrix client), key exchange grafted onto the existing `rateLimitedJoin` pairing flow, multi-device sync, screenshot detection on both platforms, content-less push, panic mode, backup/recovery is 2-4 wk of focused work. Launch is 2-3 wk out already.

2. **Wait for real DAU signal before building.** If daily engagement on rituals/games is weak post-launch, chat won't save the app; if engagement is strong, chat becomes a meaningful moat. Building blind risks a chat feature nobody uses (see Couple.me, Tuned, Official — all shut down).

Research context (from [memory/features_research.md](../memory/features_research.md) and [memory/ldr_research.md](../memory/ldr_research.md)): pure-messaging couples apps have consistently failed. Locket (80M downloads, 9M DAU) and Candle (300k users, $1M ARR) both grow with zero messaging. The counter-signal: Just Between Us survives on the privacy-for-sexting angle specifically, and Snapchat itself proves ephemeral photo/video sharing scales to 400M DAU. Privacy is the #1 blocker for intimate content sharing in LDR pairs. That combination — LDR privacy pain + Just Between Us proof of concept + Snapchat's ephemeral mechanic — is the case for building it *eventually*.

### Design considerations to spec before building

- **Signal Protocol integration** — pick between `react-native-libsignal-protocol` (proven, closer to the reference impl) and a Matrix client (broader features, more overhead)
- **Key exchange during pairing** — extend `rateLimitedJoin` to also exchange initial identity keys; keys stored in device secure enclave (iOS Keychain / Android Keystore), never in Firestore
- **Multi-device sync** — user reinstalls or gets a new phone → key recovery flow. Hardest part; get wrong and users lose all history
- **Screenshot detection** — iOS `UIApplicationUserDidTakeScreenshotNotification`, Android `MediaContentObserver` on the media store; fire an encrypted "screenshot" system message to partner
- **Content-less push notifications** — Expo Push payload = `{ type: "new_message" }`, body encrypted client-side and stored locally; notification just wakes the app to fetch/decrypt
- **App lock** — separate optional biometric / PIN layer for the chat screen specifically, not the whole app
- **Panic mode** — quick tap to wipe all local encrypted message stores; needs to also revoke server-relay-side blobs if possible
- **Backup and recovery** — Firebase Auth handles account recovery; user-controlled backup key (24-word phrase style) needed for message history recovery on new device

### Risks

- **Legal liability if E2EE claim is broken.** If Firestore rules allow admin reads, or Cloud Function logs contain plaintext, or a debug build ever exfiltrates content, the "E2EE" claim becomes fraud-adjacent. Must be air-tight before marketing anything.
- **Firestore relay cost.** Every encrypted blob written + read is a Firestore operation. Cost scales with message volume, not user count — heavy chatters could push into paid tier fast.
- **Multi-device sync is the hardest part.** Get it wrong and users lose message history when they change phones. Signal itself has re-implemented this multiple times.
- **Marketing must be honest.** Every public surface (App Store description, `/support`, `/privacy-policy`) needs to be reviewed by someone who understands the crypto claim, not just writing copy that sounds nice. Never claim E2EE if partially implemented.

### Alternative paths rejected

Documented so we don't re-litigate the discussion:

- **Path B (privacy-lite Firebase-stored ephemeral chat)** — rejected. Marketing "privacy" without real E2EE is fraud-adjacent; reviewers and press catch it.
- **Path C (photo drop only, no chat thread)** — rejected. User wants text conversation, not just photos. Locket-style mutual presence is a different product.
- **Skip messaging entirely** — rejected. Privacy angle is genuinely differentiated and fits Desire's brand as an intimate couples app; the space is unmet.

### Decision criteria for revisiting

Revisit 4 weeks post-launch if BOTH of these hit:

- DAU on daily rituals (Question of the Day, Sparks, moods) is > 30% at week 4 — meaning the app has real habitual use, not just novelty opens
- Any user survey response or support message asks for private messaging / expresses distrust of WhatsApp for intimate content

If only one signal fires, wait another 4 weeks and revisit. If neither fires by month 3, park indefinitely.

### Effort estimate (for revisit)

- Signal Protocol wiring + key exchange: **~1 wk**
- Message envelope + Firestore relay + local encrypted store: **~3-4 days**
- Screenshot detection (both platforms): **~2 days**
- Content-less push + notification handling: **~1 day**
- App lock + panic mode: **~1-2 days**
- Backup / recovery flow: **~2-3 days**
- Design + QA + marketing copy review: **~2-3 days**
- **Total: 2-4 wk focused work**, plus rolling security review

### Non-goals

- No Snapchat filters, lenses, or Stories — those are what makes Snapchat's *social* app retain, they don't map to a 1:1 couples app
- No group chats — always 1:1 with paired partner, never expandable
- No streaks or gamification — turns intimate messaging into "homework with anxiety" (LDR research anti-pattern)
- No discovery / friend graph — this is a couples app, not a social platform
- No unencrypted fallback — E2EE only, if the crypto path fails the message doesn't send

---

## Cloud Logging PII scrub + retention policy (raised August 2026)

### What

`deleteUserCascade` in [functions/src/index.ts](functions/src/index.ts) logs `uid`, `otherUid`, and `coupleId` in plaintext at multiple points. Cloud Logging default retention is 30 days for regular logs, 400 days for admin activity — after a user requests GDPR Article 17 erasure, those log entries still contain identifiers linking them to a couple.

### Why deferred

Log entries don't contain content (mood notes, message bodies, photos) — only identifiers + operational events. GDPR Article 17 has a "system integrity" exception commonly interpreted to cover application logs used for security / audit. Not a blocking issue at MVP scale, but should be tightened before the app has any real user base or first legal audit.

### Fix approach (for revisit)

Two steps:

1. Replace `uid` / `coupleId` in `console.log` / `console.warn` calls with a stable one-way hash: `sha256(uid).slice(0, 12)`. Same input always produces same hash so ops debugging still works ("all events for this hash come from the same account") but the reverse mapping needs Firestore access — a compromised logs.viewer role no longer leaks user identities.

2. Document in Privacy Policy that system logs are retained up to 30 days for regular activity and excluded from Article 17 erasure requests. Legal safe harbor.

### Decision criteria for revisiting

- First GDPR erasure request received
- Any external security audit or legal review
- App crosses ~1000 active users (compliance scrutiny scales with reach)

### Effort estimate

- Hash utility + swap logging sites: **~20 minutes**
- Privacy Policy paragraph: **~10 minutes**
- **Total: ~30 minutes**

---

## Firebase App Check (raised August 2026)

### What

Wire the Firebase App Check SDK with Play Integrity (Android) + DeviceCheck / App Attest (iOS) providers. App Check adds a cryptographic device-attestation token to every Firestore / Storage / Cloud Functions request, which the backend verifies before executing. Blocks requests from spoofed clients that pass Firebase Auth but don't come from a genuine app install.

### Why deferred

Not a security breach — Firestore rules + Cloud Functions auth checks are strong, so a spoofed client can still only do what a real client's user could. App Check is primarily a **cost-abuse defense**: without it, someone could stand up a bot farm that opens real Firebase Auth accounts and hammers Firestore / Storage from a custom client, running up our bill. At current MVP scale, cost surface is negligible.

Also has real-device testing quirks (debug providers, CI integration, Play Store review with attestation enabled) that add friction — not worth spending pre-launch cycles on.

### Fix approach (for revisit)

- Install `expo-firebase-recaptcha` for the web debug provider fallback, `@react-native-firebase/app-check` for native
- Register both provider keys in Firebase Console (Play Integrity for Android, App Attest for iOS)
- `initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true })` at Firebase init in `services/firebase.ts`
- Debug provider for local dev + Expo Go — real providers only work in EAS-built binaries
- Enable Enforcement in Firebase Console per-service after ~1 week of unenforced monitoring to confirm no legitimate requests fail

### Decision criteria for revisiting

- Firebase costs approach the free tier ceiling in a suspicious way (many writes from one uid, unusually high storage reads)
- Any public news of scraping or bot activity against a similar app
- After ~10k users, or 30 days post-launch, whichever comes first

### Risks

- Debug provider requires a debug secret that must be baked into non-production builds — leak of the secret means anyone can bypass App Check in "debug mode"
- Play Integrity fails on rooted Android devices — real user segment (small but non-zero) will be excluded

### Effort estimate

- SDK integration + init: **~1h**
- Provider registration + Firebase Console config: **~30 min**
- Real-device testing on both platforms + debug provider setup: **~1h**
- Monitoring + gradual enforcement rollout: **~30 min ongoing**
- **Total: ~2-3h focused work + gradual enforcement**

---

## Security review v2 — deferred info items (raised August 2026)

Batch of small polish / prevention items from the outside security review, none launch-blocking. All verified in the review pass and consciously deferred with revisit criteria.

### NV2 — Push token stalker path (SEPARATE ENTRY — deferred pending explicit fix decision)

**What.** `services/notificationService.ts` fetches `https://exp.host/--/api/v2/push/send` directly from the client with a partner's pushToken and no auth. Firestore rules allow a paired user to read `users/{partnerId}.pushToken`. After a couple disconnects, the previously-paired party retains the token and can push spoofed content indefinitely (until the app is reinstalled).

**Fix scope.** ~1-2 hours. Move `pushToken` from `users/{uid}` to `users/{uid}/private/pushToken` (partner can't read anymore), add a new Cloud Function `sendPushToPartner(coupleId, title, body)` that verifies the caller is currently paired to the target, and route `notifyPartner` through the function via httpsCallable instead of direct exp.host fetch. Requires a one-time migration for existing tokens.

**Revisit trigger.** Any user report of unwanted post-breakup notifications, or before any marketing push emphasizing safety / privacy.

---

### NV8 — Dead `expo-secure-store` dependency

**What.** `expo-secure-store` is listed in `app.json` plugins + `package.json` but has zero imports across `.ts`/`.tsx`. Firebase Auth refresh tokens live in plaintext `AsyncStorage` — recoverable via unencrypted device backup or jailbreak/root.

**Fix.** Either wire SecureStore for Firebase auth persistence (needs custom Persistence implementation because Firebase JS SDK doesn't natively support it) OR drop the dependency to keep the plugin list honest. If wiring, needs test coverage on both platforms since the plugin doesn't work in Expo Go.

**Revisit trigger.** Any auth-token-related security concern, or when reviewing the plugin list before EAS builds.

**Effort:** ~5 min to drop, or ~2h to wire properly.

---

### NV10 — QR regex accepts characters not in invite code alphabet

**What.** `components/QRScannerModal.tsx` regex `/^[A-Z0-9]{8}$/` accepts `0/1/O/I/L` — the actual `CODE_ALPHABET` in `services/coupleService.ts:32` excludes them for legibility. Not exploitable — codes not in alphabet just return `not_found` at the server. Nit.

**Fix.** Tighten regex to `/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/`.

**Revisit trigger.** Any user report of QR scanner accepting weird codes, or general polish sweep before launch.

**Effort:** 1 min.

---

### NV11 — Silent `.catch(() => {})` on flash cleanup delete

**What.** `functions/src/index.ts:286` — the allowed-prefix Storage delete swallows all errors silently. If the prefix guard is ever weakened by regression, out-of-prefix successful deletes leave no trace. Also legitimate failures (file already gone, transient permission blip) disappear.

**Fix.** Replace `.catch(() => {})` with `.catch((e) => console.error(...))` inside the allowed path. Keeps behavior identical (never crash cleanup) but surfaces unexpected failures.

**Revisit trigger.** Any Storage cost anomaly investigation or if the H1 flash cleanup path guard ever changes.

**Effort:** 5 min.

---

## Security / robustness sweep v3 (2026-08-12)

Fresh pass over `firestore.rules`, `storage.rules` and `functions/src/index.ts`
after the v2 round. The rules themselves held up — the dot-path spoofing guards,
the `isPremium` lock on both user and couple docs, the stateUnion completedAt
guard and the H1 flash prefix guard are all sound. Everything below is about
code that does not exist yet, or about scale rather than access control.

### S1 — The RevenueCat webhook is the highest-risk unwritten code in the project

**What.** `firestore.rules` blocks clients from writing `isPremium` /
`premiumSince` on both `users/{uid}` and `couples/{coupleId}`, with comments
describing the RevenueCat webhook as the authoritative writer. **That webhook
does not exist.** `functions/src/index.ts` exports only `rateLimitedJoin`,
`deleteUserCascade`, `cleanupExpiredFlashes` and `cleanupOldTruthDareAudio`.
Nothing, anywhere, writes `isPremium`.

Two separate consequences:

1. **Launch blocker.** A user who pays gets nothing. Premium can currently only
   be set by hand in the Firebase console. Known (CLAUDE.md lists RevenueCat as
   outstanding) but the rules comments read as though it shipped, which is how
   this kind of gap survives a review.
2. **This is where a real vulnerability will appear.** The webhook is by nature
   a public, unauthenticated HTTP endpoint whose entire job is granting paid
   access. When it is written it must:
   - verify the RevenueCat `Authorization` header against a shared secret held
     in secret config, and reject before doing any work if it does not match
   - resolve `app_user_id` to a real couple and refuse unknown ids rather than
     creating documents
   - handle the full event set (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`,
     `EXPIRATION`, `REFUND`, `BILLING_ISSUE`) — a webhook that only grants and
     never revokes means one month paid equals permanent premium
   - be idempotent on redelivery (RevenueCat retries)
   - never trust a client-supplied `coupleId` in the body

**Action.** Do not let this be written in a hurry against a launch deadline.
It deserves its own review pass.

### S3 — `cleanupOldTruthDareAudio` full-bucket scan will not scale

**What.** Runs daily, calls `storage.getFiles({ prefix: 'couples/' })` — which
lists **every** object under `couples/`, i.e. all memories, moments, flashes and
audio for every couple — then filters in JS for `/truthDare/` and issues a
separate `getMetadata()` round trip per surviving file.

At 1000 couples averaging 50 objects that is 50k listed objects plus tens of
thousands of metadata calls per day, all loaded into one function invocation's
memory. It will hit the function timeout and the memory ceiling well before it
hits any interesting user count.

**Fix options,** cheapest first:
- Move audio to a top-level `truthDareAudio/{coupleId}/…` prefix and apply a
  GCS Object Lifecycle rule (age 30 days, `matchesPrefix`). Zero function code.
  Lifecycle rules match prefixes only, which is exactly why the current nested
  path cannot use them.
- Or record audio blobs in Firestore with an `expiresAt` and query that instead
  of listing the bucket.

### S4 — `cleanupExpiredFlashes` fans out one query per couple, hourly

**What.** Reads the entire `couples` collection every 60 minutes and then runs a
separate `where('expiresAt','<',now)` query per couple. Cost scales linearly
with total couples, not with the number of expired flashes, and it runs 24x a
day whether or not anything expired.

**Fix.** One `collectionGroup('flashes').where('expiresAt','<',now)` query.
Needs a collectionGroup index. Bonus: the couple id for the prefix guard then
comes from `doc.ref.parent.parent.id`, which is more trustworthy than today's
loop variable because it is derived from the document's real path.

### S5 — `deleteUserCascade` is on a 1st-gen auth trigger

**What.** `auth.user().onDelete` from `firebase-functions/v1`. Firebase
documents that this trigger does **not** fire for bulk deletions via the Admin
SDK `deleteUsers()` path. If accounts are ever removed in bulk — a support
sweep, a test-data cleanup, a migration — the cascade silently does not run and
leaves orphaned couple documents and Storage objects behind. That is a GDPR
exposure that produces no error anywhere.

**Fix.** Route deliberate deletions through an explicit callable that performs
the cascade itself, and/or add a scheduled orphan sweep that looks for couple
docs whose partner uids no longer resolve in Auth. Verify the exact bulk-delete
behaviour against current Firebase docs before relying on either.

### S6 — NV2 (push token) should be promoted out of "deferred info"

**What.** Re-raising [NV2](#nv2--push-token-stalker-path-separate-entry--deferred-pending-explicit-fix-decision)
with a stronger argument than it got in v2. `notifyPartner` reads the partner's
`pushToken` from `users/{partnerId}` and POSTs directly to `exp.host` with no
auth. The 10-second cooldown is a client-side `Map` — a custom client ignores it
entirely.

The reason this is not a generic info item: **for a couples intimacy app, the
ex-partner is the threat model.** Every other item in this file is about an
abstract attacker. This one describes a person who already had access, retains a
working push token after the couple disconnects, and can push arbitrary text to
someone who left them, indefinitely, until they reinstall. That is the specific
harm pattern this product category gets criticised for.

**Note for whoever fixes it:** moving `pushToken` under `users/{uid}/private/`
also hides `notificationsEnabled` from the partner, so the new Cloud Function
has to check the opt-out server-side too, not just the token.

### S7 — 100 MB Storage ceiling amplifies the missing App Check

**What.** Storage rules cap uploads at 100 MB and restrict content types (both
good, from NV4). But any authenticated user can self-signup and pair two of
their own accounts, at which point they are a legitimate couple member and may
write 100 MB objects at will. App Check is already logged as a cost-abuse
concern elsewhere in this file; the 100 MB per-object ceiling sets the magnitude
of that abuse. Worth reading the two notes together when App Check is revisited.

### Documentation drift found in this pass

The "Flash Firestore + Storage cleanup" entry in the bug backlog below states
that nothing deletes expired flashes. That was fixed — `cleanupExpiredFlashes`
has shipped in `functions/src/index.ts`. Entry corrected in place.

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

---

## Bug backlog from review pass (raised 2026-08)

Non-blocking correctness / cost items surfaced during review. Ship without, revisit as noted.

### WYR `updateWYRRecordIfBest` race

**What**: `services/wyrService.ts:154-176` reads existing best, compares, writes without a transaction. If both partners simultaneously trigger from concurrent WYR sessions, one write can silently clobber the other.

**Why deferred**: Requires both partners playing WYR on separate devices and both crossing the best-record threshold in the same tick. Vanishingly rare at MVP scale.

**Revisit criteria**: If a user reports losing a best-ever record, or if concurrent WYR play becomes common.

**Effort**: ~15 min — wrap in `runTransaction`.

### ~~Flash Firestore + Storage cleanup~~ — RESOLVED

**Was**: `services/flashService.ts:sendFlash` sets `expiresAt: now + 86400000`; client filtered expired flashes out of the UI, but nothing deleted the Firestore doc or Storage blob.

**Resolved**: `cleanupExpiredFlashes` in `functions/src/index.ts` now runs hourly, deletes expired docs and their Storage blobs, with a prefix guard against the H1 cross-couple delete exploit. The "disappears after 24h" claim in the Privacy Policy is now actually enforced.

**Remaining**: the implementation's per-couple fan-out is a scale concern, tracked as S4 in the v3 sweep above.

### Home tab spawns 15 concurrent Firestore listeners

**What**: `app/(tabs)/index.tsx:289-307` — every home mount subscribes to challenge, notes, fantasyWishes, dailyQuestions, dailyWishes, wyr, intimacyLog, sparks, memories, flashes, moments, stateUnion, activityCards, todos, sensate. Even a single spark-send round trip loads all 15 flows.

**Why deferred**: At MVP scale the read volume is well inside free-tier. UX is fine — it's a cost concern, not a functional one.

**Revisit criteria**: When Firestore read-per-user metrics get hot in production, or when the free tier stops covering active DAU.

**Effort**: 2-3h — lazy-load flow listeners keyed to which home cards are actually mounted / visible.

