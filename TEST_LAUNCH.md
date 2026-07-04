# Desire — Launch Test Plan

> Focused subset of the comprehensive [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) for **every release**. ~62 tests, 4-6 hours with 2 phones. Catches ~80% of regressions.
>
> **Section 8 (Push notifications, 23 tests) is 📡 EAS-only** — run once after every EAS build, not during Expo Go / Vercel iteration. Add ~1h for that section on real devices.

## Setup
- **Phone A** logged in as User A (Eva)
- **Phone B** logged in as User B (Tester)
- Both paired to same couple via invite code
- Both have **notifications + camera + mic + photos** granted in iOS Settings
- Phone B is logged in as a **non-premium** account (to verify upgrade gates)

## Legend
- 📱 = both phones required
- 🌍 = LDR-specific
- ⚠️ = error path / edge case
- 💰 = paid-tier gate test
- 🔒 = security verification
- 📡 = **EAS-only** — real OS push notification, requires EAS build on physical device. Cannot be tested in Expo Go, Vercel web preview, or simulator/emulator. Push registration is deliberately skipped on web (see `app/_layout.tsx`).

## Feature name reference (test titles ↔ app UI)

Use this if a test says one thing and the app calls it something else.

- **Questions Game** — Discover → Questions Game. 3 categories: 😊 Playful (free), 💛 Deep (paid 🔒), 🔥 Spicy (paid 🔒). Answer privately, reveal when both done.
- **Tease** — Us tab → Rituals section is where daily ritual features live; Tease is a Quick action on Home + reachable via Flashes route. 24h ephemeral photos/videos/voice notes.
- **Moments** — Us tab → Rituals section → Moments. BeReal-style daily photo ritual with reveal.
- **Sunday Check-in** — Us tab → Rituals section → Sunday Check-in. 5-question weekly Gottman ritual.
- **Relationship Pulse** — Profile → Reminders & tools → Relationship Pulse. Route is `/pulse` (renamed from `/hita` July 2026). 10-question private satisfaction quiz.
- **Together List** — Home → "Together List" section (surfaced there instead of hidden). Also reachable from `/todo` route directly. Not on tab bar (`href: null`).

## Free vs Paid tier summary (verify on non-premium account)

Use this table to confirm every gated surface hits `/upgrade` when a free-tier
user taps it. Paid-gate tests below cover the most important ones; this table
is the complete reference.

### FREE (no lock, works for all users)
**Games:** Truth or Dare Sweet + Flirty, Questions Game **Playful**, Versus
mode (full), Would You Rather Playful + Romantic, Date Night Roulette (full).
Note: Dare Wheel was folded into Truth or Dare — no separate route.

**Rituals + Async (Us tab / Home / Profile):** Mood (except Kinky/Horny),
Spark, Love Notes, Moments, Tease, Journal, Time Capsules, Sunday Check-in,
Together List (via Home). Utility screens moved to Profile → Reminders &
tools: Calendar, Countdowns, Flirt Reminders, Relationship Pulse.

**Insights:** Love Language Quiz, Relationship Pulse (with trend chart —
now in Profile), Our Story, Year-in-Review, 30-Day Challenge Reconnect + Spark

**Daily Picks:** Sweet + Flirty categories

### PAID (locked with 🔒 icon, tap sends to /upgrade)
**Games:** Truth or Dare Spicy level, Questions Game **Deep + Spicy**
categories, Would You Rather Spicy level, Activity Cards (entire feature),
Fantasy Wishes (entire feature)

**Intimacy:** Erotic Blueprint (entire feature), Sensate Focus (entire
feature), Intimacy Log (opt-in from Profile — free but hidden by default)

**Daily Picks:** Spicy category (previously Spicy + Sexual, merged July 2026)

**Mood:** 😈 Kinky, 🥵 Horny emojis (last two on the picker)

**Programs:** 30-Day Challenge Fire + Desire programs

---

## 1. Auth + Pairing (7 tests)

