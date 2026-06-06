# Desire — Manual Test Checklist

> Use this to walk through every feature with two real iPhones (or one iPhone + one Android via sideload). Mark each test as you verify it passes.

## Setup
- iPhone A logged in as User A
- iPhone B logged in as User B
- Both paired to the same couple via invite code
- Both have notifications + camera + mic + photos permissions granted

## Legend
- 📱 = requires both phones
- 🌍 = LDR-specific (toggle on first)
- ⚠️ = edge case / error path
- 💰 = paid-tier (test on non-premium account to confirm upgrade gate)

## Table of contents
1. [Auth + Onboarding + Pairing](#1-auth--onboarding--pairing)
2. [Home tabs (Home / Discover / Love / Together List)](#2-home-tabs-home--discover--love--together-list)
3. [Love Notes + Tease + Moments + Journal](#3-love-notes--tease--moments--journal)
4. [Calendar + Countdowns + Time Capsules + Our Story + Year-in-Review](#4-calendar--countdowns--time-capsules--our-story--year-in-review)
5. [Truth or Dare + Questions Game + Versus + WYR](#5-truth-or-dare--questions-game--versus--wyr)
6. [Activity Cards + Fantasy Wishes + Daily Picks + Dare Wheel + Roulette](#6-activity-cards--fantasy-wishes--daily-picks--dare-wheel--roulette)
7. [Blueprint + Sensate + Intimacy Log](#7-blueprint--sensate--intimacy-log)
8. [Love Language + Hita Pulse + Sunday Check-in + Mood History](#8-love-language--hita-pulse--sunday-check-in--mood-history)
9. [30-Day Challenge + Flirt Reminders](#9-30-day-challenge--flirt-reminders)
10. [LDR mode (cross-feature)](#10-ldr-mode-cross-feature)
11. [Profile + Settings + Upgrade + Help + Legal](#11-profile--settings--upgrade--help--legal)
12. [Cross-cutting: push notifications, image upload, security, GDPR](#12-cross-cutting-push-notifications-image-upload-security-gdpr)
13. [Tally](#tally)

---

## 1. Auth + Onboarding + Pairing
First-launch flow: register, verify, name + photo, pair, tour.

### Email Registration (app/(auth)/register.tsx)
Creates a new Firebase auth account with email + password + 18+ consent checkbox.

- [ ] **Golden path — create account with 18+ checkbox**
  1. Launch app, tap "Don't have an account? Create one" on login screen
  2. Enter a fresh email (e.g. test+phone1@example.com)
  3. Enter password 'testpass123'
  4. Re-enter same password in 'Confirm password'
  5. Tap the 18+ checkbox row so the box fills burgundy with a checkmark
  6. Tap 'Create Account'
  - **Expected:** Button shows loading spinner briefly, then app navigates to the onboarding (name + photo) screen titled 'Welcome!'. A verification email is sent to the address in the background (not blocking).

- [ ] **Empty fields blocked** ⚠️
  1. Open Register screen
  2. Leave email, password, confirm all blank
  3. Tap the 18+ checkbox to enable
  4. Tap 'Create Account'
  - **Expected:** Red error text appears: 'Please fill in all fields.' No navigation happens. Button is not in loading state.

- [ ] **18+ checkbox must be checked** ⚠️
  1. Open Register screen
  2. Enter valid email and matching passwords (6+ chars)
  3. Leave the 18+ checkbox unchecked
  4. Observe the Create Account button
  - **Expected:** 'Create Account' button appears disabled (40% opacity / faded) and cannot be tapped. If tapping anyway is attempted, error shows: 'You must confirm you are 18 or older to continue.'

- [ ] **Passwords must match** ⚠️
  1. Open Register, enter email
  2. Enter password 'abcdef'
  3. Enter confirm 'abcdefg'
  4. Check the 18+ box
  5. Tap Create Account
  - **Expected:** Red error: 'Passwords do not match.' No account created.

- [ ] **Password length minimum 6** ⚠️
  1. Open Register, enter email
  2. Enter password 'abc'
  3. Enter confirm 'abc'
  4. Check 18+ box
  5. Tap Create Account
  - **Expected:** Red error: 'Password must be at least 6 characters.'

- [ ] **Duplicate email rejected** ⚠️
  1. Register first time with email A, complete signup
  2. Sign out, return to Register screen
  3. Enter the same email A again, valid password, check 18+
  4. Tap Create Account
  - **Expected:** Red error: 'This email is already registered.'

- [ ] **Terms / Privacy links open from inside consent text**
  1. Open Register screen
  2. Tap the underlined 'Terms' word inside the 18+ row
  3. Read the screen, swipe back
  4. Tap the underlined 'Privacy Policy' word
  - **Expected:** Terms of Service screen opens then back returns to Register. Privacy Policy screen opens. Tapping these does NOT toggle the 18+ checkbox.

- [ ] **Back to login link works**
  1. Open Register screen
  2. Tap 'Already have an account? Sign in' link at the bottom
  - **Expected:** Returns to Login screen with previously entered email/password cleared.

### Email/Password Login (app/(auth)/login.tsx)
Signs an existing user in. Maps Firebase auth error codes to friendly messages.

- [ ] **Golden path — sign in existing account**
  1. From the login screen, enter the email of an existing verified account
  2. Enter the correct password
  3. Tap 'Sign In'
  - **Expected:** Button shows spinner, then app navigates into tabs (Home). If the user already has a profile name + coupleId + completed tour, lands directly on Home tab.

- [ ] **Empty fields blocked at sign-in** ⚠️
  1. On the login screen, leave both fields blank
  2. Tap 'Sign In'
  - **Expected:** Red error: 'Please enter your email and password.' No spinner appears.

- [ ] **Wrong password error** ⚠️
  1. Enter a valid existing email
  2. Enter an obviously wrong password
  3. Tap Sign In
  - **Expected:** Red error: 'Incorrect email or password. Please try again.' Stays on login screen.

- [ ] **Invalid email format** ⚠️
  1. Enter 'notanemail' as the email
  2. Enter any password
  3. Tap Sign In
  - **Expected:** Red error: 'Please enter a valid email address.'

- [ ] **Offline login attempt** ⚠️
  1. Put phone in airplane mode
  2. Open Login screen, enter valid email + password
  3. Tap Sign In
  - **Expected:** After a moment red error appears: 'No internet connection. Please try again.' No navigation.

- [ ] **Too-many-requests throttle** ⚠️
  1. Enter a valid email and intentionally wrong password
  2. Tap Sign In repeatedly (8-10 times) within 1 minute
  3. Continue tapping
  - **Expected:** Eventually the error becomes 'Too many attempts. Please wait a moment and try again.' instead of the generic wrong-password error.

- [ ] **Email trimmed before submit** ⚠️
  1. Enter ' user@example.com ' with leading/trailing spaces
  2. Enter correct password
  3. Tap Sign In
  - **Expected:** Login succeeds (whitespace stripped). User lands on Home.

- [ ] **Already-have-account link from Register returns here**
  1. From Login tap Create one
  2. On Register tap 'Already have an account? Sign in'
  - **Expected:** Returns to Login screen, fields empty.

### Forgot Password (Reset Email) (app/(auth)/login.tsx)
Sends a Firebase reset email to the email currently typed into the email field.

- [ ] **Golden path — send reset email**
  1. On Login screen, type the email of an existing account into the email field
  2. Tap 'Forgot your password?' link below the Sign In button
  3. Check the inbox of that email account
  - **Expected:** On screen, burgundy message: 'Password reset email sent. Check your inbox.' Inbox receives a Firebase password reset email within ~1 minute.

- [ ] **Empty email field guard** ⚠️
  1. On Login screen leave email blank
  2. Tap 'Forgot your password?'
  - **Expected:** Red error: 'Enter your email above first.' No email sent.

- [ ] **Unknown email** ⚠️
  1. Enter an email that has never registered
  2. Tap 'Forgot your password?'
  - **Expected:** Red error: 'No account with that email.'

- [ ] **Invalid email format** ⚠️
  1. Enter 'foo' (no @)
  2. Tap 'Forgot your password?'
  - **Expected:** Red error: 'Please enter a valid email.'

- [ ] **Reset link in email actually resets password**
  1. Trigger reset email (golden path test)
  2. Open the email, tap the 'Reset password' link
  3. Set a new password in the browser flow
  4. Return to app, enter email + new password on Login
  5. Tap Sign In
  - **Expected:** Sign in succeeds with the new password. Old password no longer works.

### 18+ Consent Modal (app/_layout.tsx)
Post-auth full-screen modal. Decline deletes the Firebase auth user.

- [ ] **First-time login shows consent modal**
  1. Register a new account (consent recorded immediately by Register screen)
  2. Sign out via Profile
  3. On second device or after a hard kill, log in with the same email
  4. If consent was somehow not recorded (legacy account), wait for app to load
  - **Expected:** If consent was already recorded during registration the modal does NOT appear (normal flow). For a legacy account without consent the full-screen modal shows with title 'Welcome to Desire' and two buttons.

- [ ] **Confirm 18+ proceeds into app**
  1. When the consent modal is visible, read both buttons
  2. Tap 'I confirm I am 18+ — Continue →'
  - **Expected:** Modal dismisses. App routes to onboarding/tour/tabs as appropriate.

- [ ] **Decline (under 18) deletes account and returns to login** ⚠️
  1. On consent modal tap 'I am under 18 — Exit'
  2. Wait 2-3 seconds
  3. Try to log back in with the same email + password used to register
  - **Expected:** App returns to login screen. Login attempt with that email fails because the Firebase auth user was deleted. Account must be re-registered.

### Onboarding: Name + Photo (app/(auth)/onboarding.tsx)
Required first name + optional 1:1 cropped photo, then continue to pairing.

- [ ] **Golden path — name only, no photo**
  1. After registering, the 'Welcome!' screen appears with avatar placeholder showing a camera icon
  2. Type 'Eva' in the 'Your first name' field
  3. Tap Continue
  - **Expected:** Spinner briefly, then app routes to the pairing screen ('Connect with your Partner'). User profile in Firestore has name='Eva' and no photoURL.

- [ ] **Pick photo from library**
  1. On the onboarding screen tap the circular avatar placeholder
  2. When iOS photo picker appears, allow access if prompted
  3. Choose a photo and use the iOS crop UI to confirm a square crop
  4. Confirm selection
  - **Expected:** The placeholder is replaced with the cropped photo as a circular avatar with rose border.

- [ ] **Continue blocked without name** ⚠️
  1. Leave the first-name input blank
  2. Tap Continue
  - **Expected:** Red error: 'Please enter your name.' No navigation. Photo selection (if any) preserved.

- [ ] **Whitespace-only name rejected** ⚠️
  1. Type only spaces ('   ') in the name field
  2. Tap Continue
  - **Expected:** Red error: 'Please enter your name.'

- [ ] **Photo library permission denied gracefully** ⚠️
  1. On a phone where Photos permission was previously denied, tap the avatar
  2. Decline the system prompt if it shows again, or just close the picker
  - **Expected:** Picker closes without crash. No photo is set. User can still continue with just a name.

- [ ] **Continue persists name across app relaunch**
  1. Enter name 'Eva', tap Continue to move to pairing
  2. Force-quit the app
  3. Re-open the app
  - **Expected:** App lands on pairing screen (not onboarding) because the profile now has a name.

### Pairing: Generate Invite Code (app/(auth)/pairing.tsx)
Auto-generates 8-char code from safe alphabet with 7-day expiry.

- [ ] **Code auto-generates on first arrival**
  1. Reach the pairing screen for the first time after onboarding
  2. Observe the 'Your invite code' card
  - **Expected:** After a brief activity indicator the card shows an 8-character code in uppercase (letters + digits, no 0/O/1/I/L).

- [ ] **Tap to copy code**
  1. Tap the displayed code or 'Tap to copy' row
  - **Expected:** Hint text briefly changes to '✓ Copied!' for ~2 seconds, then reverts. Pasting elsewhere yields the same 8-character code.

- [ ] **Code persists across relaunch**
  1. Note the generated code, e.g. 'ABCD2345'
  2. Force-quit the app
  3. Re-open and navigate back to pairing
  - **Expected:** Same 'ABCD2345' code displays — not a new code.

- [ ] **Code excludes ambiguous characters** ⚠️
  1. Generate a code
  2. Inspect the 8 characters
  - **Expected:** No 0, O, 1, I, or L appear in the code.

### Pairing: Join Partner via Code (app/(auth)/pairing.tsx)
Calls rateLimitedJoin Cloud Function. Input auto-uppercases and clamps to 8.

- [ ] **Golden path — phone 2 joins phone 1's couple** 📱
  1. Phone 1: register and reach pairing, note the displayed code (e.g. 'ABCD2345')
  2. Phone 2: register a different email, complete name onboarding, reach pairing
  3. Phone 2: in 'Enter partner's code' input type the 8 characters from Phone 1
  4. Phone 2: tap 'Join Partner'
  - **Expected:** Phone 2 navigates to Home tab within 1-3 seconds. Both phones can see each other as paired in Profile.

- [ ] **Input auto-uppercases**
  1. On the join input type 'abcd2345' in lowercase
  - **Expected:** Visible text becomes 'ABCD2345' immediately as you type.

- [ ] **Short code rejected client-side** ⚠️
  1. Type 'ABCD' (only 4 chars) into the partner code input
  2. Tap Join Partner
  - **Expected:** Red error: 'Please enter an 8-character code.' No network call made.

- [ ] **Wrong/non-existent code** ⚠️
  1. Type 'ZZZZZZZZ'
  2. Tap Join Partner
  - **Expected:** Spinner briefly, then red error: 'Code not found or couple is already full.'

- [ ] **Full couple (third phone) rejected** 📱 ⚠️
  1. Phones 1 + 2 already paired
  2. On a third test account, reach pairing and type Phone 1's original code
  3. Tap Join Partner
  - **Expected:** Red error: 'Code not found or couple is already full.'

- [ ] **Brute-force rate limit** ⚠️
  1. Repeatedly type a wrong 8-character code and tap Join Partner ~10-15 times in under a minute
  - **Expected:** Eventually red error: 'Too many attempts. Please wait a moment and try again.'

- [ ] **Joiner-side input is 8-char clamped** ⚠️
  1. Try to type 12 characters into the partner code box
  - **Expected:** Input physically refuses characters past 8 (maxLength=8).

### Pairing: Skip for Now (app/(auth)/pairing.tsx)

- [ ] **Skip and use app solo**
  1. On the pairing screen tap 'Skip for now'
  - **Expected:** App routes to Home tab. Most partner-dependent UI shows empty/disabled.

- [ ] **Skip while code is still generating** ⚠️
  1. Reach the pairing screen and immediately tap 'Skip for now' before the spinner finishes
  - **Expected:** Skip waits ~2.5 seconds for couple creation to finish, then navigates to Home.

- [ ] **Skipped user can return and pair later** 📱
  1. Skip pairing on Phone 1, land on Home
  2. Open Profile
  3. Locate the displayed invite code
  4. Share that code with Phone 2 and have Phone 2 enter it
  - **Expected:** Phone 2 successfully joins Phone 1's couple.

### Post-Pair Onboarding Tour (app/onboarding-tour.tsx)
6 steps: intro → anniversary → LDR + next visit → partner birthday → mood pick → 4 tips.

- [ ] **Golden path — walk all 6 steps**
  1. After pairing, the tour 'You're paired with <partner>' appears as step 1 of 6
  2. Tap 'Let's go'
  3. Step 2: pick a past date in the calendar, tap Continue
  4. Step 3: tap 'No' for LDR, tap Continue
  5. Step 4: pick a day + month for partner birthday, tap Continue
  6. Step 5: tap a mood emoji (e.g. 😊), tap Continue
  7. Step 6: read the 4 tips, tap 'Got it, take me in'
  - **Expected:** Each step advances the progress dots (1→6 burgundy). Final tap routes to Home tab.

- [ ] **LDR yes path — captures next visit** 🌍
  1. Repeat the tour with a new test couple
  2. On step 3 tap 'Yes'
  3. Pick a future date in the 'next visit' picker that appears
  4. Tap Continue
  - **Expected:** Couple doc gets isLongDistance=true and nextVisitDate set.

- [ ] **LDR yes with no visit date is allowed** 🌍 ⚠️
  1. On step 3 tap 'Yes' but do NOT pick a next visit date
  2. Tap Continue
  - **Expected:** isLongDistance set to true, nextVisitDate remains unset.

- [ ] **Skip individual steps**
  1. Step 2: tap 'Set later'
  2. Step 4: tap Skip
  3. Step 5: tap Continue without selecting a mood
  - **Expected:** Each skip advances without writing.

- [ ] **Skip All from header**
  1. On any step tap 'Skip' in the top-right header
  - **Expected:** Routes straight to Home tab. Tour will not appear again.

- [ ] **Back button navigates steps**
  1. Advance to step 3 (LDR)
  2. Tap the '‹' back arrow in the header
  - **Expected:** Returns to step 2 with previously picked startDate still selected.

- [ ] **Adult moods locked for free tier**
  1. On a non-premium account complete tour to step 5
  2. Inspect the available mood emojis
  - **Expected:** Mood grid omits 😈 and 🥵 entirely for free users.

- [ ] **Adult moods available for paid tier** 💰
  1. On a premium / admin email account reach step 5
  2. Inspect available moods
  - **Expected:** All moods including 😈 and 🥵 appear.

- [ ] **Tour only shows once per user** ⚠️
  1. Complete the tour fully on Phone 1
  2. Sign out from Profile
  3. Sign back in on Phone 1 with the same account
  - **Expected:** After login the app goes directly to Home — tour does not replay.

- [ ] **Tour shows for partner separately** 📱
  1. Phone 1 completes tour and lands on Home
  2. Phone 2 reaches Home for the first time after joining the couple
  - **Expected:** Phone 2 sees the same 6-step tour.

- [ ] **Tour shows partner name dynamically** 📱
  1. Phone 1 name = 'Eva', Phone 2 name = 'Jon'
  2. On Phone 2 reach the tour step 1 then step 4 and step 5
  - **Expected:** Step 1 reads 'You're paired with Eva'. Step 4: 'When's Eva's birthday?'. Step 5: '...Eva will see this on their home.'

### Auth State Routing Guard (app/_layout.tsx)

- [ ] **Cold-launch logged out goes to login**
  1. Force-quit app while signed out
  2. Re-open the app
  - **Expected:** After splash + fonts, app lands on Login screen.

- [ ] **Cold-launch fully set up goes straight to Home**
  1. On a fully onboarded account, force-quit app
  2. Re-open
  - **Expected:** After splash app lands directly on Home tab.

- [ ] **Legacy account without name forced through name onboarding** ⚠️
  1. Use a legacy test account whose profile has name=''
  2. Sign in
  - **Expected:** App routes to /(auth)/onboarding ('Welcome!').

- [ ] **Account paired but tour skipped goes to Home** ⚠️
  1. Sign in on an account that has name + coupleId but onboarding.completed removed
  - **Expected:** App routes to /onboarding-tour. After Skip, future launches go directly to Home.

- [ ] **Sign out mid-session returns to login** ⚠️
  1. From Home, go to Profile and tap Sign Out
  2. Confirm if prompted
  - **Expected:** Within ~1 second app routes to Login screen.

- [ ] **Backgrounded auth survives** ⚠️
  1. Sign in normally and reach Home
  2. Background the app for 5+ minutes
  3. Re-foreground
  - **Expected:** App remains on Home tab.

### Push Token Registration (app/_layout.tsx)

- [ ] **iOS native build asks for permission once**
  1. Install via TestFlight / EAS preview build on Phone 1
  2. Sign in for the first time on this device
  - **Expected:** iOS shows notifications system prompt. After allowing, user profile gets a pushToken starting with 'ExponentPushToken['.

- [ ] **Decline notifications keeps user functional**
  1. On first launch tap 'Don't Allow'
  2. Continue using the app
  - **Expected:** App still works fully. No pushToken written.

- [ ] **Expo Go silently skips push registration** ⚠️
  1. Run the app via Expo Go
  2. Sign in
  - **Expected:** No crash. No permission prompt. Profile pushToken remains unset.

- [ ] **Web platform skipped** ⚠️
  1. Open the Vercel preview in mobile Safari or Chrome
  2. Sign in
  - **Expected:** No push registration attempt.

### Timezone Auto-Capture (app/_layout.tsx)

- [ ] **Timezone written on first sign-in**
  1. Sign in for the first time on Phone 1
  2. Inspect Firestore users/{uid}.timezone
  - **Expected:** Timezone field is set to IANA name matching phone settings.

- [ ] **Different timezones across phones for LDR** 📱 🌍
  1. Phone 1 in Reykjavik, Phone 2 in New York
  2. Both sign in, enable LDR
  3. Open Home on each phone
  - **Expected:** Each profile has correct IANA timezone. Home LDR partner clock shows partner's local time.

- [ ] **Timezone updates after phone setting changes** 🌍 ⚠️
  1. Change phone timezone manually
  2. Re-open the app
  - **Expected:** Profile.timezone updates to new IANA value.

### Email Verification (background) (services/authService.ts)

- [ ] **Verification email arrives after registration**
  1. Register a new account with a real inbox
  2. Wait up to 2 minutes
  3. Check the inbox (and spam folder)
  - **Expected:** Firebase verification email arrives.

- [ ] **App does not block unverified users** ⚠️
  1. Register a fresh account
  2. Do NOT click the verification email link
  3. Continue through onboarding into the app
  - **Expected:** App allows full usage even without email verification.

---

## 2. Home tabs (Home / Discover / Love / Together List)
Bottom tab bar with three tabs (Home/Discover/Love); Together List hidden.

### Tab navigation bar (app/(tabs)/_layout.tsx)

- [ ] **Three tabs render with icons and labels**
  1. Sign in on Phone A
  2. Look at the bottom of the screen
  - **Expected:** Three tabs visible: Home (🏠), Discover (✨), Love (💝). Together List tab is NOT shown.

- [ ] **Switch between tabs preserves scroll position per tab**
  1. From Home, scroll down to the Games & Rituals section
  2. Tap Discover tab, scroll down
  3. Tap Love tab, then Home tab again
  - **Expected:** Each tab retains its own scroll position.

- [ ] **Together List is reachable but not via tab bar**
  1. Tap Home tab and look at bottom tab bar
  - **Expected:** No 'Together List' tab button visible.

- [ ] **Active tab tint matches burgundy**
  1. Tap Home, Discover, Love
  - **Expected:** Active tab tinted burgundy; inactive muted grey.

### Home loading + greeting + hero (app/(tabs)/index.tsx)

- [ ] **Splash shows briefly on cold launch**
  1. Force-quit on Phone A
  2. Reopen while signed in
  - **Expected:** For ~0.5-1.5 seconds you see a centered 'Desire ♥' splash.

- [ ] **Splash on slow network** ⚠️
  1. Airplane Mode on Phone A
  2. Force-quit and reopen
  3. Wait 5 seconds
  - **Expected:** Splash stays visible; no crash.

- [ ] **Greeting matches time of day**
  1. Open Home before noon
  - **Expected:** 'Good morning'. Verify afternoon/evening variants.

- [ ] **Date header shows today**
  1. Open Home
  - **Expected:** Uppercase 'WEEKDAY, D MONTH'.

- [ ] **Profile button pushes to /profile**
  1. Tap 'Profile' top-right
  - **Expected:** Navigates to Profile.

- [ ] **Connected couple shows both avatars and names** 📱
  1. Phones paired; observe hero card
  - **Expected:** Burgundy gradient; both avatars + names; 'together since' label.

- [ ] **Anniversary pill shows when within 60 days**
  1. Set start date so anniversary <60 days
  - **Expected:** '🎉 D Mon · in N days · Y yrs'.

- [ ] **Tapping my mood pill opens history**
  1. Tap pill below own avatar
  - **Expected:** Navigates to /mood-history.

- [ ] **Partner mood pill updates live** 📱
  1. Phone B picks mood
  - **Expected:** Phone A's partner pill updates within ~5s.

- [ ] **Partner pill is read-only**
  1. Tap pill under partner's avatar
  - **Expected:** Nothing happens.

### LDR clocks + next-visit pill

- [ ] **Both timezones display under names** 🌍 📱
  1. Enable LDR; set each timezone
  - **Expected:** HH:MM under each name, ticking.

- [ ] **Next-visit pill appears when within 60 days** 🌍
  1. LDR on, Next visit 10 days from now
  - **Expected:** '✈️ D Mon · in 10 days · next visit'.

- [ ] **Today's visit shows special label** 🌍 ⚠️
  1. Set Next visit to today
  - **Expected:** '✈️ Today!' / 'next visit'.

- [ ] **Next visit pill hidden when LDR off** ⚠️
  1. Turn off LDR
  - **Expected:** No '✈️' pill.

- [ ] **Both events within 60 days show stacked** 🌍
  1. Anniversary in 20 days, visit in 30 days
  - **Expected:** Both pills stacked vertically.

### Connect banner (unpaired)

- [ ] **Invite banner shows invite code**
  1. New account, no partner, land on Home
  - **Expected:** Blush card with 💌 + invite code.

- [ ] **Tap banner opens pairing flow**
  1. Tap Connect banner
  - **Expected:** Navigates to /(auth)/pairing.

- [ ] **Banner hides as soon as partner joins** 📱
  1. Phone B joins via code
  - **Expected:** Phone A's banner disappears.

### Daily Love Language insight card

- [ ] **Insight card hidden until partner takes quiz**
  1. Neither phone completed quiz
  - **Expected:** No 'INSIGHT FOR YOU' card.

- [ ] **Insight card appears after partner completes quiz** 📱
  1. Phone B completes quiz
  - **Expected:** Beige card 'INSIGHT FOR YOU · <LANGUAGE>'.

- [ ] **Tapping CTA navigates to suggested route**
  1. Tap insight card
  - **Expected:** Navigates to tip route.

- [ ] **Tip rotates daily** ⚠️
  1. Change phone date to tomorrow
  - **Expected:** Different tip from same category.

- [ ] **Long-hug touch tip has empty CTA** ⚠️
  1. Partner language = touch; await tip
  - **Expected:** No '→' CTA, tap does nothing.

### Incoming spark banner

- [ ] **Banner appears after partner sends spark** 📱
  1. Phone B taps Love quick action
  - **Expected:** Phone A sees blush banner emoji + message + ✕.

- [ ] **Tapping banner marks spark seen**
  1. Tap banner
  - **Expected:** Banner disappears.

- [ ] **Sparks older than 24h are filtered out** ⚠️
  1. Spark with createdAt > 24h ago
  - **Expected:** No banner.

- [ ] **Only partner sparks show**
  1. Send spark to self
  - **Expected:** No banner.

### On this day memory card

- [ ] **Card shows when matching memory exists**
  1. Moments photo with same MM/DD from prior year
  - **Expected:** Yellow card 'On this day, N year(s) ago'.

- [ ] **Card hidden when no historical match**
  1. New couple
  - **Expected:** No card.

- [ ] **Card hidden for same-year memory only** ⚠️
  1. Moments photo with today's date current year only
  - **Expected:** Card not shown.

### Onboarding nudge cards

- [ ] **Add your name card when name blank**
  1. Skip name entry, pair, open Home
  - **Expected:** Blush '👤 Add your name' → /profile.

- [ ] **Start date card when no startDate**
  1. Connected, no startDate
  - **Expected:** Blush '📅 When did you get together?' card.

- [ ] **Start date card hidden until name is filled** ⚠️
  1. Both blank
  - **Expected:** Only 'Add your name' shows.

- [ ] **Both cards disappear once filled**
  1. Fill name + start date
  - **Expected:** Neither card visible.

### Mood picker grid (Home)

- [ ] **Picking a free mood saves and hides grid**
  1. Tap 😊
  - **Expected:** Section disappears; hero pill shows 😊.

- [ ] **Partner sees the mood update** 📱
  1. Phone A taps 🥰
  - **Expected:** Phone B partner pill changes within ~5s; push fires.

- [ ] **Adult moods locked for free users** 💰
  1. Free user scrolls grid
  - **Expected:** 😈 🥵 at 0.4 opacity with 🔒; tap → /upgrade.

- [ ] **Adult moods selectable when subscribed** 💰
  1. Premium taps 🥵
  - **Expected:** Mood saves normally.

- [ ] **Mood grid hidden once mood set today**
  1. Pick mood, reload
  - **Expected:** Section no longer rendered.

- [ ] **Mood reset at UTC midnight** ⚠️
  1. Pick at 23:50; wait UTC midnight
  - **Expected:** Grid reappears.

- [ ] **Mood pick on Airplane Mode silently fails** ⚠️
  1. Enable Airplane Mode; tap mood
  - **Expected:** No crash; resyncs when online.

- [ ] **Picking 🥺 unlocks mood notes** 📱
  1. Phone B writes mood-gated note; Phone A picks 🥺
  - **Expected:** Note becomes readable.

### Tonight's Ritual + Quick + Games rows

- [ ] **Ritual row navigates to questions-game**
  1. Tap 'Three questions tonight'
  - **Expected:** /questions-game.

- [ ] **Ritual row always renders**
  1. Open Home
  - **Expected:** Row always present.

- [ ] **Quick card hidden when unpaired**
  1. New user no partner
  - **Expected:** No 'Quick' card.

- [ ] **Love button opens spark picker bottom sheet**
  1. Tap ❤️ Love
  - **Expected:** Sheet with 5 SPARK_OPTIONS + Cancel.

- [ ] **Picking spark sends and shows Sent state for 3s**
  1. Tap ❤️ Love, pick option
  - **Expected:** '✓ Sent' for ~3s.

- [ ] **Cannot send while Sent state is active** ⚠️
  1. Send then immediately tap ✓ Sent
  - **Expected:** Sheet doesn't reopen.

- [ ] **Tease button deep-links to flash send flow**
  1. Tap 📸 Tease
  - **Expected:** /flashes?send=1.

- [ ] **Note button opens love notes screen**
  1. Tap 💌 Note
  - **Expected:** /notes.

- [ ] **Spark partner notification fires** 📱
  1. Phone A sends spark
  - **Expected:** Phone B push + banner.

- [ ] **Cancel button dismisses spark picker**
  1. Tap Love → Cancel
  - **Expected:** Sheet dismisses.

- [ ] **All five game rows render**
  1. Scroll to Games & Rituals
  - **Expected:** Daily Picks, Date Roulette, Would You Rather, Truth or Dare, Fantasy Wishes.

- [ ] **Daily Picks row navigates**
  1. Tap Daily Picks
  - **Expected:** /daily-wishes.

- [ ] **Fantasy Wishes row shows lock for free user** 💰
  1. Free user views row
  - **Expected:** Subtitle ends with '· 🔒'.

- [ ] **Fantasy Wishes row no lock for paid user** 💰
  1. Premium views row
  - **Expected:** Plain subtitle.

- [ ] **All five rows push correct routes**
  1. Tap each
  - **Expected:** Correct routes.

### Waiting for you — challenge / notes / daily

- [ ] **Challenge nudge after partner marks day** 📱
  1. Phone A start; Phone B mark Day 1
  - **Expected:** Phone A sees nudge.

- [ ] **Challenge nudge disappears once user marks**
  1. Mark Day 1
  - **Expected:** Nudge gone.

- [ ] **Veto counts as 'marked' for nudge** 📱 ⚠️
  1. Phone B vetoes Day 1
  - **Expected:** Same nudge appears.

- [ ] **Single ready note shows singular copy** 📱
  1. Phone B sends note unlocking in 1min; wait
  - **Expected:** '💌 Love note waiting' nudge.

- [ ] **Multiple ready notes show plural count** 📱
  1. Phone B sends 3 ready notes
  - **Expected:** 'Love notes waiting'; '3 messages from <Partner>'.

- [ ] **Future-locked notes do not nudge** 📱 ⚠️
  1. Phone B writes note openAt 24h away
  - **Expected:** No nudge.

- [ ] **Daily Questions nudge after partner discusses** 📱
  1. Phone B answers + Discussed
  - **Expected:** '💬 Questions waiting' nudge.

- [ ] **Daily Picks nudge after partner votes** 📱
  1. Phone B votes 5+
  - **Expected:** '🌹 Daily Picks' nudge.

- [ ] **Daily Picks nudge clears after I cast 20 votes**
  1. Vote 20+
  - **Expected:** Nudge gone.

- [ ] **WYR nudge after partner answers** 📱
  1. Phone B answers first
  - **Expected:** '🤔 Would You Rather' nudge.

- [ ] **Fantasy Wishes vote nudge** 📱 💰
  1. Phone B votes
  - **Expected:** '✨ Fantasy Wishes' nudge.

- [ ] **Fantasy Wishes match nudge** 📱 💰
  1. Both vote yes on same item
  - **Expected:** '✨ 1 match' nudge.

### Waiting for you — Moments / Sunday / Activity / Together / Tease

- [ ] **Daily moment prompt when neither captured**
  1. No moment today
  - **Expected:** '📸 Capture today's moment' → /moments.

- [ ] **Moment prompt updates after partner captures** 📱
  1. Phone B posts moment
  - **Expected:** '<Partner> captured today's moment'.

- [ ] **Moment nudge disappears after my capture**
  1. Phone A posts
  - **Expected:** Nudge gone.

- [ ] **Sunday ritual nudge on Sundays** ⚠️
  1. Phone date Sunday, no entries
  - **Expected:** '🌅 Sunday check-in' nudge.

- [ ] **Partner finished check-in nudge** 📱
  1. Phone B completes
  - **Expected:** '💗 <Partner> finished' nudge.

- [ ] **Partner started check-in nudge** 📱
  1. Phone B answers 2 of 5
  - **Expected:** '💞 Sunday check-in started' nudge.

- [ ] **Activity Cards pending card nudge** 📱 💰
  1. Phone B picks card for A
  - **Expected:** '🃏 <Partner> picked a card for you'.

- [ ] **Together List suggestion nudge** 📱
  1. Phone B suggests item
  - **Expected:** '✨ <Partner> suggested something'.

- [ ] **Incoming Tease flash nudge** 📱
  1. Phone B sends flash
  - **Expected:** Top nudge '📸 <Partner> sent you a tease'.

### Waiting for you — LDR + YIR + Intimacy

- [ ] **Care package nudge in first 3 days of month** 🌍 ⚠️
  1. LDR on, date set to 2nd
  - **Expected:** '🎁 Care package time?' nudge.

- [ ] **Pre-visit countdown nudge — Tomorrow** 🌍
  1. LDR on, Next visit 1 day
  - **Expected:** '💞 Tomorrow' top nudge.

- [ ] **Pre-visit nudge cycles per day-to-go** 🌍
  1. LDR on, Next visit 5 days
  - **Expected:** '💌 5 days' nudge; verify 2/3/6/7 variants.

- [ ] **Post-visit nudge for day 1 after** 🌍 ⚠️
  1. Next visit = yesterday
  - **Expected:** '✨ Visit memory drop' → /moments.

- [ ] **Post-visit nudge stops after day 3** 🌍 ⚠️
  1. Next visit 4 days ago
  - **Expected:** No nudge.

- [ ] **LDR off suppresses LDR-only nudges** ⚠️
  1. LDR off; Next visit tomorrow
  - **Expected:** No LDR nudges.

- [ ] **YIR nudge inside window** ⚠️
  1. Phone date Dec 30
  - **Expected:** YIR top nudge.

- [ ] **YIR uses prior year in January**
  1. Phone date Jan 3
  - **Expected:** Title shows last year.

- [ ] **YIR hidden outside window**
  1. Phone date Feb 1
  - **Expected:** No YIR nudge.

- [ ] **Intimacy Log nudge hidden when feature off**
  1. features.intimacyLog false
  - **Expected:** No '💝 Intimate moment'.

- [ ] **Generic time-based nudge after 7+ days** 💰
  1. Enable feature; entry 10 days ago
  - **Expected:** Nudge '💝 Intimate moment · It's been 10 days'.

- [ ] **Fantasy match boosts subtitle copy** 💰 📱
  1. Above + FW mutual match
  - **Expected:** Subtitle about Fantasy Wishes.

- [ ] **Shared Daily Pick boosts subtitle** 💰 📱
  1. Both yes on same Daily Pick today
  - **Expected:** Subtitle about today's pick.

- [ ] **Recent entry suppresses nudge**
  1. Log entry today
  - **Expected:** No nudge.

### Profile button + sign out (Home)

- [ ] **Profile button goes to profile**
  1. Tap Profile in Home header
  - **Expected:** /profile.

- [ ] **Sign out mid-scroll returns to login** ⚠️
  1. Scroll halfway, Profile → Sign out
  - **Expected:** /(auth)/login.

### Discover hub

- [ ] **All 6 game cards render in order**
  1. Tap Discover
  - **Expected:** GAMES: Questions Game, Versus, Truth or Dare, WYR, Activity Cards, Fantasy Wishes.

- [ ] **Free games show › arrow**
  1. Look at free 4
  - **Expected:** Right shows '›'.

- [ ] **Paid games show 🔒 for free user** 💰
  1. Free user views Activity Cards + Fantasy Wishes
  - **Expected:** Right shows '🔒'; tap → /upgrade.

- [ ] **Paid games unlock for premium** 💰
  1. Premium taps Activity Cards
  - **Expected:** Navigates to /bingo.

- [ ] **Versus card navigates to /versus**
  1. Tap Versus
  - **Expected:** Opens.

- [ ] **Both challenge cards render**
  1. Scroll CHALLENGES
  - **Expected:** 30-Day Challenge, Date Night Roulette.

- [ ] **30-Day Challenge navigates**
  1. Tap
  - **Expected:** /challenge.

- [ ] **Date Night Roulette navigates**
  1. Tap
  - **Expected:** /roulette.

### Love hub

- [ ] **Together List card renders and navigates**
  1. Tap Love → Together List
  - **Expected:** /todo.

- [ ] **Intimacy Log hidden behind feature flag**
  1. features.intimacyLog = false
  - **Expected:** Section omits Intimacy Log.

- [ ] **Intimacy Log appears when flag enabled**
  1. features.intimacyLog = true
  - **Expected:** Section lists Intimacy Log first.

- [ ] **All intimacy cards locked for free user** 💰
  1. Free user views section
  - **Expected:** Each card shows 🔒; tap → /upgrade.

- [ ] **Cards unlock for premium** 💰
  1. Premium taps each
  - **Expected:** Navigates to /intimacy-tracker, /blueprint, /sensate.

- [ ] **All 6 connection cards render and navigate**
  1. Open CONNECTION
  - **Expected:** Journal, Love Notes, Moments, Countdowns, Calendar, Flirt Reminders.

- [ ] **Tap each connection card lands correctly**
  1. Tap through all 6
  - **Expected:** Each navigates correctly.

- [ ] **All 5 insight cards render and navigate**
  1. Open INSIGHTS
  - **Expected:** Our Story, Time Capsules, Sunday Check-in, Love Language, Relationship Pulse.

### Together List

- [ ] **Header renders with +Add**
  1. Navigate /todo
  - **Expected:** Title + '+ Add' button.

- [ ] **Filter chips render and behave**
  1. Tap each chip
  - **Expected:** Tapped chip burgundy; list filters.

- [ ] **All chip resets filter**
  1. Tap All
  - **Expected:** All active todos.

- [ ] **Add a simple Daily Life todo**
  1. +Add → 'Buy groceries' → Daily Life → toggle off → Add →
  - **Expected:** New row at top.

- [ ] **Empty text disables save** ⚠️
  1. +Add → blank → Add →
  - **Expected:** Nothing happens.

- [ ] **Cancel resets suggest toggle**
  1. Turn ON suggest → Cancel → reopen
  - **Expected:** Reopens with toggle OFF.

- [ ] **Category selection updates highlight**
  1. Tap Intimacy then Fantasy
  - **Expected:** Only one chip highlighted.

- [ ] **Direct add real-time syncs to partner** 📱
  1. Phone A adds 'Plan a picnic'
  - **Expected:** Phone B sees row at top.

- [ ] **Send a suggestion writes status=pending** 📱
  1. +Add → 'Couples massage' → Intimacy → toggle ON → Send
  - **Expected:** Item not in A's active list; footer 'Waiting for'; Phone B push.

- [ ] **Partner sees suggestion card** 📱
  1. Phone B opens Together List
  - **Expected:** Suggestions section with ✕/✓.

- [ ] **Partner accepts suggestion** 📱
  1. Phone B taps ✓
  - **Expected:** Suggestion → active list both phones.

- [ ] **Partner declines suggestion** 📱
  1. Phone B taps ✕
  - **Expected:** Card disappears; status='rejected'.

- [ ] **Multiple suggestions pluralize**
  1. Phone A sends 3
  - **Expected:** Footer 'Waiting for <Partner> on 3 suggestions'.

- [ ] **Pending suggestion does not affect filter view**
  1. Tap Date Ideas filter
  - **Expected:** Pending item not in filtered list.

- [ ] **Toggle completed via circle**
  1. Tap circle
  - **Expected:** Light haptic; row moves to Done.

- [ ] **Uncomplete via circle**
  1. Tap filled
  - **Expected:** Row back to active.

- [ ] **Toggle from detail modal**
  1. Tap row → Mark as done
  - **Expected:** Button flips.

- [ ] **Partner sees completion live** 📱
  1. Phone A taps circle
  - **Expected:** Phone B sees within ~2s.

- [ ] **Simultaneous toggles don't crash** 📱 ⚠️
  1. Both tap same circle simultaneously
  - **Expected:** Last write wins.

- [ ] **Detail sheet shows for self-added item**
  1. Add → tap row
  - **Expected:** Sheet shows 'Added by you'.

- [ ] **Detail sheet shows for partner item** 📱
  1. Phone B adds; Phone A taps
  - **Expected:** Meta 'Added by <Phone B name>'.

- [ ] **Roulette-sourced item shows date description**
  1. Spin → accept → tap from /todo
  - **Expected:** Description box + 'from Date Night'.

- [ ] **Remove confirmation iOS**
  1. Detail → Remove
  - **Expected:** Native Alert Cancel/Remove.

- [ ] **Cancel keeps item**
  1. Cancel alert
  - **Expected:** Item still present.

- [ ] **Delete syncs to partner** 📱
  1. Phone A deletes
  - **Expected:** Phone B row vanishes within ~2s.

- [ ] **Empty state on fresh couple**
  1. Brand-new couple opens list
  - **Expected:** ✨ + 'Add something you want to do together'.

- [ ] **Help modal first-visit only**
  1. First visit, dismiss; leave + re-enter
  - **Expected:** Only first visit shows.

- [ ] **Dismiss all suppresses help globally** ⚠️
  1. Tap 'Don't show tips again'
  - **Expected:** Future help suppressed.

- [ ] **Filtered empty state**
  1. 1 Daily Life todo; tap Date Ideas filter
  - **Expected:** Empty state visible.

---

## 3. Love Notes + Tease + Moments + Journal
Timed messages, ephemeral photos, daily ritual photos, and shared journal.

### Love Notes (app/notes.tsx)
Timed/conditional letters with multiple unlock triggers.

- [ ] **Empty state shows envelope + Write a note CTA**
  1. From Home navigate to Love Notes, no notes exist
  - **Expected:** Centered envelope emoji, 'No notes yet', burgundy 'Write a note' button.

- [ ] **Write 'Right now' note delivers to partner instantly** 📱
  1. Phone A: Write → 'I love you' → confirm 'Right now' chip → Send 💌
  2. Phone B: open Love Notes within 10s
  - **Expected:** Phone B receives push and shows 'For you 💌' blush card with ✉️ icon.

- [ ] **Tonight at 8pm note shows correct lock countdown** 📱
  1. Phone A: Write → 'Read me tonight' → Tonight at 8pm → Send
  2. Phone B: Love Notes
  - **Expected:** Locked card 🔒 'Opens in Xh Ym' counting down to 20:00.

- [ ] **Mood-trigger note unlocks when partner logs matching mood** 📱
  1. Phone A: Write → 'When you're feeling...' → 😢 Sad → Send
  2. Phone B: confirm note shows 🔒 with status
  3. Phone B: Home → set mood 😢
  4. Phone B: return to Love Notes
  - **Expected:** Note surfaces in 'For you 💌' as ready; Phone A status changes to 'Opened ✓' when B opens.

- [ ] **Mood-trigger note ignores wrong mood** 📱 ⚠️
  1. Trigger 😢; Phone B sets 😊
  - **Expected:** Note stays locked on Phone B.

- [ ] **LDR 'When I arrive' trigger only when isLongDistance** 🌍
  1. Profile: turn LDR off → Write composer
  2. Turn LDR on → Write composer
  - **Expected:** First view: 4 occasions. After LDR on: 3 extra chips ✈️/🤗/🌙.

- [ ] **'When you miss me' stash letter appears in Open when section** 📱 🌍
  1. Phone A (LDR on): Write → 🤗 When you miss me → Send
  2. Phone B: Love Notes
  - **Expected:** Phone B shows 'Open when... ✨' section with tan card, openable immediately.

- [ ] **Author can edit unopened note without re-firing notification** 📱
  1. Phone A: ✎ pencil on 'Right now' note → change text → Save
  - **Expected:** Note text updates; Phone B receives NO new push.

- [ ] **Author can delete unopened note via confirm modal** 📱
  1. Phone A: ✕ → 'Keep it' (verify); ✕ → red Delete
  - **Expected:** Note disappears from both phones.

- [ ] **Opened note shows fullscreen viewer and dims in list** 📱
  1. Phone B: tap ready note → tap to close
  - **Expected:** Modal dismisses; opened note appears with reduced opacity; Phone A status 'Opened ✓'.

- [ ] **Edit/delete buttons hide once partner opens the note** 📱
  1. Phone B opens note
  - **Expected:** Phone A 'Opened ✓'; no ✎ or ✕.

- [ ] **Empty message blocks send** ⚠️
  1. Write → empty → Send 💌
  - **Expected:** Nothing happens.

- [ ] **Help modal shows on first visit then dismisses** ⚠️
  1. Fresh user enable Help → open Love Notes → dismiss
  - **Expected:** Help shown once; not on re-visit.

- [ ] **This weekend note shows correct day countdown** 📱 ⚠️
  1. Mon-Thu: This weekend → Send
  - **Expected:** 'Opens in Xd Yh' until Saturday 9am.

### Tease (Flashes) (app/flashes.tsx)
24-hour ephemeral photo/video/voice messages with countdown.

- [ ] **Hero empty state when no incoming teases**
  1. Phone B opens Tease with nothing
  - **Expected:** White hero with ✦ ✶ ✦, 'A little window into your day'.

- [ ] **Take photo + send delivers tap-to-view card** 📱
  1. Phone A: 📷 FAB → snap → 'hi cutie' caption → Send
  2. Phone B: open Tease
  - **Expected:** Phone B receives push + dark burgundy 'Tap to view' card.

- [ ] **Record + send voice note** 📱
  1. Phone A: 🎙 FAB → record 3-5s → stop → Send
  2. Phone B: open Tease
  - **Expected:** Phone B push 'voice note'; card with 🎙 'Tap to listen'.

- [ ] **Record video from camera with 30s max** 📱
  1. Phone A: 🎥 FAB → record 5s → accept → Send
  2. Phone B: tap card
  - **Expected:** Fullscreen video plays looped with native controls.

- [ ] **Library picker (⊞) accepts photo OR video**
  1. ⊞ → pick video
  - **Expected:** Compose previews muted video.

- [ ] **Tap-to-view marks viewed and removes from new section** 📱
  1. Phone B: tap 'Tap to view' → view → close
  - **Expected:** Moves to dimmed 'Already opened'; viewed=true.

- [ ] **Caption character limit caps at 60**
  1. Type a long string
  - **Expected:** Clips at 60/60.

- [ ] **Cancel during recording stops the mic gracefully** ⚠️
  1. Tap 🎙 → during 'Recording... tap to stop' tap Cancel
  - **Expected:** Recording stops; compose closes.

- [ ] **Send button disabled until media exists**
  1. Open compose voice mode without recording
  - **Expected:** Send at 0.35 opacity, disabled.

- [ ] **Upload failure shows alert and resets sending state** ⚠️
  1. Airplane mode → snap → Send
  - **Expected:** Alert 'Upload failed — Please try again.' Compose stays open.

- [ ] **Expired flash disappears after 24h boundary** ⚠️
  1. Send, advance clock past 24h
  - **Expected:** Drops from list both phones.

- [ ] **Sent today badge appears on hero card** ⚠️
  1. Zero incoming; send 2 photos from A
  - **Expected:** Hero shows 'You've sent 2 today'.

- [ ] **Camera permission denied shows alert** ⚠️
  1. Deny in iOS Settings → tap 📷 FAB
  - **Expected:** Alert 'Camera access needed'.

### Moments (app/moments.tsx)
BeReal-style daily photo ritual. Atomic streak transactions.

- [ ] **Empty state prompt before either photo** 📱
  1. Fresh day, neither posted
  - **Expected:** White prompt 📸 'Capture today's moment' + 'Take photo' button; streak '🔥 0'.

- [ ] **Take photo flow on Phone A shows waiting state** 📱
  1. Phone A: Take photo → snap → accept → upload
  - **Expected:** Section transforms to 'Waiting for Partner...' card with my thumbnail.

- [ ] **Partner-already-submitted prompt shows context** 📱
  1. Phone A submits; Phone B opens Moments
  - **Expected:** Subtitle '<Phone A name> already captured theirs, take yours to reveal both photos'.

- [ ] **Push notification fires when first partner posts** 📱
  1. Phone A submits
  - **Expected:** Phone B receives '[A name] captured today's moment 📸'.

- [ ] **Reveal card shows side-by-side photos** 📱
  1. Both submit
  - **Expected:** 220px reveal card: left mine, right partner, names overlay.

- [ ] **Streak bumps to 1 on first both-photo day** 📱
  1. Fresh couple, both submit day 1
  - **Expected:** Streak '🔥 0' → '🔥 1' the moment B's transaction commits.

- [ ] **Streak resets if a day is missed** ⚠️ 📱
  1. Day 1 streak 🔥 5; skip day 2; both submit day 3
  - **Expected:** Streak becomes 🔥 1.

- [ ] **Simultaneous submit does not double-bump streak** 📱 ⚠️
  1. Fresh day; both tap within 1 second
  - **Expected:** Streak bumps exactly once.

- [ ] **Past moments grid renders 2x2 pairs by date**
  1. Several days completed
  - **Expected:** Two-column flex-wrap grid; newest first.

- [ ] **Past moment with missing partner photo shows placeholder** ⚠️
  1. Day where only one submitted; tap cell
  - **Expected:** Placeholder block for missing side.

- [ ] **Camera permission denied alerts** ⚠️
  1. Deny in iOS Settings → tap Take photo
  - **Expected:** Alert 'Camera access needed'.

- [ ] **Upload failure shows alert and keeps Take Photo button** ⚠️
  1. Airplane mode → snap
  - **Expected:** Alert 'Upload failed'; prompt stays.

- [ ] **Cancel out of native camera does nothing** ⚠️
  1. Tap Take photo → Cancel in camera
  - **Expected:** No change.

- [ ] **Full-screen viewer shows both photos with names + date**
  1. Tap reveal/past grid cell
  - **Expected:** Black modal 360px tall pair; names + date.

### Journal (app/journal.tsx)
Shared chronological log; either partner can write with optional mood tag.

- [ ] **Empty state shows shared journal hero**
  1. Open Journal as fresh couple
  - **Expected:** 📓 + 'Your shared journal' + 'Write the first entry' button.

- [ ] **Write entry without mood — appears for partner** 📱
  1. Phone A: Write → 'I'm proud of you' → Add to journal
  2. Phone B: open Journal
  - **Expected:** Phone A success haptic + entry; Phone B receives push + sees entry.

- [ ] **Mood chip toggles on/off (single select)**
  1. Tap 🙏 then 💗 then 💗 again
  - **Expected:** Only one active; second tap clears.

- [ ] **Saved entry displays mood tag in card header**
  1. Write with 😤 Frustrated → save
  - **Expected:** Header row: 'You' | '😤 Frustrated' | timestamp.

- [ ] **Edit own entry shows 'edited' timestamp**
  1. ✎ Edit → modify → Save
  - **Expected:** Text updates; italic 'edited Today, HH:MM' appears; no re-push.

- [ ] **Cannot edit/delete partner's entry** 📱
  1. Phone B writes; Phone A views
  - **Expected:** No ✎ / ✕ on partner's card.

- [ ] **Delete confirm on native uses Alert**
  1. iOS ✕ Delete → Cancel → ✕ Delete (destructive)
  - **Expected:** Entry deleted both phones.

- [ ] **Save button disabled on empty text**
  1. Open Write blank or spaces
  - **Expected:** Save at 0.4 opacity, disabled.

- [ ] **Real-time sync of new entries between phones** 📱
  1. Both on Journal; Phone A writes
  - **Expected:** Phone B sees new card within 1-3s.

- [ ] **Yesterday/older dates format correctly**
  1. Entries today/yesterday/week ago
  - **Expected:** 'Today, HH:MM' / 'Yesterday, HH:MM' / '24 May 2026'.

- [ ] **Cancel discards composition**
  1. Type text + mood → Cancel
  - **Expected:** No entry; reopen Write is empty.

- [ ] **Entries cap at 100 most recent** ⚠️
  1. Bulk-add 101+
  - **Expected:** Only 100 newest visible.

- [ ] **Edit modal pre-fills text and mood from existing entry**
  1. ✎ on entry with ✨ Curious
  - **Expected:** Textarea filled + Curious chip active; title 'Edit entry'.

---

## 4. Calendar + Countdowns + Time Capsules + Our Story + Year-in-Review
Date-driven features: month calendar, countdown lists, sealed time capsules, relationship timeline, year wrap.

### Calendar month grid (app/calendar.tsx)

- [ ] **Calendar opens to current month with today highlighted**
  1. Navigate to /calendar
  - **Expected:** Header shows month/year; today's cell highlighted blush; weekday row Mon-Sun.

- [ ] **Prev/Next month navigation crosses year boundary**
  1. ‹ 6 times then › 14 times
  - **Expected:** Month label decrements/increments crossing years correctly.

- [ ] **Tap a day opens Add modal pre-filled to that day**
  1. Tap day 15
  - **Expected:** Modal 'Add a date' with hint shows that date; emoji defaults heart; Save disabled until label typed.

- [ ] **Saving a date updates dots on both phones** 📱
  1. Phone A: tap day 20 → 'Concert night' → 🎉 → Save
  2. Phone B: open Calendar same month
  - **Expected:** Phone A day 20 gets burgundy dot; Phone B sees same within 5s.

- [ ] **Auto-dates show grey dot without being saved**
  1. Set partner birthday next 60 days; navigate to that month and Feb 14
  - **Expected:** Both get grey dots; tap still opens Add modal.

- [ ] **Upcoming list shows next 5 events sorted by proximity**
  1. Add 6 dates spanning 12 months
  - **Expected:** Upcoming shows exactly 5 sorted soonest-first.

- [ ] **Empty Upcoming state**
  1. Fresh couple, no dates
  - **Expected:** 'No upcoming dates. Tap a day to add one.'

- [ ] **Delete date from Upcoming list (only own dates)** 📱
  1. Phone A adds 'Test event' tomorrow → ✕ from Upcoming
  - **Expected:** Disappears both phones; ✕ only on own dates.

- [ ] **Save button disabled with empty label** ⚠️
  1. Open Add → blank/whitespace label
  - **Expected:** Save at 40% opacity, disabled.

### Countdowns list (app/countdown.tsx)

- [ ] **Empty state shows when no user dates exist**
  1. Fresh couple, no user dates
  - **Expected:** Below auto cards: ⏳ 'No dates yet' + 'Add a date' CTA.

- [ ] **Auto-dates always present with dashed border**
  1. Open Countdowns
  - **Expected:** Valentine's + Mother's Day cards with dashed border; no ✕.

- [ ] **Partner birthday auto-date with turning-age**
  1. Partner birthday DD.MM.YYYY entered
  - **Expected:** '<Partner name> turns <age> 🎂'.

- [ ] **Add a normal countdown**
  1. + Add → 🎉 → 'Anniversary trip' → 90 days → Mysterious off → Save
  - **Expected:** New card sorted by days; large '90 days'.

- [ ] **Today badge appears on date with 0 days left**
  1. Add countdown for today
  - **Expected:** Blush bg + '🎉 Today!' badge.

- [ ] **Mysterious countdown hides label from partner** 📱
  1. Phone A: Add → 'Surprise getaway' → 30 days → Mysterious toggle ON → Save
  2. Phone B: Countdowns
  - **Expected:** Phone A sees real label; Phone B sees 🤫 'A surprise from your partner'.

- [ ] **Delete user-added date** 📱
  1. Phone A: ✕ on 'Test'
  - **Expected:** Disappears both phones; auto-dates have no ✕.

- [ ] **Sort order updates as new closer date is added**
  1. Existing 60-day; add 5-day
  - **Expected:** 5-day moves above 60-day.

- [ ] **First-time help modal appears** ⚠️
  1. New user opens Countdowns
  - **Expected:** HelpModal 'Countdowns' + 4 tips; dismiss once.

### Time Capsule create + seal (app/time-capsules.tsx)

- [ ] **Empty state on first visit**
  1. Open Time Capsules no capsules
  - **Expected:** 🕰️ + 'Seal a memory for the future' + 'Seal a new capsule' button.

- [ ] **Seal capsule with message only and 1-year preset**
  1. Type message → 🌱 1 year → Seal capsule 🔒
  - **Expected:** Success haptic; new sealed card 'From <name>' + 'Opens <date>'.

- [ ] **Seal capsule with photo attached**
  1. Type → photo → 5 years → Seal
  - **Expected:** Photo uploads; Firestore metadata hasPhoto:true.

- [ ] **Seal disabled until both message and date are set**
  1. Observe button states
  - **Expected:** Disabled until message + date both present.

- [ ] **Validation rejects date less than 1 day in future** ⚠️
  1. Force today's date; Seal
  - **Expected:** Alert 'Pick a date at least 1 day in the future.'

- [ ] **Partner gets push notification on seal** 📱
  1. Phone A seals; Phone B backgrounded
  - **Expected:** Phone B receives 'Time Capsule sealed 🕰️'.

- [ ] **Photo picker cancel leaves no photo attached** ⚠️
  1. Tap photo → cancel
  - **Expected:** Dashed box still says '📷 Add a photo'.

- [ ] **Storage upload failure shows error and stays in modal** ⚠️
  1. Airplane mode → photo → date → Seal
  - **Expected:** Alert 'Could not seal the capsule. Try again.'

- [ ] **Cancel button resets all state**
  1. Fill modal → Cancel → reopen
  - **Expected:** All cleared.

- [ ] **Custom date picker overrides preset selection**
  1. Tap 5 year → BrandDatePicker pick 90 days → Seal
  - **Expected:** Countdown shows ~3 months not 5 years.

### Time Capsule view + open (app/time-capsules.tsx)

- [ ] **Sealed (locked) card shows correct countdown formatting**
  1. Seal capsules 5/60/13mo out
  - **Expected:** '5 days' / '2 months' / '1y 1m'.

- [ ] **Sealer cannot preview locked card from this screen** ⚠️
  1. Phone A: tap own locked card
  - **Expected:** Non-tappable View.

- [ ] **Ready to open card shows when unlock date passes**
  1. Backdate openAt to now via admin
  - **Expected:** Card moves to 'Ready to open ✨' with → arrow.

- [ ] **Opening a ready capsule reveals content and marks opened**
  1. Tap Ready capsule
  - **Expected:** Modal with sealed date + message + optional photo; lives under 'Opened' after close.

- [ ] **Partner sees opened capsule synced** 📱
  1. Phone A opens; Phone B opens screen
  - **Expected:** Moves to Opened on B within 5s.

- [ ] **Firestore rules deny partner reading sealed content early** 📱 ⚠️
  1. Phone B force-tap still-sealed
  - **Expected:** Modal shows metadata only; no content.

- [ ] **Lazy content load — viewing previously opened capsule**
  1. Tap Opened card
  - **Expected:** 'Loading...' briefly, then message + photo.

- [ ] **Close button dismisses view modal cleanly**
  1. Scroll to bottom → Close
  - **Expected:** State reset; reopen shows fresh.

### Our Story timeline (app/our-story.tsx)

- [ ] **Empty state with CTA**
  1. Open Our Story no milestones
  - **Expected:** 📖 'Tell your story' + 'Add the first milestone' button.

- [ ] **Add first milestone with preset**
  1. + Add → 'First date 💑' → past date → Add to story
  - **Expected:** Year header + row with 💑 + label + date + Edit/Delete actions.

- [ ] **Maximum date prevents future dates**
  1. Add modal → try future
  - **Expected:** Picker disallows future dates.

- [ ] **Custom kind allows free-form label and ⭐ emoji**
  1. Custom → 'Adopted our cat' → date → Save
  - **Expected:** Custom milestone added.

- [ ] **Year headers group milestones**
  1. Add 2019, 2020, 2020, 2022 milestones
  - **Expected:** Year headers; same-year suppresses repeat header.

- [ ] **Vertical line connects timeline dots**
  1. 3+ milestones
  - **Expected:** Each dot has connecting line; last dot no line.

- [ ] **Edit own milestone updates timeline**
  1. Tap own milestone → modify → Save
  - **Expected:** Timeline updates inline.

- [ ] **Partner-created milestones not editable** 📱 ⚠️
  1. Phone A adds; Phone B taps
  - **Expected:** No Edit/Delete actions for partner.

- [ ] **Delete confirmation flow (native alert)** 📱
  1. Tap ✕ Delete → Cancel → ✕ Delete → Delete
  - **Expected:** Disappears both phones.

- [ ] **Real-time sync of new milestones** 📱
  1. Phone A open; Phone B add
  - **Expected:** Phone A updates within 5s.

### Year-in-Review carousel (app/year-in-review.tsx)

- [ ] **Loading state shows spinner**
  1. Open YIR
  - **Expected:** Spinner + 'Putting your year together...' then cover slides in.

- [ ] **Cover card displays correct year and both names**
  1. Wait for load
  - **Expected:** 'YEAR IN REVIEW' + year + '<my name> & <partner name>' + 'Swipe to begin →'.

- [ ] **Year selection logic (Sep cutoff)** ⚠️
  1. June clock → reopen; October clock → reopen
  - **Expected:** June shows last year; October shows current year.

- [ ] **Days together card with startDate set**
  1. startDate set → swipe to second card
  - **Expected:** Pink 'TIME TOGETHER' + days count + label.

- [ ] **Days together fallback without startDate** ⚠️
  1. No startDate
  - **Expected:** '∞' + 'set your start date in Profile'.

- [ ] **Top moods side-by-side with counts** 📱
  1. Both log 10+ moods; swipe to moods card
  - **Expected:** Two columns each with emoji + mood label + '<N> days'.

- [ ] **Moods fallback when no entries**
  1. Brand new account
  - **Expected:** '0' + 'moods logged this year'.

- [ ] **Rituals card shows 3 ritual counts**
  1. Generate activity year
  - **Expected:** 💬 questions / 📸 moments / 💌 notes.

- [ ] **Intimacy card only shows when entries exist AND feature enabled** ⚠️
  1. Feature disabled vs enabled with entries
  - **Expected:** 5 vs 6 pages.

- [ ] **Page dots indicator updates as you swipe**
  1. Swipe across all cards
  - **Expected:** Current dot wider/cream; others narrow.

- [ ] **Close button returns to previous screen**
  1. Tap ✕ top-left
  - **Expected:** router.back().

- [ ] **Outro card with next-year CTA**
  1. Swipe to last card
  - **Expected:** 'Here's to <year+1>' + 'Back to home' button.

- [ ] **Aggregation tolerates missing collections** ⚠️
  1. Brand-new couple
  - **Expected:** Cover + zeros, no crash.

- [ ] **Network failure during aggregation** ⚠️
  1. Airplane mode → open YIR
  - **Expected:** Spinner persists; eventually resolves with zeros.

- [ ] **Long-distance days apart placeholder** 🌍 ⚠️
  1. LDR on → open YIR
  - **Expected:** No LDR-specific card yet; behavior unchanged.

---

## 5. Truth or Dare + Questions Game + Versus + WYR
Multiplayer Truth or Dare, daily Questions Game, partner-knowledge Versus, Would You Rather.

### Truth or Dare — Mode Picker & Solo Dare Wheel (app/truth-dare.tsx)

- [ ] **Mode picker shows two distinct paths**
  1. Open Truth or Dare
  - **Expected:** Eyebrow 'TONIGHT'; two cards Solo Dare + Multiplayer.

- [ ] **Solo Dare wheel spins and reveals a dare**
  1. Solo Dare → Spin → wait 1.8s
  - **Expected:** Wheel rotates 1440°; dare card from Flirty pool.

- [ ] **Solo Dare Spicy level locked for free user** 💰
  1. Free user → Solo Dare → Spicy
  - **Expected:** /upgrade.

- [ ] **Solo Dare double-tap spin ignored while spinning** ⚠️
  1. Spin → immediately Spin again
  - **Expected:** Second tap ignored.

- [ ] **Back from Solo returns to mode picker**
  1. Solo Dare → ‹ Back
  - **Expected:** Returns to Mode Picker.

### Truth or Dare — Multiplayer Lobby

- [ ] **Multiplayer level select starts a round on both phones** 📱
  1. Phone A: Multiplayer → Flirty
  2. Phone B: observe
  - **Expected:** Phone A active game; Phone B waiting card within 2-3s.

- [ ] **Spicy level locked for free user** 💰 📱
  1. Phone A free → Spicy
  - **Expected:** /upgrade; no Firestore write.

- [ ] **Help modal shows on first multiplayer visit**
  1. First time
  - **Expected:** HelpModal 'Truth or Dare' + 4 tips.

### Truth or Dare — Picking Phase

- [ ] **Pick Truth and send to partner** 📱
  1. Phone A: Truth → preview → Send
  - **Expected:** Phone A 'Sent to <partner>!'; Phone B sees Truth with Write/Record tabs.

- [ ] **Redraw gives a different card**
  1. Phone A: Dare → 'Skip, get a different one →'
  - **Expected:** Different dare; first cannot reappear.

- [ ] **Partner sees waiting card during picking** 📱
  1. Phone A starts round; Phone B observes
  - **Expected:** '🎲 <A> is choosing your challenge…'.

- [ ] **Switching level mid-round resets the session** 📱 💰 ⚠️
  1. Phone A active in Flirty → tap Spicy
  - **Expected:** Round resets to 1; Phone B sees restart.

### Truth or Dare — Truth Answering

- [ ] **Partner answers Truth with text and both see reveal** 📱
  1. Phone A sends Truth; Phone B Write tab → type → Send my answer →
  - **Expected:** Both see Done card with answer.

- [ ] **Partner records audio answer and Phone A plays it back** 📱
  1. Record tab → 🎙 → 5s → ⏹ → Play recording → Send → Phone A play
  - **Expected:** Audio uploads; Phone A hears it.

- [ ] **Send button disabled with empty text**
  1. Empty text
  - **Expected:** 0.4 opacity, disabled.

- [ ] **Re-record discards first recording** 📱 ⚠️
  1. Record → Re-record → record again → Send
  - **Expected:** Only second uploads.

- [ ] **Skip Truth passes turn without score** 📱
  1. Phone B: Skip this one →
  - **Expected:** Round +1; turn swaps; skipsUsed increments.

- [ ] **Microphone permission denied gracefully fails** ⚠️
  1. Deny mic → tap mic button
  - **Expected:** Nothing happens; no crash.

### Truth or Dare — Dare Sequential Confirmation

- [ ] **Sequential dare confirm: partner first, then picker** 📱
  1. Phone A sends Dare; Phone B '✓ Dare completed'; Phone A confirms
  - **Expected:** '✓ Both confirmed!' green banner; B scores +1.

- [ ] **Picker cannot confirm before partner does** 📱
  1. Phone A sends Dare; observes
  - **Expected:** '✅ Dare sent to <Partner>!' grey waiting banner.

- [ ] **Partner confirms then sees waiting banner** 📱
  1. Phone B '✓ Dare completed'
  - **Expected:** Green '✓ Done! Waiting for <A>…'.

- [ ] **Simultaneous tap by both partners — transaction prevents duplicates** 📱 ⚠️
  1. Within 1s both confirm
  - **Expected:** dareConfirmed has exactly 2 entries.

- [ ] **Skip dare passes turn without score** 📱
  1. Phone B: Skip this one →
  - **Expected:** Round +1; no score.

### Truth or Dare — Done Phase & Turn Advance

- [ ] **Tap Done advances round and swaps picker** 📱
  1. Phone A: Done, your turn →
  - **Expected:** Round 2; turnUid swaps to B.

- [ ] **Score displays only after first point**
  1. Complete first round
  - **Expected:** 'You 0, <Partner> 1' shows.

- [ ] **Reset (New) button clears the session** 📱
  1. Phone A: ↺ New
  - **Expected:** Both phones return to Mode Picker.

- [ ] **Either partner can advance from Done**
  1. Phone B taps Done
  - **Expected:** Round advances same.

- [ ] **Back from mid-game preserves session** ⚠️
  1. ‹ Back → re-enter
  - **Expected:** Returns into active session at same phase.

### Questions Game — Category Tabs & Daily Pool (app/questions-game.tsx)

- [ ] **Same 3 questions appear on both phones for current category** 📱
  1. Phone A Romantic; Phone B Romantic
  - **Expected:** Same 3 in same order; progress '0/3 answered today'.

- [ ] **Spicy category locked for free user** 💰
  1. Free → Spicy tab
  - **Expected:** /upgrade; '🔒' suffix.

- [ ] **Fantasy category locked for free user** 💰
  1. Free → Fantasy tab
  - **Expected:** /upgrade.

- [ ] **LDR-tagged questions appear only when isLongDistance=true** 🌍
  1. Set LDR; reopen
  - **Expected:** LDR-tagged questions surface; non-LDR couples never see them.

- [ ] **Loading state when no items yet** ⚠️
  1. Fresh couple slow network → pick category
  - **Expected:** 'Loading today's questions…' until ready.

### Questions Game — Answer Formats

- [ ] **Open question accepts text and shows Sent banner**
  1. Type → Send answer →
  - **Expected:** White 'Sent! Waiting for <Partner>…' banner.

- [ ] **Binary question submits instantly on option tap**
  1. Tap one option
  - **Expected:** Sent banner shows that option.

- [ ] **Scale question shows 1-5 chips with hint**
  1. Scale-format Q → tap 4
  - **Expected:** Answer '4' submitted; hint '1 = not at all · 5 = completely'.

- [ ] **Reveal shows both side-by-side when both answered** 📱
  1. Phone A answer; Phone B answer same
  - **Expected:** Both phones show green card with YOU / partner answers.

- [ ] **Partner-already-answered hint before you answer** 📱
  1. Phone B answers first
  - **Expected:** Phone A sees '<B> already answered, your turn!'.

### Questions Game — Streak & Push

- [ ] **Streak shows in header after both answer day 1** 📱
  1. Both answer matching Q day 1
  - **Expected:** '🔥 1' both phones.

- [ ] **Streak increments next day** 📱
  1. Day 2 both answer again
  - **Expected:** '🔥 2'.

- [ ] **Push notification sent when first to answer** 📱
  1. Phone A answers first
  - **Expected:** Phone B receives 'Questions 💬'.

- [ ] **No notification when answering second** 📱 ⚠️
  1. Phone B answered first; Phone A answers
  - **Expected:** Phone B receives NO push.

- [ ] **No streak hidden when count is 0**
  1. Brand-new couple
  - **Expected:** No fire emoji in header.

### Versus — Pool Loading & Empty State (app/versus.tsx)

- [ ] **Empty state when partner has no binary history**
  1. New couple
  - **Expected:** 🤔 'Not enough answers yet' + 'Go to Questions →'.

- [ ] **Loading state appears briefly during pool fetch**
  1. Open Versus
  - **Expected:** 'Building your match...' then transitions.

- [ ] **Pool is shuffled — replaying gives different order** ⚠️
  1. Complete round → Play again ↻
  - **Expected:** Different order.

- [ ] **Header counter shows 1/N during play, hidden in done state**
  1. Mid-game → finish all
  - **Expected:** '3/10' during; hidden when done.

### Versus — Guess Mechanic & Reveal

- [ ] **Correct guess shows green ✓ and increments score**
  1. Pick correct
  - **Expected:** Green ✓; score +1; Next →.

- [ ] **Wrong guess shows red ✗ and correct in green**
  1. Pick wrong
  - **Expected:** Red ✗; correct green ✓; reveal text.

- [ ] **Cannot re-tap after revealing** ⚠️
  1. Pick → revealed → tap options
  - **Expected:** Disabled.

- [ ] **Final card transitions to result hero card**
  1. Answer all 10
  - **Expected:** 'See result →'; gradient card 'X / 10'.

- [ ] **Play again reloads fresh pool**
  1. Result → Play again ↻
  - **Expected:** Loading → playing index 0.

- [ ] **Versus is in free tier (no upgrade gate)**
  1. Free user → Versus
  - **Expected:** Fully accessible.

### Would You Rather — Lobby & Level Select (app/would-you-rather.tsx)

- [ ] **Lobby shows level cards with question counts**
  1. Open WYR no session
  - **Expected:** Playful/Romantic/Spicy with counts.

- [ ] **Spicy locked for free user** 💰 📱
  1. Free → Spicy
  - **Expected:** /upgrade.

- [ ] **Starting a level shows same question on both phones** 📱
  1. Phone A → Playful
  - **Expected:** Both identical prompt.

- [ ] **Help modal appears on lobby first visit**
  1. First visit
  - **Expected:** HelpModal 'Would You Rather' + 4 tips.

### Would You Rather — Simultaneous Answer & Reveal

- [ ] **First answerer sees waiting hint, partner reveal triggers** 📱
  1. Phone A picks A; Phone B picks B
  - **Expected:** Reveal '🤔 You differ!'; partner picks shown.

- [ ] **Matching answer triggers green You match card** 📱
  1. Both pick A
  - **Expected:** '🎉 You match!' green bg.

- [ ] **Cannot change answer after picking** ⚠️
  1. Pick A → try B
  - **Expected:** B disabled.

- [ ] **Next question swaps to new question and clears answers** 📱
  1. Reveal → Next →
  - **Expected:** Both phones new question.

- [ ] **Simultaneous answer transaction prevents reveal miss** 📱 ⚠️
  1. Both tap at same instant
  - **Expected:** Both answers landed; reveal triggers.

- [ ] **Score badge in header tracks across questions** 📱
  1. Match/differ/match
  - **Expected:** '1/1' / '1/2' / '2/3'.

- [ ] **Push notification on first answer** 📱
  1. Phone A answers; Phone B backgrounded
  - **Expected:** Phone B receives 'Would You Rather 🤔'.

- [ ] **Back preserves session, return continues** ⚠️
  1. Mid-Q → Back → re-enter
  - **Expected:** Session restored.

- [ ] **Session survives sign-out / sign-back-in** ⚠️
  1. Sign out mid-session → sign in
  - **Expected:** Continues at same index/score.

---

## 6. Activity Cards + Fantasy Wishes + Daily Picks + Dare Wheel + Roulette
Paid Bingo-style activities, double-blind fantasy voting, daily 4-category picks, date roulette spinner.

### Activity Cards — first session + grid (app/bingo.tsx)

- [ ] **Empty state — first ever open generates a 5x5 grid**
  1. Phone A fresh paid couple → Activity Cards
  - **Expected:** Header 'Activity Cards' + month label; 25 face-down ✦; '0 of 25 flipped'; 'Your turn'.

- [ ] **Paid gate — free user gets upgrade screen** 💰
  1. Free user → Activity Cards
  - **Expected:** /upgrade.

- [ ] **Help modal shows on first visit, dismisses for good**
  1. Reset help → open → dismiss → re-enter
  - **Expected:** First visit modal; not on second.

### Activity Cards — picker flow

- [ ] **Golden path — picker accepts a card, partner receives it** 📱 💰
  1. Phone A tap face-down → 'Accept this challenge'
  - **Expected:** Phone A turn passes; Phone B turn badge green '<A> sent you a challenge!' + receiver modal.

- [ ] **Pass burns one of 2 passes** 💰
  1. Phone A: tap card → Pass (2 left) → tap diff → Pass (1 left) → tap 3rd
  - **Expected:** Passes counter decrements; 0 left replaces Pass with red text.

- [ ] **Non-turn-owner cannot tap cards** 📱 💰
  1. Phone B not on turn taps cards
  - **Expected:** Nothing happens.

### Activity Cards — receiver flow

- [ ] **Receiver marks card done** 📱 💰
  1. Phone B: '✓ We did it!'
  - **Expected:** Card green ✓; turn flips back to A; Phone A push '✓'.

- [ ] **Capture moment — marks done AND routes to /moments** 📱 💰
  1. Phone B: '📸 We did it — capture this moment'
  - **Expected:** Card done + navigates to /moments.

- [ ] **Skip received card uses receiver pass (max 1)** 📱 💰
  1. First skip then second received card
  - **Expected:** First closes modal; turn back to A; second shows 'No skips left'.

### Activity Cards — undo and reset

- [ ] **Long-press completed card → unmark restores pending** ⚠️ 📱 💰
  1. Long-press green ✓ card → Unmark
  - **Expected:** Card returns to yellow/pending both phones.

- [ ] **Reset deck wipes everything for both partners** ⚠️ 📱 💰
  1. After progress tap ↺ New → confirm New deck
  - **Expected:** 25 face-down both phones; different shuffle.

- [ ] **Simultaneous taps — both phones tap on the same turn** ⚠️ 📱 💰
  1. A's turn; B tries to tap
  - **Expected:** Only A's tap opens modal.

### Fantasy Wishes — paid gate + load presets (app/fantasy-wishes.tsx)

- [ ] **Paid gate — free user redirected to /upgrade** 💰
  1. Free user → Fantasy Wishes
  - **Expected:** /upgrade.

- [ ] **Empty state — first visit shows '✨ Explore together' card** 💰
  1. Premium fresh couple → Fantasy Wishes → tap empty card
  - **Expected:** Loading state then 5 wish cards.

- [ ] **Info banner shows on every visit** 💰
  1. After presets loaded
  - **Expected:** Purple banner about mutual Yes.

### Fantasy Wishes — double-blind voting + pagination

- [ ] **Golden path — vote all 5 then Load 5 more** 💰
  1. Vote Y/M/N on 5 → tap Load 5 more ↓
  - **Expected:** Voted moves down; new batch loads.

- [ ] **Partner does NOT see my individual vote** 💰 📱
  1. Phone A votes; Phone B opens same items
  - **Expected:** No indication of A's vote; Matches=0 until both yes.

- [ ] **Mutual Yes creates a match + push notification** 💰 📱
  1. Both vote Yes on same wish
  - **Expected:** Matches tab shows match card; A receives push.

- [ ] **Change vote on already-voted item** ⚠️ 💰
  1. Already-voted Maybe → tap ✓ Yes
  - **Expected:** Vote updates; match if mutual.

- [ ] **Reset (↺) clears collection and reloads** ⚠️ 💰 📱
  1. Tap ↺
  - **Expected:** All votes wiped; new batch; matches 0.

### Fantasy Wishes — match handshake

- [ ] **First partner taps add → 'Waiting for partner' shown** 💰 📱
  1. Phone A: '+ Add to Together List'
  - **Expected:** Phone A italic 'Waiting for <Partner>'; no todo yet.

- [ ] **Second partner confirms — wish lands in Together List exactly once** 💰 📱
  1. Phone B: tap to confirm
  - **Expected:** Both phones '✓ Added'; Fantasy todo appears once.

- [ ] **Idempotent — tapping add twice does nothing extra** ⚠️ 💰
  1. Phone A: tap twice
  - **Expected:** Second tap no-op.

### Fantasy Wishes — add custom

- [ ] **Add custom wish appears for both partners** 💰 📱
  1. + Add → 'TestWish_12345' → Add
  - **Expected:** Appears in batch on both phones.

- [ ] **Empty/whitespace input does not save** ⚠️ 💰
  1. + Add → blank/spaces → Add
  - **Expected:** Nothing happens.

### Daily Picks — segment + daily generation (app/daily-wishes.tsx)

- [ ] **Golden path — open shows 5 sweet items + progress**
  1. Fresh today open Daily Picks
  - **Expected:** 4 tabs (Sweet active); progress 0/5; 5 wish cards with ✓/✗.

- [ ] **Both partners see same 5 picks (deterministic)** 📱
  1. Phone A note 5 Sweet; Phone B same tab
  - **Expected:** Identical text and order.

- [ ] **Switch category tabs scrolls to top**
  1. Sweet scroll → Spicy
  - **Expected:** Tab highlights; scrolls to top.

### Daily Picks — private voting + match

- [ ] **Vote yes — counter increments + partner sees 'has voted'** 📱
  1. Phone A: ✓ Yes on pick 1; Phone B opens
  - **Expected:** Phone A 1/5; Phone B sees '<A> has voted ✓' but not the vote value.

- [ ] **Mutual yes creates a match** 📱
  1. Both vote ✓ Yes on same
  - **Expected:** Rose border card + 'You both want this!'.

- [ ] **Vote no does NOT create match** ⚠️ 📱
  1. Phone A ✗; Phone B ✓
  - **Expected:** No match banner.

- [ ] **Change vote from no to yes after partner already yes → match** ⚠️ 📱
  1. Setup then Phone A switches to ✓
  - **Expected:** Match appears both phones.

### Daily Picks — Add to Together List atomic handshake

- [ ] **Both partners tap Add — exactly one todo created in correct category** 📱
  1. Both confirm on Sweet match
  - **Expected:** Date Ideas todo exactly once (sweet→dates / sexual→fantasy / flirty/spicy→intimacy).

- [ ] **Race — both partners tap Add simultaneously, todo once** ⚠️ 📱 💰
  1. Both tap within 1s on Sexual match
  - **Expected:** Transaction serializes; one todo.

### Daily Picks — All Matches modal

- [ ] **Empty total matches — Total tap does nothing** ⚠️
  1. 0 matches → tap Total
  - **Expected:** No modal; no chevron.

- [ ] **View all matches across categories**
  1. Sweet + Flirty matches → tap 'Total matches'
  - **Expected:** Slide-up modal lists matches with category badges.

- [ ] **Daily refresh — wait past midnight, picks regenerate** ⚠️
  1. Change device date to next day
  - **Expected:** New daily doc; 0/5 voted; new picks.

### Date Night Roulette — spinner + filters + result (app/roulette.tsx)

- [ ] **Golden path — spin and get a result card**
  1. Open → Spin for a Date! → wait 2s
  - **Expected:** Wheel 5 turns; result card with emoji + title + description + type label + stars + Save.

- [ ] **Filter restricts pool — At Home only**
  1. At Home 🏠 → spin 5x
  - **Expected:** All At Home; bg matches home color.

- [ ] **Save result adds to Together List Date Ideas**
  1. Result → Save for later → Together List → Date Ideas
  - **Expected:** Save flips green '✓ Saved'; todo appears with title.

- [ ] **Try again — re-spin without re-tapping main button**
  1. Result → Try again ↻
  - **Expected:** New result; Save resets.

- [ ] **Double-tap spin while spinning is a no-op** ⚠️
  1. Spin → immediately Spin again
  - **Expected:** Second tap ignored.

### Date Night Roulette — star ratings

- [ ] **Rate a date — stars sync to partner phone** 📱
  1. Phone A: 4 stars; Phone B: scroll 'All date ideas' list
  - **Expected:** Phone A label changes; Phone B sees amber stars within 3s.

- [ ] **4★+ filter limits spin pool to favourites**
  1. Rate 2-3 dates 4-5; toggle '★ Show only 4★+'
  - **Expected:** Spin only returns 4★/5★ rated.

- [ ] **Filter to empty pool — spin gracefully handles no items** ⚠️
  1. 4★+ filter with no rated dates → Spin
  - **Expected:** No result card; no crash.

### Date Night Roulette — LDR virtual-only mode

- [ ] **LDR couple defaults to virtual-only dates** 🌍
  1. Set LDR; open Roulette; spin 5x
  - **Expected:** All virtual; toggle '✈️ Show in-person dates too' visible.

- [ ] **Toggle Show in-person dates expands pool** 🌍
  1. Tap '✈️ Show in-person dates too'
  - **Expected:** Toggle flips; pool includes non-virtual.

- [ ] **Non-LDR couple sees no virtual toggle**
  1. Non-LDR couple → Roulette
  - **Expected:** No '✈️' toggle.

### Dare Wheel — removed/folded into Truth or Dare

- [ ] **Verify Dare Wheel is not in Discover nav** ⚠️
  1. Discover → games grid
  - **Expected:** No 'Dare Wheel' card; only 'Truth or Dare'.

- [ ] **Deep link /dare no longer routes to a screen** ⚠️
  1. Manually navigate to /dare
  - **Expected:** Route does not resolve.

---

## 7. Blueprint + Sensate + Intimacy Log
Erotic Blueprint quiz, guided Sensate Focus sessions, private Intimacy Log + stats.

### Erotic Blueprint Quiz (app/blueprint.tsx)

- [ ] **Golden path: complete quiz and see your type hero card**
  1. From Love → Erotic Blueprint → dismiss help → answer all 15 → wait
  - **Expected:** Gradient hero with type + traits + 5-bar profile + Retake.

- [ ] **Progress counter updates correctly on each question**
  1. Tap option, observe counter and bar
  - **Expected:** '2 of 15', etc. Bar grows proportionally.

- [ ] **Partner pending state before partner has completed** 📱
  1. Phone A finishes; Phone B does not
  - **Expected:** Phone A sees 'Partner pending' card; no compatibility.

- [ ] **Compatibility card appears in real time when partner finishes** 📱
  1. Phone A on result; Phone B completes
  - **Expected:** Phone A's pending replaced by partner card + compatibility card.

- [ ] **Retake quiz resets state but keeps Firestore result until resaved**
  1. After result → Retake → close → reopen
  - **Expected:** Quiz reopens at 1/15; previously-completed results restore.

- [ ] **Both completed: each phone sees the other partner as 'partner'** 📱
  1. Both completed; open on each phone
  - **Expected:** Each user is hero on their own phone.

- [ ] **Quit mid-quiz does not save partial results** ⚠️
  1. 7 of 15 → Back → reopen
  - **Expected:** Restarts at 1/15; no partial type for partner.

- [ ] **Same-type pairing renders compatibility entry if defined** 📱 ⚠️
  1. Both same type
  - **Expected:** Compatibility card if BLUEPRINT_COMPATIBILITY[type][type] exists.

### Sensate Focus (app/sensate.tsx)

- [ ] **Stage list renders all three stages with intro copy** 💰
  1. Open Sensate Focus
  - **Expected:** Header + intro + 3 stage cards.

- [ ] **Stage 1 timer counts down from 15:00**
  1. Stage 1 → Start Timer → 5s → Pause → Resume
  - **Expected:** Timer ticks; Pause stops; Resume continues.

- [ ] **Prompt card cycles on tap and auto-rotates**
  1. Open Stage 1; tap prompt 4x; start timer
  - **Expected:** Each tap fades next; auto-rotates every 90s.

- [ ] **Mark complete increments shared counter; both phones see badge** 📱
  1. Phone A: complete Stage 1 → Mark session complete; go back
  - **Expected:** Stage 1 shows '✓ 1×' on both phones.

- [ ] **Stage 3 (Flow) has no timer but can be marked complete**
  1. Tap Stage 3
  - **Expected:** No timer; Mark complete available immediately.

- [ ] **Pause works correctly when leaving and returning** ⚠️
  1. Pause Stage 1 → Back → re-tap
  - **Expected:** Restarts at 15:00 (elapsed not preserved).

- [ ] **Premium gate (paid feature)** 💰
  1. Free user → Sensate Focus
  - **Expected:** Routes to /upgrade.

- [ ] **Counter badge persists across sign out and back in** ⚠️
  1. Complete Stage 2; sign out/in
  - **Expected:** Still shows '✓ 1×'.

- [ ] **Timer reaches zero, shows Done, no further decrement**
  1. Let timer expire
  - **Expected:** Ring '✓ Done'; success haptic; Mark complete appears.

### Intimacy Log: log a new entry (app/intimacy-tracker.tsx)

- [ ] **Golden path: log a minimum-required entry**
  1. Log tab → 'We were intimate' → required 4 fields → Save
  - **Expected:** Sheet closes; green '✓ Logged today'; Recent list shows entry.

- [ ] **Save button stays disabled until all 4 required fields are filled**
  1. Only rating → Save
  - **Expected:** Save 0.4 opacity; hint lists missing fields.

- [ ] **Optional fields persist in Firestore and detail sheet**
  1. Set 4 stars + initiator + Hotel + Intercourse+Oral + 25min + positions + 😊 Playful + orgasms + note
  2. Save → tap entry
  - **Expected:** Detail sheet shows all values.

- [ ] **Star rating tap-to-toggle clears when same star tapped**
  1. Tap 4th star then 4th again
  - **Expected:** Clears to 0; label disappears.

- [ ] **Duration input strips non-numeric characters**
  1. Type 'abc12.5x' then '1234'
  - **Expected:** '125' then capped to '123'.

- [ ] **Note is capped at 200 characters with live counter**
  1. Paste 500 chars
  - **Expected:** 200 max; counter '200/200'.

- [ ] **Orgasm count buttons clamp to 1–9 range**
  1. Me Yes → - many times → + 12 times
  - **Expected:** Clamps at 1 and 9.

- [ ] **Save shows error alert on network failure** ⚠️
  1. Fill required + airplane mode → Save
  - **Expected:** 'Saving…' then Alert 'Could not save'.

- [ ] **Partner receives push notification on log** 📱
  1. Phone A: Save; Phone B backgrounded
  - **Expected:** Phone B receives 'Intimacy Log 💝'.

- [ ] **Close (X) discards the in-progress entry**
  1. Fill several fields → X → reopen
  - **Expected:** All fields reset.

### Intimacy Log: recent list, detail, delete

- [ ] **Empty state: no Recent section before first entry**
  1. Fresh user no entries
  - **Expected:** Hero only; privacy footer; no Recent.

- [ ] **Recent list shows max 5 entries, newest first**
  1. Log 7 entries different days
  - **Expected:** Exactly 5 rows.

- [ ] **Tap row opens detail sheet with all logged fields**
  1. Tap entry with full data
  - **Expected:** Modal shows all rows.

- [ ] **Long-press triggers delete confirmation** 📱
  1. Long-press row → Cancel; long-press → Delete
  - **Expected:** Cancel keeps; Delete removes both phones.

- [ ] **Delete from detail sheet works**
  1. Tap entry → Delete entry → confirm
  - **Expected:** Removed from list.

- [ ] **'Logged today' pill toggles based on today's date entries**
  1. Log today → delete it
  - **Expected:** Pill appears then disappears.

- [ ] **Both phones see entries logged from either device** 📱 ⚠️
  1. Phone A logs; Phone B opens within 10s
  - **Expected:** Phone B sees entry; verify initiatedBy perspective display.

### Intimacy Log: Stats tab

- [ ] **Stats empty state below 3 entries**
  1. 0-2 entries → Stats
  - **Expected:** 🔥 'Start logging to see your stats'.

- [ ] **Stats fully render with 3+ entries**
  1. Log 3+ varied entries → Stats
  - **Expected:** Hero count + cards + bar chart + orgasm rates etc.

- [ ] **'Days since last' formats correctly**
  1. Most recent today/yesterday/older
  - **Expected:** 'Today!' / 'Yesterday' / 'N days'.

- [ ] **Avg rating card hides when fewer than 3 rated entries**
  1. 5+ total, only 2 with rating → Stats
  - **Expected:** Avg rating card hidden; appears at 3rd rated.

- [ ] **Initiator bar segments reflect logged values**
  1. 1 each of 'I did' / 'They did' / 'Both'
  - **Expected:** ~33/34/33 split.

- [ ] **Initiator counts swap correctly per perspective on each phone** 📱
  1. Phone A logs 'I did'; both open Stats
  - **Expected:** A: You +1; B: Them +1.

- [ ] **Orgasm rate uses only entries logged by the current user** 📱 ⚠️
  1. Setup as described in inventory
  - **Expected:** Per-uid filter applied.

- [ ] **6-month bar chart includes current month at right**
  1. Mixed-month entries
  - **Expected:** 6 columns, current rightmost.

- [ ] **Privacy footer renders on both Log and Stats tabs**
  1. Open both tabs
  - **Expected:** Footer with lock icon on each.

---

## 8. Love Language + Hita Pulse + Sunday Check-in + Mood History
Insights & rituals: love language quiz, 10-question pulse, weekly Sunday check-in, mood timeline.

### Love Language Quiz (app/quiz.tsx)

- [ ] **Golden path: complete all 10 questions and see primary result**
  1. Open Love Language Quiz → tap A or B on each of 10
  - **Expected:** Result screen: 'Your Love Language' + emoji + category + 5-bar score list.

- [ ] **Progress bar updates each question**
  1. Note '1 of 10' → tap → advance to 5
  - **Expected:** Counter increments; bar grows ~40% on Q5.

- [ ] **Retake quiz resets state**
  1. Complete → Retake quiz
  - **Expected:** Returns to Q1; new pattern → new primary.

- [ ] **Help modal appears first time**
  1. Fresh user opens Love Language Quiz
  - **Expected:** Help modal 'Love Language Quiz' + 4 tips.

- [ ] **Result persists to user profile for partner insights** 📱
  1. Phone A complete → quit → reopen Phone B
  - **Expected:** loveLanguage field written; Phone B shows updated insight.

- [ ] **Back navigation mid-quiz discards progress** ⚠️
  1. Answer 4 → Back → reopen
  - **Expected:** Restarts at 1 of 10.

### Relationship Pulse (Hita) (app/hita.tsx)

- [ ] **Golden path: rate all 10 areas and see pulse score**
  1. Rate all 10 → See my pulse
  - **Expected:** Gauge avg + contextual msg + lowest-area suggestion + 10 bars.

- [ ] **Submit button blocked until every question rated**
  1. Rate 9
  - **Expected:** Reduced opacity; non-tappable; enables when 10th rated.

- [ ] **Score label and color update on each card**
  1. Tap 1 then 5
  - **Expected:** 'Needs work' red → 'Amazing' burgundy.

- [ ] **Suggestion targets the lowest-rated area**
  1. All 5 except Intimacy=1
  - **Expected:** 'Check your Wishlist together…'.

- [ ] **Retake clears prior ratings**
  1. Results tab → Retake
  - **Expected:** All unselected; submit disabled.

- [ ] **Last check-in line appears after history exists** ⚠️
  1. Submit one; wait day; reopen
  - **Expected:** 'Last check-in: 1 days ago' (or actual count).

- [ ] **Pulse is private — partner sees nothing of my scores** 📱
  1. Phone A submit low; Phone B open
  - **Expected:** Phone B sees only own state; no A scores.

- [ ] **Submit while offline shows local result without crashing** ⚠️
  1. Airplane mode → rate all → See my pulse
  - **Expected:** Result renders; writes when reconnected.

### Pulse History tab + trend

- [ ] **History tab shows current submission**
  1. Submit → History tab
  - **Expected:** 1 row dated today + bar; hint 'Take quiz regularly'.

- [ ] **Trend chart requires 2+ entries**
  1. Fresh user submit 1 → History
  - **Expected:** No chart yet.

- [ ] **Trend label shows 'improving' when score climbed by 0.5**
  1. Submit avg 2 → 3 → 4
  - **Expected:** 'Your score has been improving recently' with up-arrow.

- [ ] **Trend label shows 'declining' when score dropped**
  1. Submit 4.5 → 3.5 → 2.5
  - **Expected:** 'Your score has declined a little recently' down-arrow.

- [ ] **History is private per user** 📱
  1. Phone A submits 3; Phone B submits 1; B opens History
  - **Expected:** Phone B sees only own 1.

### Sunday Check-in answering (app/state-union.tsx)

- [ ] **Golden path: answer all 5 questions and finish**
  1. Type → Save and next x4 → Finish check-in
  - **Expected:** Waiting view + heart + 'Partner has answered 0 of 5'.

- [ ] **Save and next disabled when answer is empty**
  1. Empty field → tap Save and next
  - **Expected:** Reduced opacity.

- [ ] **Back button revisits and reloads saved answers**
  1. Answer Q1-3 → Back x2 to Q2
  - **Expected:** Q2 text reappears; Q1 Back disabled.

- [ ] **Progress dots reflect saved answers**
  1. Save Q1 Q2 → Back to Q1 → observe dots
  - **Expected:** Dots 1 and 2 rose; current active enlarged.

- [ ] **Loading spinner on initial open** ⚠️
  1. Force-quit → reopen Sunday Check-in
  - **Expected:** ActivityIndicator briefly.

- [ ] **Multiline input keeps focus and scrolls**
  1. Type 5 lines
  - **Expected:** Multi-line; min height 110.

### Sunday Check-in — sync, reveal, rules

- [ ] **Phase 2 progress count updates live from partner** 📱
  1. Phone A finishes; Phone B answers 3 of 5
  - **Expected:** Phone A waiting updates to 'Partner has answered 3 of 5'.

- [ ] **Phase 3 reveal appears for both after both finish** 📱
  1. Both finish
  - **Expected:** Burgundy 'You both checked in' reveal card.

- [ ] **Partner finishes first — Phone B receives push** 📱
  1. Phone A finishes; Phone B backgrounded
  - **Expected:** Push '<A name> finished the Sunday check-in 💗'.

- [ ] **Partner cannot read my draft answers before both complete** 📱
  1. Phone A drafts 1-3 incomplete; Phone B finishes
  - **Expected:** Phone B sees 'Partner has answered 3 of 5'; no text.

- [ ] **Past check-ins history only shown when 2+ weeks exist** ⚠️
  1. First week complete
  - **Expected:** 'Past check-ins' hidden; appears at 2nd week.

- [ ] **Expand past week loads both partners' answers** 📱
  1. Tap chevron on past week
  - **Expected:** '...' then both answers all 5 Qs.

- [ ] **Expand past incomplete week does not crash** ⚠️
  1. Past week only one finished
  - **Expected:** 'Incomplete' label; no answers; no error.

- [ ] **Background app between save-and-next does not lose answer** ⚠️
  1. Answer Q1 Save and next; type half of Q2; background 30s
  - **Expected:** Q1 reloads; in-flight draft lost.

- [ ] **Week rolls over on Monday — new doc created** ⚠️
  1. Complete Sunday → Monday morning reopen
  - **Expected:** New week label; phase 1 at Q1.

### Mood History — Mine tab (app/mood-history.tsx)

- [ ] **Golden path: set today's mood from history screen**
  1. Mine tab default → tap 😊
  - **Expected:** Tile blush + rose border; label flips to 'Change today's mood'.

- [ ] **Empty state: no moods logged yet**
  1. Fresh user no entries
  - **Expected:** Calendar 30 empty squares; streak 0 + 'Log today!'; no Most common.

- [ ] **Streak counts consecutive days backwards from today** ⚠️
  1. Setup as in inventory
  - **Expected:** Streak '3'; 4-days-ago entry not counted.

- [ ] **Most common emoji reflects history**
  1. 5 days 😊 + 2 days 😴
  - **Expected:** Most common 😊 Happy.

- [ ] **Adult moods locked behind paywall** 💰
  1. Non-premium user → grid
  - **Expected:** 😈/🥵 not rendered.

- [ ] **Adult moods visible for premium user** 💰
  1. Premium user → grid
  - **Expected:** All 10 moods.

- [ ] **Setting mood sends partner push and unlocks notes** 📱
  1. Phone B backgrounded; Phone A → 🥰
  - **Expected:** Push 'New mood 💫'; mood-gated notes unlock.

- [ ] **Optimistic update on slow network** ⚠️
  1. Throttle → tap emoji
  - **Expected:** UI immediately reflects; resyncs.

### Mood History — Together tab

- [ ] **Same / Different stats reflect last 14 days** 📱
  1. A 5x 🥰 + 3x 😊; B 5x 🥰 + 3x 😴 same days
  - **Expected:** 5 same / 3 different; 8 day-rows.

- [ ] **Empty Together state when partner has not logged** 📱
  1. Phone A log; Phone B no entries
  - **Expected:** 0/0; A's days with · for partner.

- [ ] **Day row hidden when neither partner logged**
  1. Both 3 days out of 14
  - **Expected:** Only 3 rows.

- [ ] **Real-time sync of partner's mood appears in Together view** 📱
  1. Phone A on Together; Phone B set today
  - **Expected:** Today row updates within seconds.

- [ ] **Tab switch preserves data without refetching**
  1. Mine → Together → Mine
  - **Expected:** Instant; no spinner.

- [ ] **Sign out mid-session does not leak partner data** ⚠️
  1. Sign out from Together view; sign in different account
  - **Expected:** No prior data remains.

---

## 9. 30-Day Challenge + Flirt Reminders
Daily-task programs and scheduled local notification reminders.

### Program picker (app/challenge.tsx)

- [ ] **Reconnect program shows 4 cards and intro copy**
  1. Non-LDR couple no active → open Challenge
  - **Expected:** 4 cards Reconnect/Spark/Fire/Desire.

- [ ] **LDR couple sees Distance as 5th program** 🌍
  1. Enable LDR → open Challenge
  - **Expected:** 5 cards; Distance shows ✈️.

- [ ] **Tap Reconnect → setup phase appears with 30 days**
  1. Tap Reconnect
  - **Expected:** 'Starting…' → Review Days header + 30 cards.

- [ ] **Desire program shows 18+ warning modal before starting**
  1. Tap Desire
  - **Expected:** Modal 💋 'Desire, 18+ only' + 5-bullet rules + 2 buttons.

- [ ] **Desire 'Not now' returns to picker**
  1. Tap 'Not now'
  - **Expected:** Modal dismisses; no challenge created.

- [ ] **Desire confirm enters setup phase**
  1. Tap "I'm in, let's go 💋"
  - **Expected:** Review Days for Desire.

- [ ] **Partner sees same program in setup within seconds** 📱
  1. Phone A tap Spark; Phone B open
  - **Expected:** Phone B lands directly on Review Days for Spark.

- [ ] **Account-not-ready guard shows warning** ⚠️
  1. Open before couple ready, tap any non-Desire
  - **Expected:** '⏳ Setting up account…' or 'Account not ready'.

- [ ] **Permission-denied surfaces inline error** ⚠️
  1. Revoke Firestore rule briefly → tap Reconnect
  - **Expected:** Red error 'Permission denied'.

### Setup phase — edit days

- [ ] **Edit a day saves and shows edited styling**
  1. ✏️ Day 5 → replace text → Save edit
  - **Expected:** Day 5 highlighted; counter '1 edit remaining'.

- [ ] **Edit modal Cancel discards changes**
  1. ✏️ Day 7 → type → Cancel
  - **Expected:** Original task; counter unchanged.

- [ ] **Empty edit is rejected** ⚠️
  1. ✏️ Day 10 → clear text → Save
  - **Expected:** Nothing happens.

- [ ] **Edits exhausted hides pencil icon**
  1. Edit Day 1 + Day 2
  - **Expected:** '✓ No edits remaining'; ✏️ disappears.

- [ ] **Partner sees edits in real-time** 📱
  1. Phone A edit Day 3; Phone B observes
  - **Expected:** Phone B Day 3 updates within 5s.

- [ ] **Each partner has independent 2-edit budget** 📱
  1. A edits 5,6; B edits 7,8
  - **Expected:** Both '✓ No edits remaining'; all 4 days edited.

- [ ] **Choose different program resets state**
  1. Review Days → 'Choose a different program'
  - **Expected:** Picker; edits gone.

- [ ] **Back arrow during setup resets challenge** ⚠️
  1. Tap ‹ Back
  - **Expected:** resetChallenge runs; picker shows.

### Activate + Mark complete

- [ ] **Activate transitions both phones to active phase** 📱
  1. Phone A: Start Challenge →
  - **Expected:** Both phones swap to active layout within 5s.

- [ ] **Active screen shows progress bar and today card**
  1. Activate
  - **Expected:** 'Day 1 of 30' + 0% bar + task + Mark/Veto buttons.

- [ ] **Marking shows waiting state until partner confirms**
  1. Phone A: Mark as done ✓
  - **Expected:** Success haptic; waiting line 'You've marked this done…'.

- [ ] **Partner gets push notification when first marks** 📱
  1. Phone A marks; Phone B locked
  - **Expected:** Push '<A> marked day 1 done, your turn'.

- [ ] **Both marked advances to Day 2** 📱
  1. Both mark
  - **Expected:** Day 2 task; '3% complete' (1/30); Completed grid Day 1.

- [ ] **Simultaneous mark from both phones is idempotent** 📱 ⚠️
  1. Both tap mark at same moment
  - **Expected:** Day advances exactly once; no [1,1].

- [ ] **Tap Mark twice doesn't double-count** ⚠️
  1. Mark then try again
  - **Expected:** Button gone; no duplicate writes.

- [ ] **Completed grid shows finished days with text**
  1. Complete 1-3
  - **Expected:** 3 cards with day task text.

### Veto

- [ ] **Veto button shows remaining count**
  1. Look at action row
  - **Expected:** '🎲 Veto (2)'.

- [ ] **Veto advances day and writes Free Day text**
  1. Tap Veto
  - **Expected:** Heavy haptic; Day +1; completed grid shows '🎲 Free day' with 🎲 icon; counter (1).

- [ ] **Veto on one phone reflects on partner** 📱
  1. Phone A vetoes; Phone B watches
  - **Expected:** Phone B advances within 5s; A's budget changes only.

- [ ] **Veto budget exhausted hides Veto button**
  1. Use both vetoes, mark Day 3
  - **Expected:** Day 4 only Mark button.

- [ ] **Veto day does not show veto button on a veto day** ⚠️
  1. Veto Day 1, observe Day 2 (regular)
  - **Expected:** Mark + Veto both present.

- [ ] **Vetoes are per-partner, independent** 📱
  1. A vetoes Day 1; B vetoes Day 2
  - **Expected:** Both budgets (1); both in Completed.

### Reset

- [ ] **Reset from active phase returns both phones to picker** 📱
  1. Phone A: Reset
  - **Expected:** Both phones return to picker; state wiped.

- [ ] **Reset on Day 30 endgame still allowed** ⚠️
  1. Tap Reset mid-challenge
  - **Expected:** Returns to picker.

### Free vs paid

- [ ] **Free user picks Reconnect with no upgrade prompt**
  1. Free user → Reconnect
  - **Expected:** Setup phase normally.

- [ ] **Free user tapping Fire/Desire is routed to /upgrade** 💰 ⚠️
  1. Free → Fire then Desire
  - **Expected:** Per spec routes to /upgrade.

- [ ] **Premium user can start any program** 💰
  1. Premium → Fire, Reset, Desire confirm
  - **Expected:** All start normally.

### Help modal

- [ ] **First visit shows help modal once**
  1. Reset help → activate any program
  - **Expected:** HelpModal '30-Day Challenge' + 4 tips; not on reopen.

- [ ] **Dismiss all suppresses on future features** ⚠️
  1. Tap "Don't show these again"
  - **Expected:** Global suppression.

### Flirt Reminders — list/empty (app/reminders.tsx)

- [ ] **Empty state shows CTA + suggestions**
  1. Fresh user → Flirt Reminders
  - **Expected:** 🔔 empty + CTA + Suggestions list (10).

- [ ] **Reminders list ordered with active/inactive toggle**
  1. Create 2 reminders different times
  - **Expected:** Both visible; correct meta and switch state.

### Flirt Reminders — create new

- [ ] **Modal opens with defaults**
  1. Tap + New
  - **Expected:** 'New Reminder'; placeholder; '09:00'; Mon-Fri active.

- [ ] **Save with all defaults creates active reminder**
  1. Type 'Kiss me goodnight' → Save 🔔
  - **Expected:** New card '09:00 · Mon-Fri'; switch ON.

- [ ] **Invalid time format blocks save and shows error**
  1. Type 'test'; time '25:99' → Save
  - **Expected:** Red error 'Enter a valid time'.

- [ ] **Time error clears as user retypes**
  1. Edit to '08:30' → Save
  - **Expected:** Error disappears; save succeeds.

- [ ] **Empty message is rejected silently** ⚠️
  1. + New → blank → Save
  - **Expected:** Nothing happens.

- [ ] **Day toggles work bidirectionally**
  1. Tap Mon to deselect; Sat to select
  - **Expected:** Selection updates.

- [ ] **All-days-off reminder still saves** ⚠️
  1. + New → type → deselect all 7 → Save
  - **Expected:** Reminder created; no scheduled notifications.

- [ ] **Cancel discards new reminder** ⚠️
  1. + New → type → Cancel; reopen
  - **Expected:** List unchanged; verify whether previous message persists.

### Flirt Reminders — suggestions

- [ ] **Tap suggestion opens modal pre-filled**
  1. Scroll → tap 'Send a flirty text 💬'
  - **Expected:** Message pre-filled; defaults 09:00 Mon-Fri.

- [ ] **Save from suggestion adds reminder**
  1. Tap 'Give a long hug…' → Save 🔔
  - **Expected:** New card.

### Flirt Reminders — toggle + delete

- [ ] **Switch off cancels and persists**
  1. Flip switch off
  - **Expected:** Cancels locals; persists.

- [ ] **Switch on schedules notifications** ⚠️
  1. Set 1-2 min ahead, switch on, lock phone
  - **Expected:** At trigger, local notification fires (real device).

- [ ] **Delete removes card and cancels notifications**
  1. Tap ✕
  - **Expected:** Card gone; notifications cancelled.

- [ ] **Partner sees create / delete in real-time** 📱
  1. Phone A creates 'Phone A reminder'
  - **Expected:** Phone B list adds within 5s.

- [ ] **Toggle on Phone A reflects on Phone B but doesn't reschedule on B** 📱 ⚠️
  1. Phone A switch off
  - **Expected:** Phone B switch flips within 5s; local queue not updated on B.

- [ ] **Notification permissions denied still saves but no alerts fire** ⚠️
  1. iOS Settings Off → create reminder
  - **Expected:** Saves; no notification fires.

### Flirt Reminders — help modal

- [ ] **Help modal shows once on first visit**
  1. Reset help → open Flirt Reminders
  - **Expected:** Modal + 4 tips; not on reopen.

### Sign-out / connectivity

- [ ] **Sign out mid setup leaves no challenge half-created** ⚠️
  1. Edit Day 5 setup → sign out → sign in
  - **Expected:** Setup phase preserved; edit counter 1 remaining.

- [ ] **Network drop during Mark queues then commits** ⚠️
  1. Airplane mode → Mark → reconnect
  - **Expected:** UI optimistic waiting; commits when online.

- [ ] **Background then return preserves state** ⚠️
  1. Day 4 active → background 1 min → return
  - **Expected:** Day 4 still; no flicker.

- [ ] **Reminders survive app kill**
  1. Create 2 reminders → force-quit → reopen
  - **Expected:** Both still present; OS still has notifications queued.

---

## 10. LDR mode (cross-feature)
Long-distance toggle and the suite of features it unlocks.

### Long Distance toggle (app/profile.tsx)

- [ ] **Toggle Long distance ON shows the Next visit picker** 🌍
  1. Paired user → Profile → Features → toggle Long distance ON
  - **Expected:** Switch burgundy ON; 'Next visit' row with BrandDatePicker appears.

- [ ] **Long distance row is hidden until couple is paired** ⚠️
  1. Fresh account skip pairing → Profile Features
  - **Expected:** No Long distance row.

- [ ] **LDR setting syncs to partner phone** 🌍 📱
  1. Phone A toggle ON; Phone B Profile Features
  - **Expected:** Phone B switch ON within 10s.

- [ ] **Setting Next visit date saves and shows on Home** 🌍
  1. Pick 5 days → confirm → Home
  - **Expected:** '✈️ <Day Mon>' pill + 'in 5 days · next visit'.

- [ ] **Clearing Next visit removes the pill** 🌍 ⚠️
  1. Clear date in picker
  - **Expected:** Pill disappears.

- [ ] **Toggling LDR OFF hides next-visit pill even with date in Firestore** ⚠️
  1. LDR on with date → toggle OFF → Home
  - **Expected:** No '✈️' pill; no partner clock.

- [ ] **Minimum date prevents picking past dates** ⚠️
  1. Open Next visit picker, try yesterday
  - **Expected:** Past dates disabled.

### Partner timezone clock (Home)

- [ ] **Partner clock appears under both avatars when LDR is on** 🌍 📱
  1. Phone A LDR ON; both Home
  - **Expected:** HH:MM under each avatar (en-GB 24h).

- [ ] **Clock hidden when LDR is off** ⚠️
  1. LDR OFF → Home
  - **Expected:** No HH:MM.

- [ ] **Different timezones show different times** 🌍 📱
  1. Set Phone A timezone different from B; LDR ON; both Home
  - **Expected:** Different HH:MM values.

- [ ] **Invalid/missing timezone field renders no clock** ⚠️
  1. Clear timezone for one partner; other opens Home
  - **Expected:** Clock omitted; no crash.

### Next-visit countdown pill (Home)

- [ ] **Visit > 60 days out shows only next-visit pill** 🌍
  1. Visit 90 days; anniversary also >60
  - **Expected:** Only '✈️' pill.

- [ ] **Both events within 60 days shows both pills stacked** 🌍
  1. Visit 20 days; anniversary <60
  - **Expected:** Both 🎉 and ✈️ stacked with 4px gap.

- [ ] **Visit day = today shows special label** 🌍 ⚠️
  1. Set Next visit today
  - **Expected:** '✈️ Today!' subtitle 'next visit'.

- [ ] **Visit date in past hides the pill** 🌍 ⚠️
  1. Visit 2 days ago (Firestore write)
  - **Expected:** No pill.

### Date Roulette LDR virtual filter (app/roulette.tsx)

- [ ] **LDR on: spin returns only virtual dates** 🌍
  1. LDR ON → Roulette → spin 5x
  - **Expected:** All 5 virtual:true.

- [ ] **Opt-in toggle 'Show in-person dates too' restores full pool** 🌍
  1. Tap '✈️ Show in-person dates too' → spin
  - **Expected:** Pool includes in-person.

- [ ] **LDR off: virtual filter not applied and toggle is hidden**
  1. LDR OFF → Roulette
  - **Expected:** No '✈️' toggle; all 130 ideas in pool.

- [ ] **Combined virtual + adventure filter narrows pool** 🌍 ⚠️
  1. LDR ON → Adventure → Spin 3x
  - **Expected:** Results are virtual AND adventure.

- [ ] **Empty pool: virtual + 4★+ + adventure with no ratings** 🌍 ⚠️
  1. LDR ON → Adventure → 4★+ → Spin
  - **Expected:** No result card.

### Notes LDR occasions (app/notes.tsx)

- [ ] **LDR-only occasions appear in composer** 🌍
  1. LDR ON → Notes → Write
  - **Expected:** Base + 3 LDR chips ✈️/🤗/🌙.

- [ ] **LDR occasions are hidden when LDR is off**
  1. LDR OFF → Notes → Write
  - **Expected:** Only 4 base occasions.

- [ ] **'When I arrive' note auto-unlocks on next visit date** 🌍 📱
  1. LDR on; Next visit today; Phone A writes 'I missed you' (When I arrive) → Phone B kill+relaunch + Home
  - **Expected:** Phone B push '💌'; 'Love note waiting' nudge; openable.

- [ ] **'When you miss me' note appears in recipient Open When stash** 🌍 📱
  1. Phone A writes 'thinking of you' (When you miss me)
  - **Expected:** Phone B Open when ✨ section.

- [ ] **Sender sees stash status correctly on their own card** 🌍 📱
  1. Phone A after sending stash note
  - **Expected:** Status 'In partner's Open When... stash'.

- [ ] **Visit note status before date arrives** 🌍 📱
  1. Next visit 7 days; write When I arrive
  - **Expected:** 'Unlocks on your next visit'.

- [ ] **Editing a stash note's condition saves correctly** 🌍 ⚠️ 📱
  1. Tap 'When you miss me' → change to 'When you can't sleep'
  - **Expected:** 🌙 icon; Phone B's Open when reflects update within 30s.

### Questions Game LDR-tagged questions (app/questions-game.tsx)

- [ ] **LDR off: LDR-tagged questions never appear**
  1. LDR OFF → cycle 4 categories
  - **Expected:** No LDR phrasing visible.

- [ ] **LDR on: LDR-tagged questions are mixed in daily picks** 🌍
  1. LDR ON → cycle Deep/Romantic multiple days
  - **Expected:** At least one LDR-flavored question.

- [ ] **Both partners see same LDR-mixed daily questions** 🌍 📱
  1. Phone A Deep daily picks; Phone B same
  - **Expected:** Identical 3 in same order.

- [ ] **Toggling LDR mid-day swaps pool** ⚠️ 🌍
  1. Note today's; toggle LDR ON; reopen
  - **Expected:** Refreshes via subscribeDailyQuestions; no crash.

- [ ] **LDR-tagged scale question only shows in LDR** ⚠️ 🌍
  1. LDR ON → seed date to expose 'How connected do you feel apart'
  - **Expected:** Scale renders; toggling OFF hides.

### 30-Day Challenge Distance program (app/challenge.tsx)

- [ ] **Distance program card visible only with LDR on** 🌍
  1. LDR ON → Challenge picker
  - **Expected:** 5 programs including Distance.

- [ ] **Distance program hidden when LDR off**
  1. LDR OFF → Challenge
  - **Expected:** 4 cards only.

- [ ] **Starting Distance program creates active challenge synced to partner** 🌍 📱
  1. Phone A LDR ON → Distance → confirm; Phone B opens within 30s
  - **Expected:** Both phones active at day 1.

- [ ] **Day 8 task: virtual dinner over video** 🌍
  1. Distance active → advance to day 8
  - **Expected:** 'Plan a 30-minute virtual dinner date this week…'.

- [ ] **Distance is not in the paid-tier list (free for LDR)** 🌍 💰
  1. LDR ON free-tier → Distance
  - **Expected:** Starts directly; not /upgrade.

### Care package nudge

- [ ] **Nudge visible on day 1-3 of month with LDR on** 🌍
  1. LDR ON; partner name set; date 1-3rd → Home
  - **Expected:** 🎁 'Care package time?' → /notes.

- [ ] **Nudge hidden on day 4+** ⚠️
  1. LDR ON; date 5th
  - **Expected:** No nudge.

- [ ] **Nudge hidden when LDR off even on day 1-3**
  1. LDR OFF; date 1st
  - **Expected:** No nudge.

- [ ] **Nudge hidden when partner name missing** ⚠️ 🌍
  1. LDR ON; day 1-3; clear partner name
  - **Expected:** Nudge suppressed.

### Pre-visit excitement nudges (1-7 days)

- [ ] **Day-1 'Tomorrow' nudge appears with correct route** 🌍
  1. Next visit tomorrow → Home
  - **Expected:** 💞 'Tomorrow' → /notes.

- [ ] **Day-4 nudge sends partner to Flashes/Tease** 🌍
  1. Next visit 4 days
  - **Expected:** 📸 'Send a teaser' → /flashes.

- [ ] **Day-7 (One week) wording** 🌍
  1. Next visit 7 days
  - **Expected:** ✈️ 'One week'.

- [ ] **Day-8+ hides pre-visit nudge** ⚠️ 🌍
  1. Next visit 10 days
  - **Expected:** No 1-7 day nudge (pill still on hero).

- [ ] **Pre-visit nudges hidden when LDR is OFF even if nextVisitDate is in Firestore** ⚠️
  1. LDR OFF with date still saved
  - **Expected:** No pre-visit nudge.

### Post-visit recovery nudges (1-3 days after)

- [ ] **Day 1 post-visit shows memory drop nudge** 🌍 ⚠️
  1. Next visit yesterday
  - **Expected:** ✨ 'Visit memory drop' → /moments.

- [ ] **Day 2 post-visit routes to countdown** 🌍 ⚠️
  1. Next visit 2 days past
  - **Expected:** 📅 'Day 2 apart' → /countdown.

- [ ] **Day 4+ post-visit hides nudge** ⚠️ 🌍
  1. Next visit 4 days past
  - **Expected:** No nudge.

- [ ] **Post-visit nudge gone when LDR off** ⚠️
  1. Date past in Firestore; LDR OFF
  - **Expected:** No nudge.

### Visit-note auto-unlock

- [ ] **Visit-day arrives: pending 'When I arrive' notes unlock automatically** 🌍 ⚠️ 📱
  1. Phone A LDR ON; write 'When I arrive'; advance to visit day
  2. Phone B kill+relaunch → Home
  - **Expected:** Phone B push + 💌 nudge; note openable.

- [ ] **unlockVisitNotes does not unlock sender's own notes** 🌍 ⚠️ 📱
  1. Phone A self-view after sending
  - **Expected:** Still 'Unlocks on your next visit' for sender.

### Mysterious countdown (Countdowns)

- [ ] **Mysterious countdown hides label on partner phone until day arrives** 📱
  1. Phone A: Countdowns + Add → 'Surprise trip to Paris' 5 days ✈️ → Mysterious ON → Save
  - **Expected:** Phone A real label; Phone B 🤫 'A surprise from your partner'.

- [ ] **Sender always sees their own mysterious countdown unmasked** ⚠️ 📱
  1. Phone A scrolls list
  - **Expected:** Real label visible.

- [ ] **On the day of the secret countdown, label reveals** ⚠️ 📱
  1. Date = tomorrow; advance to that day
  - **Expected:** Phone B sees real label with '🎉 Today!'.

- [ ] **Toggle works for non-LDR couples too**
  1. LDR OFF → Mysterious countdown
  - **Expected:** Works regardless.

- [ ] **Auto-dates cannot be made mysterious** ⚠️
  1. View auto anniversary/birthday card
  - **Expected:** Dashed border; never 🤫 state.

### Mood today across timezones

- [ ] **Mood set in evening on Phone A still readable as today on Phone B** 🌍 ⚠️ 📱
  1. Phone A Reykjavik 23:00 picks 😊; Phone B LA 15:00 opens Home
  - **Expected:** Phone B partner pill 😊.

- [ ] **Date-line transition does not duplicate today's mood** 🌍 ⚠️ 📱
  1. Auckland 00:30 picks 🥰; LA still previous day
  - **Expected:** Partner pill shows 🥰; history single entry.

---

## 11. Profile + Settings + Upgrade + Help + Legal
Profile screen controls, payment paywall, help system, legal viewers.

### Display name edit (app/profile.tsx)

- [ ] **Golden path: change display name**
  1. Profile → Display name → 'Alex' → Save
  - **Expected:** Modal closes; avatar header + Display name row show 'Alex'.

- [ ] **Empty name does not save** ⚠️
  1. Display name → blank → Save
  - **Expected:** Modal stays open.

- [ ] **Whitespace-only name does not save** ⚠️
  1. '   ' → Save
  - **Expected:** Modal stays open.

- [ ] **Cancel reverts**
  1. Type 'XYZ' → Cancel
  - **Expected:** Original name unchanged.

- [ ] **Name update reflects on partner phone** 📱
  1. Phone A change to 'Alex2026'
  - **Expected:** Phone B sees new name on Home within ~5s.

### Profile photo upload

- [ ] **Golden path: pick and upload photo**
  1. Profile → tap avatar → pick → 1:1 crop → confirm
  - **Expected:** Photo replaces fallback; Home avatar updates within ~5s.

- [ ] **Cancel image picker leaves avatar unchanged** ⚠️
  1. Tap avatar → Cancel
  - **Expected:** Avatar same; no spinner.

- [ ] **Photo permission denied path** ⚠️
  1. Revoke permission → tap avatar → deny prompt
  - **Expected:** Picker doesn't open; no crash.

- [ ] **Photo upload syncs to partner** 📱
  1. Phone A change avatar
  - **Expected:** Phone B partner card shows new photo within ~10s.

- [ ] **Fallback initial shown when no photo**
  1. Fresh user no photoURL → Profile
  - **Expected:** Blush circle with first letter.

### Change password

- [ ] **Golden path: change password successfully**
  1. Profile → Change password → current + new(6+) + confirm → Update
  - **Expected:** '✓ Password updated' then auto-close; new pw works on relogin.

- [ ] **Empty fields blocked**
  1. Leave fields blank → Update
  - **Expected:** Error 'Fill in all fields.'

- [ ] **Mismatched new passwords**
  1. New=abcdef, confirm=abcdeg → Update
  - **Expected:** Error 'New passwords do not match.'

- [ ] **Too-short password rejected**
  1. New=abc12 → Update
  - **Expected:** Error 'Password must be at least 6 characters.'

- [ ] **Wrong current password**
  1. Wrong current → Update
  - **Expected:** Error 'Current password is incorrect.'

- [ ] **Network failure during password update** ⚠️
  1. Airplane mode → Update
  - **Expected:** Error 'Something went wrong. Try again.'

### Birthday (yours)

- [ ] **Golden path: set birthday for the first time**
  1. Your birthday → 15 March 1990 → Save
  - **Expected:** Row hint '15.03.1990 — visible to partner'.

- [ ] **Empty state shows tap-to-add hint**
  1. Fresh user → Profile
  - **Expected:** 'Tap to add (DD.MM.YYYY)'.

- [ ] **Pre-fill on re-open**
  1. Tap row again
  - **Expected:** Picker pre-selected to saved date.

- [ ] **Cannot save with no date picked** ⚠️
  1. Open modal, don't pick
  - **Expected:** Save 0.4 opacity, disabled.

- [ ] **Cannot choose a future birthday**
  1. Try to scroll past today
  - **Expected:** maximumDate=today.

- [ ] **Birthday becomes visible to partner** 📱
  1. Phone A set; Phone B view
  - **Expected:** Phone B sees birthday surfaced.

### Pairing via invite code (from Profile)

- [ ] **Empty state: unpaired user sees invite code + connect row**
  1. Fresh user → Profile → Your couple
  - **Expected:** Invite code + 'Enter partner's code'.

- [ ] **Pair successfully from Profile** 📱
  1. Phone B types Phone A's code → Connect
  - **Expected:** Couple card now shows Partner, Days, Disconnect.

- [ ] **Wrong-length code blocked client-side**
  1. 'ABCD' → Connect
  - **Expected:** 'Enter an 8-character code.'

- [ ] **Unknown code rejected**
  1. 'ZZZZZZZZ' → Connect
  - **Expected:** 'Code not found or couple is already full.'

- [ ] **Code is auto-uppercased**
  1. Type lowercase
  - **Expected:** Visible uppercase.

- [ ] **Network error during pair** ⚠️
  1. Airplane mode → Connect
  - **Expected:** 'Something went wrong. Try again.'

- [ ] **Re-pair from already-paired state disconnects first** 📱 ⚠️
  1. Phone A enters third user's code
  - **Expected:** A unlinked from B and joined new; Phone B partner '-' within ~10s.

### Days together / start date

- [ ] **Days together default to days-since-couple-created**
  1. No startDate
  - **Expected:** '(N) days' computed from createdAt.

- [ ] **Set custom start date in the past**
  1. Tap Days together → 1 year ago → Save
  - **Expected:** '365 days'; hint 'Custom date set'.

- [ ] **Save disabled when no date picked** ⚠️
  1. Open without picking
  - **Expected:** Save 0.4 opacity.

- [ ] **Cannot choose future start date**
  1. Try past today
  - **Expected:** Disabled.

- [ ] **Start date syncs to partner** 📱
  1. Phone A sets 100 days ago
  - **Expected:** Phone B Days together also '100 days' within ~5s.

### Disconnect couple

- [ ] **Disconnect button hidden when unpaired**
  1. Unpaired user
  - **Expected:** No red Disconnect row.

- [ ] **Confirm disconnect from Profile** 📱
  1. Tap Disconnect couple → Disconnect (destructive)
  - **Expected:** Re-renders unpaired; Phone B partner '-' within ~10s.

- [ ] **Cancel disconnect leaves couple intact**
  1. Tap Disconnect → Cancel
  - **Expected:** No state change.

### Delete account

- [ ] **Golden path: delete account with correct password** 📱
  1. Delete account → password → Delete
  - **Expected:** /(auth)/login; relogin fails; Phone B partner empty within ~10s.

- [ ] **Empty password rejected**
  1. Blank password → Delete
  - **Expected:** 'Enter your password to confirm.'

- [ ] **Wrong password rejected**
  1. Wrong pw → Delete
  - **Expected:** 'Password is incorrect.'

- [ ] **Cancel keeps account intact**
  1. Open → Cancel
  - **Expected:** Still signed in.

- [ ] **Network error during delete** ⚠️
  1. Airplane mode → Delete
  - **Expected:** 'Something went wrong. Try again.'

### Push notifications toggle

- [ ] **Toggle on when OS permission granted**
  1. Switch off → on
  - **Expected:** Track rose on, border-grey off; profile.notificationsEnabled writes.

- [ ] **OS-denied state shows Off + hint** ⚠️
  1. Revoke iOS notification permission → reopen → Profile
  - **Expected:** 'Off' label + hint to Settings; no Switch.

- [ ] **Web shows 'Web only' label**
  1. npm run web → Profile
  - **Expected:** 'Web only' label.

- [ ] **Disabling notifications stops partner pushes** 📱
  1. Phone A toggle OFF; Phone B sends spark/mood
  - **Expected:** Phone A no push.

### Intimacy Log toggle

- [ ] **Default off for new users**
  1. Fresh user → Profile Features
  - **Expected:** Switch OFF.

- [ ] **Toggle on persists and unlocks feature**
  1. Toggle ON → kill → reopen
  - **Expected:** Still ON; feature visible.

- [ ] **Toggle is per-user not per-couple**
  1. Phone A toggle ON; Phone B Profile
  - **Expected:** Phone B independent.

### Explicit content toggle

- [ ] **Default on for new users**
  1. Fresh user → Profile
  - **Expected:** Switch ON.

- [ ] **Toggle off hides spicy content**
  1. Toggle OFF → Daily Picks / Questions / etc.
  - **Expected:** Spicy/Sexual tabs hidden/filtered.

- [ ] **Toggle on restores spicy content**
  1. Toggle ON → Daily Picks
  - **Expected:** Spicy/Sexual tabs reappear (paid gating still applies).

- [ ] **Toggle persists across sessions**
  1. Toggle OFF → sign out/in
  - **Expected:** Still OFF.

### Long-distance toggle + next visit

- [ ] **LDR row hidden when unpaired**
  1. Unpaired user → Features
  - **Expected:** No Long distance switch.

- [ ] **Toggle LDR on shows Next visit picker** 🌍
  1. Paired → toggle ON
  - **Expected:** Next visit row appears below.

- [ ] **Set next visit date** 🌍
  1. Pick 30 days from now
  - **Expected:** Home shows 'next visit in 30 days'.

- [ ] **Cannot pick a past next-visit date**
  1. Try past
  - **Expected:** Disabled (minimumDate=today).

- [ ] **LDR toggles sync between partners** 🌍 📱
  1. Phone A toggle ON
  - **Expected:** Phone B switch ON within ~5s.

- [ ] **Toggle LDR off hides Next visit** 🌍
  1. Toggle OFF
  - **Expected:** Next visit row + Home LDR widgets gone.

### Feature hints toggle + Reset hints

- [ ] **Default: hints enabled, Reset visible**
  1. Fresh user → Profile Help card
  - **Expected:** Hints ON; 'Reset all hints' shown.

- [ ] **Disable hints hides Reset row**
  1. Toggle OFF
  - **Expected:** Reset disappears; help popups stop.

- [ ] **Reset all hints re-shows popups**
  1. Visit features dismissing → Profile → Reset all hints
  - **Expected:** Alert 'Help reset'; popups appear again.

- [ ] **Hint enable state persists across sessions**
  1. Toggle OFF → sign out/in
  - **Expected:** Still OFF.

- [ ] **Per-user, not per-couple** 📱
  1. Phone A toggle OFF; Phone B Profile
  - **Expected:** Independent.

### Year in Review entry

- [ ] **Hidden when unpaired**
  1. Unpaired user → Profile
  - **Expected:** No '✨ Year in Review' tile.

- [ ] **Visible when paired and opens screen**
  1. Paired user → tap tile
  - **Expected:** YIR opens.

### Sign out

- [ ] **Confirm sign out**
  1. Tap Sign out → destructive Sign out
  - **Expected:** /(auth)/login.

- [ ] **Cancel sign out**
  1. Sign out → Cancel
  - **Expected:** Stays authenticated.

- [ ] **Sign out mid-session** 📱 ⚠️
  1. TorD session running → sign out on A; B observes
  - **Expected:** A → login; B sees state but no crash.

### Upgrade screen (paywall) (app/upgrade.tsx)

- [ ] **Paywall opens when locked feature tapped (non-premium)** 💰
  1. Non-premium → Activity Cards
  - **Expected:** /upgrade with '💝 Desire Premium'.

- [ ] **All 6 feature rows rendered** 💰
  1. Scroll feature list
  - **Expected:** Six rows with burgundy ✓.

- [ ] **Pricing 'Coming soon' message visible** 💰
  1. Scroll to pricing
  - **Expected:** 'Coming soon' card.

- [ ] **Got it dismisses paywall** 💰
  1. Tap 'Got it →'
  - **Expected:** router.back().

- [ ] **Close (✕) dismisses paywall**
  1. Tap ✕ top-right
  - **Expected:** router.back().

- [ ] **Premium user bypasses paywall entirely** 💰
  1. Set isPremium=true; reopen; Activity Cards
  - **Expected:** Feature opens directly.

- [ ] **One subscription covers both partners (note)** 💰
  1. Scroll under Got it
  - **Expected:** Italic 'One subscription covers both partners'.

### Help system (useHelp + HelpModal)

- [ ] **First-visit popup appears for each feature**
  1. Fresh user hints ON → Questions Game
  - **Expected:** Help modal shows.

- [ ] **Dismiss marks feature seen, popup does not return**
  1. Got it → leave + re-enter
  - **Expected:** No modal second time.

- [ ] **Dismiss-all disables all future hints**
  1. Tap 'Don't show hints again' → open different feature
  - **Expected:** No popups anywhere.

- [ ] **Per-uid: partner sees own hints** 📱
  1. Phone A dismiss-all; Phone B opens feature
  - **Expected:** Phone B still sees own popup.

- [ ] **Reset hints via Profile re-shows first-visit popups**
  1. Dismiss several → Profile Reset → re-enter
  - **Expected:** Modal appears again.

- [ ] **Cache coherence within session** ⚠️
  1. Toggle Feature hints OFF without restart → open new feature
  - **Expected:** No popup.

### Privacy Policy viewer

- [ ] **Open from Profile**
  1. Profile → 'Privacy Policy'
  - **Expected:** Privacy Policy screen pushes in.

- [ ] **All 11 sections present**
  1. Scroll top to bottom
  - **Expected:** Sections 1–11 in order.

- [ ] **Contact email shown**
  1. Scroll Section 11
  - **Expected:** Body includes 'olsenis@gmail.com'.

- [ ] **Back returns to Profile**
  1. Tap ‹ Back
  - **Expected:** Returns to Profile.

- [ ] **Footer copyright shown**
  1. Scroll to bottom
  - **Expected:** '© 2026 Desire App. All rights reserved.'

### Terms of Service viewer

- [ ] **Open from Profile**
  1. Profile → 'Terms of Service'
  - **Expected:** Terms screen pushes in.

- [ ] **All 12 sections present**
  1. Scroll top to bottom
  - **Expected:** Sections 1–12 in order.

- [ ] **Eligibility states 18+**
  1. Section 1
  - **Expected:** 'You must be at least 18 years old'.

- [ ] **Governing law is Iceland**
  1. Section 11
  - **Expected:** 'These terms are governed by the laws of Iceland.'

- [ ] **Back returns to Profile**
  1. Tap ‹ Back
  - **Expected:** Returns to Profile.

### Premium gating (useSubscription)

- [ ] **Non-premium user blocked from Spicy in Daily Picks** 💰
  1. Non-premium → Spicy
  - **Expected:** /upgrade.

- [ ] **Non-premium user blocked from Activity Cards** 💰
  1. Non-premium → Activity Cards
  - **Expected:** /upgrade.

- [ ] **Premium granted via Firestore unlocks everything** 💰
  1. isPremium=true → reopen → Activity Cards, Fantasy Wishes, Sensate, Blueprint
  - **Expected:** All open directly.

- [ ] **isPremium false explicitly is still locked** 💰 ⚠️
  1. isPremium=false → Activity Cards
  - **Expected:** /upgrade.

- [ ] **Both partners need own subscription** 💰 📱
  1. Phone A premium; Phone B not
  - **Expected:** B gets /upgrade despite shared couple.

---

## 12. Cross-cutting: push notifications, image upload, security, GDPR
System-level behaviors that span multiple features.

### Push notification delivery (notificationService.ts)

- [ ] **Foreground partner receives push for mood change** 📱
  1. Phone A pick Happy mood
  - **Expected:** Phone B receives push within 30s; plays sound.

- [ ] **Backgrounded partner still receives push** ⚠️ 📱
  1. Phone B backgrounds; Phone A sends Love Note
  - **Expected:** Phone B lock-screen push.

- [ ] **Partner with notifications toggle OFF receives nothing** 📱
  1. Phone B Profile toggle OFF; Phone A sends Love Note
  - **Expected:** No push on Phone B.

- [ ] **Partner with OS-level notifications denied shows guidance**
  1. iOS Settings → Off; reopen → Profile
  - **Expected:** 'Off' label + hint.

- [ ] **Web platform shows 'Web only' label and no toggle** ⚠️
  1. npm run web → Profile
  - **Expected:** 'Web only'.

- [ ] **Push failure does not break the action** ⚠️
  1. Briefly fail DNS to exp.host while sending note
  - **Expected:** Note saves; no error toast.

- [ ] **Stale push token after partner reinstall does not crash sender** ⚠️
  1. Phone B reinstall; Phone A sends note
  - **Expected:** No crash on Phone A.

- [ ] **Push only delivers on real devices (not Expo Go simulator)** ⚠️
  1. EAS build vs simulator
  - **Expected:** EAS receives; simulator does not.

### Profile photo upload + compression (profile.tsx)

- [ ] **Upload from library and partner sees new avatar** 📱
  1. Phone A pick + crop + upload
  - **Expected:** Phone B sees within ~10s.

- [ ] **Cancel image picker leaves existing avatar untouched**
  1. Tap avatar → Cancel
  - **Expected:** No change.

- [ ] **Large photo gets compressed before upload** ⚠️
  1. Pick 4032x3024 photo
  - **Expected:** Uploaded JPEG ≤1920px wide, ~1-2MB.

- [ ] **Upload error logged but UI recovers** ⚠️
  1. Airplane mode → tap avatar → pick
  - **Expected:** Hourglass clears; avatar reverts; no crash.

- [ ] **Avatar fallback shows initial when no photo set**
  1. Fresh account no photoURL → Profile
  - **Expected:** Cream/rose circle with first-letter initial.

### Image compression in shared media flows

- [ ] **Moment photo upload compresses before storing**
  1. 4K photo as today's Moment
  - **Expected:** Storage file ≤1920px, ~1-2MB.

- [ ] **Time Capsule photo upload compresses** 💰
  1. Seal capsule with large photo
  - **Expected:** Compressed JPEG.

- [ ] **Flash video does NOT get re-encoded** ⚠️
  1. Send video Flash
  - **Expected:** Uploaded .mp4 original encoding.

- [ ] **Truth or Dare audio uploads as m4a without compression** 📱
  1. Record Truth audio
  - **Expected:** .m4a playable; no manipulation errors.

- [ ] **Compression failure falls back to original** ⚠️
  1. Web with HEIC source
  - **Expected:** Upload completes with original URI.

### Firestore security rules - user profile reads

- [ ] **User can read own profile**
  1. Phone A signs in; reads users/{my-uid}
  - **Expected:** Profile loads.

- [ ] **Paired partner can read each other's profile**
  1. A and B paired; A opens Home
  - **Expected:** Partner profile renders.

- [ ] **Stranger cannot read someone else's profile** ⚠️
  1. User C not paired; debug getDoc A
  - **Expected:** Missing/insufficient permissions.

- [ ] **isPremium field cannot be written from client** ⚠️ 💰
  1. Free user runs updateDoc isPremium:true
  - **Expected:** Write rejected.

- [ ] **Cannot read partner's private subcollection** ⚠️
  1. Phone A reads users/{partnerUid}/private/blueprint
  - **Expected:** Denied.

### Firestore security rules - couple subcollections

- [ ] **Non-member cannot read couple data** ⚠️
  1. Non-member reads couples/{otherCoupleId}/moods
  - **Expected:** Denied.

- [ ] **Cannot spoof createdBy when creating a todo** ⚠️
  1. addDoc with createdBy=partnerUid
  - **Expected:** Rejected.

- [ ] **Cannot rewrite fromUid after creating a love note** ⚠️
  1. updateDoc fromUid to partner
  - **Expected:** Rejected.

- [ ] **Either partner can delete a shared item** 📱
  1. A creates wishlist item; B deletes
  - **Expected:** Removed both phones.

### Firestore security rules - Time Capsules content gate

- [ ] **Sealed capsule metadata is visible to partner with locked countdown** 📱
  1. Phone A seals 1-year capsule; Phone B opens screen
  - **Expected:** Phone B sees entry with sealer name + locked countdown.

- [ ] **Partner cannot read sealed content before openAt** ⚠️ 📱
  1. Phone B debug getDoc /sealed/data
  - **Expected:** Denied.

- [ ] **Sealer can re-read their own sealed content (preview)**
  1. Phone A taps own locked
  - **Expected:** Phone A sees own content.

- [ ] **Sealed content is immutable** ⚠️
  1. updateDoc /sealed/data changing message
  - **Expected:** Rejected.

- [ ] **After openAt passes, partner can open** 📱
  1. openAt +60s; wait → Phone B opens
  - **Expected:** Content loads.

### Firestore security rules - Sunday Check-in entries

- [ ] **Cannot peek at partner's draft answers** ⚠️ 📱
  1. Phone A drafts incomplete; Phone B debug getDoc entries/{A_uid}
  - **Expected:** Denied.

- [ ] **After both complete, answers become readable** 📱
  1. Both complete
  - **Expected:** Both see each other's answers side by side.

- [ ] **User can always read own draft**
  1. Phone A drafts; background+reopen
  - **Expected:** Own answers reload.

### GDPR account deletion (deleteUserCascade)

- [ ] **Delete account flow requires password confirmation** ⚠️
  1. Profile → Delete account → Delete without password
  - **Expected:** 'Enter your password to confirm.'

- [ ] **Wrong password shows clear error**
  1. Wrong pw → Delete
  - **Expected:** 'Password is incorrect.'

- [ ] **Successful delete routes to login and partner data preserved** 📱
  1. Phone A delete with correct pw
  - **Expected:** A → login; B's shared history intact; couple doc scrubbed.

- [ ] **Both partners deleted → couple data fully wiped** 📱 ⚠️
  1. Both delete sequentially
  - **Expected:** Couple doc + subcollections + Storage prefix all removed.

- [ ] **Profile photo removed from Storage on delete**
  1. Had photo; delete account
  - **Expected:** users/{uid}/ prefix deleted.

- [ ] **Private subcollection removed on delete**
  1. Had blueprint; delete
  - **Expected:** users/{uid}/private/* deleted.

- [ ] **Sign-out from Delete modal cancel does NOT delete**
  1. Open → Cancel
  - **Expected:** Account intact.

- [ ] **Disconnect happens before delete to avoid orphan couple link**
  1. Paired user deletes
  - **Expected:** disconnectFromCouple runs before deleteUser; cascade handles rest.

### Rate-limited invite code joining (rateLimitedJoin onCall)

- [ ] **Valid 8-char code joins partner** 📱
  1. Phone B types A's code → Connect
  - **Expected:** Phone B paired; couple shows partner name.

- [ ] **Sub-6-char code rejected client-side**
  1. 'ABC' → Connect
  - **Expected:** 'Enter an 8-character code.'

- [ ] **Wrong code shows 'Code not found'**
  1. 'ZZZZZZZZ' → Connect
  - **Expected:** 'Code not found or couple is already full.'

- [ ] **Rate limit triggers after 5 attempts within a minute** ⚠️
  1. Wrong code 5 times in 30s; 6th attempt
  - **Expected:** Rate-limit error.

- [ ] **Using own code is rejected** ⚠️
  1. A enters own code
  - **Expected:** joined:false reason:'own'; generic error.

- [ ] **Expired invite code cannot be used** ⚠️
  1. Set inviteExpiresAt < now; B tries
  - **Expected:** 'Code not found' generic.

### Scheduled cleanup — expired Flashes (24h TTL)

- [ ] **Flash older than 24h disappears from partner feed** 📱
  1. Send flash; wait 24h or set expiresAt past; wait cleanup
  - **Expected:** Flash gone; Storage file deleted.

- [ ] **Unexpired flash within 24h remains** 📱
  1. Send now; trigger cleanup manually
  - **Expected:** Still visible.

- [ ] **Storage cleanup is best-effort** ⚠️
  1. Manually delete Storage file before cleanup; trigger
  - **Expected:** Firestore doc deleted; no fatal error.

### Scheduled cleanup — Truth or Dare audio (30 day retention)

- [ ] **Old audio file gets deleted** ⚠️
  1. Upload fake file with updated time 31 days ago; trigger
  - **Expected:** Deleted.

- [ ] **Recent audio stays** 📱
  1. Fresh truth audio; trigger
  - **Expected:** Still present.

- [ ] **Non-truthDare paths skipped** ⚠️
  1. Trigger; check other paths
  - **Expected:** Only /truthDare/ files considered.

### Notifications toggle (in-app)

- [ ] **Toggle off persists across restart**
  1. Toggle OFF → force-quit → reopen → Profile
  - **Expected:** Still OFF.

- [ ] **Toggle off stops partner pushes immediately** 📱
  1. Phone B OFF; A sends Love Note
  - **Expected:** No push on B; note still saves.

- [ ] **Toggle hidden when OS permission denied** ⚠️
  1. iOS Off → reopen → Profile
  - **Expected:** 'Off' label + hint; no switch.

### Disconnect couple (without delete)

- [ ] **Disconnect confirm dialog requires explicit tap**
  1. Profile → Disconnect couple → confirm
  - **Expected:** Couple link broken; pairing prompt returns.

- [ ] **Cancel disconnect leaves couple intact** 📱
  1. Alert → Cancel
  - **Expected:** Couple still connected on both phones.

- [ ] **Partner sees they are now unpaired in real time** 📱 ⚠️
  1. Phone A disconnects; Phone B opens Home
  - **Expected:** Partner card disappears.

### Change password reauth

- [ ] **Successful password change shows checkmark and closes**
  1. Profile → Change password → valid → Update
  - **Expected:** '✓ Password updated'; sign in with new works.

- [ ] **Mismatched new + confirm rejected**
  1. new=abc123, confirm=xyz999 → Update
  - **Expected:** 'New passwords do not match.'

- [ ] **Too short password rejected**
  1. new=abc → Update
  - **Expected:** 'Password must be at least 6 characters.'

- [ ] **Wrong current password shows clear error**
  1. Wrong current → Update
  - **Expected:** 'Current password is incorrect.'

- [ ] **Empty fields rejected**
  1. All blank → Update
  - **Expected:** 'Fill in all fields.'

### Sign out mid-session

- [ ] **Sign out routes to login and clears session**
  1. Profile → Sign out → confirm
  - **Expected:** Login screen; no auto-resume.

- [ ] **Sign out while partner is mid-action does not crash partner** 📱 ⚠️
  1. B mid-TorD; A signs out
  - **Expected:** B's session doesn't crash.

- [ ] **Cancel sign-out alert keeps session**
  1. Sign out → Cancel
  - **Expected:** Stays on Profile.

### Birthday privacy

- [ ] **Birthday visible to partner after set** 📱
  1. Phone A set birthday; Phone B Home
  - **Expected:** Phone B sees A's birthday surfaced.

- [ ] **Stranger cannot read birthday** ⚠️
  1. Non-partner debug getDoc users/{A_uid}
  - **Expected:** Permission denied.

- [ ] **Birthday format is DD.MM.YYYY**
  1. Set March 5, 1990
  - **Expected:** Stored '05.03.1990'; UI shows same.

---

## Additional Edge Cases (from adversarial review)
Gaps surfaced by walking the app end-to-end as a real two-phone tester.

### Cross-feature interactions

- [ ] **LDR toggle ON → Date Roulette pool flips to virtual without restart** 🌍
  1. Open Roulette, spin once, note non-virtual results possible
  2. Go to Profile → toggle Long distance ON → return to Roulette without killing app
  3. Spin 5 times
  - **Expected:** Pool flips to virtual-only immediately; '✈️ Show in-person dates too' toggle appears without app reload.

- [ ] **Mood 😢 triggers unlock of mood-gated Love Note end-to-end** 📱
  1. Phone A: Notes → Write → 'When you're sad ❤️' → 😢 Sad trigger → Send
  2. Phone B: Love Notes — verify 🔒 'Unlocks when you feel 😢'
  3. Phone B: Home → tap 😢 in mood grid
  4. Phone B: return to Love Notes (do not force-quit)
  - **Expected:** Within 5s, the locked note flips to ready/openable; Phone A status updates when B opens.

- [ ] **Setting partner birthday surfaces in Countdowns and Calendar simultaneously** 📱
  1. Phone A: Profile → set birthday to 30 days from now
  2. Phone B: open Countdowns
  3. Phone B: open Calendar and navigate to that month
  - **Expected:** Countdowns shows '<A name> turns N 🎂' card; Calendar shows grey dot on the day.

- [ ] **LDR enabled mid-Questions session adds Distance program and LDR-tagged questions** 🌍 📱 ⚠️
  1. Phone A: open Questions Game, answer 1 question while LDR is OFF
  2. Phone A: Profile → toggle LDR ON
  3. Phone A: return to Questions Game and to Challenge picker
  - **Expected:** Questions Game subscribes again and may inject LDR-tagged items in next day's pool; Challenge picker now shows 5 programs including Distance.

- [ ] **Daily Pick match → Together List category routing matches pick category** 📱
  1. Both partners vote Yes on a Sweet pick, both confirm Add
  2. Both partners vote Yes on a Spicy pick, both confirm Add (premium)
  3. Open Together List on Phone A
  - **Expected:** Sweet match lands in Date Ideas; Spicy match lands in Intimacy; counts +1 each; no duplicates.

- [ ] **Explicit content toggle OFF hides Spicy across all surfaces simultaneously**
  1. Profile → Explicit content toggle OFF
  2. Open Daily Picks, Questions Game, Truth or Dare, Would You Rather, Dare Wheel
  - **Expected:** Spicy/Sexual tabs/levels hidden or grey-locked everywhere consistently; no leaks.

### State transitions and account lifecycle

- [ ] **Sign out mid-Truth-or-Dare with active card** 📱 ⚠️
  1. Phone A picks a Dare and sends to Phone B; Phone B sees confirm button
  2. Phone A: Profile → Sign out
  3. Phone B observes
  - **Expected:** Phone B's session does not crash; Truth or Dare screen either shows waiting state or session ends gracefully. No stuck pending card.

- [ ] **Delete account mid-active 30-Day Challenge** 📱 ⚠️
  1. Both partners on Day 5 of Reconnect; Phone A marks done, Phone B does not
  2. Phone A: Profile → Delete account → confirm
  3. Phone B opens Challenge
  - **Expected:** Phone B's challenge gracefully ends or shows partner-disconnected state; no stuck '<deleted> marked Day 5'.

- [ ] **Disconnect couple mid-Sunday Check-in** 📱 ⚠️
  1. Both partners on Sunday Check-in, Phone A answered 3 of 5
  2. Phone B: Profile → Disconnect couple → confirm
  3. Phone A continues to Q4
  - **Expected:** Phone A receives error/empty state on next save; no crash; subsequent screens show 'Connect with partner' prompt.

- [ ] **Change display name mid-flight in active Questions Game** 📱
  1. Both phones on Questions Game; Phone A answers first
  2. Phone A: Profile → change name to 'NewName' → Save
  3. Phone A returns to Questions Game; Phone B observes reveal card
  - **Expected:** Phone B reveal card shows new name 'NewName' for Phone A within ~5s. No stale name.

- [ ] **Disconnect then re-pair preserves no shared data** ⚠️ 📱
  1. Couple has shared todos, notes, moments
  2. Phone A disconnects; Phone A pairs with brand-new Phone C
  3. Phone A opens Together List, Notes, Moments
  - **Expected:** All previous shared data gone; new couple sees clean empty states.

- [ ] **Sign out during photo upload (Moments)** ⚠️ 📱
  1. Phone A: tap Take photo → snap → during 'Uploading...' navigate to Profile → Sign out
  - **Expected:** No crash; partial upload either completes silently or is abandoned; no orphan progress UI on next sign-in.

- [ ] **App backgrounded mid-Time-Capsule seal does not duplicate write** ⚠️
  1. Open Time Capsules → seal capsule with photo → tap Seal
  2. Background app immediately during upload
  3. Resume after 30s
  - **Expected:** Exactly one capsule in Firestore; no duplicate doc; partner receives exactly one push.

### Security and privacy verifications

- [ ] **UI blocks tapping sealed capsule before openAt date (no client-side bypass)** ⚠️
  1. Phone A seals capsule with openAt 1 day future
  2. Phone B: open Time Capsules, attempt to long-press / repeatedly tap locked capsule
  - **Expected:** Card stays non-interactive; no modal opens; no Firestore read of /sealed/data attempted.

- [ ] **Try to read partner's Sunday Check-in answers before both done** ⚠️ 📱
  1. Phone A finishes all 5 answers; Phone B answers only 2 of 5
  2. Phone A: attempt to expand any UI revealing partner answers; inspect Firestore via debug if available
  - **Expected:** Phone A sees only count 'Partner has answered 2 of 5' — no answer text exposed in UI or Firestore client.

- [ ] **Free user tapping Spicy Truth in Truth or Dare hits upgrade gate** 💰
  1. Free-tier account → Truth or Dare → Multiplayer → tap Spicy level card
  - **Expected:** Routes to /upgrade; no Firestore truthDare doc written; no card revealed.

- [ ] **Free user tapping locked mood emoji hits upgrade** 💰
  1. Free user → Home mood grid → tap 😈
  - **Expected:** /upgrade; mood NOT saved; partner does not receive push.

- [ ] **Mysterious countdown does not leak label via push notification text** ⚠️ 📱
  1. Phone A creates Mysterious countdown 'Surprise trip to Paris'
  2. Phone B receives any related push (if any)
  - **Expected:** Push body does NOT contain 'Paris'; only generic copy.

- [ ] **Intimacy Log entries cannot be read by stranger (security rule)** ⚠️
  1. User C debug attempts to read couples/{otherCoupleId}/intimacy/{id}
  - **Expected:** Permission denied.

- [ ] **Partner can read each other's Intimacy Log entries** 📱
  1. Phone A logs entry; Phone B opens Recent list
  - **Expected:** Phone B sees the entry with perspective swapped correctly.

- [ ] **Blueprint result private subcollection rule prevents stranger read** ⚠️
  1. User C debug reads users/{A_uid}/private/blueprint
  - **Expected:** Permission denied.

- [ ] **Tease/Flash media URL is not accessible after expiry** ⚠️ 📱
  1. Send Flash; note Storage URL
  2. Wait 24h or trigger cleanup
  3. Try to fetch URL directly in browser
  - **Expected:** 403 / 404 on the Storage object.

### Race conditions

- [ ] **Both partners flip same Activity Card simultaneously** 📱 ⚠️ 💰
  1. Both phones on same fresh deck, Phone A's turn
  2. While A is mid-tap, B also taps the same face-down card (B not on turn anyway)
  - **Expected:** Only A's tap registers; B's tap is no-op; no duplicate writes; revealedBy holds exactly A's uid.

- [ ] **Both partners answer last Question of the day simultaneously** 📱 ⚠️
  1. Both phones on Q3 of Romantic; coordinate to tap Send within 1s
  - **Expected:** Both answers persisted; streak increments by exactly 1; reveal shows both answers.

- [ ] **Both partners post Moment photo simultaneously** 📱 ⚠️
  1. Both at 'Take photo' prompt; both snap + accept within the same second
  - **Expected:** Both photos upload; reveal card shows both; streak bumps exactly once.

- [ ] **Both partners create the same Activity Cards deck on same date** 📱 ⚠️ 💰
  1. Fresh couple, no existing deck; both open Activity Cards within 1s
  - **Expected:** Exactly one deck doc per month; not two collisions; both phones converge on the same 25 cards.

- [ ] **Both partners answer same WYR question simultaneously and triggering reveal** 📱 ⚠️
  1. Same prompt; both tap option within 1s
  - **Expected:** Both answers landed; reveal fires exactly once; score badge increments correctly.

- [ ] **Both partners simultaneously tap Add on a Daily Pick match** 📱 ⚠️
  1. Sweet match; both tap '+ Add to Together List' within 1s
  - **Expected:** Exactly one Date Ideas todo written; no duplicate.

- [ ] **Simultaneous mood pick + opposite mood pick** 📱 ⚠️
  1. Phone A picks 😊; Phone B picks 😢 within 1s
  - **Expected:** Each phone shows own mood + partner mood correctly; mood-gated note unlocks fire correctly without confusion.

- [ ] **Concurrent Together List edits — same todo toggled and deleted** 📱 ⚠️
  1. Phone A: toggle complete on todo X; Phone B: delete todo X (within 1s)
  - **Expected:** No crash; final state consistent (deleted wins); no zombie row on either phone.

### Permission flow

- [ ] **Deny camera then try Tease** ⚠️
  1. Revoke camera in iOS Settings
  2. Open Tease → tap 📷 FAB
  - **Expected:** Alert 'Camera access needed' (or similar); no crash; user can return via Settings → reopen Tease and now allow.

- [ ] **Deny notifications then check Profile hint** ⚠️
  1. Revoke notifications in iOS Settings
  2. Open Profile → Notifications row
  - **Expected:** Shows 'Off' label and hint pointing to Settings; toggle replaced with informational text.

- [ ] **Toggle in-app notif off then verify pushes stop within seconds** 📱
  1. Phone A: Profile → Notifications toggle OFF
  2. Phone B: trigger any push (mood / spark / note)
  3. Wait 60s
  - **Expected:** Phone A receives zero pushes; lock screen empty.

- [ ] **Deny microphone then try recording Truth audio** 📱 ⚠️
  1. Phone B: revoke mic in iOS Settings
  2. Phone B: receives a Truth from Phone A; tap Record tab → 🎙
  - **Expected:** Recording does not start; either alert appears or button is no-op; no app crash.

- [ ] **Deny photos then try sealing Time Capsule with photo** ⚠️
  1. Revoke photo library
  2. Open Time Capsules → tap '📷 Add a photo'
  - **Expected:** System picker either reprompts or returns empty; no crash; capsule can still be sealed without photo.

- [ ] **Deny photos then Memories/Moments graceful handling** ⚠️
  1. Revoke photo library access
  2. Open Moments → tap Take photo (camera) — should still work since this is camera, not library
  3. Try any library-pick flow
  - **Expected:** Camera flow works; library flow either prompts or fails gracefully; no crash.

### Memory and performance

- [ ] **50+ Love Notes scroll without jank** ⚠️
  1. Seed couple with 50 love notes (mix of opened/locked/stash)
  2. Open Notes screen, scroll top to bottom rapidly
  - **Expected:** Smooth 60fps; no flicker; no out-of-memory; locked countdowns render correctly.

- [ ] **30 days of Moments grid renders without crash** ⚠️
  1. Seed 30 days of completed Moments (60 photos total)
  2. Open Moments, scroll past grid
  - **Expected:** Grid renders fully; thumbnails load lazily; tap to open viewer still works on day 30.

- [ ] **Long Spicy Dare list cycling does not slow down** ⚠️ 💰
  1. In a single Truth or Dare session, skip+redraw Spicy Dare 30 times
  - **Expected:** Each redraw responsive (<200ms); no memory growth; no duplicate cards within the round.

- [ ] **100+ Journal entries — cap at 100 verified** ⚠️
  1. Seed 110 journal entries
  2. Open Journal
  - **Expected:** Exactly 100 most recent render; older 10 not displayed (or paginated); scroll smooth.

- [ ] **Calendar with 200 user dates does not lag** ⚠️
  1. Seed 200 user dates spread across 24 months
  2. Open Calendar; tap prev/next month rapidly
  - **Expected:** Month navigation responsive; dots render; no freeze.

- [ ] **Pulse history with 24 weekly check-ins renders trend chart** ⚠️
  1. Seed 24 weekly Pulse submissions
  2. Open Pulse History tab
  - **Expected:** Trend chart fits screen; labels readable; no overlap.

### App backgrounded mid-flow

- [ ] **App backgrounded mid-Tease voice recording** ⚠️
  1. Tease → 🎙 → start recording → 2s in, background app
  2. Resume after 10s
  - **Expected:** Recording either stops cleanly or is discarded; no audio session leak; mic indicator clears.

- [ ] **App backgrounded with Time Capsule seal modal open** ⚠️
  1. Open Time Capsules → tap Seal → fill message + date
  2. Background app
  3. Resume after 30s
  - **Expected:** Modal still open with state preserved (message + date); Seal button still works.

- [ ] **App backgrounded mid-Blueprint quiz (Q8 of 15)** ⚠️
  1. Open Erotic Blueprint quiz, answer to Q8
  2. Background app for 5 minutes
  3. Resume
  - **Expected:** Quiz at Q8 with previous answers preserved; can continue without restart.

- [ ] **App backgrounded mid-Sensate timer** ⚠️ 💰
  1. Start Stage 1 timer; background app at 5min remaining
  2. Resume after 2min real time
  - **Expected:** Either timer continued correctly OR clearly paused with elapsed-time-frozen behavior; no crash; no negative time.

- [ ] **App backgrounded during Truth audio playback** ⚠️ 📱
  1. Phone A receives Truth audio; tap Play
  2. Background app at 2s in
  3. Resume
  - **Expected:** Playback paused or stopped cleanly; no continued audio in background unless intentional; re-open and replay works.

- [ ] **App backgrounded mid-spin (Solo Dare wheel)** ⚠️
  1. Tap Spin
  2. Background during 1.8s spin animation
  3. Resume
  - **Expected:** Wheel either completes or shows result; no stuck mid-rotation; tap Spin again works.

### iOS-specific

- [ ] **NSCameraUsageDescription prompt appears on first camera use** ⚠️
  1. Fresh install on iOS; first time using camera (Moments / Tease)
  - **Expected:** System prompt with app's NSCameraUsageDescription string shown clearly; tap Allow → camera opens.

- [ ] **NSMicrophoneUsageDescription prompt on first audio record** ⚠️
  1. Fresh install; first Truth audio record attempt
  - **Expected:** System prompt with NSMicrophoneUsageDescription string; explains why mic is needed.

- [ ] **NSPhotoLibraryUsageDescription prompt on first library pick** ⚠️
  1. Fresh install; first time choosing photo (onboarding avatar)
  - **Expected:** System prompt with app's NSPhotoLibraryUsageDescription string shown.

- [ ] **ITSAppUsesNonExemptEncryption=false in Info.plist hides export compliance prompt** ⚠️
  1. Submit a build to TestFlight via App Store Connect
  - **Expected:** No 'Export Compliance Information' prompt appears for testers; build goes straight to Ready to Test.

- [ ] **App icon and splash screen render correctly on iPhone notch/Dynamic Island** ⚠️
  1. Cold launch on iPhone 14/15 Pro
  - **Expected:** Splash respects safe areas; icon round-cornered; no clipping under Dynamic Island.

- [ ] **Dark Mode iOS does not break light-theme UI** ⚠️
  1. iOS Settings → Display → Dark
  2. Open Desire
  - **Expected:** App uses its own burgundy/cream theme regardless of OS Dark Mode; no white-on-white or black-on-black contrast issues.

- [ ] **Dynamic Type / larger text size does not break layouts** ⚠️
  1. iOS Settings → Accessibility → Display → Larger Text → Max
  2. Open various Desire screens
  - **Expected:** Text either scales gracefully or app uses fixed font sizes; no clipping that hides critical buttons.

### Push notification reliability

- [ ] **Spark push arrives within 30s** 📱
  1. Phone A: Home → ❤️ Love → pick spark
  2. Phone B: locked screen, observe
  - **Expected:** Push appears on Phone B lock screen within 30s.

- [ ] **Questions Game push arrives within 30s** 📱
  1. Phone A answers first
  2. Phone B locked
  - **Expected:** Push within 30s.

- [ ] **Activity Cards (Bingo) flip push arrives within 30s** 📱 💰
  1. Phone A picks card and accepts; Phone B locked
  - **Expected:** Push '<A> sent you a challenge' within 30s.

- [ ] **Deep link from spark push opens Home with spark banner** 📱 ⚠️
  1. Phone B locked, receives spark push; tap notification
  - **Expected:** App opens to Home; blush spark banner visible at top.

- [ ] **Deep link from Love Note push opens /notes** 📱 ⚠️
  1. Phone B locked; receives Love Note push; tap
  - **Expected:** App opens directly to /notes (not just Home).

- [ ] **Deep link from Truth or Dare push opens /truth-dare** 📱 ⚠️
  1. Phone B locked; receives Truth or Dare push; tap
  - **Expected:** App opens to /truth-dare with active session.

- [ ] **Multiple pushes stack/coalesce in iOS notification center** 📱 ⚠️
  1. Phone B locked; Phone A sends 3 sparks in 30s
  - **Expected:** Notifications either stack under one Desire group or appear individually; tapping latest opens correctly.

- [ ] **Push sender uses correct partner name even after rename** 📱
  1. Phone A renames to 'NewName'; Phone A sends spark
  - **Expected:** Phone B receives push with 'NewName' (not stale old name).

### Empty state and first-use

- [ ] **Pure first run renders Home without crash** ⚠️
  1. Brand-new account, just paired, freshly completed tour
  2. Open Home
  - **Expected:** Home renders with greeting + empty-but-not-broken state: no mood, no partner mood, no nudges that don't apply, empty Daily Picks ribbon, no crash.

- [ ] **Brand-new couple Year-in-Review does not crash** ⚠️
  1. Couple created today, no data anywhere
  2. Profile → Year in Review
  - **Expected:** Cover slide renders with both names; subsequent cards show zeros/'∞' gracefully; outro card present; no aggregation crash.

- [ ] **Brand-new couple Stats / Insights screens empty-safe** ⚠️
  1. Fresh couple, open Pulse History, Intimacy Stats, Mood History
  - **Expected:** Each shows empty state; no division by zero; no NaN; no crash.

- [ ] **First open of Calendar with no data does not crash** ⚠️
  1. Fresh couple → Calendar
  - **Expected:** Current month renders, today highlighted, Upcoming empty state shown.

- [ ] **First open of Activity Cards generates deck atomically** ⚠️ 📱 💰
  1. Fresh paid couple; both open Activity Cards within 5s
  - **Expected:** Exactly one deck doc; both phones see identical 25 cards.

- [ ] **Solo user (skipped pairing) does not crash partner-dependent screens** ⚠️
  1. Skip pairing; navigate to Home, Discover, Love, Together List, Notes
  - **Expected:** Each screen shows 'Connect with partner' style empty state; no crash; no NPE on missing partner.

- [ ] **Versus empty state — partner has zero binary answers** ⚠️ 📱
  1. Fresh couple; Phone A opens Versus
  - **Expected:** 🤔 'Not enough answers yet' + CTA to /questions-game; no crash; no infinite loading.

- [ ] **Fantasy Wishes first-load on premium account with empty Firestore** ⚠️ 💰
  1. Fresh premium couple → Fantasy Wishes → tap '✨ Explore'
  - **Expected:** Loads 5 presets from constants; no error; voting works.

- [ ] **Onboarding tour aborted partway then re-enter on next launch** ⚠️
  1. Reach tour step 3; force-quit
  2. Re-open app
  - **Expected:** Tour resumes at step 3 (or restarts cleanly at step 1); no stuck at blank screen.

- [ ] **First-time open of a screen with hints disabled** ⚠️
  1. Profile → Feature hints OFF
  2. First-ever visit to Activity Cards / Fantasy Wishes / Questions Game
  - **Expected:** No help modal anywhere; feature works fine on first visit.

---

## Tally

**Coverage summary:**

- Total feature areas: 12 (+ 1 adversarial-review section)
- Total features documented: 143
- Total test cases: 902
- Two-phone (📱) tests: 257
- LDR (🌍) tests: 67
- Edge case (⚠️) tests: 286
- Paid-gated (💰) tests: 73

> Run through this checklist on every major release. Update counts when adding new features.

