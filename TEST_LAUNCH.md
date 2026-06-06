# Desire — Launch Test Plan

> Focused subset of the comprehensive [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) for **every release**. ~65 tests, 4-6 hours with 2 phones. Catches ~80% of regressions.

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

---

## 1. Auth + Pairing (4 tests)

- [ ] **Register with 18+ consent → routed to onboarding**
  1. Phone A: Launch app fresh, tap "Create one"
  2. Enter new email + password (×2)
  3. Tap 18+ checkbox so it fills burgundy
  4. Tap "Create Account"
  - **Expected:** Loading spinner, then "Welcome!" name+photo screen.

- [ ] **Login with verified email succeeds**
  1. Phone A: Sign out, then enter credentials
  - **Expected:** Lands on Home with mood picker visible.

- [ ] **Invite code flow connects both phones** 📱
  1. Phone A: Profile → Get invite code → copy 8-char code
  2. Phone B: Enter code in pairing screen → tap Join
  - **Expected:** Both phones show paired state within 5s. Phone A sees Phone B's name in couple card. Phone B sees Phone A's name.

- [ ] **Disconnect couple removes pairing both sides** 📱
  1. Phone A: Profile → Disconnect from partner
  2. Confirm in modal
  - **Expected:** Phone A returns to pairing screen. Phone B's home shows "Connect with partner" prompt within 10s.

---

## 2. Core daily features (10 tests)

- [ ] **Mood pick syncs to partner within 30s** 📱
  1. Phone A: Tap 😍 In love
  2. Phone B: Pull-to-refresh Home
  - **Expected:** Phone B partner card shows 😍 In love label.

- [ ] **Spark pill sends + nudges partner** 📱
  1. Phone A: Tap ❤️ Love you pill
  - **Expected:** Phone B home banner: "Eva sent you a spark · just now · ❤️ Love you" within 30s.

- [ ] **Daily Question answer reveal when both done** 📱
  1. Both: Open Questions Game → pick same category
  2. Both: Type answer to question 1 → Send
  - **Expected:** Both screens reveal both answers side by side within 10s.

- [ ] **Daily streak bumps once when both answer** 📱
  1. Both: Complete daily question (above test) on day N
  - **Expected:** Streak indicator on Questions Game header shows 🔥 1 (not 🔥 2). Repeat next day → 🔥 2.

- [ ] **Moment photo capture + reveal when both posted** 📱
  1. Phone A: Open Moments → 📸 → take photo → upload
  2. Phone B: Open Moments
  3. Phone B: Take photo → upload
  - **Expected:** Phone B sees "Waiting for Eva..." until Phone A posted. After both: side-by-side reveal of both photos. Phone A receives nudge banner.

- [ ] **Streak Moments bumps once per day**
  1. After both submit Moment same day
  - **Expected:** Streak count shows N (not N+N or N×2). Refreshing doesn't double-count.

- [ ] **Love Note "Right now" arrives instantly** 📱
  1. Phone A: Notes → New → "Right now" → write "test" → Send
  - **Expected:** Phone B inbox shows the note within 30s. Tap to open shows message.

- [ ] **Love Note edit + delete** ⚠️
  1. Phone A: Notes → tap own draft → ✏️ Edit → change text → Save
  - **Expected:** Note text updates immediately. Then tap 🗑️ → confirm → note removed from list.

- [ ] **"When you're sad" note unlocks on partner mood pick** 📱
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
  1. Both: Navigate to a binary daily question (e.g., "Beach or Mountains?")
  - **Expected:** Both see two large buttons "Beach" and "Mountains". Tap → answer locks in. Both partners answered → reveal shows both choices side by side.

- [ ] **Questions Game scale format** 📱
  1. Both: Find a scale question (e.g., "How adventurous are you feeling?")
  - **Expected:** Both see 1-5 row with "1=not at all · 5=completely" hint. Tap → submit → reveal shows both scores.

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

- [ ] **Dare Wheel spin lands on a card** ⚠️
  1. Phone A: Discover → Dare Wheel → pick Flirty → tap Spin
  - **Expected:** Wheel animates ~3s then lands on a dare card. Tap "Done" to spin again.

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

- [ ] **Hita Pulse 10-Q + history + trend chart**
  1. Phone A: Hita → answer all 10 → See my pulse
  2. Tap History tab
  - **Expected:** Single result first time. Take twice more (~3 entries) → trend chart appears with vertical bars. Trend label shows "stable / improving / declining".

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

- [ ] **Free user → Fantasy Wishes → upgrade gate** 💰
  1. Phone B (non-premium): Love hub → Fantasy Wishes
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

## 8. Push notifications (4 tests)

- [ ] **Spark push arrives within 30s on locked phone** 📱
  1. Phone B: lock screen
  2. Phone A: send any Spark
  - **Expected:** Phone B receives push within 30s. Lock-screen banner shows "Eva sent you a spark ✨" + the message.

- [ ] **Question answered push arrives within 30s** 📱
  1. Phone B: lock screen
  2. Phone A: submit a Questions Game answer
  - **Expected:** Phone B push: "Eva answered a question, your turn!" within 30s.

- [ ] **Deep link from push opens correct screen** 📱 ⚠️
  1. Phone B: lock screen → receive Love Note push → tap notification
  - **Expected:** App opens directly to /notes (not just Home).

- [ ] **Notification toggle OFF stops pushes** ⚠️
  1. Phone B: Profile → toggle Push notifications OFF
  2. Phone A: send a Spark
  - **Expected:** Phone B receives nothing for 2+ minutes. Toggle back ON → next event arrives.

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

## 12. Race conditions (3 tests)

- [ ] **Simultaneous Questions Game final answer → streak bumps once** 📱 ⚠️
  1. Both: have answered Q1, Q2 of category, Q3 ready
  2. Both: tap "Send answer" on Q3 within 1 second of each other
  - **Expected:** Streak count increases by exactly 1 (not 2). Refresh both phones → both show same count.

- [ ] **Both flip same Activity Card** 📱 💰 ⚠️
  1. Both (premium): Activity Cards → both tap card 8 within 1 second
  - **Expected:** Only one flip persists. Other partner sees the card already flipped. No "double turn" or duplicate pending state.

- [ ] **Both post Moment photo simultaneously** 📱 ⚠️
  1. Both: take Moment photo
  2. Both: tap Upload within 1 second of each other
  - **Expected:** Both photos appear in today's grid. Streak bumps exactly once. No "waiting for partner" stuck state.

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

**Total: 57 tests**
- 📱 Two-phone: ~30
- 🌍 LDR: 4
- ⚠️ Edge cases: ~18
- 💰 Paid-gate: 9
- 🔒 Security: 8

**Estimated time: 4-6 hours with 2 phones, single tester.**

If beta with 5 real couples: distribute checklist sections (~12 tests each) across couples for parallel coverage.

---

> When this passes end-to-end, you're launch-ready. For deep verification before major releases or after big refactors, fall back to the full `TEST_CHECKLIST.md` (902 tests).