- [x] **Register with 18+ consent → routed to onboarding**
  1. Phone A: Launch app fresh, tap "Create one"
  2. Enter new email + password (×2)
  3. Tap 18+ checkbox so it fills burgundy
  4. Tap "Create Account"
  - **Expected:** Loading spinner, then "Welcome!" name+photo screen. Firestore: `users/{uid}/private/consent` exists with `confirmed: true` + `confirmedAt` timestamp.

- [x] **Register with 18+ checkbox unchecked keeps Create Account disabled** ⚠️
  1. Phone A: Fresh register, fill email + password, do NOT check 18+ box
  - **Expected:** Create Account button stays disabled. No auth account is created. No consent doc written.

- [ ] **Post-login consent modal fires for legacy account without consent doc** ⚠️
  1. Delete `users/{uid}/private/consent` in Firestore devtools for an existing account
  2. Sign out, sign back in
  - **Expected:** Full-screen 18+ consent modal blocks all navigation. Home is unreachable until Confirm or Decline. Terms of Service and Privacy Policy links inside the paragraph are tappable and open the correct screens; back returns to the modal.

- [ ] **Decline path deletes the auth user (no bypass by signing back in)** 🔒 ⚠️
  1. Sign in with a fresh account, get to the consent modal
  2. Tap "I am under 18 — Exit"
  3. Try to sign back in with the same credentials
  - **Expected:** Sign-in fails with "user not found". No Firestore consent doc exists. Re-registration requires fresh 18+ attestation.

- [x] **Login with verified email succeeds**
  1. Phone A: Sign out, then enter credentials
  - **Expected:** Lands on Home with mood picker visible.

- [ ] **Re-login of fully-paired user goes straight to Home, NOT onboarding/pairing** ⚠️
  1. Phone A: Confirm you have a name set and are paired with a partner
  2. Phone A: Profile → Sign out
  3. Phone A: Sign back in with the same credentials
  - **Expected:** Lands DIRECTLY on Home. Should NOT see the "What's your name?" onboarding screen, and should NOT see the "Connect with partner" pairing screen. If "Skip for now" would reveal that you're actually already paired with the correct partner name, that means the routing fired against stale profile data — regression check for the useAuth loading-reset fix (July 2026).

- [x] **Invite code flow connects both phones** 📱
  1. Phone A: Profile → Get invite code → copy 8-char code
  2. Phone B: Enter code in pairing screen → tap Join
  - **Expected:** Both phones show paired state within 5s. Phone A sees Phone B's name in couple card. Phone B sees Phone A's name.

- [x] **Disconnect couple removes pairing both sides** 📱
  1. Phone A: Profile → Disconnect from partner
  2. Confirm in modal
  - **Expected:** Phone A returns to pairing screen. Phone B's home shows "Connect with partner" prompt within 10s.

---

## 2. Core daily features (8 tests)

- [x] **Mood pick syncs to partner within 30s** 📱
  1. Phone A: Tap 😍 In love
  2. Phone B: Pull-to-refresh Home
  - **Expected:** Phone B partner card shows 😍 In love label.

- [x] **Spark pill sends + nudges partner** 📱
  1. Phone A: Tap ❤️ Love you pill
  - **Expected:** Phone B home banner: "Eva sent you a spark · just now · ❤️ Love you" within 30s.

- [x] **Questions Game answer reveal when both done** 📱
  1. Both: Discover → Questions Game → pick Playful category (free — Deep and Spicy are 🔒 paid)
  2. Both: Type answer to question 1 → Send answer
  - **Expected:** Both screens reveal both answers side by side within 10s. Own answer in green box on left, partner's answer in green box on right.

- [x] **Moment photo capture + reveal when both posted** 📱
  1. Phone A: Open Moments → 📸 → take photo → upload
  2. Phone B: Open Moments
  3. Phone B: Take photo → upload
  - **Expected:** Phone B sees "Waiting for Eva..." until Phone A posted. After both: side-by-side reveal of both photos. Phone A receives nudge banner.

