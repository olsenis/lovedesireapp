# Test checklist — Aug 27 retention batch

Manual QA walkthrough for the 5 retention interventions + content shipped Aug 27, 2026.

**Setup:**
1. Confirm QA patches are still active (uncommitted local changes):
   - [app/(tabs)/index.tsx](app/(tabs)/index.tsx) — Moments nudge threshold `>= 1` (was `>= 8`)
   - [constants/content.ts](constants/content.ts) — `getCurrentSeason` forced to return `'fall'`
2. Reload the app (`r` in Metro terminal, or shake → Reload in Expo Go).

---

## 1. Upgrade screen re-frame (#3) — no QA patch needed

- [ ] Open Discover tab
- [ ] Tap any feature with 🔒 (Fantasy Wishes, Sensate, Blueprint, etc.)

**Expected:**
- Hero: 💝 "Love Desire Premium" / "Everything that keeps intimacy from going on autopilot"
- Section header (uppercase burgundy): **THE THREE DEEP FEATURES**
- 3 cards in sequence with rose border: Fantasy Wishes / Sensate Focus / Fire & Desire challenges
- Section header (uppercase muted): **AND EVERYTHING ELSE THAT COMES WITH IT**
- 4 cards on blush background: Tease / Activity Cards / Spicy content everywhere / The Lovers quiz

**Fail if:** flat list of 7 items without section headers = old version.

---

## 2. Moments archive nudge (#4) — QA patch active

- [ ] If no Moment captured today: Home → Moments → today's slot → both partners take a photo
- [ ] Return to Home tab

**Expected in "Waiting for you" stack:**
- 📸 "N Moments together already"
- Subtitle: "See how the story is growing"

- [ ] Tap the nudge → routes to /moments
- [ ] Back to Home → **nudge should be gone** (one-shot, never reappears)

**Fail if:** nudge does not appear, or reappears after tap.

---

## 3. Sunday CI rotation (#1) — Firebase Console action required

- [ ] Firebase Console → Firestore → `couples/{coupleId}/stateUnion/2026-35` → Delete document
- [ ] In app: open Sunday Check-in (Us tab or profile link)
- [ ] Doc regenerates with a new `questionSetId`

**Expected:**
- 5 questions that are **not** the original Gottman baseline (unless the deterministic pick happens to land on set 0 for this couple)
- Original 5 to compare against:
  1. What went well between us this week?
  2. What was hard for you this week?
  3. What's one thing I appreciate about you?
  4. What's one thing I'd love more of from you?
  5. What are we looking forward to together?

**Should sound like:** warm, honest, 2nd person, 6-18 words, invitational rather than survey.

**Fail if:** same 5 as original (rotation not firing), or questions sound corporate/therapy/jargon-heavy.

---

## 4. Fall Reflections pack (#5) — QA patch active

- [ ] On Home, look at "Waiting for you" stack

**Expected:**
- 🍂 "New this season: Fall Reflections"
- Subtitle: "10 questions for slow days and cozy nights. Playful and Romantic mix."

- [ ] Tap the nudge → routes to /would-you-rather
- [ ] Look at the pack picker

**Expected packs:**
1. Getting to know you (launch pack)
2. Friday night (launch pack)
3. **Fall Reflections 🍂**
4. Winter Reflections ❄️
5. Spring Awakening 🌱
6. Summer Nights ☀️

(All seasonal packs are visible in the picker all the time. Only the Home nudge is time-gated.)

- [ ] Tap Fall Reflections → see 10 questions
- [ ] Verify: pack is `paid: false`, works for free tier
- [ ] Verify: questions are autumn-themed but not cheesy (no "pumpkin spice")

- [ ] Back to Home → **Fall nudge should be gone** (one-shot)

**Fail if:** nudge does not appear, packs missing, or pack is paywalled.

---

## 5. Your Year Together (#2) — no QA patch needed

- [ ] Profile tab → tap "✨ Your Year Together"

