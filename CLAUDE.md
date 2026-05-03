# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

All app UI text, strings, labels, and comments must be in **English**. The developer communicates in Icelandic but the app itself is entirely in English.

## Commands

```bash
npm start          # Start Expo dev server (scan QR with Expo Go)
npm run web        # Run in browser (fastest way to preview during development)
npm run android    # Start on Android emulator
npm run ios        # Start on iOS simulator (macOS only)
npx tsc --noEmit   # TypeScript type check
```

Install packages with `--legacy-peer-deps` due to react-dom peer conflict:
```bash
npm install <package> --legacy-peer-deps
```

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
  questions-game.tsx         Questions — Daily (3/day synced) across 6 categories
  fantasy-wishes.tsx         Fantasy Wishes — explicit double-blind voting, 5 at a time
  truth-dare.tsx             Truth or Dare — real 2-phone multiplayer (phase: picking/answering/done)
  would-you-rather.tsx       Would You Rather — simultaneous answer reveal, 3 levels
  two-truths.tsx             Two Truths One Lie — guessing game with dares, local state
  bingo.tsx                  Intimacy Bingo — 5×5 monthly card, both partners sync
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
couples/{coupleId}/wyr/active        WYRSession — level, questionIndex, answers{uid:a|b}, phase, score
couples/{coupleId}/bingo/{month}     BingoSession — squares[], checked[], checkedBy{}, winner?
couples/{coupleId}/truthDare/active  TruthDareSession — level, turnUid, phase(picking|answering|done), card, scores, round
couples/{coupleId}/dailyWishes/{date} DailyWishDoc — items[], votes{}, addToList{}
couples/{coupleId}/dailyQuestions/{date} DailyQuestionDoc — items[], discussed{}
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
| `storageService.ts` | `uploadProfilePhoto`, `uploadMemoryPhoto` — Firebase Storage |
| `helpService.ts` | `getHelpState`, `markFeatureSeen`, `setHelpEnabled`, `disableAllHelp`, `resetHelp` |
| `dailyWishService.ts` | `subscribeDailyWishes`, `voteDailyWish`, `markAddToList`, `bothWantToAdd` |
| `dailyQuestionsService.ts` | `subscribeDailyQuestions`, `markDiscussed`, `bothDiscussed` |
| `wyrService.ts` | `subscribeWYR`, `startWYR`, `answerWYR`, `nextWYRQuestion`, `resetWYR` |
| `bingoService.ts` | `subscribeBingo`, `checkBingoSquare`, `hasBingo` |
| `truthDareService.ts` | `subscribeTruthDare`, `startTruthDare`, `playCard`, `submitTruthAnswer`, `nextTurn`, `resetTruthDare` |

### Hooks

- `useAuth()` — returns `{ user, profile, loading }`
- `useCouple(myUid, coupleId)` — returns `{ couple, partner, loading }`
- `useHelp(featureKey)` — returns `{ visible, dismiss, dismissAll }` for first-visit help popups

### Static content (`/constants/content.ts`)

All static game content lives here — import from this file, never hardcode in screens:

- `QUESTIONS` + `QUESTION_CATEGORY_CONFIG` — 120 questions across Fun/Deep/Romantic/Spicy/Therapy/Fantasy (20 each)
- `DARES` + `DARE_LEVEL_CONFIG` — 90 dares across Sweet/Flirty/Spicy (30 each)
- `TRUTHS` — 30 truths across Sweet/Flirty/Spicy (10 each)
- `DATE_IDEAS` — 48 date ideas (home/out/adventure, 16 each)
- `PRESET_WISHES` — 60 wishlist presets (Romantic/Adventure/Intimate/Spicy, 15 each)
- `QUIZ_QUESTIONS` + `LOVE_LANGUAGE_LABELS` — 10 A/B love language questions
- `BLUEPRINT_QUESTIONS` + `BLUEPRINT_TYPE_CONFIG` + `BLUEPRINT_COMPATIBILITY` — 15 A/B questions, 5 types, 25-pair compatibility guidance
- `FANTASY_PRESETS` + `FANTASY_CATEGORY_CONFIG` — 60 fantasy presets (Roleplay/Sensual/Bold/Adventurous)
- `FANTASY_WISHES_PRESETS` — 290+ explicit sexual scenarios for Fantasy Wishes
- `CHALLENGE_PROGRAMS` + `CHALLENGE_PROGRAM_CONFIG` — 4 programs × 30 tasks
- `WYR_QUESTIONS` + `WYR_LEVEL_CONFIG` — 90 Would You Rather questions (Playful/Romantic/Spicy)
- `BINGO_ACTIVITIES` + `BINGO_REWARDS` — 55 activities + 10 rewards for Intimacy Bingo
- `DAILY_WISH_ITEMS` + `DAILY_WISH_CATEGORY_CONFIG` — 240+ items for Daily Picks (Sweet/Flirty/Spicy/Sexual)

### Design system (`/constants`)

- `colors.ts` — `Colors.burgundy` (#880E4F), `Colors.cream` (#FFF8F0), `Colors.rose` (#F4A7B9), `Colors.blush` (#FCE4EC), `Colors.muted` (#9E7B84), `Colors.border` (#F0D5DC)
- `fonts.ts` — `Fonts.heading` (Cormorant Garamond SemiBold), `Fonts.body` (Lato Regular), `Fonts.bodyBold`, `Fonts.bodyItalic`, `Fonts.headingItalic`
- `spacing.ts` — `Spacing` (xs→xxl), `Radius` (sm→full), `Shadow` (sm/md)

### Key implementation patterns

**Truth or Dare multiplayer:** Uses `phase` field (picking/answering/done) in Firestore. Picker sees choice buttons; partner sees waiting screen. For Truth: partner types answer → both see reveal. For Dare: both see immediately. Session persists between app visits.

**Double-blind voting (Wishlist, Fantasy, Fantasy Wishes):** `votes: { [uid]: 'yes'|'maybe'|'no' }`. Only mutual `yes` surfaces in Matches. Never expose individual votes.

**Daily Picks / Daily Questions:** Deterministic shuffle by date+coupleId ensures both partners see same items. 5 picks per category per day (Daily Picks), 3 questions per category per day (Daily Questions).

**Fantasy Wishes pagination:** Shows 5 items locked in `shownUnvotedIds`. Only advances when all 5 are voted + "Load 5 more" pressed. Voted items accumulate in "Already voted" section.

**30-Day Challenge:** Setup phase allows 2 edits + 2 vetoes per partner before activating. `completedBy: {day: [uid]}` syncs across phones.

**Help system:** `useHelp(key)` hook checks `users/{uid}/private/help` — shows HelpModal once per feature. Toggle in Profile.

**Push notifications:** Expo Push tokens registered on startup. `notifyPartner()` POSTs to Expo Push API. Only works on real devices.

**Firebase Storage:** Profile photos and memories stored at `users/{uid}/profile.jpg` and `couples/{coupleId}/memories/`. `storageService.ts` handles upload + getDownloadURL.

## App Store / Play Store deployment

```bash
npx eas build --platform ios
npx eas build --platform android
```

Bundle ID: `com.desire.app`. EAS profiles: `development`, `preview`, `production`.

## Outstanding before production

- Firestore security rules — test mode. Restrict to couple members before launch.
- Push notifications — complete infrastructure. Only works on real devices.
- Photo upload (memories) — uses Firebase Storage but no size limits enforced.
- Blueprint privacy — `users/{uid}/private/blueprint` needs security rules.
- Challenge `completedBy` — no transaction, could race under concurrent writes.