- [x] **Love Note "Right now" arrives instantly** 📱
  1. Phone A: Notes → New → "Right now" → write "test" → Send
  - **Expected:** Phone B inbox shows the note within 30s. Tap to open shows message.

- [x] **Love Note edit + delete** ⚠️
  1. Phone A: Notes → tap own draft → ✏️ Edit → change text → Save
  - **Expected:** Note text updates immediately. Then tap 🗑️ → confirm → note removed from list.

- [x] **"When you're sad" note unlocks on partner mood pick** 📱
  1. Phone A: Notes → "When you're feeling..." → pick 😢 → write "you are loved" → Send
  2. Phone B: Home → tap 😢 mood
  - **Expected:** Phone B receives nudge "A note unlocked from Eva" within 30s. Open shows the message.

- [ ] **Daily Picks mutual match adds to Together List** 📱
  1. Both: Open Daily Picks → both tap ❤️ on same item in same category
  - **Expected:** Match modal appears on both phones. Tap "Add to list" → item appears under correct Together List category.

---

## 3. Games — multiplayer correctness (8 tests)

- [ ] **Truth or Dare full round end-to-end** 📱
  1. Phone A: Open Truth or Dare → start → pick Sweet level
  2. Phone A: Draw card → "Send Truth" 
  3. Phone B: Receives card → type answer → Send
  4. Phone A: See partner's answer
  - **Expected:** Both phones move through picking/answering/done phases in sync. Score increments correctly on truth-answered.

- [ ] **Questions Game binary format** 📱
  1. Both: Discover → Questions Game → stay on Playful (or unlock Deep/Spicy) → cycle through today's 3 questions until a binary one appears (e.g., "Beach or Mountains?", "Morning or night?")
  - **Expected:** Both see two large buttons (e.g. "Beach" and "Mountains"). Tap → answer locks in. Both partners answered → reveal shows both choices side by side.

- [ ] **Questions Game scale format** 📱 💰
  1. Both: Unlock premium → Questions Game → Deep chip → scan today's 3 for a scale-format question (e.g., "How safe do you feel sharing something hard with me?", "How adventurous are you feeling?")
  - **Expected:** Both see 1-5 row with "1=not at all · 5=completely" hint. Tap → submit → reveal shows both scores. Scale prompts are almost all in Deep + Spicy so this test currently requires premium.

- [ ] **Versus mode end-to-end** 📱
  1. Phone B: Open Versus
  - **Expected:** If 10+ binary questions in history: 10-question quiz starts; each card shows partner's actual answer + 1 decoy; score tallied; final gradient card with %. If <10: empty state with CTA to Questions Game.

- [ ] **WYR session persists across app close** 📱
  1. Phone A: Open Would You Rather → Playful → start → answer Q1
  2. Phone A: Close app, reopen → Would You Rather
  - **Expected:** Session resumes at Q2 (or wherever they left off), not restart.

- [ ] **Activity Cards flip → accept → complete** 📱 💰
  1. Phone A (premium): Activity Cards → flip card 12
  2. Phone B: Receives card → "We did it!" or skip
  - **Expected:** Card goes face-down → pending (yellow) → completed (green). Turn passes to partner. Both phones see same state.

- [ ] **Fantasy Wishes mutual YES surfaces match** 📱 💰
  1. Both (premium): Fantasy Wishes → vote same item with ❤️ yes
  - **Expected:** Item moves to Matches section on both phones. Other votes never visible (double-blind).

---

## 4. Intimacy + Insights (5 tests)

- [ ] **Blueprint quiz completion + couple compatibility view** 📱 💰
  1. Both (premium): Open Erotic Blueprint → answer all 15 questions → see result
  - **Expected:** Each sees own type + partner's type once both completed + compatibility text. Score breakdown bars visible.

- [ ] **Sensate Focus timer completes stage 1** 💰
  1. Phone A (premium): Sensate → Stage 1 → Start Timer
  - **Expected:** Timer counts down from 15:00. Prompts rotate every 90s. At 0:00, ✓ Done badge + success haptic.

