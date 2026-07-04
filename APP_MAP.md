# Desire — App Map (July 2026)

Living overview of every feature, content pool size, and connection between features. Ratings are subjective ("gut" scores based on code review + content depth, not full QA). Treat them as a starting point for discussion, not a verdict.

## Navigation tree

```
┌─ (auth) ─────────────────────────────
│  ├─ login
│  ├─ register        (18+ consent)
│  ├─ onboarding      (name + photo)
│  ├─ pairing         (invite code / QR)
│  └─ onboarding-tour (post-pair walkthrough)
│
├─ (tabs) ─── bottom bar (3 visible + hidden Together List)
│  ├─ Home     🏠  mood picker, sparks, "Waiting for you" nudges,
│  │              Together List card, Tonight's Picks (3 curated),
│  │              tonight's ritual, "See all games →" link to Discover
│  ├─ Discover ✨  hub of interactive games
│  ├─ Us       💝  Rituals / Nurture / Discover yourselves
│  │              (was 'Love' with 15 items — trimmed to 10, renamed July 2026)
│  └─ Together List 📝  reachable via Home "Together List" card, not on tab bar
│
└─ Full-screen features (30 screens)
   ├─ Games / interactive
   │  ├─ questions-game     Discover
   │  ├─ daily-wishes       Discover ("Daily Picks")
   │  ├─ versus             Discover
   │  ├─ would-you-rather   Discover
   │  ├─ truth-dare         Discover (Solo Dare + 2-phone multiplayer; ex-Dare Wheel folded in)
   │  ├─ bingo              Discover ("Activity Cards", paid)
   │  ├─ challenge          Discover ("30-Day Challenge")
   │  ├─ fantasy-wishes     Us (paid)
   │  └─ roulette           Discover ("Date Night Roulette")
   │
   ├─ Nurture (Us tab)
   │  ├─ blueprint          Us ("Erotic Blueprint", paid)
   │  ├─ sensate            Us ("Sensate Focus", paid)
   │  └─ intimacy-tracker   Us ("Intimacy Log", opt-in)
   │
   ├─ Messages / async
   │  ├─ notes              Us > Rituals ("Love Notes")
   │  ├─ moments            Us > Rituals (BeReal-style)
   │  ├─ flashes            Home Quick tile ("Tease")
   │  ├─ time-capsules      Us > Rituals
   │  └─ journal            Us > Rituals
   │
   ├─ Insights
   │  ├─ quiz               Us > Discover yourselves ("Love Language Quiz")
   │  ├─ pulse              Profile > Reminders & tools ("Relationship Pulse", route /pulse — renamed from /hita)
   │  ├─ state-union        Us > Rituals ("Sunday Check-in")
   │  ├─ our-story          Us > Discover yourselves
   │  └─ year-in-review     Profile shortcut
   │
   └─ Utility
      ├─ mood-history       Home  (tap mood)
      ├─ calendar           Profile > Reminders & tools
      ├─ countdown          Profile > Reminders & tools
      ├─ reminders          Profile > Reminders & tools ("Flirt Reminders")
      ├─ profile
      └─ upgrade
```

## Feature matrix

Categories:
- **Type:** what kind of interaction (Game / Ritual / Async / Insight / Utility)
- **Tier:** Free / Paid / Mixed (some content free, some paid)
- **Pool size:** how much content backs replay value (— if not content-driven)
- **UI:** code-level polish signal (state machines, transitions, mutual reveal, mobile fit)
- **Fun:** replay value + emotional payoff + "come back tomorrow" pull
- **Notes:** unique mechanic OR redundancy flag

### Games (Discover tab)

