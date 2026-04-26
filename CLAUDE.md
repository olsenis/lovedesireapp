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
app/_layout.tsx              Root layout — font loading, auth guard, redirects
app/(auth)/                  Unauthenticated flow (Stack)
  login.tsx                  Email/password sign in
  register.tsx               Create account
  onboarding.tsx             Name + profile photo
  pairing.tsx                Invite code generation & entry

app/(tabs)/                  Authenticated flow (Bottom Tab navigator)
  index.tsx                  Home — mood check-in, partner card, quick actions
  todo.tsx                   Together List — shared todos with categories
  discover.tsx               Discover hub — links to all games
  love.tsx                   Love hub — links to all love features

app/                         Full-screen sub-screens (pushed from tabs)
  dare.tsx                   Dare Wheel — Sweet / Flirty / Spicy spin
  roulette.tsx               Date Night Roulette — spin for a date idea
  questions-game.tsx         Questions card game — Fun / Deep / Romantic / Spicy
  wishlist.tsx               Double-blind Wishlist — mutual Yes reveals
  notes.tsx                  Love Notes — timed secret messages
  memories.tsx               Memory Wall — shared private photo album
  countdown.tsx              Countdowns — important dates & anniversaries
  reminders.tsx              Flirt Reminders — scheduled daily nudges
  quiz.tsx                   Love Language Quiz — 10-question result with bar chart
  hita.tsx                   Relationship Pulse — private 10-question satisfaction tracker
