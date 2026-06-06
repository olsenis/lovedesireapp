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
  index.tsx                  Home — mood, partner card, "Waiting for you" nudges, Daily Picks
  todo.tsx                   Together List — shared todos (Daily Life / Date Ideas / Intimacy / Fantasy / Goals)
  discover.tsx               Together hub — Games + Challenges
  love.tsx                   Love hub — Intimacy / Connection / Insights

app/                         Full-screen sub-screens
  dare.tsx                   Dare Wheel — Sweet / Flirty / Spicy spin
  roulette.tsx               Date Night Roulette — spin for a date idea
  questions-game.tsx         Questions — 3/day per category, private answers, reveal when both answered, daily streak
  fantasy-wishes.tsx         Fantasy Wishes — explicit double-blind voting, 5 at a time
  truth-dare.tsx             Truth or Dare — real 2-phone multiplayer (picking/answering/done), audio answers
  would-you-rather.tsx       Would You Rather — simultaneous answer reveal, 3 levels, session persists
  bingo.tsx                  Activity Cards — 25 face-down cards, turn-based reveal, 3 states (pending/done), passes system
  challenge.tsx              30-Day Challenge — Reconnect/Spark/Fire/Desire + edit/veto system
  blueprint.tsx              Erotic Blueprint Quiz — 5 types, couple compatibility
  profile.tsx                Profile & Settings — name, photo, password, notifications, relationship date
  sensate.tsx                Guided Sensate Focus — 3-stage guided sessions with timer
  notes.tsx                  Love Notes — timed secret messages
  memories.tsx               Memory Wall — shared photo album (Firebase Storage)
  countdown.tsx              Countdowns — important dates & anniversaries
  reminders.tsx              Flirt Reminders — local scheduled notifications
  quiz.tsx                   Love Language Quiz — 10-question result
  hita.tsx                   Relationship Pulse — private 10-question satisfaction tracker
  daily-wishes.tsx           Daily Picks — 5/day per category (Sweet/Flirty/Spicy/Sexual)
  time-capsules.tsx          Time Capsules — seal a message/photo to open at a future date (1y/5y/10y or custom)
  versus.tsx                 Versus — guess what your partner picked, binary-question knowledge quiz
  wishlist.tsx               Shared Wishlist (legacy — not in main nav)
  fantasy.tsx                Fantasy Match (legacy — replaced by fantasy-wishes.tsx)