| Feature | Type | Tier | Pool | UI | Fun | Notes |
|---|---|---|---|---|---|---|
| Questions Game | Daily card + mutual reveal | Mixed (Playful free, Deep + Spicy paid) | **474** (P 87 · D 241 · S 146) | 4/5 | **5/5** | Strongest replay + mutual reveal. Content is the moat. |
| Daily Picks | Daily voting + Together List seed | Mixed (Sweet + Flirty free, Spicy paid) | **224** (Sw 60 · Fl 60 · Sp 104) | 4/5 | 4/5 | Real payoff (feeds Together List). Post-merge to 3 cats. |
| Versus | Guessing quiz | Free | Uses binary answers from Questions Game (last 45d) | 4/5 | 3/5 | No own pool — parasitic on Questions Game. Empty until you play Questions. |
| Would You Rather | Simultaneous reveal | Mixed (Playful + Romantic free, Spicy paid) | **191** (Pl 70 · Rm 60 · Sp 61) | 4/5 | 3/5 | Same DNA as Questions binary format. Some overlap. |
| Truth or Dare | Multiplayer state machine + audio + Solo Dare mode | Mixed (Sweet + Flirty free, Spicy paid) | Truths **311** (Sw 95 · Fl 95 · Sp 121) + Dares **189** (Sw 45 · Fl 46 · Sp 98) | **5/5** | **5/5** | Deepest interaction. Audio + skip system + score. Solo Dare (ex-Dare Wheel) folded in July 2026. |
| Activity Cards | Turn-based reveal grid | Paid | Activities **55** + Rewards **10** | 4/5 | 4/5 | Passes system + 3-state cards is a strong pattern. Paid-only limits reach. |
| 30-Day Challenge | Guided daily program | Mixed (Reconnect + Spark free, Fire + Desire paid) | 4 programs × 30 tasks = **120** | 3/5 | 3/5 | Commitment feature; low return once done. Edit/veto system is clever. |
| Fantasy Wishes | Explicit double-blind voting | Paid | **394** presets | 4/5 | 4/5 | Biggest content pool. No user-facing categories. |
| Roulette | Spin for date idea | Free | **130** Date Ideas | 3/5 | 3/5 | Static utility. LDR filter for virtual dates. |

### Intimacy

| Feature | Type | Tier | Pool | UI | Fun | Notes |
|---|---|---|---|---|---|---|
| Erotic Blueprint | 15-Q assessment + couple compat | Paid | 15 Q + 5 types + **25 pairs** | 4/5 | 4/5 | High-value insight. Blueprint compatibility is unique. |
| Sensate Focus | Guided 3-stage session + timer | Paid | 3 stages | 4/5 | 3/5 | Deliberate, therapeutic. Lower "fun" but high value. |
| Intimacy Log | Opt-in tracking | Free (opt-in from Profile) | N/A | 3/5 | 2/5 | Utility, not fun. Some may find it clinical. |

### Async / messages

| Feature | Type | Tier | Pool | UI | Fun | Notes |
|---|---|---|---|---|---|---|
| Love Notes | Timed / mood-gated / stash | Free | User-generated | 4/5 | 4/5 | 4 unlock conditions (right now / timed / mood / visit / stash). Surprise mechanic. |
| Moments | BeReal-style daily photo | Free | User-generated | 4/5 | 4/5 | Mutual reveal + nudge. Strong daily ritual. |
| Tease (Flashes) | 24h ephemeral photo/video/voice | Free | User-generated | 4/5 | 4/5 | Snapchat-for-couples. Unique to Desire. |
| Time Capsules | Sealed messages for future | Free | User-generated | 4/5 | 3/5 | Two-doc security model. Emotional payoff long-delayed. |
| Journal | Written entries | Free | User-generated | 3/5 | 2/5 | Overlaps heavily with Notes. Redundancy candidate. |

### Insights

| Feature | Type | Tier | Pool | UI | Fun | Notes |
|---|---|---|---|---|---|---|
| Love Language Quiz | 10-Q quiz | Free | 10 Q | 3/5 | 3/5 | Classic feature, once-per-user. |
| Relationship Pulse (Hita) | 10-Q private tracker + trend | Free | 10 Q | 4/5 | 2/5 | Serious tool. Not "fun" but valuable. |
| Sunday Check-in (State Union) | 5-Q weekly Gottman ritual | Free | 5 Q per week | 4/5 | 2/5 | Deliberate ritual. Cadence-driven. |
| Our Story | Timeline of joint milestones | Free | Auto-generated | 3/5 | 3/5 | Passive, once-viewed. |
| Year-in-Review | Annual highlight reel | Free | Auto-generated | 4/5 | 4/5 | Emotional payoff. Seasonal. |

### Utility

| Feature | Type | Tier | Pool | UI | Fun | Notes |
|---|---|---|---|---|---|---|
| Mood + Mood History | Daily emotion pick | Mixed (Kinky + Horny paid) | 10 moods | 4/5 | 3/5 | Daily entrypoint. Unlocks Love Notes. |
| Calendar | Date view | Free | — | 3/5 | 2/5 | Overlaps with Countdown. |
| Countdown | Important dates ticker | Free | User-generated | 3/5 | 3/5 | Overlaps with Calendar. |
| Flirt Reminders | Scheduled push nudges | Free | User-generated | 3/5 | 2/5 | Setup once, low return. Requires EAS build for push. |
| Together List | Shared todo taxonomy | Free | User-generated | 4/5 | 3/5 | Central pipe. Fed by Daily Picks + Roulette + Fantasy Wishes. |

## Cross-feature connections