- [ ] **Love Language quiz → result + tip on home**
  1. Phone A: Profile → Love Language Quiz → answer 10 A/B
  2. Phone A: Return to Home
  - **Expected:** Result shows primary love language. Home card shows "💬 Your love language tip" with daily rotation.

- [ ] **Relationship Pulse 10-Q + history + trend chart**
  1. Phone A: Profile → Reminders & tools → Relationship Pulse → answer all 10 → See my pulse
  2. Tap History tab
  - **Expected:** Single result first time. Take twice more (~3 entries) → trend chart appears with vertical bars. Trend label shows "stable / improving / declining". Route is `/pulse` (renamed from `/hita`).

- [ ] **Sunday Check-in dual completion reveal** 📱
  1. Both: Sunday Check-in → answer all 5 → Finish
  - **Expected:** Phase 1 (answering) → Phase 2 ("Done, waiting for [partner]") → Phase 3 (both answers side-by-side reveal). Each partner shown alongside both answers per question.

---

## 5. LDR mode (3 tests)

- [ ] **LDR toggle reveals partner timezone on home** 🌍 📱
  1. Phone A: Profile → toggle "Long distance" ON
  2. Phone B: Pull-to-refresh Home
  - **Expected:** Phone B partner card shows partner's local time (e.g., "Eva · 14:32"). Phone A same for Phone B.

- [ ] **Next visit date sets countdown pill** 🌍
  1. Phone A: Profile → with LDR on → "Next visit date" → pick date 14 days out
  2. Return to Home
  - **Expected:** Couple card shows ✈️ "14 days" pill below names.

- [ ] **Date Roulette defaults to virtual-only when LDR on** 🌍
  1. Phone A (LDR on): Discover → Date Roulette → Spin
  - **Expected:** Only ideas with `virtual: true` flag in pool. "Show in-person too" pill available to override.

---

## 6. Time Capsules (3 tests)

- [ ] **Seal capsule with photo + message → partner sees locked metadata** 📱 🔒
  1. Phone A: Time Capsules → Seal new → message + photo → 1 year preset → Seal
  2. Phone B: Open Time Capsules
  - **Expected:** Phone B sees "Sealed" section with one card showing "🔒 From Eva · Opens [date 1 year out] · 365 days". Content NOT visible.

- [ ] **Try to open before openAt blocked at content level** 🔒 ⚠️
  1. Phone B: Tap the locked partner capsule
  - **Expected:** Either disabled tap, or modal shows "Loading..." indefinitely and Firestore rule denies read on `/sealed/data`. NEVER shows message + photo before date.

- [ ] **Sealer can preview own capsule anytime**
  1. Phone A: Time Capsules → tap own sealed capsule (the one they created)
  - **Expected:** Modal opens showing message + photo (the sealer always sees their own).

---

## 7. Security verifications 🔒 (5 tests)

- [ ] **Free user → Spicy Truth → upgrade gate** 💰
  1. Phone B (non-premium): Truth or Dare → tap Spicy level
  - **Expected:** Navigates to /upgrade screen. Cannot bypass.

- [ ] **Free user → Deep Questions → upgrade gate** 💰
  1. Phone B (non-premium): Discover → Questions Game → tap 💛 Deep chip
  - **Expected:** Chip shows 🔒 lock. Tap → navigates to /upgrade.

- [ ] **Free user → Spicy Questions → upgrade gate** 💰
  1. Phone B (non-premium): Discover → Questions Game → tap 🔥 Spicy chip
  - **Expected:** Chip shows 🔒 lock. Tap → navigates to /upgrade. Playful remains accessible as the free taste.

- [ ] **Free user → Fantasy Wishes → upgrade gate** 💰
  1. Phone B (non-premium): Discover → Fantasy Wishes (also reachable via Home "Tonight's Picks")
  - **Expected:** Hits /upgrade. No data loaded.

- [ ] **Free user → Kinky/Horny mood → upgrade gate** 💰
  1. Phone B (non-premium): Home → swipe mood picker to bottom → tap 😈 or 🥵
  - **Expected:** Lock icon visible. Tap → /upgrade.

