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
| [`RUN_DEV.md`](RUN_DEV.md) | Runbook for the developer: start Expo with tunnel or LAN, Expo Go login, fixed IP so phones reopen without rescanning, what to do when it does not start, dev flags during a test session. | When the start command, tunnel provider or Expo Go requirements change. |
| [`MARKETING.md`](MARKETING.md) | Marketing + ASO source of truth: positioning, App Store title / subtitle / keyword fields per locale / IAP names / screenshots / description (written with a `{APP_NAME}` token while H43 is open), long-tail custom product pages, launch channel sequence, Apple Search Ads plan, KPIs, budget. | On any App Store Connect metadata change, on a name change (H43), after each monthly keyword review. |
| [`NAMING.md`](NAMING.md) | App-name top 100 for H43: method (RDAP, iTunes Search API, agent pass), three tiers, a reserve list, and a "checked and out" appendix so no RED name gets re-proposed. | When a name is checked or the rename is decided (then mark it closed). |
| [`COMPETITORS.md`](COMPETITORS.md) | Competitor profiles with store numbers, pricing, praise and complaints, and what we take from each (14 new-wave apps + incumbents, Reddit voice-of-customer, Sep 2026). Feeds MARKETING positioning and POST_LAUNCH C1. | When a competitor changes pricing or mechanic in a way that touches our copy, or a new one reaches four-digit ratings. |
| [`VOICE.md`](VOICE.md) | Tone and word choice for every user-facing string: the voice in one line, the conventions (English, names not pronouns, no gamification or pressure words, no therapy framing), how we phrase locked / empty / waiting / error / explicit / privacy, and a never-use list. | When a copy rule is added or changed; read before writing any new UI string. |
| [`USER_VOICE.md`](USER_VOICE.md) | Review mining, Sep 2026: 18,320 store reviews of 30 couples apps plus Reddit threads. The twelve things couples complain about, what earns five stars, per-app digests, the intimacy sub-market, a gap table against our features, and a ranked change list (P0 to P7 before the store build, then post-launch). Raw data and rerunnable scripts in `research/` (data gitignored). | When a ranked item ships (mark it), after a new review pass, or when a competitor's reviews change what we say in the store copy. |
| [`USER_VOICE_TODO.md`](USER_VOICE_TODO.md) | The actionable list from the review mining: A pre-launch code items (A1 new partner never inherits old data, A2 lapsed subscription keeps read access, A3 billing honesty, A4 discreet pushes, A5 Daily no-repeat, A6 Fantasy Wishes opt-out, A7 app lock, A8 store copy, A9 FW help line, A10 tests), B docs, C post-launch features in order, D decisions for Óli, E research upkeep. Each with why, where, steps, test, effort. | Tick items as they ship; BUG_BASH and POST_LAUNCH point here instead of repeating. |
| [`BREACH_RESPONSE_PLAN.md`](BREACH_RESPONSE_PLAN.md) | Operational playbook for the 72h GDPR breach-notification clock. Backs Privacy §8 legal commitments. Includes severity matrix, per-data-class playbooks, Persónuvernd + user notification templates. | After any real incident (add post-mortem link, tighten process). Otherwise rarely — living document that evolves with real experience. |
| [`DPIA.md`](DPIA.md) | GDPR Article 35 Data Protection Impact Assessment following EDPB WP248 rev 01 template. Systematic description of processing, risk assessment per data class, mitigations, sign-off. Internal document — not published, produced on Persónuvernd request. | On any material change to processing (new special-category feature, new sub-processor, new cross-border flow); after any real incident; annually as fallback. Signed by controller representative. |
| [`ENTERTAINMENT_REVIEW.md`](ENTERTAINMENT_REVIEW.md) | Feature-by-feature entertainment score audit (source of the H-series polish roadmap in POLISH_TODO). | Rarely — this is a snapshot review. Update when re-running the audit. |
| [`reviews/README.md`](reviews/README.md) | Outside-agent review archive (retention journey, naming candidates, Review #10-12: features/retention/new games, retention-build bugs B1-B13, vs. top-10 competitors). Index has date, HEAD, and status per review. | When a new outside review lands; when acting on a B-item or D-entry that originated there. |
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

### Device testing (Expo Go, two phones)

- `npx expo start --tunnel --clear` — tunnel is **Cloudflare**, not ngrok: `@expo/ngrok` is aliased to `expo-cloudflared` in package.json because the bundled ngrok v2 is rejected by ngrok's cloud (Sep 2026). First run downloads `cloudflared` to `~/.expo/expo-cloudflared/` and may hit Expo's startup timeout or Windows Firewall once; run again. `--lan` works too but iOS needs Local Network permission for Expo Go.
- **Expo Go 57 on iOS requires login on both sides** (changelog: expo-go-57-login). Terminal: `npx expo login` (account `olsenis`; `--sso` is broken on Windows because cmd mangles `&` in the URL, so use email + password). Phones: avatar icon top-right in Expo Go. Android is exempt for now.
- Run Metro in your own terminal, not from Claude in the background: the QR only renders in an interactive TTY.
- Weekday-gated Home cards (Wed WYR author, Thu Memory Lane / Sunday history) and the Memory Lane 30-day gate have `__DEV__ && false` overrides: `DEV_IGNORE_WEEKDAY_GATES` and `DEV_SHORT_DAILY_NO_REPEAT` (Daily no-repeat window 56 → 3 days) in `constants/devFlags.ts`, `MEMORY_LANE_DEV_UNLOCK` in `services/featureUnlockService.ts`. The weekday flag is flipped per session and flipped back before committing; the Memory Lane flag is **committed ON (`__DEV__ && true`) for the Sep 2026 test period** and is reset in the TEST_LAUNCH "Dev flags" gate before the first store build. The unlock-days number (14 vs 30) is decided there too.
- Dev-overlay warnings that are known-harmless on SDK 57: Firestore "WebChannelConnection RPC … transport errored" (already hidden via LogBox), expo-router "state update on a component that hasn't mounted" (expo/expo#35224), `Response.blob()` perf hint (needs `expo-blob`, not in Expo Go). Red errors and anything visibly wrong are the signal.
- Chain type-checks as `npx tsc --noEmit 2>&1 | tail -8; test ${PIPESTATUS[0]} -eq 0 && git …` — a bare `tsc | tail && git commit` reads tail's exit code and commits broken code.

Install packages with `--legacy-peer-deps` due to react-dom peer conflict:
```bash
npm install <package> --legacy-peer-deps
```

## Git workflow & deploy budget

This project deploys to Vercel Pro on every push to `main` (~60-90s per build). Pro tier allows **1000+ deploys / day per project**, so rate limit is no longer a daily constraint, but batching is still good hygiene — each commit is a separate revert point and noisy history is harder to read.

### Vercel projects (three, one repo)

| Project | Source | Domain | Builds when |
|---|---|---|---|
| `lovedesireapp` | root `vercel.json` → `expo export --platform web` → `dist/` | https://lovedesireapp.vercel.app | any changed file outside `web/` and `admin-web/` |
| `lovedesireapp-web` | `web/` (Astro + Tailwind marketing site, 9 pages) | https://lovedesireapp-web.vercel.app (→ `lovedesireapp.com` once the domain is assigned) | `web/` changes |
| `admin-lovedesireapp` | `admin-web/` (Vite React SPA, admin dashboard) | https://admin-lovedesireapp.vercel.app | `admin-web/` changes |

Root `public/` ships into the app preview only. **A page a human should open on a phone without a login (QA checklists, one-off notes) goes in `web/public/qa/`** and is served at `lovedesireapp-web.vercel.app/qa/<file>.html`. Claude artifacts require a Claude account to view, so they are not a way to hand a page to a non-user.

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

**Expo SDK 57 + TypeScript + Expo Router v6 (file-based routing)**

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
  sensate.tsx                Guided Sensate Focus ("Presence" in the UI) — 4-stage guided sessions (Discover / Connect / Together / Flow) with timer, cycle tracking (couples/{coupleId}/sensate/progress adds cyclesCompleted + currentCycleStages Aug 2026), full-cycle completion moment, Home nudge after 14+ days of inactivity if cyclesCompleted ≥ 1
  notes.tsx                  Love Notes — timed secret messages
  (memories.tsx removed — renamed / superseded by Moments daily-photo ritual in commit c649e3f; memoryService kept as legacy read for Home "memory of the day" card only)
  calendar.tsx               Special Days ledger — chronological list of anniversaries, birthdays, first times, grouped by Coming up / Next 3 months / Later this year. Rewritten from month-grid Aug 2026 to a pure ledger. Includes auto-inline Valentine's, partner birthday, couple anniversary from startDate. Secret dates render as "A surprise from {partnerName}" until the day arrives.
  (countdown.tsx removed Aug 2026 — merged into Special Days ledger since both used the same importantDateService data; secret-date toggle ported over)
  reminders.tsx              Reminders (called "Flirt Reminders" until Sep 21 2026; most of them are sweet, not flirty) — private reminders to do something sweet for the partner, local scheduled notifications. Opened from the Us tab (last section, after "Speak {partner}'s language"); was under Profile until Sep 21 2026.
  reset.tsx                  Reset — start over in ONE part of the app (Sep 19 2026), opened from Profile → Reset. Four rows one person may clear after a confirm, six that need the partner to agree. Deleting is done by the `resetCoupleData` callable.
  quiz.tsx                   Love Language Quiz — 10-question result
  love-language-nudge.tsx    Speak partner's love language — weekly Sunday nudge (local scheduled notification, Sunday 09:00), 3 concrete actions from partner's language pool (20 per language × 5 languages = 100). Deterministic pick (weekAnchor + coupleId) so both partners see same trio.
  pulse.tsx                  Redirect stub → /state-union (Pulse merged into Sunday Check-in Aug 2026 as a 5-dimension pre-step)
  daily-wishes.tsx           Redirect stub → /daily?category=... (kept for deep-linked URLs from July 2026 merge)
  (time-capsules.tsx removed July 2026 — abstract long-timeline payoff didn't demo well pre-launch; revisit if users request "seal for later" mechanics)
  (versus.tsx removed Aug 2026 — guess-what-partner-picked mechanic merged into Daily's binary-question reveal flow; see `submitGuess` / `skipGuess` in dailyQuestionsService)
  memory-lane.tsx            Memory Lane ("Manstu?") — weekly 5-question quiz generated from the couple's OWN history (Moments, Daily answers, moods, milestones, Sunday pulses, FW matches). Free, data-gated on 30 days since max(couple.createdAt, couple.firstRitualCompletedAt) (not paywalled). Each partner gets their OWN question set (`questions{uid:[]}`, Review #11 B1): Daily/mood questions are about the partner from the viewer's side, symmetric sources (milestones, Sunday, FW, Moment month) come out identical for both. Instant ✓/✗ per question, score card, partner score when both done. Sep 2026.
  (wishlist.tsx and fantasy.tsx removed — legacy features replaced by fantasy-wishes.tsx / dailyWishes)
```

### Firebase / Firestore data model

Firebase project: `lovedesireapp-8c7f2`

```
users/{uid}                          UserProfile — name, photoURL, coupleId, inviteCode, pushToken
users/{uid}/private/blueprint        BlueprintResult — type, scores, completedAt
users/{uid}/private/help             HelpState — enabled, seen[]
users/{uid}/private/features         FeatureUnlockState — sticky per-user data-gate unlocks (Versus unlock removed Aug 2026; doc currently unused, reserved for Memory Lane day-30 unlock)
users/{uid}/private/consent          ConsentState — confirmed, confirmedAt (age + explicit-content attestation)
users/{uid}/private/photoConsent     PhotoConsentState — confirmed, confirmedAt (H42 first-photo re-attestation)
users/{uid}/private/flirtReminders   { items: FlirtReminder[] } — message, time, days[], active, createdAt, local id (Sep 21 2026: PRIVATE, a reminder to do something for the partner only works if the partner never sees it; max 12)

couples/{coupleId}                   Couple — partner1Uid, partner2Uid, inviteCode, createdAt, startDate?, pendingPartner2Uid/Name/At (H22 request), partnerLeftUid/partnerLeftAt (set on disconnect), archivedAt/archivedMembers/archivedReplacedBy (server-set when a NEW partner gets a fresh doc; the remaining partner keeps their slot here for read access)
couples/{coupleId}/todos/{id}        Todo — text, category, completed, createdBy, createdAt
couples/{coupleId}/moods/{id}        MoodEntry — uid, emoji, note, createdAt
couples/{coupleId}/memories/{id}     Memory — photoURL (Firebase Storage URL), caption, createdBy, createdAt
couples/{coupleId}/notes/{id}        LoveNote — message, openAt, fromUid, opened
couples/{coupleId}/wishlist/{id}     WishlistItem — text, category, votes {uid: 'yes'|'maybe'|'no'}
couples/{coupleId}/fantasy/{id}      FantasyItem — text, category, votes {uid: 'yes'|'maybe'|'no'}
couples/{coupleId}/fwState/main      FWState — ONE doc per couple (Sep 19 2026): votes{uid:{itemId:'yes'|'no'}}, matched{itemId:{at,text}} (stamped once by the vote that completes a mutual Yes; keeps the text it was matched with), addToList{uid:{itemId:true}}, reactions{uid:{itemId:true}}, replies{uid:{itemId:text}} (C2). Created by the first vote; rules: a doc may only be BORN with the caller's own uid key in its per-uid maps
couples/{coupleId}/fantasyWishes/{id} CustomWish — couple-written wishes only: text, createdBy, createdAt. (Until Sep 19 2026 all 394 presets were copied here with votes on each doc; a doc that still has a `votes` field is legacy and is removed by `cleanupLegacyFantasyWishes`.)
couples/{coupleId}/reminders/{id}    LEGACY (until Sep 21 2026 Flirt Reminders were shared here and the partner could read them; migrated away per person by `migrateLegacyReminders`, nothing writes here)
couples/{coupleId}/dates/{id}        ImportantDate — label, date, emoji, createdBy
couples/{coupleId}/challenge/active  ChallengeState — program, phase, currentDay, completedDays[], completedBy, customTasks, editsUsed, vetoesUsed
couples/{coupleId}/blueprints/{uid}  BlueprintResult — type, scores, completedAt (readable by both)
couples/{coupleId}/wyr/active        WYRSession — level, questionIndex, answers{uid:a|b}, revealed, score, savedToList?, dayKey?, answeredToday?, bonusDraws? (H21 daily-cap fields Aug 2026)
couples/{coupleId}/bingo/{month}     ActivityCardsSession — squares[], revealed[], revealedBy{}, completed[], pendingCard, turnUid, passes{}, receiverPasses{}, resetCount
couples/{coupleId}/truthDare/active  TruthDareSession — level, turnUid, phase(picking|answering|done), card{type,text,answer,audioURL,answeredBy,dareConfirmed[]}, scores, round, skipsUsed
couples/{coupleId}/dailyWishes/{date} DailyWishDoc — items[], votes{}, addToList{}, reactions{uid:{gi:true}}, replies{uid:{gi:text}} (C2)
couples/{coupleId}/dailyQuestions/{date} DailyQuestionDoc — items[], discussed{} (unused), answers{uid:{gi:text}}, guesses{}, reactions{uid:{gi:true}}, replies{uid:{gi:text}} (C2), custom{uid:{text,createdAt}} (C2b, one couple-written question per person per day; its gi is derived: partner1 → 1000, partner2 → 1001)
couples/{coupleId}/stateUnion/{weekId} StateUnionDoc — weekId, startedAt, completedAt{uid:ts}, answeredCount{uid:n}
couples/{coupleId}/stateUnion/{weekId}/entries/{uid} StateUnionEntry — answers{qi:text}, pulseScores?, doneForPartner?[] (Sep 19 2026: what I ticked as DONE from an earlier private plan; the plan itself lives in users/{uid}/private/sundayPlans and never here), reactionsOnPartner?{qi:true} + repliesOnPartner?{qi:text} (C2, my heart / one line on the partner's answer, same owner-write / read-after-both gate), predictions?[] + verdictsOnPartner? (LEGACY, "Call it" retired Sep 19 2026, nothing reads them), updatedAt (rules: only readable by owner OR after both completed; owner-write has no week restriction)
couples/{coupleId}/memoryLane/{weekId} MemoryLaneDoc — questions{uid:[]} (one set per partner, generated once per week from a single shared source read, seeded weekId::coupleId; legacy docs from Sep 8 2026 hold a plain array, read via `questionsFor(doc, uid)`), answers{uid:{qi:optionIndex}} (inherits catch-all 'answers' guard), completedAt{uid:ts} (rules: each member may only stamp their own key; `questions` immutable after create). Never created for a week with zero questions on both sides.
couples/{coupleId}/tonight/{uid}     TonightSignal — uid, setAt, expiresAt (Sep 2026: private "in the mood tonight" flag, clears at 04:00 local; rules let the partner read it ONLY while their own signal is live, so a one-sided yes is never visible; excluded from the wildcard)
couples/{coupleId}/resetRequests/{key} ResetRequest — uid (who asked), at, autoAt? (joint targets only: when it clears without the partner; swept hourly by `runDueResets`), doneAt? + doneBy? / declinedAt? (the partner's answer, read by the asker; an answered doc is no longer a request). Written ONLY by the `resetCoupleData` callable; members can read, never write (rules). One per reset key, lapses after 7 days.
couples/{coupleId}/bingoCustom/{id}  CustomCard — text, createdBy, createdAt (couple-authored Activity Cards; up to 5 newest join each deck on ↺ New)

reports/{reportId}                   H33 Report — reporterUid, coupleId, targetUid, contentType, contentPath, contentSnippet, contentStorageUrl?, category, detail?, disconnected, status, createdAt, resolvedAt?, resolvedBy?, resolveNotes? (top-level, admin-SDK-only access via callables; couples wildcard NOT applied)
```

### Services (`/services`)

| File | Exports |
|------|---------|
| `firebase.ts` | `auth`, `db`, `storage` |
| `authService.ts` | `register`, `login`, `logout`, `getUserProfile`, `createUserProfile`, `disconnectFromCouple` |
| `coupleService.ts` | `createCouple`, `joinCouple` (→ `rateLimitedJoin` callable, writes a pending request), `acceptPairing` (→ `acceptPairing` callable, Sep 2026), `declinePairing`, `cancelPairingRequest`, `setCoupleStartDate`, `setLongDistance`, `setNextVisitDate`, `setPartnerBirthday`, `markFirstRitualIfUnset` |
| `todoService.ts` | `subscribeTodos`, `addTodo`, `toggleTodo`, `deleteTodo` — category: daily/dates/intimacy/goals (legacy `fantasy` category from before July 2026 is normalised to `intimacy` at read time) |
| `moodService.ts` | `setMood(coupleId, uid, emoji, note?, label?)`, `getTodaysMood`, `subscribeToMoods`, `subscribeMoodHistory`, `MOOD_LABELS`, `ALL_MOODS` (20 pickable), `CUSTOM_MOOD` (💬, own words, NOT in ALL_MOODS on purpose), `moodLabel(emoji, label?)` (use this wherever a label is printed; safe on unknown emoji). Sep 2026 C4 added Off / In my head / Overthinking / Tender / Check in with me and the own-words sheet on Home and Mood History (one shared `components/OwnWordsSheet.tsx` since Sep 20 2026: keyboard-aware, focuses on `onShow` because `autoFocus` inside a Modal does not raise the Android keyboard, plain placeholder "Write how you are feeling", a live "n/24" counter). `moodCaption(emoji, label)` is the mood as a caption (own words in quotes): the couple card on Home shows it under BOTH pills and Mood History → Together under every emoji, because until Sep 20 2026 the partner saw only the emoji and could not read own words anywhere (the push hides them when Discreet is on, which is the default). The partner's pill on Home opens `/mood-history?tab=together`. |
| `noteService.ts` | `subscribeNotes`, `createNote`, `openNote` |
| `reminderService.ts` | Private per person since Sep 21 2026, keyed by `uid`: `subscribeReminders(uid, cb)`, `addReminder`, `toggleReminder`, `deleteReminder`, `migrateLegacyReminders(uid, coupleId)` (one time, keeps ids so scheduled notifications can still be cancelled), `REMINDER_SUGGESTIONS` (with `{partner}`, filled by `personalise` before saving), `scheduleReminderNotifications`, `cancelReminderNotifications` |
| `fantasyWishesService.ts` | Storage like Daily since Sep 19 2026: content in the app, one state doc per couple. `presetId(text)`, `composeFWItems(state, customs)` (the whole deck as `FantasyWishesItem` views, incl. couple-written and retired-but-matched), `subscribeFWState`, `subscribeCustomWishes`, `subscribeFantasyWishes` (only touched items, ONE read; Home and Our Story), `getFWMatches(coupleId, uid1, uid2)` (Memory Lane, Year in Review), `voteOnFantasyWish(coupleId, item, uid, vote, partnerId)` → `{ newMatch }`, `isFWMatch`, `markFWAddToListAtomic`, `fwBothWantToAdd`, `reactToFantasyWish`, `replyToFantasyWish`, `addFantasyWishesItem(coupleId, text, uid)`, `resetFantasyWishes`, `cleanupLegacyFantasyWishes`, `setFWCategory` |
| `challengeService.ts` | `subscribeChallenge`, `startChallenge`, `activateChallenge`, `editTask`, `markDayComplete`, `vetoDay`, `resetChallenge` |
| `blueprintService.ts` | `subscribeCoupleBlueprints`, `saveBlueprintResult`, `getMyBlueprintOneshot`, `pickWeeklyLoversTip(myType, partnerType, coupleId)` (Sep 2026: one of the ordered pair's 3 compatibility tips or the partner's turnOns line, seeded per Monday-anchored week + couple; each partner sees their own side) |
| `notificationService.ts` | `notifyPartner` — POSTs to Expo Push API |
| `memoryService.ts` | `subscribeMemories`, `addMemory`, `deleteMemory` |
| `importantDateService.ts` | `subscribeDates`, `addImportantDate`, `deleteImportantDate`, `getDaysUntil` |
| `storageService.ts` | `uploadProfilePhoto`, `uploadMemoryPhoto`, `uploadTruthDareAudio`, `uploadCapsulePhoto`, `uploadFlashMedia`, `uploadMomentPhoto` — Firebase Storage. Photos compressed via `expo-image-manipulator` (max 1920px, JPEG 0.7) before upload. |
| `helpService.ts` | `getHelpState`, `markFeatureSeen`, `setHelpEnabled`, `disableAllHelp`, `resetHelp` |
| `dailyWishService.ts` | `subscribeDailyWishes`, `voteDailyWish`, `markAddToList`, `bothWantToAdd`, `drawMoreActions`. Day doc created in a transaction; picks skip item ids served in the last 56 days (`recentItemIds` + `excludeRecent`, Sep 2026 A5) |
| `dailyQuestionsService.ts` | `subscribeDailyQuestions`, `submitAnswer`, `bothAnswered`, `markDiscussed`, `bothDiscussed`, `drawMoreQuestions`. Day doc created in a transaction; questions skip texts served in the last 56 days (`recentQuestionTexts` + `excludeRecent`, Sep 2026 A5; questions have no id, the text is the key) |
| `wyrService.ts` | `subscribeWYR`, `startWYR`, `answerWYR`, `nextWYRQuestion`, `resetWYR`, `saveMatchToList`, `drawMoreWYR`, exports `WYR_DAILY_CAP` / `WYR_BONUS_PER_DRAW` / `WYR_MAX_BONUS_DRAWS` |
| `bingoService.ts` | `subscribeActivityCards`, `flipCard`, `markCardDone`, `skipReceivedCard`, `usePass`, `resetActivityCards` |
| `truthDareService.ts` | `subscribeTruthDare`, `startTruthDare`, `playCard`, `submitTruthAnswer`, `confirmDare`, `nextTurn`, `skipCard`, `resetTruthDare` |
| `reportService.ts` | `submitReport(input)`, `reportCategoryLabel`, `shouldPrecheckDisconnect`, `offersDisconnect` — H33 moderation. Wraps `submitReport` callable which writes to top-level `/reports/{reportId}` and optionally atomically disconnects the reporter's couple. Rate-limited server-side (20/day/uid). |
| `photoConsentService.ts` | `hasPhotoConsent(uid)`, `confirmPhotoConsent(uid)` — H42 first-photo re-attestation. AsyncStorage cache short-circuits Firestore read after first grant. |
| `memoryLaneService.ts` | `subscribeMemoryLane`, `ensureMemoryLaneWeek(coupleId, weekId, uid, partnerUid, myName, partnerName)` (one `loadSources` read → pure `buildQuestions(sources, view, seed)` per partner → transaction create-if-missing; returns without writing when both sets are empty), `questionsFor(doc, uid)`, `answerMemoryQuestion`, `completeMemoryLane`, `memoryLaneScore(doc, uid)`, `MEMORY_LANE_QUESTIONS` — six generators (moments / daily / mood / milestone / sunday / fw) with per-source cold-start minimums, max 2 per source, seeded selection. Daily source only uses questions BOTH answered (keeps Daily's mutual-reveal promise). Targets must be at least `MIN_AGE_DAYS` (3) old so there is something to have forgotten (distractors may be recent); questions asked in the last `NO_REPEAT_WEEKS` (4) weeks are excluded via `recentQuestionIds`, falling back to the full pool if that leaves fewer than 3. Sep 2026, per-uid rewrite Review #11. |
| `featureUnlockService.ts` | `getFeatureUnlockState`, `markMemoryLaneUnlocked` (caches only after a successful write), `isUnlockRecent`, `memoryLaneEligible(couple)`, `memoryLaneDaysLeft(couple)` (anchor = max(createdAt, firstRitualCompletedAt)), `MEMORY_LANE_UNLOCK_DAYS` (30), `MEMORY_LANE_DEV_UNLOCK` — sticky per-user data-gate unlocks at `users/{uid}/private/features`. Rebuilt Sep 2026 after the Versus version was deleted. |
| `spicyConsentService.ts` + `hooks/useSpicyConsent.tsx` | Once-per-day, per-person, per-device consent card before any explicit surface (Truth or Dare Spicy in both modes, Fantasy Wishes on entry), on top of the signup 18+ attestation. `joint` copy on the shared one-phone screen, `solo` copy elsewhere. AsyncStorage only. Reuses ConfirmModal. Sep 2026, from COMPETITORS.md (koopla). |
| `tonightService.ts` | `setTonight`, `clearTonight`, `subscribeMyTonight`, `subscribePartnerTonight` (subscribe only while mine is live), `isTonightLive`, `tonightMatchKey`, `tonightExpiry` (next 04:00 local) — the mutual-only "Tonight?" signal on Home; the client that completes the match (later setAt) sends the one push. Sep 2026, from COMPETITORS.md (In The Mood). |
| `resetService.ts` | `RESET_ROWS` (the ten rows, `both: boolean`; keys must match `RESET_TARGETS` in the callable), `runReset`, `requestReset`, `confirmReset`, `cancelReset`, `subscribeResetRequests` (live ones only). Wraps the `resetCoupleData` callable. Sep 19 2026. |
| `appLockService.ts` | `isAppLockEnabled`, `setAppLockEnabled`, `canUseAppLock`, `authenticate`, `LOCK_AFTER_MS` (60 s) — Face ID / Touch ID / passcode gate via `expo-local-authentication`, flag device-local in AsyncStorage (Sep 2026, USER_VOICE A7). |
| `reviewPromptService.ts` | `noteFirstOpen()`, `noteHappyMoment(moment)` — App Store / Play rating prompt via `expo-store-review`, gated per device on 7 days since first open, 3 happy moments, 90 days between asks; called after a Fantasy Wishes match, a Sunday reveal that appears during the visit, Memory Lane completion, challenge day 30. Never on Home or open. No-op in Expo Go. Sep 2026. |
| `seed.ts` | `hashString`, `mulberry32`, `seededShuffle`, `seededPick` — shared deterministic randomness for anything both phones must agree on without a server. Extracted from loveLanguageNudgeService Sep 2026. dailyQuestionsService and bingoService keep their own older LCGs on purpose (changing them would alter historical picks). `excludeRecent(pool, keyOf, recentDays, needed)` + `DAILY_NO_REPEAT_DAYS` (56): the no-repeat window for daily content that shrinks day by day (newest first) until at least `needed` items remain, so a small pool never yields an empty day (Sep 2026, USER_VOICE A5). |

### Hooks

- `useAuth()` — returns `{ user, profile, loading }`
- `useCouple(myUid, coupleId)` — returns `{ couple, partner, loading }`
- `useHelp(featureKey)` — returns `{ visible, dismiss, dismissAll }` for first-visit help popups
- `useSubscription()` — returns `{ isSubscribed, isLoading }` from `couples/{id}.isPremium`
- `usePhotoConsent()` — H42 photo consent guard; `guardPhotoAction(uid, action)` fires modal if unconsented, invokes action after grant
- `useCurrentWeekId()` — ISO week id that follows the clock (AppState foreground + 60 s check). Use instead of memoising `getCurrentWeekId()` in a screen; Sunday Check-in and Memory Lane do.
- `useSpicyConsent(uid)` — `{ spicyOk, requireSpicyConsent(mode, onProceed, onDecline?), spicyGate }`; render `{spicyGate}` in every root view of the screen.
- `usePaidAccess(hasData)` — paid-screen gate with a read view: `{ isSubscribed, ready, readOnly }`; see the paid-feature gate pattern below.
- `useAppLock()` — mounted once in `app/_layout.tsx`: `{ enabled, locked, covered, unlock, setEnabled }`; see "App lock" below.
- `useReport()` — H33 report launcher; `openReport(contentRef)` opens ReportModal with content reference, `reportContentRef` + `closeReport` for modal state

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
- `FANTASY_WISHES_PRESETS` — 392 scenario items for Fantasy Wishes, each with `category` (`FantasyWishesCategory`: sensual 50 / roleplay 55 / explicit 221 / bdsm 66; places and settings are `explicit`, `roleplay` is only parts to play) and `level` 1 / 2 / 3 (158 / 169 / 65: gentle or suggestive, clearly sexual and specific, intense or edgy; never shown, drives the deck order) plus `FANTASY_WISHES_CATEGORY_CONFIG` and `FW_CATEGORY_ORDER` (sensual → roleplay → explicit → bdsm). Every scenario is for the two of you; no third parties. Target 400+. See `memory/fantasy_wishes_prompt.md`. New presets MUST carry a category AND a level; then run `design/fantasy-wishes/simulate_deck.py` (regenerates `FANTASY_WISHES_LEVELS.md`, the readable list by level) and `check_ts_order.js`.
- `CHALLENGE_PROGRAMS` + `CHALLENGE_PROGRAM_CONFIG` — 4 programs x 30 tasks
- `WYR_QUESTIONS` + `WYR_LEVEL_CONFIG` — 191 Would You Rather questions (Playful 70 / Romantic 60 / Spicy 61). Plus `WYR_PACKS` (6 themed packs × 10) and per-couple `wyrCustom` collection (`addCustomWYRQuestion` inserts at deck front).
- `BINGO_ACTIVITIES` + `BINGO_REWARDS` — 50 activities + 10 rewards for Activity Cards
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
- `app.ts` — `APP_NAME`, `SITE_URL`, `JOIN_URL` for copy that leaves the app (share sheets, links). One place to change on H43.
- `pricing.ts` — `PRICING` (monthly, annual, trial days, intro month) + derived savings / discount; mirrored in `web/src/data/pricing.ts` because the site builds from `web/` as its Vercel root. The paywall shows live RevenueCat prices; these feed legal copy and docs.

### Key implementation patterns

**Rules budget for batches (found in review, Sep 19 2026):** a batched write or a transaction gets 20 rules `get()` calls in TOTAL, and the couples wildcard rule spends one per write on `isMemberOfCouple`. A client batch of more than about 15 writes into couple subcollections is rejected as a whole. Use single writes in parallel chunks (see `cleanupLegacyFantasyWishes`), or do it server-side. Large uid-keyed maps that nothing queries get a single-field index exemption in `firestore.indexes.json` (`fwState` has five).

**Content lives in the app, Firestore holds only what the couple did (rule since Sep 19 2026).** Never copy a content pool into a couple's collection: it costs a loading screen, one read per item on every open, and the couple never receives new content. Address pool items by a stable id and store votes / answers keyed by that id in one doc (Daily, Fantasy Wishes).

**Truth or Dare multiplayer:** Phase-based state machine (picking/answering/done) in Firestore. Picker draws card locally first (can skip/redraw before sending), then commits with `playCard()`. Truth: partner types text OR records audio (expo-av, uploaded to Firebase Storage). Dare: single-tap confirmation — challenged partner taps "Dare completed" and the round immediately moves to done (double-confirm removed Aug 2026, picker no longer has to also confirm; the extra click added zero trust value between partners who already share everything). Score goes to challenged person, not picker. `skipsUsed` tracks skips per uid. Picker screen has 2 live-play mode cards: Together Right Here (solo spin) and Wherever You Are (2-phone live). Inside Wherever You Are picking phase, partner can either DRAW random from the DARES / TRUTHS pool (top [Truth] [Dare] row) OR write their own via the "✏️ Truth" / "✏️ Dare" secondary row (Aug 2026 H19). Manual authoring writes to the same `playCard` service with a custom `text` field; partner-side rendering + answer/dare-complete flow is identical to pool-drawn cards. **The async-dares feature was deleted entirely Aug 2026 (H19)** — no more standalone `/dares` route, no `AsyncDaresPanel`, no `dareService`, no dare Home nudges, no deadline mechanic, no proof-photo upload. Manual live-mode authoring covers the same user-value (custom content) with dramatically less surface area.

**WYR session persistence:** Session stored in Firestore — Back button and app exit do NOT reset the game. Push notification sent when you answer. Home screen nudge appears when partner answered but you haven't. **Daily-cap pacing (Aug 2026, H21):** session carries `dayKey` + `answeredToday` + `bonusDraws` counters. Free tier caps at `WYR_DAILY_CAP` (5) reveals per day; paid tier can tap "Draw 5 more" from the DoneState to bump `bonusDraws` up to `WYR_MAX_BONUS_DRAWS` (3) packs = 20/day max. Counter resets on the first `answerWYR` reveal of a new day (`dayKey !== today` check inside the transaction). Cap applies per-couple-per-day across levels — switching from Playful to Romantic doesn't refresh the counter. Mirrors the Daily Picks bonus-draws pattern.

**Questions Game reveal:** Both partners answer privately. Open-text uses TextInput. Binary uses two large buttons (q.options[0] | or | q.options[1]). Scale uses 1-5 chips with "1 = not at all · 5 = completely" hint. Neither sees the other's answer until both have submitted. When both answered, both answers reveal side by side.

**Guess-in-Daily (ex-Versus, merged Aug 2026):** On binary Daily questions, after you answer, a bottom sheet offers "Wanna guess {partner}'s pick first?" with the two options or "Just show me". Guess or skip unlocks the reveal; a ✓/✗ banner shows instantly. Stored at `dailyQuestions/{date}.guesses.{uid}.{gi}` (sentinel `__skipped__`). `getWeeklyGuessStats` and `getGuessStreak` in `dailyQuestionsService` feed Home. Standalone Versus screen, `versusService`, and `featureUnlockService` were deleted.

**Activity Cards:** 25 face-down cards, turn-based. Picker has 2 passes to swap before accepting. Receiver gets the card and can mark "We did it!" or skip (1 pass). Cards have 3 states: face-down, pending (accepted not done), completed (green). `pendingCard` field tracks which card is waiting for receiver. Paid feature.

**Double-blind voting (Wishlist, Fantasy, Fantasy Wishes):** `votes: { [uid]: 'yes'|'maybe'|'no' }`. Only mutual `yes` surfaces in Matches. Never expose individual votes. FW UI dropped Maybe Aug 2026 (Yes/No + Skip only); the type stays broad for backward compat with existing docs.

**Daily Picks / Daily Questions:** Deterministic shuffle by date+coupleId ensures both partners see same items. 5 picks per category per day (Daily Picks), 3 questions per category per day (Daily Questions). **No-repeat (Sep 2026, A5):** before the shuffle, each category's pool drops what the couple was served in the last 56 day docs (`excludeRecent` in `services/seed.ts`), shrinking the window per category while fewer than base + all bonus slices would remain (Playful, 87 questions, keeps about 25 days; Deep keeps all 56). The history read happens once per generation (first open, bonus draw, migration) and history before today never changes during the day, so the seed, the slice layout and the answer / vote indices are untouched and both phones agree. Day docs are created in a create-if-missing transaction. `DEV_SHORT_DAILY_NO_REPEAT` in `constants/devFlags.ts` makes the window 3 days for a test. **Write your own question (Sep 2026, C2b; the link read "Ask {partner} something" until Sep 20 2026):** a link under the category tabs opens a one-field sheet; `askCustomQuestion` writes `custom.{uid}` (rules: own key only); the question shows in every category as a "FROM {NAME}" card for both partners, answered and revealed like any other, reactions included; `customGi(partner1Uid, askerUid)` gives 1000 / 1001 so answers, guesses, reactions and replies are keyed normally and `drawMoreQuestions` (items only) cannot clobber it; Memory Lane's daily source never sees it (indexes `items`). Push: "{name} asked you something 💬" with a discreet body.

**Fantasy Wishes deck (Aug 2026 refactor, categories Sep 2026 A6):** One card at a time from the derived deck: unvoted items whose category is on for the couple (`couples/{id}.fwCategories`, absent = on; items without a category are always in play), in the order of `orderFWDeck`, session-skipped moved to back. **Order (Sep 19 2026): a ramp, not category blocks.** Each level is spread over its own overlapping stretch of the deck (level 1 over 0 to 60%, level 2 over 8 to 90%, level 3 over 50 to 100%) and every (category, level) pile is spread evenly over its stretch, so the first twenty or so cards are gentle and mixed across categories, level 2 starts to blend in around card 23, level 3 only past the middle (card 224 of 392), and no category runs longer than about five cards. **The card prints its category** (a small "🎭 ROLEPLAY" line above the text, Sep 19 2026): in a mixed deck "Celebrity and fan meeting backstage" read as a riddle without it. The level is never shown. A preset's category must therefore be true of the card, not just a bucket. Strict waves were tried in simulation and rejected (first level-2 card at position 159). The order is computed from the content alone and is IDENTICAL for both partners on purpose: they vote on the same cards the same evening, which is what makes matches come early. Never shuffle per person. It is laid out over the playable set and voted cards then drop out, so a couple midway continues where it was; a category switched off drops out and the ramp re-forms; couple-written wishes come last. BDSM stays ON by default: the ☰ switch is shared, so turning it on would reveal exactly the interest the double-blind vote protects. Either partner changes categories from the ☰ sheet in the header; Matches are never filtered; the progress and DoneState counts use the filtered set; all categories off shows a "turn one back on" card. **Storage (Sep 19 2026):** the deck is composed in memory from `FANTASY_WISHES_PRESETS` (each preset addressed by `preset-{hash of its text}`) plus the couple's own wishes; nothing is seeded, so a new couple sees the first card at once, every open of Home / Our Story / this screen is one read instead of 394, and new or corrected presets reach every couple automatically. Rewording a preset makes it a new card; a match keeps its original text in `matched`. "Start over" is NOT on the screen (the ↺ header icon read as "refresh" and sat beside the two controls used daily): it is the Fantasy Wishes row on the Reset screen, see "Reset" below. Known and deliberate: both votes sit in a doc both can read, so double-blind is a promise of the UI, not the database (POST_LAUNCH). **Draw one for tonight (Sep 2026, C12):** with two or more matches the Matches tab has a button that picks one with `seededPick(matched, 1, \`${day}::${coupleId}::${n}\`)` (same draw on both phones the same day), pins it at the top as "Tonight's draw" and offers Draw again; nothing is written. Yes / No vote auto-advances by removing item from unvoted set on subscription round-trip. Legacy `shownUnvotedIds` batching + "Load 5 more" removed; existing Firestore Maybe votes preserved but no UI writes new ones. Progress bar scales to true totalCount but label hides the denominator (394 items is overwhelming; encourages grinding). Session pacing: after `SESSION_BATCH` (8) Yes/No votes, deck steps aside for "Load 8 more / Save for later" prompt. Skip does NOT count. Save for later parks at a "See you tomorrow" state with a change-my-mind link — never a hard gate.

**30-Day Challenge:** Setup phase allows 2 edits + 2 vetoes per partner before activating. `completedBy: {day: [uid]}` syncs across phones.

**Help system (feature hints):** `useHelp(key)` hook checks `users/{uid}/private/help` and shows `components/HelpModal.tsx` ("How it works": title, one-sentence description, 3 to 5 tips) once per feature; "I don't need more help" silences all, Profile → Help turns them back on or resets them. Keys are free-form strings. 21 screens carry one (audited Sep 17 2026): `together-list`, `bingo`, `blueprint`, `challenge`, `daily`, `fantasy-wishes`, `love-notes`, `love-language`, `reminders`, `date-night`, `presence`, `truth-dare`, `would-you-rather`, `sunday-checkin`, `memory-lane`, `moments`, `intimacy-log`, `tease`, `special-days`, `our-story`, `mood-history`. None on Home (the onboarding tour's mood step explains the Tonight? pill), the Love Language nudge (the screen already explains itself), Year in Review, Profile, Upgrade. **Length budget (Sep 19 2026, after the Fantasy Wishes card filled the whole screen):** at most 4 tips, each under about 84 characters, description plus tips under about 400; nobody reads more before tapping Got it. The card scrolls and its two buttons stay fixed, so a long hint can never push Got it off a small screen. **Writing rules:** the title is the feature's name as the app shows it; each tip is one thing you can do; quote only labels that exist on the screen; the partner by name (`partnerName`, fallback "your partner"); no pool sizes or other numbers that go stale; no words from the VOICE.md never-use list; say once which part is Premium. **When a feature changes, update its hint in the same commit.** Changing a hint's text does not show it again to someone who dismissed it (same key); use a new key only when the feature changed enough to need re-explaining.

**Pairing (H22 Aug 2026, A1 Sep 2026):** a code entry writes a pending request (`rateLimitedJoin` callable); the existing member accepts through the `acceptPairing` callable, never on the client. The callable fills the empty slot when it is the first pairing or the SAME former partner (`partnerLeftUid`) coming back, and creates a FRESH couple doc when a new partner joins after a disconnect: the old doc gets `archivedAt` / `archivedMembers` / `archivedReplacedBy`, the remaining partner stays in its slot (read access to their own history), nothing is copied, and a solo doc the joiner owned is archived too. **Premium follows its owner:** the fresh doc gets `isPremium` / `premiumSince` / `premiumOwnerUid` when the member who stays owns it (or no owner is recorded), and a joiner's own Premium is added; the leaver's subscription is never inherited (Sep 19 2026, found in the two-phone test; webhook requirements in LAUNCH_STATUS §4). Both profiles get `coupleId` in the same transaction; `pairing.tsx` detects acceptance from its own profile (`pendingCoupleId` seen, then gone, with `coupleId` set), not from the couple doc. `firestore.rules` make the partner slots immutable from the client except for the disconnect move (own slot → empty while stamping `partnerLeftUid = me`); `archived*` and `isPremium` are never client-writable. Every disconnect path (client `disconnectFromCouple`, `disconnectCoupleAdmin`, the delete cascade) stamps `partnerLeftUid`. New callables need the Cloud Run invoker IAM fix (memory `firebase_functions_v2_iam`). Rationale: USER_VOICE.md §2.1 (a new partner used to inherit the former partner's Intimacy Log, FW votes, Sunday answers, Notes, Moments).

**App lock (Sep 2026, USER_VOICE A7):** off by default, Profile → Privacy → "Lock the app". Device-local (AsyncStorage), so it protects this phone and the partner cannot toggle it. `useAppLock` in `app/_layout.tsx` locks on cold start and after 60 s in the background, and covers the screen with `components/AppLockOverlay.tsx` (cream, wordmark only) whenever the app is inactive so the app switcher never shows content. **That cover only works on iOS.** Android takes the switcher snapshot before JavaScript hears about the state change (seen on a phone, Sep 20 2026), so on Android `useAppLock` sets FLAG_SECURE through `expo-screen-capture` while the lock is on: blank card in the switcher, and screenshots blocked as a side effect (the Profile hint says so). The OS owns the secret (no PIN of ours); turning the switch on or off both authenticate, and it cannot be turned on without an enrolled biometric or device passcode. `NSFaceIDUsageDescription` + the `expo-local-authentication` plugin are in `app.json`.

**Push notifications:** Expo Push tokens registered on startup. `notifyPartner(coupleId, myUid, title, body, discreet?)` in `services/notificationService.ts` POSTs to the Expo Push API from the SENDER's phone after reading the recipient's profile (token, `notificationsEnabled`, `discreetNotifications`), 10 s cooldown per recipient + title. 18 call sites (mood ×2, love tap, Tonight, Daily, WYR, Sunday Check-in, Moments, Notes, Together List suggestion, Challenge, Activity Cards ×4, Fantasy Wishes match, Intimacy Log, Tease) plus the server's pair request. **Discreet notifications (Sep 2026, USER_VOICE A4):** the eight sites whose full text carries words for the two of you (Tonight, FW match, Intimacy Log, mood label, card text, Tease caption, love-tap message, list suggestion) pass a `discreet` variant (the app and a name, never the words); the recipient's `discreetNotifications` (Profile switch, default on) picks which is sent. New push sites with sensitive words must pass a variant. Only works on real devices (EAS builds).

**Home screen nudges ("Waiting for you"):** index.tsx subscribes to challenge, notes, fantasyWishes, dailyQuestions, dailyWishes, WYR, truthDareSession, moments, flashes, sensate, todos, sunday check-in, bingo. Shows nudge card when partner has acted but current user hasn't. Some nudges `unshift` to top of stack for weekly/timed rituals (Year in Review, LDR pre/post-visit, incoming flash, Sunday Love-Language). The "Intimate moment" card (Intimacy Log opt-in, 7+ days since the last entry) goes where its sentence points: a shared Daily pick → `/daily`, else existing matches → `/fantasy-wishes?tab=matches`, else the log; it no longer counts days out loud (Sep 17 2026). The "N matches" card opens Matches directly via the same `?tab=matches` param. Aug 2026 dedupes: Fantasy Wishes matches-nudge suppresses the partner-ahead nudge when both would fire (same emoji, same route, matches wins as the specific-reward signal); Truth or Dare has two mutually-exclusive states (`phase='answering' && turnUid !== uid` → "{partner} sent you a Truth/Dare" with card-text preview; `phase='picking' && turnUid === uid` → "Your turn in Truth or Dare"), no dedupe needed. Insight card (daily rotating love-language tip) hidden on Sundays when partner has loveLanguage — Sunday LL nudge owns the surface. Personalized greeting: "Good morning, {firstName}" when profile.name is set. **Tonight? signal (Sep 2026):** a pill under my mood in the couple card sets a private flag that clears at 04:00; the partner's flag is readable only while mine is live (rules), so Home shows the "You're both in the mood tonight" banner only on a mutual yes, and the one who completed the match sends the single push. Free tier. **The Lovers (Sep 2026):** Home subscribes to both partners' blueprints (`subscribeCoupleBlueprints`) and shows three cards, all gated on `isSubscribed`: partner finished and you have not (data-driven, no dismiss key), the Friday tip (weekly dismiss key), and the annual anniversary. The result screen lets each compatibility tip be added to the Together List (`source: 'lovers'`, category intimacy).

**Home while unpaired (Sep 2026, USER_VOICE C6):** under the connect banner, a "While you wait" card with four solo actions (send the invite via the share sheet with `inviteMessage(code)` from `constants/app.ts`, add a Special Day, take the Love Language quiz, write a Love Note for the arrival) and one line on what the partner will see. Tonight's Picks are hidden until paired; the mood picker stays.

**Home Tonight's Picks:** 3 launcher tiles — Daily (💫), Truth or Dare (🎯), Fantasy Wishes (✨). See-all-games row routes to Discover tab. Dares tile was added Aug 2026 (H5), removed Aug 2026 (H14), and the async-dares feature it linked to was deleted entirely Aug 2026 (H19) in favour of manual truth/dare authoring inside the Wherever You Are live game flow. No dare-related Home nudges remain — everything happens live in the session now.

**Intimacy Log (reflection framing):** Paid + per-user opt-in (`profile.features.intimacyLog`). Reframed Aug 2026 (H25) — the composer's "Note" field is labeled "One thing memorable about this?" and the Us tab subtitle reads "Your shared story of closeness". Not entertainment; a private reflection surface for the self-selected user segment that wants it. Monthly narrative surfaces at top of Stats tab (past-month, ≥3 entries, `generateMonthlyNarrative`) + Home nudge on days 1-7 of new month → `/intimacy-tracker?tab=stats`. **Cross-flow prompts** hand off from three adjacent moments — Sensate cycle complete, Fantasy Wishes fresh match, Daily Spicy Picks fresh mutual-yes — each firing a `useToast()` bubble via the shared [`components/Toast.tsx`](components/Toast.tsx). Tap → `/intimacy-tracker?prefill=<source>` opens the composer with contextual defaults (initiatedBy / types / mood); user reviews and saves. `PREFILL_PRESETS` table in intimacy-tracker.tsx. All hooks gated on the opt-in feature flag so non-users see nothing. **Logger-relative fields (Sep 2026):** the entry is shared, but `initiatedBy` ('me' | 'partner' | 'both'), `orgasm.me` / `orgasm.partner` and `typeDetail` are all stored from the LOGGER's side (`loggedBy`). Every display and stat goes through `initiatedFromViewer` / `directionFromViewer` (or the equivalent flip in `getIntimacyStats`) so the partner's phone reads them the right way round; never read those fields raw. `typeDetail?: { oral?, hands? }` holds an optional direction ('gave' | 'received' | 'both') per directional type, set from a small sub-row that only appears under What? while Oral or Hands is selected ("For {partner}" / "For you" / "Both ways"); unspecified is the default. Rendered as "Oral · for Eva" pills. Stats ignore it for now (a giving/receiving balance card can come once there is data). Stats tab needs `STATS_MIN_ENTRIES` (3) entries and counts down until then.

**WhileYouWait (`components/WhileYouWait.tsx`, Sep 2026):** rendered under every in-screen "waiting for {partner}" state (Sunday Check-in, Presence reflection, Moments, Daily, WYR, Truth or Dare, Activity Cards). **Only at a dead end:** Daily shows it on "Done for today" while the partner still has cards to go, NOT on each answered card (until Sep 20 2026 it sat on every card mid-deck, where more cards were waiting and the box pushed Next → below the fold). Turns the dead end into 1-2 chips the user can act on alone: take today's Moment (self-subscribes to `moments/{today}`, hidden once captured) and leave a Love Note. Only genuinely solo actions belong here; the Presence mini was considered and dropped because it is a two-person touch exercise. `exclude` prop hides the chip that points back at the host screen. Answers the partner-lag churn driver without any per-user activity tracking.

**A little something for {partner} (Sep 19 2026, replaced "Call it"):** the optional last step of the Sunday Check-in. "Call it" (hidden predictions about the partner, graded by the partner) read as a hidden wish list and made the partner mark their own misses, so it was turned around: you write one to three small things YOU will do before the next check-in ("Need an idea?" pulls from the partner's love-language pool, or `GENERIC_SMALL_THINGS`). The plan is stored in `users/{uid}/private/sundayPlans` with its `coupleId` (self-only by the existing private rule; NEVER under `couples/…`, where an entry becomes readable once both finish). After a later check-in the writer ticks what happened; only ticked items are written, to their current week's entry as `doneForPartner`, and the partner sees "🎁 {name} did this for you, on purpose" in the reveal, Past check-ins and the Our Story archive. **The rule: only what was done is ever shown.** No counts, no "x of y", no trace of an unticked plan. One silent local notification three days later (no content in the body), and the plan is shown back to its writer in two places, both private: the Sunday Check-in screen ("Your little something for {partner} · only you see this": the newest unanswered plan, on the first step when the screen is opened during the week and on the finished screen, hidden once the "Last time you planned" tick card asks about the same plan; NOT tied to the ISO week, which turns over hours after the plan is written; a plain list with no counts). It is deliberately NOT in Past check-ins: that is the shared record, and an unticked plan must leave no trace, not even for its writer, or it becomes a list of things not done and the Monday love-language screen ("From your Sunday Check-in · only you see this"). `services/sundayPlanService.ts`.

**Sunday Check-in sets get deeper over time (Sep 19 2026):** 25 sets of 5 in `services/stateUnionService.ts`, each with a depth in `STATE_UNION_SET_TIER` (1 light, 2 middle, 3 heavy: repair, fear, money, family, being seen). `pickWeeklyQuestionSet(weekId, coupleId, history)` allows tier 1 only for a couple's check-ins 1 to 3, tiers 1 and 2 for 4 to 8, everything from 9; it counts check-ins, not calendar weeks, and skips recently used sets with a shrinking window (`excludeRecent`). The pick is frozen on the week doc as `questionSetId`, so history never changes. Never reorder sets; a new set needs a tier. The bar for every question (content pass Sep 19 2026, all 125 rewritten against it; the full rule is in the service header and `memory/sunday_checkin_prompt.md`): answerable in ten seconds with one memory, the answer tells the partner something new, a friend could ask it. The partner is the voice ("you" answers, "I" reads). Tier 0 retires a set; after launch a changed question ships as a new set, never an in-place edit. Copy rule for these questions: plain English, no idioms ("bend for", "land", "carry quietly", "nail down" were all removed), because many couples read them as a second language.

**Weekly ritual calendar (Sep 2026):** Sunday = Check-in (+ optional "A little something for {partner}") · Monday = love-language nudge · Wednesday = "write one Would You Rather for {partner}" (`/would-you-rather?author=1` opens the add modal; hidden once authored this ISO week) · Thursday = Memory Lane if unlocked and unplayed, else "your first Sunday Check-in was N weeks ago" history card · Friday = Lovers tip (paid, both partners have a The Lovers result; dismiss key `lovers-tip-{weekId}`). Daily = Daily + Moments. Keep new weekly rituals off Sunday/Monday.

**Looking back (Our Story archives; Daily answers Sep 19 2026, USER_VOICE C3):** nothing a couple answers is deleted, and everything has a place to be read again: Sunday answers ("Past check-ins" on the Sunday screen and in Our Story), mutual-Yes Daily picks, Fantasy Wishes matches, Love Language weeks, Moments, moods, and since Sep 19 the text answers to Daily questions. `getAllRevealedDailyAnswers` (dailyQuestionsService) scans `dailyQuestions` once, lazily, the first time the "Daily answers" tile or `/our-story?archive=answers` (the "Your past answers, in Our Story ›" link in Daily's DoneState) is opened. Rules of the view: only questions BOTH answered (one-sided answers never show, not even your own), today excluded (the guess step still lives in Daily), couple-written questions included with a FROM pill, hearts and replies shown with `ReactionRow readOnly`, grouped by month then day, readable without Premium whatever the category (A2). A new answer-bearing feature needs a look-back surface before it ships. Not covered: Would You Rather (only scores are stored).

**Reactions and replies (Sep 2026, USER_VOICE C2):** `components/ReactionRow.tsx` renders a ❤️ toggle, the partner's heart chip, and one optional line per person on an item BOTH have already revealed: Daily questions after mutual reveal and picks with a mutual Yes (`reactToDailyQuestion` / `replyToDailyQuestion`, `reactToDailyPick` / `replyToDailyPick`), Fantasy Wishes matches (`reactToFantasyWish` / `replyToFantasyWish`), and Sunday Check-in answers once both finished (`reactOnPartnerAnswer` / `replyOnPartnerAnswer`, stored on MY entry so the existing gate applies; history shows them read-only). Not a chat: no threads, no read state, no counters, no tab; a reply can be edited or removed. The reply is written in a bottom sheet ("Reply to {name}"), never inline in a scrolling list (every list or scroll view that hosts a `ReactionRow` must set `keyboardShouldPersistTaps="handled"`, or the first tap on Send only closes the keyboard: a Modal is still a React child of the list), and whoever replied FIRST is shown on top: `replyAt` (uid → key → ms; `replyAtOnPartner` on a Sunday entry) is stamped when a reply is first written and kept on an edit (`keepTime`). Replies from before Sep 19 2026 have no time and show the partner's line first. A reply pushes the partner ("{name} replied 💬", discreet body "Open to read it."); hearts are silent. Rules guard `reactions` / `replies` like `answers` (own uid key only). The old `discussed` / `markDiscussed` path is unused and superseded.

**Reset and erasure (`app/reset.tsx`, Sep 19 2026):** a couple can start over in ONE part of the app (disconnecting does not do it: by A1 the same partner gets the history back). Built on one rule, from GDPR Art. 17 and 7(3) read against data two people share (conservative reading, not legal advice; DPIA §4.3 and §5.1): **(1) what is YOURS you erase alone and at once** ("Clear mine": your answers, moods, photos, notes you wrote, votes, hearts, replies, milestones you added; for Fantasy Wishes also every match, because a match shows your Yes); **(2) what is your PARTNER'S needs your partner** ("Clear for both": ask → neutral push + a Home card → "Agree and clear" / "Not now"; a request lapses after 7 days; **the asker always reads the answer**: on "Agree" or "Not now" the callable turns the request into an answer (`doneAt` / `declinedAt`) that the asker sees as a Home card and on the Reset row; reading it there closes it (it is removed when the asker leaves the Reset screen, no button: a first "OK" button made no sense to the tester), shown for 7 days at most, and the answering phone sends one neutral push, "{name} answered you", the same words for yes and for not now. Before Sep 20 2026 the request was simply deleted and the asker never learned what happened. The asker's own Cancel just deletes it); **(3) what is inseparably about BOTH, the Intimacy Log, either of you can erase**: it clears on a date 7 days out (inside Art. 12(3)'s month, the date is shown to both) or at once if the partner agrees; only the person who started it can cancel, the partner can bring it forward but never stop it. Memory Lane and Presence are derived and either clears them at once. **Never make one person's erasure depend on another person, and never let one person destroy the other's own data alone.** All deleting is server-side in the `resetCoupleData` callable (`mine` / `request` / `confirm` / `cancel`, field-level `mine` per target in `RESET_TARGETS`, "Clear mine" works unpaired too) plus the hourly `runDueResets`; the rules forbid a client from deleting `stateUnion`, Moments has files, and agreement can only be checked there. **Account deletion follows the same rule:** with the partner remaining, `eraseOwnContributions` removes the leaver's own part of every target, everything joint, and their quiz results (until Sep 19 2026 the cascade kept all shared history, contradicting Privacy §6). Switching the Intimacy Log off offers the erasure on the spot. The privacy policy (app + site), FAQ, support page and DPIA say exactly this; change them together with the code. A new feature that accumulates shared history needs a `RESET_TARGETS` entry with a `mine`, a row in `RESET_ROWS`, and a decision about which of the three kinds it is.

**Shared Toast (`components/Toast.tsx`):** `useToast()` hook returns `{ toast, showToast, dismiss }`. Two visual variants — `default` (cream fill, burgundy border, info tone) and `emphasis` (burgundy fill, cream text, celebrations). Optional `onTap` handler wraps in TouchableOpacity. Auto-dismisses after `duration` (default 3s). Extracted from fantasy-wishes.tsx inline pattern; used by FW, Bingo, Sensate, Daily. Render `{toast}` inside the screen's root View.

**Firebase Storage:** Profile photos at `users/{uid}/profile.jpg`, memories at `couples/{coupleId}/memories/`, Truth or Dare audio at `couples/{coupleId}/truthDare/{round}_{uid}.m4a`, Moments at `couples/{coupleId}/moments/{date}_{uid}.jpg`, Flashes at `couples/{coupleId}/flashes/{ts}_{uid}.{ext}`. All photo uploads compressed via `expo-image-manipulator` (max 1920px, JPEG 0.7) before `uploadBytes`. (Time Capsules storage path at `couples/{coupleId}/timeCapsules/` no longer written — feature removed July 2026, any pre-launch test blobs remain in Storage until GDPR cascade cleans them.)

**Content rules:** No em dashes (—) anywhere in UI strings — use commas instead. Dares must be physical actions (do something), not verbal (say/tell/describe). Spicy level = explicitly X-rated language.

**Pronoun-free copy convention (Aug 2026):** User-facing strings refer to the partner by NAME (`${partnerName}`) or by "your partner" — not by `they/them/their`. Exception: pronouns are fine where they follow a name in the same sentence and swapping would sound stiff ("Tell {partnerName} what you love about who they are"). Rationale: names are personal, impossible to misgender, avoid the settings surface a pronoun toggle would need, and sidestep Icelandic-locale declension complications if we ever localise. Chart labels, log options, standalone tooltip refs → always use name or "Partner".

**Subscription gating:** `hooks/useSubscription.ts` — returns `{ isSubscribed }`. Reads `couples/{coupleId}/isPremium` so **one subscription covers both partners**. RevenueCat webhook writes to the couple doc; QA test couples flipped manually in Firebase Console. Client cannot write `isPremium` or `premiumSince` (firestore.rules blocks the two fields explicitly). Legacy per-user `isPremium` on `users/{uid}` was deprecated Aug 2026 — any stale value is ignored by the hook.

**Paid-feature gate pattern (defense in depth, read view since Sep 2026):** every paid screen enforces the paywall AT THE SCREEN, not just on the entry-point card, so Home nudges and deep links cannot bypass it. Paid screens gate WRITES; data the couple created is always readable (USER_VOICE A2: Cozy Couples, Evergreen and Lovewick were punished for locking what people had already made). Use `usePaidAccess(hasData)` from `hooks/usePaidAccess.ts`:

```tsx
const [loaded, setLoaded] = useState(false);            // set true in the data subscription callback
const { ready, readOnly } = usePaidAccess(loaded ? entries.length > 0 : null);
// hasData null → not loaded (render nothing) · false → non-subscriber is sent to /upgrade
// true → non-subscriber gets the screen read-only: hide every write affordance, render
// <PremiumEndedBanner /> (components/PremiumEndedBanner.tsx) as the first thing under the header
if (!ready) return null;
```

Read views exist on Intimacy Log (log + stats; no composer, no delete), Fantasy Wishes (Matches only; "+ Add to Together List" stays), The Lovers (own result + compatibility; no retake) and Activity Cards (board with done/revealed cards; no flip, pass, reset, custom cards, receiver flow). Presence and Tease keep the full gate on purpose. Discover/Us cards for the four read-view screens carry `readable: true` and route to the screen even when locked (the screen decides); 🔒 stays as the cue. Home nudges that invite a WRITE on a paid screen are gated on `isSubscribed`; read nudges (FW matches, monthly narrative, active challenge) are not.

For per-item gating (e.g. Challenge's Fire+Desire programs while Reconnect+Spark are free), gate the tap handler:

```tsx
if (PAID_PROGRAMS.has(program) && !isSubscribed) { router.push('/upgrade' as any); return; }
```

### Free tier (store-safe)
- Truth or Dare: Sweet + Flirty only across both modes — "Together Right Here" (one phone, quick spin, ex-Dare Wheel folded in July 2026) and "Wherever You Are" (two phones, turn-based multiplayer)
- Daily: Playful category only — combines old Sweet Daily Picks (5/day) + old Playful Questions (3/day, incl. binary + scale variants). Flirty Daily Picks moved to Spicy tier July 2026 as part of the Daily merge.
- Guess-partner's-answer on binary Daily questions (ex-Versus, inside Daily since Aug 2026; not a separate screen)
- Memory Lane (data-gated: Discover card shows "Nd" pill + toast until 30 days since max(couple.createdAt, couple.firstRitualCompletedAt), then permanently visible with a NEW badge for 7 days. Not paywalled.)
- Sunday Check-in's optional last step, "A little something for {partner}" (a private plan; only what was done is ever shown)
- Would You Rather: Playful + Romantic only
- Tonight's Date (full)
- All connection features: Mood, Notes, Moments, Countdowns, Reminders (full)
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
- Tease (24h ephemeral photos, videos, voice — moved to paid Aug 2026 per H41: narrows highest-risk photo-upload surface. Moments stays free as flagship daily-photo ritual.)
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

A new account never sees the post-login gate (Sep 19 2026): the routing effect skips the consent read while on Register (which awaits `confirmConsent` before navigating), a confirmed record always clears a stale gate, and an account created in the last minute gets one re-read after 1.5 s before the gate shows. Before this, the read could land before Register's write and the gate flashed for a second, unmounting the Stack while it did.

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