```

### Firebase / Firestore data model

Firebase project: `lovedesireapp-8c7f2`

```
users/{uid}                          UserProfile — name, photoURL, coupleId, inviteCode, pushToken
users/{uid}/private/blueprint        BlueprintResult — type, scores, completedAt
users/{uid}/private/help             HelpState — enabled, seen[]

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
couples/{coupleId}/wyr/active        WYRSession — level, questionIndex, answers{uid:a|b}, revealed, score
couples/{coupleId}/bingo/{month}     ActivityCardsSession — squares[], revealed[], revealedBy{}, completed[], pendingCard, turnUid, passes{}, receiverPasses{}, resetCount
couples/{coupleId}/truthDare/active  TruthDareSession — level, turnUid, phase(picking|answering|done), card{type,text,answer,audioURL,answeredBy,dareConfirmed[]}, scores, round, skipsUsed
couples/{coupleId}/dailyWishes/{date} DailyWishDoc — items[], votes{}, addToList{}
couples/{coupleId}/dailyQuestions/{date} DailyQuestionDoc — items[], discussed{}, answers{uid:{gi:text}}
couples/{coupleId}/streaks/questions QuestionStreak — count, lastDate
couples/{coupleId}/timeCapsules/{id} TimeCapsule metadata — sealedAt, openAt, sealedBy, sealedByName, opened, hasPhoto
couples/{coupleId}/timeCapsules/{id}/sealed/data TimeCapsuleContent — message, photoURL? (rules: only readable by sealer or after openAt)
couples/{coupleId}/stateUnion/{weekId} StateUnionDoc — weekId, startedAt, completedAt{uid:ts}, answeredCount{uid:n}
couples/{coupleId}/stateUnion/{weekId}/entries/{uid} StateUnionEntry — answers{qi:text}, updatedAt (rules: only readable by owner OR after both completed)
```

### Services (`/services`)

| File | Exports |
|------|---------|
| `firebase.ts` | `auth`, `db`, `storage` |
| `authService.ts` | `register`, `login`, `logout`, `getUserProfile`, `createUserProfile`, `disconnectFromCouple` |
| `coupleService.ts` | `createCouple`, `joinCouple`, `getCouple`, `setCoupleStartDate` |
| `todoService.ts` | `subscribeTodos`, `addTodo`, `toggleTodo`, `deleteTodo` — category: daily/dates/intimacy/fantasy/goals |
| `moodService.ts` | `setMood`, `getTodaysMood`, `subscribeToMoods` |
| `noteService.ts` | `subscribeNotes`, `createNote`, `openNote` |
| `reminderService.ts` | `subscribeReminders`, `addReminder`, `toggleReminder`, `deleteReminder`, `scheduleReminderNotifications`, `cancelReminderNotifications` |
| `wishlistService.ts` | `subscribeWishlist`, `addWishlistItem`, `voteOnWish`, `isMatch` |
| `fantasyService.ts` | `subscribeFantasy`, `addFantasyItem`, `voteOnFantasy`, `isFantasyMatch` |
| `fantasyWishesService.ts` | `subscribeFantasyWishes`, `addFantasyWishesItem`, `voteOnFantasyWish`, `isFWMatch`, `markFWAddToList`, `clearAndReloadFantasyWishes` |
| `challengeService.ts` | `subscribeChallenge`, `startChallenge`, `activateChallenge`, `editTask`, `markDayComplete`, `vetoDay`, `resetChallenge` |
| `blueprintService.ts` | `subscribeCoupleBlueprints`, `saveBlueprintResult` |
| `notificationService.ts` | `notifyPartner` — POSTs to Expo Push API |
| `memoryService.ts` | `subscribeMemories`, `addMemory`, `deleteMemory` |
| `importantDateService.ts` | `subscribeDates`, `addImportantDate`, `deleteImportantDate`, `getDaysUntil` |
| `storageService.ts` | `uploadProfilePhoto`, `uploadMemoryPhoto`, `uploadTruthDareAudio`, `uploadCapsulePhoto`, `uploadFlashMedia`, `uploadMomentPhoto` — Firebase Storage. Photos compressed via `expo-image-manipulator` (max 1920px, JPEG 0.7) before upload. |
| `helpService.ts` | `getHelpState`, `markFeatureSeen`, `setHelpEnabled`, `disableAllHelp`, `resetHelp` |
| `dailyWishService.ts` | `subscribeDailyWishes`, `voteDailyWish`, `markAddToList`, `bothWantToAdd` |
| `dailyQuestionsService.ts` | `subscribeDailyQuestions`, `subscribeStreak`, `submitAnswer`, `checkAndUpdateStreak`, `bothAnswered`, `markDiscussed`, `bothDiscussed` |
| `wyrService.ts` | `subscribeWYR`, `startWYR`, `answerWYR`, `nextWYRQuestion`, `resetWYR` |
| `bingoService.ts` | `subscribeActivityCards`, `flipCard`, `markCardDone`, `skipReceivedCard`, `usePass`, `resetActivityCards` |
| `truthDareService.ts` | `subscribeTruthDare`, `startTruthDare`, `playCard`, `submitTruthAnswer`, `confirmDare`, `nextTurn`, `skipCard`, `resetTruthDare` |
| `timeCapsuleService.ts` | `subscribeTimeCapsules` (metadata), `sealTimeCapsule` (writes metadata + content as separate docs), `getCapsuleContent` (lazy fetch of /sealed/data when opening), `markCapsuleOpened`, `isUnlocked` |
| `versusService.ts` | `loadVersusPool` — queries last 45 days of `dailyQuestions`, filters binary questions partner has answered, returns shuffled quiz items |

### Hooks

- `useAuth()` — returns `{ user, profile, loading }`
- `useCouple(myUid, coupleId)` — returns `{ couple, partner, loading }`
- `useHelp(featureKey)` — returns `{ visible, dismiss, dismissAll }` for first-visit help popups

### Static content (`/constants/content.ts`)

All static game content lives here — import from this file, never hardcode in screens:

- `QUESTIONS` + `QUESTION_CATEGORY_CONFIG` — 403+ questions across Fun/Deep/Romantic/Spicy/Therapy/Fantasy. `Question` interface gained `format?: 'open' | 'binary' | 'scale'` + `options?: [string, string]` (May 2026). 15 binary + 15 scale variants in pool. Target 500+. See `memory/question_writer_prompt.md` for quality standards.
- `DARES` + `DARE_LEVEL_CONFIG` — ~141 dares across Sweet (~45)/Flirty (~46)/Spicy (~50). Clear level separation: Sweet=cute/romantic, Flirty=sensual kissing/touch, Spicy=explicitly sexual/X-rated. Target 200+. See `memory/explicit_content_prompt.md`.
- `TRUTHS` — 310 truths across Sweet(95)/Flirty(95)/Spicy(120). Sweet=emotional, Flirty=physical attraction, Spicy=explicitly sexual. See `memory/explicit_content_prompt.md`.
- `DATE_IDEAS` — 130 date ideas (53 home + 39 out + 38 adventure + 28 with `virtual: true` for LDR). Rich 1-2 sentence descriptions.
- `PRESET_WISHES` — 60 wishlist presets (Romantic/Adventure/Intimate/Spicy, 15 each)
- `QUIZ_QUESTIONS` + `LOVE_LANGUAGE_LABELS` — 10 A/B love language questions
- `BLUEPRINT_QUESTIONS` + `BLUEPRINT_TYPE_CONFIG` + `BLUEPRINT_COMPATIBILITY` — 15 A/B questions, 5 types, 25-pair compatibility guidance
- `FANTASY_PRESETS` + `FANTASY_CATEGORY_CONFIG` — 60 fantasy presets (Roleplay/Sensual/Bold/Adventurous)
- `FANTASY_WISHES_PRESETS` — 294 scenario items for Fantasy Wishes (Sensual/Roleplay/Explicit/BDSM). Target 400+. See `memory/fantasy_wishes_prompt.md`.
- `CHALLENGE_PROGRAMS` + `CHALLENGE_PROGRAM_CONFIG` — 4 programs x 30 tasks
- `WYR_QUESTIONS` + `WYR_LEVEL_CONFIG` — 90 Would You Rather questions (Playful/Romantic/Spicy)
- `BINGO_ACTIVITIES` + `BINGO_REWARDS` — 55 activities + 10 rewards for Intimacy Bingo
- `DAILY_WISH_ITEMS` + `DAILY_WISH_CATEGORY_CONFIG` — 239 items for Daily Picks (Sweet/Flirty/Spicy/Sexual). Target 300+. See `memory/explicit_content_prompt.md` for Spicy/Sexual.

### Content generation prompts (`memory/`)
Three prompts for expanding content — always use the right one for the category:
- `memory/question_writer_prompt.md` — **PG / free tier**: Questions Fun/Deep/Romantic/Therapy, Truths Sweet/Flirty, Dares Sweet/Flirty, Daily Picks Sweet/Flirty
- `memory/explicit_content_prompt.md` — **X-rated / paid tier**: Questions Spicy/Fantasy, Truths Spicy, Dares Spicy, Daily Picks Spicy/Sexual
- `memory/fantasy_wishes_prompt.md` — **Fantasy Wishes only**: noun/gerund scenario phrases (NOT commands or questions), 4 categories: Sensual/Roleplay/Explicit/BDSM

### Design system (`/constants`)

- `colors.ts` — `Colors.burgundy` (#880E4F), `Colors.cream` (#FFF8F0), `Colors.rose` (#F4A7B9), `Colors.blush` (#FCE4EC), `Colors.muted` (#9E7B84), `Colors.border` (#F0D5DC)
- `fonts.ts` — `Fonts.heading` (Cormorant Garamond SemiBold), `Fonts.body` (Lato Regular), `Fonts.bodyBold`, `Fonts.bodyItalic`, `Fonts.headingItalic`
- `spacing.ts` — `Spacing` (xs→xxl), `Radius` (sm→full), `Shadow` (sm/md)

### Key implementation patterns

**Truth or Dare multiplayer:** Phase-based state machine (picking/answering/done) in Firestore. Picker draws card locally first (can skip/redraw before sending), then commits with `playCard()`. Truth: partner types text OR records audio (expo-av, uploaded to Firebase Storage). Dare: sequential confirmation — partner confirms first ("Dare completed"), then picker confirms. Score goes to challenged person, not picker. `skipsUsed` tracks skips per uid.

**WYR session persistence:** Session stored in Firestore — Back button and app exit do NOT reset the game. Push notification sent when you answer. Home screen nudge appears when partner answered but you haven't.

**Questions Game reveal:** Both partners answer privately. Open-text uses TextInput. Binary uses two large buttons (q.options[0] | or | q.options[1]). Scale uses 1-5 chips with "1 = not at all · 5 = completely" hint. Neither sees the other's answer until both have submitted. When both answered, both answers reveal side by side. Daily streak (`couples/{coupleId}/streaks/questions`) increments when both answer on the same day. Streak shown as 🔥 N in header.

**Versus:** Pulls binary-format answers from last 45 days of `dailyQuestions`. Builds a 10-question shuffled quiz of items where partner has answered. Each card shows partner's actual answer + 1 decoy (the other binary option). Instant reveal with ✓/✗ after pick. Final score shown with gradient hero card. Empty state nudges to play more Questions first.

**Time Capsules:** Two-doc structure for security. `couples/{coupleId}/timeCapsules/{id}` holds metadata (sealedBy, sealedByName, sealedAt, openAt, opened, hasPhoto) and is always readable by both partners so the partner can see locked countdown. `couples/{coupleId}/timeCapsules/{id}/sealed/data` holds content (message, photoURL) and is gated: rules allow read only by the sealer OR after openAt has passed. This means a partner with a custom Firestore client genuinely cannot peek at sealed content. Loaded via `getCapsuleContent` when the user taps to open a ready capsule.

**Activity Cards:** 25 face-down cards, turn-based. Picker has 2 passes to swap before accepting. Receiver gets the card and can mark "We did it!" or skip (1 pass). Cards have 3 states: face-down, pending (accepted not done), completed (green). `pendingCard` field tracks which card is waiting for receiver. Paid feature.

**Double-blind voting (Wishlist, Fantasy, Fantasy Wishes):** `votes: { [uid]: 'yes'|'maybe'|'no' }`. Only mutual `yes` surfaces in Matches. Never expose individual votes.

**Daily Picks / Daily Questions:** Deterministic shuffle by date+coupleId ensures both partners see same items. 5 picks per category per day (Daily Picks), 3 questions per category per day (Daily Questions).

**Fantasy Wishes pagination:** Shows 5 items locked in `shownUnvotedIds`. Only advances when all 5 are voted + "Load 5 more" pressed. Voted items accumulate in "Already voted" section.

**30-Day Challenge:** Setup phase allows 2 edits + 2 vetoes per partner before activating. `completedBy: {day: [uid]}` syncs across phones.

**Help system:** `useHelp(key)` hook checks `users/{uid}/private/help` — shows HelpModal once per feature. Toggle in Profile.

**Push notifications:** Expo Push tokens registered on startup. `notifyPartner()` POSTs to Expo Push API. Only works on real devices. Used in: mood, WYR answers, Questions Game answers, Truth or Dare answers.

**Home screen nudges ("Waiting for you"):** index.tsx subscribes to challenge, notes, fantasyWishes, dailyQuestions, dailyWishes, and WYR. Shows nudge card when partner has acted but current user hasn't.

**Firebase Storage:** Profile photos at `users/{uid}/profile.jpg`, memories at `couples/{coupleId}/memories/`, Truth or Dare audio at `couples/{coupleId}/truthDare/{round}_{uid}.m4a`, Moments at `couples/{coupleId}/moments/{date}_{uid}.jpg`, Flashes at `couples/{coupleId}/flashes/{ts}_{uid}.{ext}`, Time Capsules at `couples/{coupleId}/timeCapsules/{ts}_{uid}.jpg`. All photo uploads compressed via `expo-image-manipulator` (max 1920px, JPEG 0.7) before `uploadBytes`.

**Content rules:** No em dashes (—) anywhere in UI strings — use commas instead. Dares must be physical actions (do something), not verbal (say/tell/describe). Spicy level = explicitly X-rated language.

**Subscription gating:** `hooks/useSubscription.ts` — returns `{ isSubscribed }`. Admin emails hardcoded for testing. Production will use RevenueCat. `isPremium: boolean` field on user Firestore doc also grants access.

### Free tier (store-safe)
- Truth or Dare: Sweet + Flirty only
- Dare Wheel: Sweet + Flirty only
- Questions Game: Fun, Deep, Romantic, Therapy only (including binary + scale variants in those categories)
- Versus mode (full — uses partner's binary-question history)
- Would You Rather: Playful + Romantic only
- Daily Picks: Sweet + Flirty only
- Date Night Roulette (full)
- All connection features: Mood, Notes, Moments, Countdowns, Reminders, Tease, Time Capsules (full)
- Love Language Quiz, Relationship Pulse (with trend chart, full)
- 30-Day Challenge: Reconnect + Spark programs only

### Paid tier (subscription — `app/upgrade.tsx` shown when locked)
- Truth or Dare: Spicy level
- Dare Wheel: Spicy level
- Questions Game: Spicy + Fantasy categories
- Would You Rather: Spicy level
- Daily Picks: Spicy + Sexual categories
- Fantasy Wishes (entire feature)
- Erotic Blueprint (entire feature)
- Sensate Focus (entire feature)
- 30-Day Challenge: Fire + Desire programs
- Activity Cards (entire feature)
- Kinky + Horny moods (shown greyed with lock for free users)

## Distribution strategy (decided May 2026)

- **iOS:** App Store, age rating 17+. Standard EAS build + TestFlight + App Review.
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
- Age gate — 17+ confirmation on first launch not yet implemented
- Host Privacy Policy + Terms of Service at public URL for store submission
- Blueprint privacy — `users/{uid}/private/blueprint` needs security rules.
- Challenge `completedBy` — no transaction, could race under concurrent writes.