- [ ] **Sunday Check-in answers private until both done** 🔒 📱
  1. Phone A: Sunday Check-in → answer Q1-Q2 → DON'T finish
  2. Phone B: Sunday Check-in screen
  - **Expected:** Phone B sees Phone A's progress ("answered 2 of 5") but NOT the answer text. Once both finish: both answers visible.

- [ ] **Mysterious countdown label hidden from partner** 🔒 📱 🌍
  1. Phone A: Countdowns → New → label "Surprise trip" → toggle Mysterious ON
  2. Phone B: Open Countdowns
  - **Expected:** Phone B sees placeholder like "🤫 Something special" + countdown, not the real label.

---

## 8. Push notifications (18 tests — 📡 EAS-only)

> **Run this section ONCE after every EAS build, before submitting to TestFlight / hosting the APK.** All tests below require both phones to be running an EAS build (not Expo Go, not Vercel web). Push tokens register on first launch via `Notifications.getExpoPushTokenAsync()` — verify tokens exist in `users/{uid}.pushToken` in Firestore before starting.

### Pre-flight
- [ ] **Both users have pushToken written to Firestore** 📡 📱 🔒
  1. Fresh install both phones → sign in → grant notification permission → open Home once
  2. Check Firebase console: `users/{A_uid}.pushToken` and `users/{B_uid}.pushToken` both exist and start with `ExponentPushToken[...]`
  - **Expected:** Both tokens present. Without this, every test below silently no-ops.

### One test per trigger site (all 16 `notifyPartner` calls)
- [ ] **Spark push** 📡 📱
  1. Phone B: lock screen. Phone A: Home → ❤️ Love pill → send.
  - **Expected:** Phone B lock-screen banner "Oli sent you love ❤️" + emoji/message within 30s.

- [ ] **Mood push (Home)** 📡 📱
  1. Phone B: lock screen. Phone A: Home → tap 😍 mood.
  - **Expected:** Phone B push "New mood 💫" + "Oli is feeling 😍 In love".

- [ ] **Mood push (Mood History)** 📡 📱
  1. Phone B: lock screen. Phone A: Mood History → tap 🥰.
  - **Expected:** Phone B push "New mood 💫" + label matches picked emoji.

- [ ] **Love Note push** 📡 📱
  1. Phone B: lock screen. Phone A: Notes → New → "Right now" → send.
  - **Expected:** Phone B push "You have a love note 💌" + subtitle.

- [ ] **Questions Game answer push** 📡 📱
  1. Phone B: lock screen. Phone A: Questions Game → answer any question first.
  - **Expected:** Phone B push "Questions 💬" + "Oli answered a question, your turn!". No push if Phone B was the one who answered first.

- [ ] **Would You Rather answer push** 📡 📱
  1. Phone B: lock screen. Phone A: WYR → tap A or B.
  - **Expected:** Phone B push "Would You Rather 🤔" + "your turn!".

- [ ] **Moments photo push** 📡 📱
  1. Phone B: lock screen. Phone A: Moments → snap photo → upload.
  - **Expected:** Phone B push "[A] captured today's moment 📸".

- [ ] **Activity Cards flip push** 📡 📱 💰
  1. Both premium. Phone B: lock screen. Phone A: Activity Cards → flip a card → send.
  - **Expected:** Phone B push "Activity Cards 🃏" + activity name + "your turn!".

- [ ] **Activity Cards marked-done push** 📡 📱 💰
  1. Phone B: lock screen after A sent a card. Phone A: mark it done.
  - **Expected:** Phone B push "Activity Cards ✓" + "your turn!".

- [ ] **Activity Cards skip push** 📡 📱 💰
  1. Phone B: lock screen after A sent a card. Phone A: skip.
  - **Expected:** Phone B push "Activity Cards" + "skipped this one, your turn to pick again".

- [ ] **30-Day Challenge day-done push** 📡 📱
  1. Phone B: lock screen. Phone A: Challenge → mark today done.
  - **Expected:** Phone B push "Challenge update ✓" + "marked day N done, your turn".