```

The root layout in `app/_layout.tsx` is the auth guard: listens to Firebase auth via `useAuth()` and redirects to `/(auth)/login` or `/(tabs)` accordingly. Fonts are loaded here before splash screen hides.

### Firebase / Firestore data model

Firebase project: `lovedesireapp-8c7f2`

```
users/{uid}                          UserProfile — name, photoURL, coupleId, inviteCode
couples/{coupleId}                   Couple — partner1Uid, partner2Uid, inviteCode, createdAt
couples/{coupleId}/todos/{id}        Todo — text, category, completed, createdBy, createdAt
couples/{coupleId}/moods/{id}        MoodEntry — uid, emoji, note, createdAt
couples/{coupleId}/memories/{id}     Memory — photoURL, caption, createdBy, createdAt
couples/{coupleId}/notes/{id}        LoveNote — message, openAt, fromUid, opened
couples/{coupleId}/wishlist/{id}     WishlistItem — text, category, votes {uid: 'yes'|'maybe'|'no'}
couples/{coupleId}/reminders/{id}    FlirtReminder — message, time, days[], active, createdBy
couples/{coupleId}/dates/{id}        ImportantDate — label, date, emoji, createdBy
```

Couple linking: partner1 creates couple doc → gets 6-char invite code → partner2 enters code → `coupleService.joinCouple()` sets `partner2Uid`.

All real-time listeners use Firestore `onSnapshot` and return an unsubscribe function — always call it on component unmount.

### Services (`/services`)

| File | Exports |
|------|---------|
| `firebase.ts` | `auth`, `db` — uses `getApps()` guard against hot-reload re-init |
| `authService.ts` | `register`, `login`, `logout`, `getUserProfile`, `createUserProfile` |
| `coupleService.ts` | `createCouple`, `joinCouple`, `getCouple`, `generateInviteCode` |
| `todoService.ts` | `subscribeTodos`, `addTodo`, `toggleTodo`, `deleteTodo` |
| `moodService.ts` | `setMood`, `getTodaysMood`, `subscribeToMoods`, `ALL_MOODS`, `MOOD_LABELS` |
| `noteService.ts` | `subscribeNotes`, `createNote`, `openNote` |
| `reminderService.ts` | `subscribeReminders`, `addReminder`, `toggleReminder`, `deleteReminder` |
| `wishlistService.ts` | `subscribeWishlist`, `addWishlistItem`, `voteOnWish`, `isMatch` |
| `memoryService.ts` | `subscribeMemories`, `addMemory`, `deleteMemory` |
| `importantDateService.ts` | `subscribeDates`, `addImportantDate`, `deleteImportantDate`, `getDaysUntil` |

### Hooks

- `useAuth()` — wraps `onAuthStateChanged`, returns `{ user, profile, loading }`
- `useCouple(myUid, coupleId)` — real-time listener on couple doc, fetches partner profile, returns `{ couple, partner, loading }`

### Static content (`/constants/content.ts`)

All static game content lives here — import from this file, never hardcode in screens:

- `QUESTIONS` + `QUESTION_CATEGORY_CONFIG` — 32 questions across Fun/Deep/Romantic/Spicy
- `DARES` + `DARE_LEVEL_CONFIG` — 24 dares across Sweet/Flirty/Spicy
- `DATE_IDEAS` — 12 date night ideas with type (home/out/adventure)
- `PRESET_WISHES` + `WISH_CATEGORY_CONFIG` — 20 wishlist presets across 4 categories
- `QUIZ_QUESTIONS` + `LOVE_LANGUAGE_LABELS` — 10 A/B quiz questions mapping to 5 love languages

### Design system (`/constants`)

- `colors.ts` — `Colors.burgundy` (#880E4F), `Colors.cream` (#FFF8F0), `Colors.rose` (#F4A7B9), `Colors.blush` (#FCE4EC), `Colors.muted` (#9E7B84), `Colors.border` (#F0D5DC)
- `fonts.ts` — `Fonts.heading` (Cormorant Garamond SemiBold), `Fonts.body` (Lato Regular), `Fonts.bodyBold`, `Fonts.bodyItalic`, `Fonts.headingItalic`
- `spacing.ts` — `Spacing` (xs→xxl), `Radius` (sm→full), `Shadow` (sm/md)

Fonts must use exact string names from `Fonts.*` — loaded in `app/_layout.tsx` via `useFonts`.

### Components (`/components`)

- `Button` — variants: `primary` (burgundy), `secondary` (blush), `ghost`. Always fires haptic.
- `Card` — white card with border; `elevated` prop adds `Shadow.md`.
- `CategoryBadge` — renders a `TodoCategory` pill with emoji + label.
- `PartnerAvatar` — photo or initials fallback; uses `expo-image`.

### Key implementation patterns

**Double-blind Wishlist:** Each item has `votes: { [uid]: 'yes'|'maybe'|'no' }`. `isMatch(item, uid1, uid2)` returns true only when both are `'yes'`. Partners never see individual votes — only confirmed matches surface in the Matches tab.

**Love Notes timing:** `openAt` is a Unix timestamp. A note is locked until `Date.now() >= openAt`. Occasions are computed at creation time in `getOccasionTime()` in `notes.tsx`.

**Mood check-in:** Queries today's moods with `where('createdAt', '>=', todayStart())`. Firestore index required on `(uid, createdAt)` for `couples/{id}/moods`.

**Dare/Roulette spin:** Uses React Native `Animated` API (not Reanimated) for web compatibility. `Easing.out(Easing.cubic)` gives a natural deceleration feel.

## App Store / Play Store deployment

Use EAS Build — not Vercel (Vercel is for web apps only):
```bash
npx eas build --platform ios      # App Store
npx eas build --platform android  # Play Store
```

Bundle IDs: `com.desire.app` (both platforms).
EAS profiles in `eas.json`: `development` (internal), `preview` (internal), `production`.

## Outstanding before production

- Firestore security rules — currently in **test mode**. Must restrict reads/writes to couple members only before launch.
- `expo-notifications` push scheduling — implemented in UI/Firestore but native scheduling (`Notifications.scheduleNotificationAsync`) not yet wired to reminder saves.
- Firestore indexes — compound indexes needed for mood queries (`uid` + `createdAt`).
- Photo upload — memory photos currently store local URIs; needs Firebase Storage or Cloudinary for persistence across devices.
