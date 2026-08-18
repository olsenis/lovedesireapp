# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Platform

**This is a mobile-only app (iOS + Android).** It is NOT a web app. Vercel deployment exists only for quick visual preview during development — it is not a target platform. All features must be designed and tested for native mobile via Expo Go or EAS build.

Consequences:
- Use `expo-image-picker` with `launchCameraAsync` / `launchImageLibraryAsync` — native camera always available
- Do NOT use `Alert.alert` with button callbacks for critical flows — use custom Modals instead (Alert callbacks are unreliable on web but that's OK since web is not a target)
- `ActionSheetIOS` is fine for iOS-specific flows
- Push notifications require EAS build (not Expo Go)
- All UI/UX decisions should be for mobile screen sizes

## Language

All app UI text, strings, labels, and comments must be in **English**. The developer communicates in Icelandic but the app itself is entirely in English.

## Repo root is also an Obsidian vault

The Desire repo root (`G:\forrit\Desire\`) is opened as an Obsidian vault — `.obsidian/` config lives in the repo. That's why `.obsidian/workspace.json` shows as modified in `git status` between sessions (Obsidian rewrites it on open/close). Consequences:

- All `.md` files in the repo are simultaneously version-controlled AND readable/editable in Obsidian by the developer.
- Do NOT stage `.obsidian/workspace.json` when making commits — it's noise from the editor, not intentional changes. Skip it with `git reset HEAD .obsidian/workspace.json` before committing.
- The vault workflow is used for content curation (e.g. the planned `sex-ed/` folder). Raw research notes (transcripts, drafts) that shouldn't ship in the repo belong under `.gitignore` even though they live in the vault. Only publish-ready content gets committed.

### Companion docs — read/update these when relevant

| File | Purpose | When to update |
|---|---|---|
| [`APP_MAP.md`](APP_MAP.md) | Feature inventory across Home / Discover / Us / Profile tabs. High-level "what exists in the app". | When a feature is added, removed, renamed, or moved between tabs. |
| [`BUG_BASH.md`](BUG_BASH.md) | Live session tracker — active tests, regression items for recent commits, pending Round 2/3, launch-prep chain, rolling shipped log with commit hashes. | Every time an item ships / passes / blocks. Move items between sections; trim shipped-history to POLISH_TODO after a couple days. |
| [`POLISH_TODO.md`](POLISH_TODO.md) | Polish + roadmap history. Long-form H-series entries with shipped notes, entertainment-review items, deferred POST_LAUNCH work. | When shipping a polish/roadmap item, add an entry with commit hash + files touched + why. When superseded, mark ⏸️ with pointer to replacement. |
| [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md) | Comprehensive per-feature manual test walkthrough — 13 sections, dozens of check items per feature. For the full "walk every screen with 2 phones" sweep. | Before launch or after a big refactor. Add items when a new feature ships; check off items during a full-sweep session. |
| [`TEST_LAUNCH.md`](TEST_LAUNCH.md) | Launch-day test plan (pre-flight before App Store submission). | Right before submitting a build to App Review. |
| [`LAUNCH_STATUS.md`](LAUNCH_STATUS.md) | Current launch readiness snapshot (what's ready, what's blocking). | Weekly, or after a significant milestone. |
| [`POST_LAUNCH.md`](POST_LAUNCH.md) | Roadmap for after v1 ships. Deferred features, wish-list items, analytics-gated decisions. | When deferring work "to post-launch"; when a v1 launch decision needs to be re-visited later. |
| [`APP_STORE_SUBMISSION.md`](APP_STORE_SUBMISSION.md) | App Store metadata + submission checklist (screenshots, description, age rating, privacy questionnaire). | When preparing an App Review submission. |
| [`ADMIN_DASHBOARD.md`](ADMIN_DASHBOARD.md) | Admin dashboard architecture + stats/telemetry spec + admin-web deployment. | When adding new stats, callables, or admin-web features. |
| [`ENTERTAINMENT_REVIEW.md`](ENTERTAINMENT_REVIEW.md) | Feature-by-feature entertainment score audit (source of the H-series polish roadmap in POLISH_TODO). | Rarely — this is a snapshot review. Update when re-running the audit. |
| [`BRAND_RESEARCH.md`](BRAND_RESEARCH.md) | Competitive research, naming, brand positioning. | When re-doing competitive analysis. |
| [`README.md`](README.md) | Public-facing repo README. | Rarely — for external readers, not devs. |
| `memory/*.md` | Persistent memory index — user preferences, feedback, project state, references, prompts. | Automatically via the memory system when learning something worth persisting across sessions. |
| `plans/*.md` | Implementation plans authored via plan mode. | Whenever ExitPlanMode is called (the plan file is set by the plan-mode system message). |

Read the relevant doc before starting a task in its area; update it in the same commit that changes the underlying code.

## Commands

```bash
npm start          # Start Expo dev server (scan QR with Expo Go)
npm run web        # Run in browser (quick visual preview only — not a target platform)
npm run android    # Start on Android emulator
npm run ios        # Start on iOS simulator (macOS only)
npx tsc --noEmit   # TypeScript type check
```

Install packages with `--legacy-peer-deps` due to react-dom peer conflict:
```bash
npm install <package> --legacy-peer-deps
```

## Git workflow & deploy budget

This project deploys to Vercel Pro on every push to `main` (~60-90s per build). Pro tier allows **1000+ deploys / day per project**, so rate limit is no longer a daily constraint, but batching is still good hygiene — each commit is a separate revert point and noisy history is harder to read.

**Default:** batch related changes into a single commit. Push when you genuinely want to see it live.

### Before pushing
- `npx tsc --noEmit` — must be clean
- `npm run build` — local prod build (catches issues Vercel would catch)
- `npm run dev` — sanity-check the change in the running app when feasible

### When to batch vs push
- ✅ **Push immediately:** security fixes, migrations the user needs to run, single user-facing bug fixes
- ⚠️ **Batch first:** UI tweaks, label/copy edits, iterative styling, "while I'm here" cleanups — let 3-5 small fixes accumulate into one commit
- ❌ **Don't push:** experimental scaffolding, mockups, work-in-progress refactors

### When a tiny tweak comes in
If the user iterates on UI ("change the label", "swap to placeholder", "no, the other way"), keep editing locally and **don't commit each round**. Combine them into one commit at the end of the iteration. Each round-trip via Vercel wastes a deploy slot and adds 90s of waiting per commit.

### Rate limit symptoms (mostly historical, project is on Pro)
- Vercel dashboard shows new commits as "queued" but never builds
- Live `/settings` version sticks at an older hash
- Last green deploy is hours old even though git push succeeded

If hit on Pro: check Vercel project settings or open a support ticket — should not happen in normal use.

## Architecture

**Expo SDK 54 + TypeScript + Expo Router v6 (file-based routing)**

### Navigation structure

```
app/_layout.tsx              Root layout — font loading, auth guard, couple-creation, push token
app/(auth)/                  Unauthenticated flow (Stack)
  login.tsx                  Email/password sign in
  register.tsx               Create account
  onboarding.tsx             Name + profile photo
  pairing.tsx                Invite code generation & entry

app/(tabs)/                  Authenticated flow (Bottom Tab navigator)
  index.tsx                  Home — mood, partner card, "Waiting for you" nudges, Your List (Together), Daily
  todo.tsx                   Together List — shared todos (Daily Life / Date Ideas / Intimacy / Goals). Not on tab bar; surfaced via Home 'Your List' card.
  discover.tsx               Discover hub — Games + Challenges
  love.tsx                   Us hub — Rituals / Nurture / Discover yourselves. Renamed from 'Love' July 2026. Utility screens (Calendar, Countdown, Reminders, Relationship Pulse) moved to Profile > Reminders & tools.

app/                         Full-screen sub-screens
  (dare.tsx removed July 2026 — Dare Wheel folded into Truth or Dare Solo mode)
  roulette.tsx               Tonight's Date — spin for a date idea (formerly "Date Night Roulette")
  daily.tsx                  Daily — merged Picks + Questions, 3 categories (Playful free · Deep 💰 · Spicy 💰). Actions first, questions second. Actions with mutual Yes save to Together List; questions reveal side-by-side when both answered
  questions-game.tsx         Redirect stub → /daily?category=... (kept for deep-linked URLs from July 2026 merge)
  fantasy-wishes.tsx         Fantasy Wishes — explicit double-blind voting, one-card-at-a-time deck (refactored Aug 2026 from 5-at-a-time list). Yes/No vote (Maybe dropped Aug 2026 — added no signal beyond softer No). Skip for later moves card to back of deck. Session pacing at 8 votes: friendly "Load 8 more / Save for later" prompt (not a hard cap).
  truth-dare.tsx             Truth or Dare — real 2-phone multiplayer (picking/answering/done), audio answers
  would-you-rather.tsx       Would You Rather — simultaneous answer reveal, 3 levels, session persists
  bingo.tsx                  Activity Cards — 25 face-down cards, turn-based reveal, 3 states (pending/done), passes system
  challenge.tsx              30-Day Challenge — Reconnect/Spark/Fire/Desire + edit/veto system
  blueprint.tsx              The Lovers — 5-type intimacy quiz (Feeling/Sexual/Spark/Kinky/Explorer), couple compatibility. Feature renamed from "Erotic Blueprint" → "Intimacy Style" → "The Lovers" (Aug 2026) to establish own brand vocabulary, distancing from Jaiya Ma's trademarked framework. Enum keys kept as-is internally for zero-migration compatibility. 3 of 5 type names are custom (Feeling/Spark/Explorer); Sexual + Kinky are common English descriptors used freely in sex education literature.
  profile.tsx                Profile & Settings — name, photo, password, notifications, relationship date
  sensate.tsx                Guided Sensate Focus — 3-stage guided sessions with timer, cycle tracking (couples/{coupleId}/sensate/progress adds cyclesCompleted + currentCycleStages Aug 2026), full-cycle completion moment, Home nudge after 14+ days of inactivity if cyclesCompleted ≥ 1
  notes.tsx                  Love Notes — timed secret messages
  memories.tsx               Memory Wall — shared photo album (Firebase Storage)
  calendar.tsx               Special Days ledger — chronological list of anniversaries, birthdays, first times, grouped by Coming up / Next 3 months / Later this year. Rewritten from month-grid Aug 2026 to a pure ledger. Includes auto-inline Valentine's, partner birthday, couple anniversary from startDate. Secret dates render as "A surprise from {partnerName}" until the day arrives.
  (countdown.tsx removed Aug 2026 — merged into Special Days ledger since both used the same importantDateService data; secret-date toggle ported over)
  reminders.tsx              Flirt Reminders — local scheduled notifications
  quiz.tsx                   Love Language Quiz — 10-question result
  love-language-nudge.tsx    Speak partner's love language — weekly Sunday nudge (local scheduled notification, Sunday 09:00), 3 concrete actions from partner's language pool (20 per language × 5 languages = 100). Deterministic pick (weekAnchor + coupleId) so both partners see same trio.
  pulse.tsx                  Redirect stub → /state-union (Pulse merged into Sunday Check-in Aug 2026 as a 5-dimension pre-step)
  daily-wishes.tsx           Redirect stub → /daily?category=... (kept for deep-linked URLs from July 2026 merge)
  (time-capsules.tsx removed July 2026 — abstract long-timeline payoff didn't demo well pre-launch; revisit if users request "seal for later" mechanics)
  versus.tsx                 Versus — guess what your partner picked, binary-question knowledge quiz
  (wishlist.tsx and fantasy.tsx removed — legacy features replaced by fantasy-wishes.tsx / dailyWishes)
```

### Firebase / Firestore data model

Firebase project: `lovedesireapp-8c7f2`

```
users/{uid}                          UserProfile — name, photoURL, coupleId, inviteCode, pushToken
users/{uid}/private/blueprint        BlueprintResult — type, scores, completedAt
users/{uid}/private/help             HelpState — enabled, seen[]
users/{uid}/private/features         FeatureUnlockState — versusUnlockedAt? (sticky, per-user data-gate unlocks)

couples/{coupleId}                   Couple — partner1Uid, partner2Uid, inviteCode, createdAt, startDate?
couples/{coupleId}/todos/{id}        Todo — text, category, completed, createdBy, createdAt
couples/{coupleId}/moods/{id}        MoodEntry — uid, emoji, note, createdAt
couples/{coupleId}/memories/{id}     Memory — photoURL (Firebase Storage URL), caption, createdBy, createdAt
couples/{coupleId}/notes/{id}        LoveNote — message, openAt, fromUid, opened
couples/{coupleId}/wishlist/{id}     WishlistItem — text, category, votes {uid: 'yes'|'maybe'|'no'}
couples/{coupleId}/fantasy/{id}      FantasyItem — text, category, votes {uid: 'yes'|'maybe'|'no'}
couples/{coupleId}/fantasyWishes/{id} FantasyWishesItem — text, votes, addToList[]
couples/{coupleId}/reminders/{id}    FlirtReminder — message, time, days[], active, createdBy
couples/{coupleId}/dates/{id}        ImportantDate — label, date, emoji, createdBy
couples/{coupleId}/challenge/active  ChallengeState — program, phase, currentDay, completedDays[], completedBy, customTasks, editsUsed, vetoesUsed
couples/{coupleId}/blueprints/{uid}  BlueprintResult — type, scores, completedAt (readable by both)
couples/{coupleId}/wyr/active        WYRSession — level, questionIndex, answers{uid:a|b}, revealed, score, savedToList?, dayKey?, answeredToday?, bonusDraws? (H21 daily-cap fields Aug 2026)
couples/{coupleId}/bingo/{month}     ActivityCardsSession — squares[], revealed[], revealedBy{}, completed[], pendingCard, turnUid, passes{}, receiverPasses{}, resetCount
couples/{coupleId}/truthDare/active  TruthDareSession — level, turnUid, phase(picking|answering|done), card{type,text,answer,audioURL,answeredBy,dareConfirmed[]}, scores, round, skipsUsed
couples/{coupleId}/dailyWishes/{date} DailyWishDoc — items[], votes{}, addToList{}
couples/{coupleId}/dailyQuestions/{date} DailyQuestionDoc — items[], discussed{}, answers{uid:{gi:text}}
couples/{coupleId}/stateUnion/{weekId} StateUnionDoc — weekId, startedAt, completedAt{uid:ts}, answeredCount{uid:n}
couples/{coupleId}/stateUnion/{weekId}/entries/{uid} StateUnionEntry — answers{qi:text}, updatedAt (rules: only readable by owner OR after both completed)
```

### Services (`/services`)

| File | Exports |
|------|---------|
| `firebase.ts` | `auth`, `db`, `storage` |
| `authService.ts` | `register`, `login`, `logout`, `getUserProfile`, `createUserProfile`, `disconnectFromCouple` |
| `coupleService.ts` | `createCouple`, `joinCouple`, `getCouple`, `setCoupleStartDate`, `acceptPairing`, `declinePairing`, `cancelPairingRequest` |
| `todoService.ts` | `subscribeTodos`, `addTodo`, `toggleTodo`, `deleteTodo` — category: daily/dates/intimacy/goals (legacy `fantasy` category from before July 2026 is normalised to `intimacy` at read time) |
| `moodService.ts` | `setMood`, `getTodaysMood`, `subscribeToMoods` |
| `noteService.ts` | `subscribeNotes`, `createNote`, `openNote` |
| `reminderService.ts` | `subscribeReminders`, `addReminder`, `toggleReminder`, `deleteReminder`, `scheduleReminderNotifications`, `cancelReminderNotifications` |
| `fantasyWishesService.ts` | `subscribeFantasyWishes`, `addFantasyWishesItem`, `voteOnFantasyWish`, `isFWMatch`, `markFWAddToList`, `clearAndReloadFantasyWishes` |
| `challengeService.ts` | `subscribeChallenge`, `startChallenge`, `activateChallenge`, `editTask`, `markDayComplete`, `vetoDay`, `resetChallenge` |
| `blueprintService.ts` | `subscribeCoupleBlueprints`, `saveBlueprintResult` |
| `notificationService.ts` | `notifyPartner` — POSTs to Expo Push API |
| `memoryService.ts` | `subscribeMemories`, `addMemory`, `deleteMemory` |
| `importantDateService.ts` | `subscribeDates`, `addImportantDate`, `deleteImportantDate`, `getDaysUntil` |
| `storageService.ts` | `uploadProfilePhoto`, `uploadMemoryPhoto`, `uploadTruthDareAudio`, `uploadCapsulePhoto`, `uploadFlashMedia`, `uploadMomentPhoto` — Firebase Storage. Photos compressed via `expo-image-manipulator` (max 1920px, JPEG 0.7) before upload. |
| `helpService.ts` | `getHelpState`, `markFeatureSeen`, `setHelpEnabled`, `disableAllHelp`, `resetHelp` |
| `dailyWishService.ts` | `subscribeDailyWishes`, `voteDailyWish`, `markAddToList`, `bothWantToAdd` |
| `dailyQuestionsService.ts` | `subscribeDailyQuestions`, `submitAnswer`, `bothAnswered`, `markDiscussed`, `bothDiscussed` |
| `wyrService.ts` | `subscribeWYR`, `startWYR`, `answerWYR`, `nextWYRQuestion`, `resetWYR`, `saveMatchToList`, `drawMoreWYR`, exports `WYR_DAILY_CAP` / `WYR_BONUS_PER_DRAW` / `WYR_MAX_BONUS_DRAWS` |
| `bingoService.ts` | `subscribeActivityCards`, `flipCard`, `markCardDone`, `skipReceivedCard`, `usePass`, `resetActivityCards` |
| `truthDareService.ts` | `subscribeTruthDare`, `startTruthDare`, `playCard`, `submitTruthAnswer`, `confirmDare`, `nextTurn`, `skipCard`, `resetTruthDare` |
| `versusService.ts` | `loadVersusPool`, `getPartnerBinaryAnswerCount`, `VERSUS_UNLOCK_THRESHOLD` — queries last 45 days of `dailyQuestions`, filters binary questions partner has answered, returns shuffled quiz items. Threshold gates whether Versus is shown in Discover at all (see below). |
| `featureUnlockService.ts` | `getFeatureUnlockState`, `markVersusUnlocked`, `isVersusUnlockRecent` — persists per-user unlocks at `users/{uid}/private/features`. In-memory cached. |

### Hooks

- `useAuth()` — returns `{ user, profile, loading }`
- `useCouple(myUid, coupleId)` — returns `{ couple, partner, loading }`
- `useHelp(featureKey)` — returns `{ visible, dismiss, dismissAll }` for first-visit help popups

### Static content (`/constants/content.ts`)

All static game content lives here — import from this file, never hardcode in screens:

- `QUESTIONS` + `QUESTION_CATEGORY_CONFIG` — 474 questions in 3 categories: Playful (87), Deep (241), Spicy (146). Consolidated from 6 → 3 in July 2026 to reduce cognitive load (old fun → playful; old romantic + therapy → deep; old fantasy → spicy). `Question` interface has `format?: 'open' | 'binary' | 'scale'` + `options?: [string, string]`. 15 binary + 15 scale variants in pool. See `memory/question_writer_prompt.md` for quality standards.
- `DARES` + `DARE_LEVEL_CONFIG` — 274 dares across Sweet (70) / Flirty (81) / Spicy (123). Clear level separation: Sweet=cute/romantic, Flirty=sensual kissing/touch, Spicy=explicitly sexual/X-rated. Every dare has an optional `context?: 'ldr' | 'either' | 'physical'` — `ldr` = LDR-only (video call, sexting, camera performance, feels weird in-person), `either` = hybrid (song send, coordinated candle ritual, cooked meal + photo, "in front of {partner}" phrasings that work live or on camera), `physical` = in-person only (kiss/touch/oral/positions, implicit default when `context` is undefined). Filter in `truth-dare.tsx`: `isLDR ? DARES.filter(d => d.context === 'ldr' || d.context === 'either') : DARES.filter(d => d.context !== 'ldr')`. Both modes see `either`; only `ldr` is exclusive to LDR view, only `physical` (or undefined) is exclusive to in-person. Per-mode counts — LDR on: Sweet 38, Flirty 38, Spicy 35; LDR off: Sweet 62, Flirty 50, Spicy 95. Truths need no filter since they're all verbal/typed/audio by nature. See `memory/explicit_content_prompt.md` and `memory/question_writer_prompt.md`.
- `TRUTHS` — 310 truths across Sweet(95)/Flirty(95)/Spicy(120). Sweet=emotional, Flirty=physical attraction, Spicy=explicitly sexual. See `memory/explicit_content_prompt.md`.
- `DATE_IDEAS` — 130 date ideas (53 home + 39 out + 38 adventure + 28 with `virtual: true` for LDR). Rich 1-2 sentence descriptions.
- `PRESET_WISHES` — 60 wishlist presets (Romantic/Adventure/Intimate/Spicy, 15 each)
- `QUIZ_QUESTIONS` + `LOVE_LANGUAGE_LABELS` — 10 A/B love language questions
- `LOVE_LANGUAGE_ACTIONS` (constants/loveLanguageActions.ts) — 100 daily-doable actions (20 per language × 5) for the weekly Sunday nudge. Low-friction, no special setup, matches the tone of the quiz.
- `BLUEPRINT_QUESTIONS` + `BLUEPRINT_TYPE_CONFIG` + `BLUEPRINT_COMPATIBILITY` — 15 A/B questions, 5 types, 25-pair compatibility guidance
- `FANTASY_PRESETS` + `FANTASY_CATEGORY_CONFIG` — 60 fantasy presets (Roleplay/Sensual/Bold/Adventurous)
- `FANTASY_WISHES_PRESETS` — 294 scenario items for Fantasy Wishes (Sensual/Roleplay/Explicit/BDSM). Target 400+. See `memory/fantasy_wishes_prompt.md`.
- `CHALLENGE_PROGRAMS` + `CHALLENGE_PROGRAM_CONFIG` — 4 programs x 30 tasks
- `WYR_QUESTIONS` + `WYR_LEVEL_CONFIG` — 90 Would You Rather questions (Playful/Romantic/Spicy)
- `BINGO_ACTIVITIES` + `BINGO_REWARDS` — 55 activities + 10 rewards for Intimacy Bingo
- `DAILY_WISH_ITEMS` + `DAILY_WISH_CATEGORY_CONFIG` — 254 items across 4 categories (Sweet 60 + Flirty 60 + Spicy 104 + Deep 30). Old 'sexual' category merged into 'spicy' July 2026. Deep actions added Aug 2026 (reflective, connection-oriented prompts) to give the Deep tab in Daily its own action pool alongside its questions. `sx()` factory still exists but now emits `category: 'spicy'`; `dp()` factory added for Deep. See `memory/explicit_content_prompt.md` for Spicy.

### Content generation prompts (`memory/`)
Three prompts for expanding content — always use the right one for the category:
- `memory/question_writer_prompt.md` — **PG / free tier**: Questions Playful/Deep, Truths Sweet/Flirty, Dares Sweet/Flirty, Daily Picks Sweet/Flirty
- `memory/explicit_content_prompt.md` — **X-rated / paid tier**: Questions Spicy/Fantasy, Truths Spicy, Dares Spicy, Daily Picks Spicy
- `memory/fantasy_wishes_prompt.md` — **Fantasy Wishes only**: noun/gerund scenario phrases (NOT commands or questions), 4 categories: Sensual/Roleplay/Explicit/BDSM

### Design system (`/constants`)

- `colors.ts` — `Colors.burgundy` (#880E4F), `Colors.cream` (#FFF8F0), `Colors.rose` (#F4A7B9), `Colors.blush` (#FCE4EC), `Colors.muted` (#9E7B84), `Colors.border` (#F0D5DC)
- `fonts.ts` — `Fonts.heading` (Cormorant Garamond SemiBold), `Fonts.body` (Lato Regular), `Fonts.bodyBold`, `Fonts.bodyItalic`, `Fonts.headingItalic`
- `spacing.ts` — `Spacing` (xs→xxl), `Radius` (sm→full), `Shadow` (sm/md)

### Key implementation patterns

**Truth or Dare multiplayer:** Phase-based state machine (picking/answering/done) in Firestore. Picker draws card locally first (can skip/redraw before sending), then commits with `playCard()`. Truth: partner types text OR records audio (expo-av, uploaded to Firebase Storage). Dare: single-tap confirmation — challenged partner taps "Dare completed" and the round immediately moves to done (double-confirm removed Aug 2026, picker no longer has to also confirm; the extra click added zero trust value between partners who already share everything). Score goes to challenged person, not picker. `skipsUsed` tracks skips per uid. Picker screen has 2 live-play mode cards: Together Right Here (solo spin) and Wherever You Are (2-phone live). Inside Wherever You Are picking phase, partner can either DRAW random from the DARES / TRUTHS pool (top [Truth] [Dare] row) OR write their own via the "✏️ Truth" / "✏️ Dare" secondary row (Aug 2026 H19). Manual authoring writes to the same `playCard` service with a custom `text` field; partner-side rendering + answer/dare-complete flow is identical to pool-drawn cards. **The async-dares feature was deleted entirely Aug 2026 (H19)** — no more standalone `/dares` route, no `AsyncDaresPanel`, no `dareService`, no dare Home nudges, no deadline mechanic, no proof-photo upload. Manual live-mode authoring covers the same user-value (custom content) with dramatically less surface area.

**WYR session persistence:** Session stored in Firestore — Back button and app exit do NOT reset the game. Push notification sent when you answer. Home screen nudge appears when partner answered but you haven't. **Daily-cap pacing (Aug 2026, H21):** session carries `dayKey` + `answeredToday` + `bonusDraws` counters. Free tier caps at `WYR_DAILY_CAP` (5) reveals per day; paid tier can tap "Draw 5 more" from the DoneState to bump `bonusDraws` up to `WYR_MAX_BONUS_DRAWS` (3) packs = 20/day max. Counter resets on the first `answerWYR` reveal of a new day (`dayKey !== today` check inside the transaction). Cap applies per-couple-per-day across levels — switching from Playful to Romantic doesn't refresh the counter. Mirrors the Daily Picks bonus-draws pattern.

**Questions Game reveal:** Both partners answer privately. Open-text uses TextInput. Binary uses two large buttons (q.options[0] | or | q.options[1]). Scale uses 1-5 chips with "1 = not at all · 5 = completely" hint. Neither sees the other's answer until both have submitted. When both answered, both answers reveal side by side.

**Versus:** Pulls binary-format answers from last 45 days of `dailyQuestions`. Builds a 10-question shuffled quiz of items where partner has answered. Each card shows partner's actual answer + 1 decoy (the other binary option). Instant reveal with ✓/✗ after pick. Final score shown with gradient hero card. Empty state nudges to play more Questions first.

**Activity Cards:** 25 face-down cards, turn-based. Picker has 2 passes to swap before accepting. Receiver gets the card and can mark "We did it!" or skip (1 pass). Cards have 3 states: face-down, pending (accepted not done), completed (green). `pendingCard` field tracks which card is waiting for receiver. Paid feature.

**Double-blind voting (Wishlist, Fantasy, Fantasy Wishes):** `votes: { [uid]: 'yes'|'maybe'|'no' }`. Only mutual `yes` surfaces in Matches. Never expose individual votes. FW UI dropped Maybe Aug 2026 (Yes/No + Skip only); the type stays broad for backward compat with existing docs.

**Daily Picks / Daily Questions:** Deterministic shuffle by date+coupleId ensures both partners see same items. 5 picks per category per day (Daily Picks), 3 questions per category per day (Daily Questions).

**Fantasy Wishes deck (Aug 2026 refactor):** One card at a time from the derived deck (unvoted items in createdAt order, session-skipped moved to back). Yes / No vote auto-advances by removing item from unvoted set on subscription round-trip. Legacy `shownUnvotedIds` batching + "Load 5 more" removed; existing Firestore Maybe votes preserved but no UI writes new ones. Progress bar scales to true totalCount but label hides the denominator (394 items is overwhelming; encourages grinding). Session pacing: after `SESSION_BATCH` (8) Yes/No votes, deck steps aside for "Load 8 more / Save for later" prompt. Skip does NOT count. Save for later parks at a "See you tomorrow" state with a change-my-mind link — never a hard gate.

**30-Day Challenge:** Setup phase allows 2 edits + 2 vetoes per partner before activating. `completedBy: {day: [uid]}` syncs across phones.

**Help system:** `useHelp(key)` hook checks `users/{uid}/private/help` — shows HelpModal once per feature. Toggle in Profile.

**Push notifications:** Expo Push tokens registered on startup. `notifyPartner()` POSTs to Expo Push API. Only works on real devices. Used in: mood, WYR answers, Questions Game answers, Truth or Dare answers.

**Home screen nudges ("Waiting for you"):** index.tsx subscribes to challenge, notes, fantasyWishes, dailyQuestions, dailyWishes, WYR, truthDareSession, moments, flashes, sensate, todos, sunday check-in, bingo. Shows nudge card when partner has acted but current user hasn't. Some nudges `unshift` to top of stack for weekly/timed rituals (Year in Review, LDR pre/post-visit, incoming flash, Sunday Love-Language). Aug 2026 dedupes: Fantasy Wishes matches-nudge suppresses the partner-ahead nudge when both would fire (same emoji, same route, matches wins as the specific-reward signal); Truth or Dare has two mutually-exclusive states (`phase='answering' && turnUid !== uid` → "{partner} sent you a Truth/Dare" with card-text preview; `phase='picking' && turnUid === uid` → "Your turn in Truth or Dare"), no dedupe needed. Insight card (daily rotating love-language tip) hidden on Sundays when partner has loveLanguage — Sunday LL nudge owns the surface. Personalized greeting: "Good morning, {firstName}" when profile.name is set.

**Home Tonight's Picks:** 3 launcher tiles — Daily (💫), Truth or Dare (🎯), Fantasy Wishes (✨). See-all-games row routes to Discover tab. Dares tile was added Aug 2026 (H5), removed Aug 2026 (H14), and the async-dares feature it linked to was deleted entirely Aug 2026 (H19) in favour of manual truth/dare authoring inside the Wherever You Are live game flow. No dare-related Home nudges remain — everything happens live in the session now.

**Firebase Storage:** Profile photos at `users/{uid}/profile.jpg`, memories at `couples/{coupleId}/memories/`, Truth or Dare audio at `couples/{coupleId}/truthDare/{round}_{uid}.m4a`, Moments at `couples/{coupleId}/moments/{date}_{uid}.jpg`, Flashes at `couples/{coupleId}/flashes/{ts}_{uid}.{ext}`. All photo uploads compressed via `expo-image-manipulator` (max 1920px, JPEG 0.7) before `uploadBytes`. (Time Capsules storage path at `couples/{coupleId}/timeCapsules/` no longer written — feature removed July 2026, any pre-launch test blobs remain in Storage until GDPR cascade cleans them.)

**Content rules:** No em dashes (—) anywhere in UI strings — use commas instead. Dares must be physical actions (do something), not verbal (say/tell/describe). Spicy level = explicitly X-rated language.

**Pronoun-free copy convention (Aug 2026):** User-facing strings refer to the partner by NAME (`${partnerName}`) or by "your partner" — not by `they/them/their`. Exception: pronouns are fine where they follow a name in the same sentence and swapping would sound stiff ("Tell {partnerName} what you love about who they are"). Rationale: names are personal, impossible to misgender, avoid the settings surface a pronoun toggle would need, and sidestep Icelandic-locale declension complications if we ever localise. Chart labels, log options, standalone tooltip refs → always use name or "Partner".

**Subscription gating:** `hooks/useSubscription.ts` — returns `{ isSubscribed }`. Reads `couples/{coupleId}/isPremium` so **one subscription covers both partners**. RevenueCat webhook writes to the couple doc; QA test couples flipped manually in Firebase Console. Client cannot write `isPremium` or `premiumSince` (firestore.rules blocks the two fields explicitly). Legacy per-user `isPremium` on `users/{uid}` was deprecated Aug 2026 — any stale value is ignored by the hook.

**Paid-feature gate pattern (defense in depth):** every paid screen (Fantasy Wishes, Sensate, Blueprint, Bingo, Intimacy Tracker, plus Fire/Desire challenge programs) enforces the paywall AT THE SCREEN, not just on the entry-point card. This covers Home nudges that route directly to the screen and would otherwise bypass the Discover/Us tab lock. Copy the pattern verbatim when adding a new paid screen:

```tsx
const { isSubscribed, isLoading: subLoading } = useSubscription();
useEffect(() => {
  if (!subLoading && !isSubscribed) router.replace('/upgrade' as any);
}, [subLoading, isSubscribed]);
// early return before rendering, so free users don't see the UI flash
if (subLoading || !isSubscribed) return null;
```

For per-item gating (e.g. Challenge's Fire+Desire programs while Reconnect+Spark are free), gate the tap handler:

```tsx
if (PAID_PROGRAMS.has(program) && !isSubscribed) { router.push('/upgrade' as any); return; }
```

Discover/Us tab cards still show 🔒 for the visual cue; the screen-level gate is belt-and-suspenders.

### Free tier (store-safe)
- Truth or Dare: Sweet + Flirty only across both modes — "Together Right Here" (one phone, quick spin, ex-Dare Wheel folded in July 2026) and "Wherever You Are" (two phones, turn-based multiplayer)
- Daily: Playful category only — combines old Sweet Daily Picks (5/day) + old Playful Questions (3/day, incl. binary + scale variants). Flirty Daily Picks moved to Spicy tier July 2026 as part of the Daily merge.
- Versus mode (data-gated — hidden in Discover until partner has answered 5+ binary questions in Daily, then permanently visible with a NEW badge for the first 7 days. Not paywalled. Empty state deep-link explains the unlock threshold.)
- Would You Rather: Playful + Romantic only
- Tonight's Date (full)
- All connection features: Mood, Notes, Moments, Countdowns, Reminders, Tease (full)
- Love Language Quiz, Sunday Check-in (5-dimension pulse + 5 Gottman questions with mutual reveal, full — was standalone Pulse pre-Aug 2026)
- 30-Day Challenge: Reconnect + Spark programs only

### Paid tier (subscription — `app/upgrade.tsx` shown when locked)
- Truth or Dare: Spicy level in both modes ("Together Right Here" and "Wherever You Are")
- Daily: Deep + Spicy categories (Deep = 3 questions + 5 reflective actions/day, added Aug 2026; Spicy = 3 questions + 10 actions/day, includes ex-Flirty picks + explicit Spicy picks + Spicy questions)
- Would You Rather: Spicy level
- Fantasy Wishes (entire feature)
- The Lovers (5-type intimacy quiz, entire feature)
- Sensate Focus (entire feature)
- 30-Day Challenge: Fire + Desire programs
- Activity Cards (entire feature)
- Kinky + Horny moods (shown greyed with lock for free users)

## Age gate + explicit-content consent

Apple's rating ceiling is 17+; the user-facing attestation is **18+** (matches
legal age of majority + adult content laws). Two paths, both required:

1. **Register:** [app/(auth)/register.tsx](app/(auth)/register.tsx) has an
   `ageConfirmed` checkbox that must be checked before `Create Account` is
   enabled. `confirmConsent(uid)` runs immediately after auth account
   creation and writes `users/{uid}/private/consent` with a timestamp.

2. **Post-login modal:** [app/_layout.tsx](app/_layout.tsx) runs
   `getConsent(uid)` on every authenticated launch. If the doc is missing
   (existing pre-consent users or corrupted state), a full-screen consent
   modal blocks all navigation. Decline path deletes the Firebase Auth user
   so no bypass is possible by signing back in.

Legal defensibility: timestamp is stored per-user in Firestore, not just
device-local, so we have a per-account audit trail if ever required.

## Distribution strategy (decided May 2026)

- **iOS:** App Store, age rating 17+ (Apple ceiling). In-app attestation is 18+. Standard EAS build + TestFlight + App Review.
- **Android:** NOT on Google Play. Signed APK hosted on the marketing website (Vercel), users sideload after enabling "Install from this source". In-app update prompt compares running version to a JSON manifest hosted alongside the APK. Same uncompromised feature set as iOS — no split build, no content sanitization.

```bash
npx eas build --platform ios          # for App Store submission
npx eas build --platform android      # produces APK for website hosting (NOT AAB)
```

Bundle ID: `com.desire.app`. EAS profiles: `development`, `preview`, `production`.

## Legal documents
- `app/privacy-policy.tsx` — full Privacy Policy (GDPR compliant, 11 sections)
- `app/terms-of-service.tsx` — Terms of Service (12 sections, Icelandic law)
- Both accessible from Profile → links at bottom
- **For store submission:** both need to be hosted at a public URL

## Outstanding before production

- Push notifications — only works on real devices, needs EAS build
- Photo upload (memories) — no size limits enforced
- RevenueCat subscription — payment provider not yet integrated
- Host Privacy Policy + Terms of Service at public URL for store submission
- Accessibility sweep — many TouchableOpacity elements lack `accessibilityLabel` / `accessibilityRole`. Real App Store review concern.