- [ ] **Fantasy Wishes mutual match push** 📡 📱 💰
  1. Both premium, at least one item already yes-voted by B. Phone B: lock screen. Phone A: vote yes on same item.
  - **Expected:** Phone B push "New match ✨" + "shared fantasy wish".

- [ ] **Time Capsule sealed push** 📡 📱
  1. Phone B: lock screen. Phone A: Time Capsules → seal a new capsule.
  - **Expected:** Phone B push "Time Capsule sealed 🕰️" + open date.

- [ ] **Tease (Flash) push** 📡 📱
  1. Phone B: lock screen. Phone A: Tease → send a flash.
  - **Expected:** Phone B push (title/body per flash type).

- [ ] **Intimacy Log push** 📡 📱 💰
  1. Both premium. Phone B: lock screen. Phone A: log an intimate moment.
  - **Expected:** Phone B push "Intimacy Log 💝" + "logged an intimate moment".

- [ ] **Journal entry push** 📡 📱
  1. Phone B: lock screen. Phone A: Journal → write + share.
  - **Expected:** Phone B push per journal service.

- [ ] **Together List add push** 📡 📱
  1. Phone B: lock screen. Phone A: Together List → add new item.
  - **Expected:** Phone B push per todo service.

- [ ] **Sunday Check-in (State Union) push** 📡 📱
  1. Phone B: lock screen. Phone A: Sunday Check-in → complete a session.
  - **Expected:** Phone B push per state-union service.

### System behaviour
- [ ] **Deep link from push opens correct screen** 📡 📱 ⚠️
  1. Phone B: locked → receive Love Note push → tap notification.
  - **Expected:** App opens directly to /notes (not just Home).

- [ ] **Notification toggle OFF stops pushes** 📡 ⚠️
  1. Phone B: Profile → toggle Push notifications OFF. Phone A: send a Spark.
  - **Expected:** Phone B receives nothing for 2+ minutes. Toggle back ON → next event arrives.

- [ ] **Foreground behaviour: banner still shows when app is open** 📡 📱
  1. Phone B: app open on Home. Phone A: send Spark.
  - **Expected:** iOS/Android in-app banner slides down (per `setNotificationHandler` config in `_layout.tsx`).

- [ ] **iOS: revoke permission in Settings → toggle in Profile reflects OFF** 📡 ⚠️
  1. Phone B: iOS Settings → Desire → Notifications → OFF. Reopen app → Profile.
  - **Expected:** Notifications row shows "Off" hint pointing to Settings.

- [ ] **Second install on same account overwrites pushToken** 📡 ⚠️
  1. Phone A signed in on device 1. Sign into same account on device 2.
  - **Expected:** `users/{uid}.pushToken` now holds device 2 token. Pushes arrive on device 2, not device 1.

---

## 9. iOS permissions (4 tests)

- [ ] **First camera use shows description string** ⚠️
  1. Fresh install on Phone A
  2. Tap "Take photo" anywhere (Moments, Tease, Time Capsule)
  - **Expected:** iOS prompt shows: "Love Desire uses the camera so you can capture daily Moments, send Tease photos and videos, and add photos to Time Capsules." → Allow/Deny.

- [ ] **First microphone use shows description string** ⚠️
  1. Fresh install
  2. Tease → 🎤 voice note → start recording
  - **Expected:** iOS prompt: "Love Desire uses the microphone so you can record voice notes in Tease and audio answers in Truth or Dare."

- [ ] **First photo library use shows description string** ⚠️
  1. Fresh install
  2. Profile → tap profile photo → Choose from library
  - **Expected:** iOS prompt: "Love Desire needs access to your photo library..."

- [ ] **Deny camera then try Tease → graceful failure** ⚠️
  1. iOS Settings → Love Desire → Camera → OFF
  2. Open Tease → 📷 button
  - **Expected:** Either Alert ("Camera permission needed. Enable in Settings.") or library picker alternative. NO crash.