**Expected on cover slide:**
- Eyebrow (uppercase): **YOUR YEAR TOGETHER**
- Big year number (2026)
- Names: "{your name}  &  {partner name}"
- Hint at bottom: "Swipe to begin →"

**Fail if:** eyebrow says "YEAR IN REVIEW" = old version.

- [ ] Swipe through — slides render for every metric > 0

**Possible new slides** (render conditionally on data):
- Sundays (weeks you paused to look at us)
- Presence (full cycles together) — burgundy bg, cream text
- Fantasy Matches — pink bg, cream text
- Sparks Sent (times you reached for {partnerName})
- Tease (ephemeral moments, gone by morning) — dark bg

- [ ] Reopen from Home → **loads fast** (session cache should short-circuit)

**Fail if:** slides that should have data render as empty, or all slides render as empty.

---

## 6. Content quality spot-check (bonus)

- [ ] In Sunday CI (after step 3): read the questions aloud. Do they sound like the answerer is talking to self or partner, not like a therapist or survey?
- [ ] In Fall Reflections: read 2-3 questions. Cozy fall vibe without cheese?
- [ ] Scan any UI copy: look for words like "them", "their" — should be **none** in retention-batch content.

---

## 7. Bug fixes shipped Aug 27 (post-initial-batch)

Regression checks for the bugs that landed during device-test rounds.

### 7a. Mood History card layout (`86322ad`)

- [ ] Profile → Mood tracker → "Mood History" (or wherever the screen surfaces)
- [ ] Switch to "Together" tab

**Expected:**
- Two side-by-side cards at the top: "Same mood" (left) and "Different moods" (right)
- Both cards are **equal width**
- "SAME MOOD" label reads as one line, not character-by-character wrap

**Fail if:** left card is squeezed narrow and "SAME MOOD" wraps as "S A M E M O O D".

### 7b. Truth or Dare level swap preserves pending card (`86322ad`)

- [ ] Open Truth or Dare (Discover tab)
- [ ] Start Wherever You Are mode, pick e.g. Sweet
- [ ] Draw or write a Truth/Dare, send it to partner (phase becomes "answering")
- [ ] While the partner has not answered yet, tap **Flirty** tab

**Expected:**
- Level tab visually switches to Flirty
- **Pending card is preserved** — the partner still sees the sent card
- Turn badge still says "waiting for {partner} to answer"

**Fail if:** switching tab resets to picker with no pending card visible = bug regression.

### 7c. WYR waiting state — copy + re-pick (`86322ad`)

- [ ] Would You Rather → any level → pick answer A (or B)
- [ ] Do NOT let partner answer yet

**Expected below the two options:**
- Line 1: "Locked in. {partner} sees this question the next time the app is open. Both picks reveal at the same time."
- Line 2: "Tap {other letter} to change your pick before {partner} answers."

- [ ] Tap the OTHER letter (B if you picked A)

**Expected:**
- Selection flips to the other option
- **No push notification** fires to partner on the change (partner only got one push on your first pick)

- [ ] Tap the same letter again (no change)

**Expected:** nothing happens, no double-push.

**Fail if:** wait copy is single-line "Waiting for {partner}…", or re-tap does nothing, or partner gets spammed with pushes.

### 7d. Expo Go push warning silenced (`9ff3c67`)

- [ ] Sign out (Profile → Sign out)
- [ ] Sign back in

**Expected:**
- **No red LogBox banner** at the top of the screen
- No "expo-notifications: Android Push notifications ... was removed from Expo Go" console error

**Fail if:** red LogBox still appears on login. (This is only a QA-time fix — real EAS builds always had push working; this just quiets Expo Go noise.)

### 7e. Auth screens — Sign In visible above keyboard (`4c9b40b`)

- [ ] Sign out
- [ ] On the Login screen, tap the email input

**Expected:**
- Keyboard opens
- Email + password inputs stay visible
- **Sign In button is visible right above the keyboard** (no scroll needed to reach it)

- [ ] Repeat on Create Account screen: tap email → Sign Up / Create Account button visible above keyboard
- [ ] Repeat on Onboarding (Continue after first sign up): tap name input → Continue button visible above keyboard