```
       ┌───────────────┐
       │  Together List │ ◀── manual +Add
       └───────▲────────┘
               │
       ┌───────┴───────────────────────────┐
       │                                   │
   Daily Picks           Roulette      Fantasy Wishes
   (Sw→dates,           (→dates)        (→intimacy)
    Fl/Sp→intimacy)

   Mood pick (Home) ──► unlocks Love Notes (mood-gated)
   Mood pick (Home) ──► logs Mood History
   Mood pick (Home) ──► partner push (EAS)

   Questions Game ──► Versus (parasitic — reads binary answers)

   Truth or Dare (Solo mode) ──► same DARES pool as multiplayer

   Fantasy Wishes match ──► Together List (Intimacy category)

   Blueprint result ──► Blueprint Compatibility view
```

**Nothing feeds Home except Home itself + Firestore subscriptions.** Home is display-only.

## Redundancy / consolidation candidates

Ranked by strength of case.

### Done

1. **Dare Wheel → cut, folded into Truth or Dare** ✅ Done July 2026
   - The old dare.tsx route was removed. Truth or Dare gained a Solo Dare mode
     that draws from the same DARES pool. Users get the single-tap novelty
     inside the deeper multi-round game surface.

### Strong candidates (open)

1. **Journal → cut or fold into Love Notes**
   - Both are "write a message that lives in the shared space"
   - Notes has a stronger hook (timed/mood-gated/visit unlock)
   - Journal has no unlock condition — just a running log
   - **Recommendation:** Add a "Journal / just save it" occasion to Love Notes and delete Journal.

3. **Calendar + Countdown → merge into single "Dates" surface**
   - Calendar shows list of important dates; Countdown shows next date ticker
   - Same underlying data (`importantDates` subcollection)
   - **Recommendation:** One screen with Countdown at top + calendar-style month view below.

### Weaker candidates (defensible either way)

4. **Would You Rather + Questions Game binary format**
   - Both present two options and reveal choices
   - Questions Game already has binary questions in the pool
   - WYR is more playful ("would you rather...") vs Questions Game more thoughtful
   - **Recommendation:** Keep both. Tonal difference is meaningful even if mechanic overlaps.

5. **Versus is parasitic**
   - No own content pool
   - Empty state nudges to play Questions Game
   - Adds a Discover tile but doesn't stand alone
   - **Recommendation:** Keep for now — free-tier bonus makes Questions Game feel more valuable.

6. **Intimacy Log**
   - Opt-in, hidden by default
   - Feels clinical for a warm app
   - **Recommendation:** Keep as opt-in. Users who want it will find it.

## The "is this too much" question

30+ full-screen features + 4 hubs. That's genuinely large for a couples app — competitors typically ship with 8–15 features.

**Why big can work here:**
- Different couples want different rituals (mood-focused vs game-focused vs journaling)
- Hub structure (Home / Discover / Us) breaks it into digestible chunks
- Content-driven features (Questions / Daily Picks / TorD) age well — more items = more play
- Paid tier gates the heaviest surfaces (Fantasy Wishes, Blueprint, Sensate, Activity Cards) so free-tier surface stays leaner

**Where the July 2026 restructure helped:**
- ✅ Us tab trimmed from 15 items → 10 (Rituals / Nurture / Discover yourselves)
- ✅ Utility screens (Calendar, Countdowns, Flirt Reminders, Relationship Pulse) moved to Profile > Reminders & tools
- ✅ Home Tonight's Picks curated to 3 games + "See all games →" link (was 5 rows duplicating Discover)
- ✅ Together List surfaced on Home as a dedicated card (was orphan on old Love tab)

**Where it still hurts:**
- **Discover tab has 8 destinations** (6 games + 2 challenges). Manageable but at the edge.
- **Onboarding tour has a lot to introduce.** Consider showing only the 5 most-used features on tour.

**Verdict:** Post-restructure, this is now roughly right. Not too much in the code, not too much on-surface. Further trimming candidates are documented above but the "feature store" feeling is mostly gone.

## Content-pool health check

| Feature | Current | Target (CLAUDE.md) | Gap |
|---|---|---|---|
| Questions | 474 | — | Healthy |
| Dares | 189 | 200+ | Close |
| Truths | 311 | — | Healthy |
| WYR | 191 | 90 (outdated target) | Way over |
| Daily Picks | 224 | 300 | Under |
| Fantasy Wishes | 394 | 400+ | On target |
| Date Ideas | 130 | — | Healthy |
| Activity Cards | 55 | — | Thin — 55 with 25/deck means 2 decks before recycling |
| Challenge | 120 (4×30) | — | Healthy |
| Blueprint | 15 Q | — | Fixed |
| Love Language | 10 Q | — | Fixed |
| Sunday Check-in | 5/wk | — | Fixed |

CLAUDE.md was written when totals were lower — most pools have grown past their old targets. Update CLAUDE.md targets as part of launch cleanup.