---

## 10. Image upload + compression (2 tests)

- [ ] **Profile photo upload + partner sees** 📱
  1. Phone A: Profile → tap avatar → pick photo from library → Upload
  2. Phone B: Pull-to-refresh Home
  - **Expected:** Phone A avatar updates within 5s. Phone B partner card shows new avatar within 30s.

- [ ] **Moment photo compressed before upload**
  1. Take a high-res photo (12+ megapixel)
  2. Upload via Moments
  3. After upload completes, check Firebase Storage console: file size ≤ 2MB
  - **Expected:** Compressed to ≤ 2MB JPEG quality 0.7, max 1920px wide. Original camera output was ~3-8MB before compression.

---

## 11. GDPR + Account (3 tests)

- [ ] **Delete account preserves couple data for partner** 📱 ⚠️
  1. Phone A: Profile → Delete account → confirm with password
  2. Phone B: Open Home
  - **Expected:** Phone A signed out, Firebase auth user gone. Phone B couple card shows "Eva left" marker or partnerLeftAt indicator. Past memories/notes/moments still visible.

- [ ] **Both delete → couple fully deleted**
  1. After test above, Phone B also deletes account
  - **Expected:** All subcollections (notes, moments, memories, etc.) deleted from Firestore. Couple doc deleted. Storage files removed.

- [ ] **Privacy Policy + ToS open from Profile** ⚠️
  1. Profile → scroll to bottom → tap "Privacy Policy"
  2. Profile → tap "Terms of Service"
  - **Expected:** Each opens in-app reader with full document. Back button works.

---

## 12. Race conditions (2 tests)

- [ ] **Both flip same Activity Card** 📱 💰 ⚠️
  1. Both (premium): Activity Cards → both tap card 8 within 1 second
  - **Expected:** Only one flip persists. Other partner sees the card already flipped. No "double turn" or duplicate pending state.

- [ ] **Both post Moment photo simultaneously** 📱 ⚠️
  1. Both: take Moment photo
  2. Both: tap Upload within 1 second of each other
  - **Expected:** Both photos appear in today's grid. No "waiting for partner" stuck state.

---

## 13. State transitions (3 tests)

- [ ] **Sign out mid-Truth-or-Dare round** ⚠️ 📱
  1. Phone A: Truth or Dare active session, picker phase
  2. Phone A: Sign out from Profile
  3. Phone B: Open Truth or Dare
  - **Expected:** Phone B can either continue from same session, reset, or sees a "your partner left" message. No infinite loading.

- [ ] **Background app mid-Time-Capsule seal preserves state** ⚠️
  1. Phone A: Time Capsules → Seal new → fill message + photo → DON'T tap Seal
  2. Press home button (background)
  3. Wait 30s, come back
  - **Expected:** Form state preserved (message + photo still there). OR modal closed cleanly with no data loss other than the draft.

- [ ] **Disconnect couple → previous data hidden** 🔒 ⚠️ 📱
  1. Phone A: Disconnect from partner
  2. Phone A: try to access Moments, Notes, etc.
  - **Expected:** Empty states everywhere; no previous-couple data leaks. Pair with new partner → fresh start, no old data merged.

---

## Tally

**Coverage targets:**
- ✅ All 12 feature areas
- ✅ 5 core daily-engagement features tested 2-phone
- ✅ Security rules validated behaviourally
- ✅ iOS permission prompts verified
- ✅ Push notification reliability
- ✅ Race conditions for known concurrent paths

**Total: 59 tests**
- 📱 Two-phone: ~30
- 🌍 LDR: 4
- ⚠️ Edge cases: ~18
- 💰 Paid-gate: 11
- 🔒 Security: 8

**Estimated time: 4-6 hours with 2 phones, single tester.**

If beta with 5 real couples: distribute checklist sections (~12 tests each) across couples for parallel coverage.

---

> When this passes end-to-end, you're launch-ready. For deep verification before major releases or after big refactors, fall back to the full `TEST_CHECKLIST.md` (902 tests).