**Fail if:** button falls behind keyboard on any of the three screens.

### 7f. Sunday CI "See you next Monday" line (`0204534`)

- [ ] Complete Sunday Check-in on both phones (or open a week both have already completed)

**Expected on the reveal card, right under "You both checked in 💗":**
- Small italic muted line: *See you next Monday*

**Fail if:** hint line missing, or copy says something else.

### 7g. Daily TextInput auto-scroll above keyboard (`2993270`)

- [ ] Open Daily (any category)
- [ ] Advance to a question card past the first (e.g. card 4 or later)
- [ ] Tap the "Type your answer…" input

**Expected:**
- Keyboard opens
- ScrollView auto-scrolls (~250ms after keyboard opens)
- **Text input and Send button are visible above the keyboard**

**Fail if:** the input stays behind the keyboard and the user has to manually scroll.

### 7h. Our Story matches archive (`aad3a76`)

- [ ] Us tab → Our Story

**Expected between the stats grid and the timeline:**
- Section header (uppercase muted): **YOUR ARCHIVE**
- Three sub-cards in a row:
  - ✨ Fantasy matches — count + "View →" if > 0
  - 🌹 Daily matches — count + "View →" if > 0
  - 🕯️ Sunday check-ins — count + "View count" if > 0

**Card states:**
- During load: cards show `—` instead of `0`
- Zero data: cards show `0` and are not tappable (no "View →")
- Data present: cards show number and are tappable

- [ ] Tap Fantasy matches (if > 0)

**Expected modal:**
- Title: ✨ Fantasy matches
- Scrollable list of item text + matched date
- Close via ✕ in top right

- [ ] Tap Daily matches (if > 0)

**Expected modal:**
- Title: 🌹 Daily matches
- Scrollable list of item text + date (YYYY-MM-DD)
- Newest first

- [ ] Tap Sunday check-ins (if > 0)

**Expected modal:**
- Title: 🕯️ Sunday check-ins
- Small count row at top: "N weeks together"
- Scrollable list of every completed week: date (e.g. "30 Aug 2026") + chevron `▸`

- [ ] Tap a week row

**Expected:**
- Row expands (chevron flips to `▾`)
- "Loading…" briefly, then the 5 questions render with You + partner answers side by side
- Re-tapping same row collapses, tapping a different row expands that one

**Fail if:** section missing, tap does not open modal when count > 0, week rows missing, or expand does not reveal past answers.

---

## When testing is complete

Tell Claude:
- **✅ All passed:** Claude reverts the QA patches (`git checkout ...`), re-runs tsc + verify script, confirms everything is clean.
- **❌ Something failed:** describe what you saw and on which screen. Claude diagnoses and fixes.

## Shipped commits covered by this checklist

Retention batch:
- `cfe2926` — Retention #3 upgrade re-frame + #4 Moments archive nudge
- `50b6339` — Retention #1 Sunday CI rotation (framework + 5 starter sets)
- `5b36d2b` — Retention #5 seasonal drops framework
- `13ff197` — Retention #2 Your Year Together upgrade
- `5769d8e` — Sunday CI content: 20 new sets, 100 questions
- `b11b3de` — Fall Reflections 2026 WYR pack
- `c0ac650` — Winter/Spring/Summer WYR packs + getSeasonYear fix
- `c4de5d7` — Standalone verification script (`node scripts/verify-retention-content.mjs`)

Bug fixes (during device-test rounds):
- `86322ad` — Mood History layout + Truth or Dare level swap + WYR wait state
- `9ff3c67` — Expo Go push notification warning silenced
- `4c9b40b` — Auth screens Sign In / Continue behind keyboard
- `0204534` — Sunday CI reveal "See you next Monday" hint
- `2993270` — Daily TextInput auto-scroll above Android keyboard
- `aad3a76` — Our Story matches archive (Fantasy + Daily + Sunday check-ins)
- `751aa78` — Our Story: browsable Sunday check-in history (list + expand + reveal)
