# Desire — Launch Test Plan

> Focused subset of the comprehensive [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) for **every release**. ~62 tests, 4-6 hours with 2 phones. Catches ~80% of regressions.
>
> **Section 0 (Pre-launch content review) runs ONCE before App Store submission** — full read-through of every content pool (~2400 items). Budget 4-6h over two sittings.
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

- **Daily** — Discover → Daily (or Home → Tonight's Picks → Daily). 3 categories: 😊 Playful (free), 💛 Deep (paid 🔒), 🔥 Spicy (paid 🔒). Merged Daily Picks + Questions Game (July 2026): each category interleaves action cards (vote Yes/Not for me) and question cards (private answer → reveal when both done). Route: `/daily`. Legacy `/daily-wishes` and `/questions-game` redirect here.
- **Versus** — Data-gated: card is hidden in Discover until partner has answered 5+ binary questions in Daily. Once unlocked, appears at position 2 with a `NEW` badge for 7 days. Not paywalled.
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
**Games:** Truth or Dare Sweet + Flirty, Daily **Playful** category (merged
Sweet action cards + Playful question cards), Versus mode (data-gated —
appears after partner has 5+ binary answers), Would You Rather Playful +
Romantic, Date Night Roulette (full).
Note: Dare Wheel was folded into Truth or Dare, Time Capsules removed
July 2026 — no separate route for either.

**Rituals + Async (Us tab / Home / Profile):** Mood (except Kinky/Horny),
Spark, Love Notes, Moments, Tease, Journal, Sunday Check-in, Together List
(via Home). Utility screens moved to Profile → Reminders & tools: Calendar,
Countdowns, Flirt Reminders, Relationship Pulse.

**Insights:** Love Language Quiz, Relationship Pulse (with trend chart —
now in Profile), Our Story, Year-in-Review, 30-Day Challenge Reconnect + Spark

### PAID (locked with 🔒 icon, tap sends to /upgrade)
**Games:** Truth or Dare Spicy level, Daily **Deep + Spicy** categories
(includes ex-Flirty action cards which moved from free tier as part of the
merge), Would You Rather Spicy level, Activity Cards (entire feature),
Fantasy Wishes (entire feature)

**Intimacy:** Erotic Blueprint (entire feature), Sensate Focus (entire
feature), Intimacy Log (opt-in from Profile — free but hidden by default)

**Mood:** 😈 Kinky, 🥵 Horny emojis (last two on the picker)

**Programs:** 30-Day Challenge Fire + Desire programs

---

## 0. Pre-launch content review (one-shot before App Store submission)

Every content pool must be read end-to-end before shipping. You are looking for:

- **Spelling / grammar errors** (the fastest to catch, most embarrassing to miss)
- **Awkward phrasing** — anything that reads clinical, cringe, or "translated from another language"
- **Tone drift within a level** — a "Sweet" item that's actually spicy, a "Deep" question that's actually playful. Level integrity matters.
- **Tier appropriateness** — Sweet / Flirty / Playful / Playful (Deep) must be App Store safe (no explicit sexual content). Spicy / Fantasy Wishes / Sexual pools can be X-rated per prompts.
- **English-only rule** (CLAUDE.md) — no Icelandic drift, no accented characters that shouldn't be there
- **No em dashes** (—) in any UI string — use commas instead
- **Duplicates** — same phrasing appearing twice in the same pool
- **Length** — anything over ~140 chars will overflow UI cards on smaller phones

For each pool, tick the box only after reading every item. If you find one drift issue, log the fix and re-read only that section on the follow-up commit.

### Content pools

- [ ] **Daily questions** — [constants/content.ts:QUESTIONS](constants/content.ts) · 474 items (surfaced via merged Daily screen; source unchanged post-merge)
  - Playful (87) · free tier · [must be App Store safe]
  - Deep (241) · paid tier · [vulnerable / romantic / growth; not explicit]
  - Spicy (146) · paid tier · [explicit permitted per explicit_content_prompt.md]

- [ ] **Dares** — [constants/content.ts:DARES](constants/content.ts) · 189 items
  - Sweet (45) · free tier · [physical action, cute/romantic]
  - Flirty (46) · free tier · [sensual kissing/touch, App Store safe]
  - Spicy (98) · paid tier · [explicitly sexual, X-rated allowed]
  - Verify: every dare is a physical action ("do X"), never a verbal one ("say X" / "describe X").

- [ ] **Truths** — [constants/content.ts:TRUTHS](constants/content.ts) · 311 items
  - Sweet (95) · free tier · [emotional, App Store safe]
  - Flirty (95) · free tier · [physical attraction, App Store safe]
  - Spicy (121) · paid tier · [explicitly sexual, X-rated allowed]

- [ ] **Would You Rather** — [constants/content.ts:WYR_QUESTIONS](constants/content.ts) · 191 items
  - Playful (70) · free tier
  - Romantic (60) · free tier
  - Spicy (61) · paid tier

- [ ] **Daily actions** — [constants/content.ts:DAILY_WISH_ITEMS](constants/content.ts) · 224 items (surfaced via merged Daily screen; category `sweet` renders under Playful, `flirty` + `spicy` render under Spicy)
  - Sweet (60) · free tier
  - Flirty (60) · free tier
  - Spicy (104) · paid tier · [merged from old Spicy + Sexual, July 2026]

- [ ] **Fantasy Wishes** — [constants/content.ts:FANTASY_WISHES_PRESETS](constants/content.ts) · 394 items · paid tier only
  - Verify: noun/gerund phrases, not commands ("Kiss for 30 seconds") or questions ("What if we...?"). Prompt: memory/fantasy_wishes_prompt.md.
  - Categories: Sensual / Roleplay / Explicit / BDSM

- [ ] **Date Ideas** — [constants/content.ts:DATE_IDEAS](constants/content.ts) · 130 items
  - Home (~53) · Out (~39) · Adventure (~38) · Virtual for LDR (~28)
  - Each has a title + 1-2 sentence description. Both must read well.

- [ ] **30-Day Challenge tasks** — [constants/content.ts:CHALLENGE_PROGRAMS](constants/content.ts) · 120 items
  - 4 programs × 30 days: Reconnect (free) · Spark (free) · Fire (paid) · Desire (paid, 18+)

- [ ] **Activity Cards** — [constants/content.ts:BINGO_ACTIVITIES + BINGO_REWARDS](constants/content.ts) · 55 + 10 items · paid tier

- [ ] **Blueprint Quiz** — [constants/content.ts:BLUEPRINT_QUESTIONS + BLUEPRINT_COMPATIBILITY](constants/content.ts) · 15 questions + 25 pair compatibility entries · paid tier

- [ ] **Love Language Quiz** — [constants/content.ts:QUIZ_QUESTIONS + LOVE_LANGUAGE_LABELS](constants/content.ts) · 10 questions + 5 labels · free tier

- [ ] **Sunday Check-in questions** — [services/stateUnionService.ts:STATE_UNION_QUESTIONS](services/stateUnionService.ts) · 5 questions · free tier

- [ ] **Sensate Focus prompts** — [constants/content.ts (SENSATE prompt data)](constants/content.ts) · 3 stages of rotating prompts · paid tier

- [ ] **Preset onboarding-tour copy** — [app/onboarding-tour.tsx](app/onboarding-tour.tsx) · every screen's copy read in order
  - First impression of the app after pairing — one of the highest-value read-throughs.

- [ ] **Preset home nudge subtitles** — [app/(tabs)/index.tsx nudges memo (~line 250-500)](app/(tabs)/index.tsx) · 30+ conditional subtitle strings
  - These fire opportunistically. Grep for the memo body and read every subtitle template.

- [ ] **Preset Love Language daily tip rotation** — [app/(tabs)/index.tsx getLanguageTip (~line 76-111)](app/(tabs)/index.tsx) · 5 languages × ~7 tips each

### Sweep tests (run once after content pass is done)

- [ ] **Grep for em dashes across all content files** — `Grep(pattern: "—")` in `constants/` and `services/` returns zero user-facing hits
- [ ] **Grep for Icelandic characters** — `Grep(pattern: "[áéíóúýþæðöÁÉÍÓÚÝÞÆÐÖ]")` in `app/**/*.tsx` and `constants/` returns zero user-facing hits (privacy-policy / terms may be exempt if intentional)
- [ ] **Grep for legacy category names** — `Grep(pattern: "'sexual'|'fantasy'|Romantic|Therapy")` in `constants/content.ts` returns zero hits (all migrations complete)

### Notes

- Prompts for generating consistent content live in `memory/question_writer_prompt.md`, `memory/explicit_content_prompt.md`, and `memory/fantasy_wishes_prompt.md`. Use them for any additions during this review.
- Rough total: ~2400 items to read. Budget ~4-6 hours over two sittings. Don't try to power through in one — tone fatigue leads to false positives.

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

- [x] **Post-login consent modal fires for legacy account without consent doc** ⚠️
  1. Delete `users/{uid}/private/consent` in Firestore devtools for an existing account
  2. Sign out, sign back in
  - **Expected:** Full-screen 18+ consent modal blocks all navigation. Home is unreachable until Confirm or Decline. Terms of Service and Privacy Policy links inside the paragraph are tappable and open the correct screens; back returns to the modal.

- [x] **Decline path deletes the auth user (no bypass by signing back in)** 🔒 ⚠️
  1. Sign in with a fresh account, get to the consent modal
  2. Tap "I am under 18 — Exit"
  3. Try to sign back in with the same credentials
  - **Expected:** Sign-in fails with "user not found". No Firestore consent doc exists. Re-registration requires fresh 18+ attestation.

- [x] **Login with verified email succeeds**
  1. Phone A: Sign out, then enter credentials
  - **Expected:** Lands on Home with mood picker visible.

- [x] **Re-login of fully-paired user goes straight to Home, NOT onboarding/pairing** ⚠️
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

## 2. Core daily features (10 tests)

- [x] **Mood pick syncs to partner within 30s** 📱
  1. Phone A: Tap 😍 In love
  2. Phone B: Pull-to-refresh Home
  - **Expected:** Phone B partner card shows 😍 In love label.

- [x] **Spark pill sends + nudges partner** 📱
  1. Phone A: Tap ❤️ Love you pill
  - **Expected:** Phone B home banner: "Eva sent you a spark · just now · ❤️ Love you" within 30s.

- [x] **Daily question reveal when both answered** 📱
  1. Both: Discover → Daily (or Home → Tonight's Picks → Daily) → Playful category (default; Deep and Spicy are 🔒 paid)
  2. Both: scroll to a QUESTION card (interleaved after action cards, marked with burgundy `QUESTION` pill) → Type answer → Send answer
  - **Expected:** Both screens reveal both answers side by side within 10s. Own answer in green box on left, partner's answer in green box on right. Route is `/daily` (Questions Game merged into Daily July 2026).

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

- [x] **Daily action mutual match adds to Together List** 📱
  1. Both: Open Daily → Playful, scroll to action cards (marked with burgundy `PICK` pill)
  2. Both: vote ✓ Yes on the same action card
  - **Expected:** Both cards flip to rose-bordered match state showing `✓ You both want this!` + `+ Add to Together List` button. One partner taps Add → both phones show `✓ Added to Together List`. Open `/todo` → item appears under Date Ideas (Playful/Sweet mapping). Route is `/daily` (Daily Picks merged into Daily July 2026).

- [x] **Home shows unified Daily nudge when partner is ahead** 📱
  1. Phone A: open `/daily` → Playful → answer 1 question + vote on 2 action items
  2. Phone B: refresh Home
  - **Expected:** Exactly ONE `💫 Daily is waiting` nudge in `Waiting for you` section. Subtitle: `Eva is ahead by 1 question + 2 picks today`. Tap → opens `/daily` (auto-selects category where partner is ahead). Regression check: pre-July-2026 there were two separate nudges (Questions Game + Daily Picks) that could BOTH appear at once.

- [x] **Daily nudge clears when I catch up on the deficit** ⚠️ 📱
  1. Nudge fires (partner ahead by 1 question + 2 picks)
  2. Phone B: tap nudge → answer the same question, vote on the same 2 picks → Home → refresh
  - **Expected:** `💫 Daily is waiting` nudge disappears. Other unrelated nudges (challenge, notes, etc.) stay. Diff-based trigger resolves naturally as caller catches up. Regression check: pre-fix DP nudge fired on `myVoteCount < 20` which never cleared because schema is 15 items — partial voters got stuck-nudged forever.

- [x] **Intimacy Log entry with backdate picker** 💰
  1. Us tab → Intimacy Log → tap "We were intimate" hero button
  2. Sheet opens with `When?` date picker at top, defaulted to today
  3. Tap picker → pick a date 3 days in the past → fill required fields → Save
  - **Expected:** Sheet closes; Recent list shows the past date (not today). Stats screen still counts the entry. Future dates are blocked in the picker + clamped in the handler. Regression check: pre-July-2026 the entry always used `Date.now()` so users could only log "today".

## 3. Games — multiplayer correctness (13 tests)

- [ ] **Truth or Dare full round end-to-end** 📱
  1. Phone A: Open Truth or Dare → start → pick Sweet level
  2. Phone A: Draw card → "Send Truth" 
  3. Phone B: Receives card → type answer → Send
  4. Phone A: See partner's answer
  - **Expected:** Both phones move through picking/answering/done phases in sync. Score increments correctly on truth-answered.

- [ ] **Daily question binary format** 📱
  1. Both: Open Daily → Playful (or unlock Deep/Spicy) → cycle through today's 3 questions until a binary one appears (e.g., "Beach or Mountains?", "Morning or night?")
  - **Expected:** Both see two large buttons (e.g. "Beach" and "Mountains"). Tap → answer locks in. Both partners answered → reveal shows both choices side by side.

- [ ] **Daily question scale format** 📱 💰
  1. Both: Unlock premium → Daily → Deep tab → scan today's 3 for a scale-format question (e.g., "How safe do you feel sharing something hard with me?", "How adventurous are you feeling?")
  - **Expected:** Both see 1-5 row with "1=not at all · 5=completely" hint. Tap → submit → reveal shows both scores. Scale prompts are almost all in Deep + Spicy so this test currently requires premium.

- [x] **Daily category picker: all 3 tabs accessible for paid user** 💰
  1. Paid user opens `/daily`, taps each of `😊 Playful` / `💛 Deep` / `🔥 Spicy`
  - **Expected:** No 🔒 badges. Each tab opens instantly, no `/upgrade` redirect. Deep shows 5 PICK + 3 QUESTION cards (Deep gained its own action pool August 2026 — was 3 questions only pre-fix). Spicy shows 13 items (4 warmup PICK + interleaved QUESTIONs). Playful shows 8 items (3 warmup PICK + interleaved). Each cat has its own tagline copy.

- [x] **Legacy routes redirect cleanly** ⚠️
  1. Navigate to `/daily-wishes` (no param) → auto-replaces to `/daily?category=playful`
  2. Navigate to `/daily-wishes?category=flirty` → auto-replaces to `/daily?category=spicy` (Flirty moved to paid Spicy tier as part of merge)
  3. Navigate to `/questions-game?category=deep` → auto-replaces to `/daily?category=deep` (Q category names match merged category names exactly)
  4. Navigate to `/questions-game` (no param) → auto-replaces to `/daily` (defaults to Playful)
  - **Expected:** Each URL shows a plain cream flash for at most one frame, then lands on the correct `/daily?category=...`. No 404. No hang. Back button behaves — `router.replace` cleared the stub from history so back goes to the previous route (tabs), not the stub.

- [x] **Daily auto-selects category where partner is ahead** ⚠️ 📱
  1. Partner (Phone A) answers 1 Deep question (a cat where user is behind)
  2. User (Phone B) taps `💫 Daily is waiting` nudge on Home
  - **Expected:** `/daily` opens with `💛 Deep` tab active (not Playful default). Auto-selector picked Deep because partner is ahead there and questions rank above actions. Manual tap on another tab sets `autoSelected=true` guard so subsequent nudge taps in the same session don't steal focus back.

- [x] **Daily rows interleave (actions first + spread pattern)** ⚠️
  1. Both partners open Daily → Playful with no votes/answers yet
  - **Expected:** Card sequence is exactly `A,A,A,Q,A,Q,A,Q` — 3 warmup action cards (burgundy `PICK` pill), then alternating action/question after that. Spicy: `A,A,A,A,Q,A,A,Q,A,A,Q,A,A`. Deep: `A,A,A,Q,A,Q,A,Q` (5 reflective PICK + 3 QUESTION, same interleave shape as Playful now that Deep has an action pool). Both partners see identical order. Regression check: pre-July-2026 Playful showed 5 actions clustered then 3 questions clustered — user flagged this as a "dull wall". Deep was questions-only until August 2026.

- [x] **Daily progress card shows one combined counter** ⚠️
  1. Playful: vote on some actions, answer some questions
  - **Expected:** Progress card shows `X/8 Done today` where X = votes + answers. NOT the previous split `X/5 You voted` + `Y/3 You answered`. Regression check: user reported the split `5/5` looked like "done" when 3 questions were still unanswered.

- [ ] **Versus mode end-to-end** 📱 💰
  1. Phone B: Discover → tap Versus card (only appears when partner has 5+ binary answers in Daily; hidden otherwise)
  - **Expected:** If 10+ binary questions in history: 10-question quiz starts; each card shows partner's actual answer + 1 decoy; score tallied; final gradient card with %. If 5-9: shorter round with what's available. If <5: card is hidden from Discover entirely.

- [x] **Versus card hidden in Discover for new couples** ⚠️
  1. Fresh couple (partner has 0 binary answers), open Discover
  - **Expected:** Games list shows exactly 5 cards (Daily, Truth or Dare, WYR, Activity Cards, Fantasy Wishes). NO Versus card. Regression check: pre-July-2026 Versus was always visible so new couples always tapped into a dead-end "not enough answers yet" empty state.

- [ ] **Versus card appears with NEW badge after partner hits threshold** 📱
  1. Partner answers 5+ binary questions in Daily (may take a few days of active play)
  2. Reopen Discover
  - **Expected:** Games list now shows 6 cards including `🆚 Versus` at position 2 with a small burgundy `NEW` pill next to the title. Unlock is sticky (persisted in `users/{uid}/private/features.versusUnlockedAt`) and NEW badge decays after 7 days.

- [ ] **WYR session persists across app close** 📱
  1. Phone A: Open Would You Rather → Playful → start → answer Q1
  2. Phone A: Close app, reopen → Would You Rather
  - **Expected:** Session resumes at Q2 (or wherever they left off), not restart.

- [x] **WYR match → Save to Together List (single tap saves for both)** 📱
  1. Both: WYR → pick the same option on a question so a green `You match!` card appears
  2. Either partner: tap `+ Save to our list`
  - **Expected:** Success haptic. Button replaces with green pill `✓ Saved to Date Ideas` (Playful/Romantic) or `✓ Saved to Intimacy` (Spicy). Both phones flip to saved state within one Firestore snapshot. Open Together List → winning option text (e.g. `Stay in a luxury hotel`, NOT the full "Would you rather..." question) appears once in the mapped category with source=`wyr`. Match is already double-confirmed by the match itself, so single-tap saves; race guard in `saveMatchToList` transaction prevents double-write if both tap simultaneously.

- [ ] **WYR score shows percentage + compatibility band mid-session** ⚠️
  1. Start any WYR session, answer 3+ questions with mix of matches and differs
  - **Expected:** Header top-right shows `X/Y` + small italic percentage below (e.g. `6/7` + `86%`). Below the level badge, a small band label appears: 🔥 Twin flames (100%), 💫 Perfectly synced (90-99%), ✨ In tune (75-89%), 🌱 Learning each other (50-74%), ⚡ Opposites attract (25-49%), or 🌪️ Wildly different (<25%). Band only appears after 3+ total (a single match doesn't over-claim). Regression check: pre-fix the header was just `6/7` with no context — user reported it as "hvað þýðir 6/7?"

- [ ] **WYR milestone toast fires at 5/10/25/50/100/200 matches** ⚠️
  1. Answer WYR questions with your partner until you cross a milestone match count (e.g. hit 5 mutual yes/agreements)
  - **Expected:** Burgundy fill toast slides down from top with celebratory copy: `5 matches — you're getting each other!` / `10 matches! You're in sync ✨` / `25 matches! Serious compatibility 💫` / `50 matches! You know each other well 💛` / `100 matches! Twin flames 🔥` / `200 matches! Off the charts 🌟`. Success haptic. Auto-dismisses after ~3s. Regression guard: does NOT re-fire on tab switch, app reopen, or Firestore re-snapshot — celebratedAtLeastRef seeds on first load so historical milestones don't retroactively celebrate.

- [ ] **WYR session summary opens at 10/25/50/100 matches** ⚠️
  1. Cross a summary milestone (10, 25, 50, or 100 matches)
  - **Expected:** Full-screen modal card overlay opens on top of the toast: big percentage (e.g. `86%`), compatibility band (🔥/💫/✨/…), current cat + score line (`Playing 😊 Playful · 8/10`), best-ever comparison (`Your best: 92% on Romantic`) OR `🏆 New personal best!` badge, and two buttons: `Keep going` (dismiss) + `Try Romantic next?` (or level-appropriate suggestion — Playful→Romantic, Romantic→Spicy, Spicy→Playful). Tapping the suggestion resets session to the recommended level.

- [ ] **WYR best-ever record persists across sessions and resets** ⚠️ 📱
  1. Play a full session to at least 10 questions, note the summary card's percentage
  2. Change level (score resets), play another session past 10 questions with higher rate
  - **Expected:** Second summary card shows the first session's rate as "Your best: N%" if second was lower, OR `🏆 New personal best!` if second exceeded first. Record is stored at `couples/{coupleId}/wyr/records` and survives `resetWYR` (which only wipes the active session). Guard: sessions with < 10 total do NOT overwrite the record (prevents a lucky 3/3 from permanently claiming "Twin flames").

- [ ] **WYR level badge tap → change level mid-session** ⚠️
  1. Start any WYR session (e.g. Playful), answer at least one question so score accumulates
  2. Tap the small level badge under the "Would you rather..." prompt (shows current cat emoji + label + `Change ›` hint)
  3. Confirm modal appears: `Change level? Your current score (X/Y) will reset.`
  4. Tap `Change level`
  - **Expected:** Session ends (resetWYR deletes the active doc), level picker reappears with 3 level cards + Themed session accordion + Add-your-own button. Pick a different level → new session starts fresh. Cancel button leaves session untouched. Regression check: pre-fix resetWYR did setDoc({level:'playful',...}) which technically "reset" but locked the user onto Playful without ever surfacing the picker.

- [x] **WYR custom questions: add, edit, delete lifecycle** ⚠️ 📱
  1. Level picker → tap `+ Add your own` → modal opens (empty library shortcut)
  2. Fill Option A + B, pick a level, Save → couple's library now has 1 entry
  3. Both partners: start a session on that level → newly added question shows FIRST (newest custom is prepended to the level array, and addCustomWYRQuestion resets the active session's questionIndex to 0)
  4. Back to picker → button now reads `Your questions · 1 ›` → tap to expand accordion
  5. Accordion shows `+ Add a new one` row + the custom question row with ✎ Edit and 🗑 Delete
  6. Tap ✎ → same modal opens in EDIT mode (title: `Edit question`, save: `Save changes`), fields pre-filled → change something → Save changes → accordion row updates
  7. Tap 🗑 → ConfirmModal `Delete this question? Both of you will stop seeing it.` → Confirm → row disappears, partner's device also drops it via subscription
  - **Expected:** All three flows work. Add is cross-partner (both see it via realtime subscription). Edit preserves createdBy/createdAt (does NOT re-order the library or nuke session state — typo fix should be low-drama). Delete is destructive-styled and confirmed. Regression check: pre-fix the +Add button was write-only, no manage list existed — couples could only add, never edit or prune.

- [ ] **Activity Cards flip → accept → complete** 📱 💰
  1. Phone A (premium): Activity Cards → flip card 12
  2. Phone B: Receives card → "We did it!" or skip
  - **Expected:** Card goes face-down → pending (yellow) → completed (green). Turn passes to partner. Both phones see same state.

- [ ] **Fantasy Wishes mutual YES surfaces match + celebratory toast** 📱 💰
  1. Both (premium): Fantasy Wishes → vote same item with ❤️ yes
  - **Expected:** Card flips to celebrating state (blush background, burgundy border, `It's a Match! ✨` pill on top) for ~2s. Success haptic. Floating toast at top: `It's a Match! ✨ Tap to see` on burgundy fill with cream text (celebratory — inverted colors vs the passive `Added ✓` toast). Tap toast → jumps to Matches tab. Both phones celebrate independently as their Firestore snapshot lands. Regression check: pre-fix copy was flat `✨ Match saved · Tap to view` on cream fill — user flagged as dull.

- [ ] **Fantasy Wishes +Add wish appears inline in current batch** ⚠️ 💰
  1. Fantasy Wishes → tap `+ Add` → type a wish → Send
  - **Expected:** Modal closes. Floating toast: `Added ✓ · Just below`. Wish appears at the bottom of the current batch (currentBatch bumps 5→6 items) with Yes/Maybe/No vote buttons. Regression check: pre-fix the wish silently deferred until Load 5 more, and even then never surfaced because `.slice(0,5)` on createdAt-asc-sorted items picked the oldest presets first.

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

## 6. Security verifications 🔒 (5 tests)

- [ ] **Free user → Spicy Truth → upgrade gate** 💰
  1. Phone B (non-premium): Truth or Dare → tap Spicy level
  - **Expected:** Navigates to /upgrade screen. Cannot bypass.

- [ ] **Free user → Deep Daily → upgrade gate** 💰
  1. Phone B (non-premium): Home → Tonight's Picks → Daily → tap 💛 Deep tab
  - **Expected:** Tab shows 🔒 badge. Tap → navigates to /upgrade.

- [ ] **Free user → Spicy Daily → upgrade gate** 💰
  1. Phone B (non-premium): Home → Tonight's Picks → Daily → tap 🔥 Spicy tab
  - **Expected:** Tab shows 🔒 badge. Tap → navigates to /upgrade. Playful remains accessible as the free taste. Flirty content (previously free in Daily Picks) is now behind this gate — documented downgrade of free-tier value from the July 2026 Daily merge.

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

## 7. Push notifications (📡 EAS-only)

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

- [ ] **Daily answer push** 📡 📱
  1. Phone B: lock screen. Phone A: Daily → answer any question first.
  - **Expected:** Phone B push "Daily 💬" + "Eva played today, your turn!". No push if Phone B was the one who answered first. Title changed from "Questions 💬" post-merge (July 2026).

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

## 8. iOS permissions (4 tests)

- [ ] **First camera use shows description string** ⚠️
  1. Fresh install on Phone A
  2. Tap "Take photo" anywhere (Moments, Tease, Memories, Profile photo)
  - **Expected:** iOS prompt shows a permission rationale for camera access → Allow/Deny. Description string must not mention Time Capsules (feature removed July 2026); if it still does, update `app.json` `NSCameraUsageDescription`.

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

## 9. Image upload + compression (2 tests)

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

## 10. GDPR + Account (3 tests)

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

## 11. Race conditions (2 tests)

- [ ] **Both flip same Activity Card** 📱 💰 ⚠️
  1. Both (premium): Activity Cards → both tap card 8 within 1 second
  - **Expected:** Only one flip persists. Other partner sees the card already flipped. No "double turn" or duplicate pending state.

- [ ] **Both post Moment photo simultaneously** 📱 ⚠️
  1. Both: take Moment photo
  2. Both: tap Upload within 1 second of each other
  - **Expected:** Both photos appear in today's grid. No "waiting for partner" stuck state.

---

## 12. State transitions (2 tests)

- [ ] **Sign out mid-Truth-or-Dare round** ⚠️ 📱
  1. Phone A: Truth or Dare active session, picker phase
  2. Phone A: Sign out from Profile
  3. Phone B: Open Truth or Dare
  - **Expected:** Phone B can either continue from same session, reset, or sees a "your partner left" message. No infinite loading.

- [ ] **Disconnect couple → previous data hidden** 🔒 ⚠️ 📱
  1. Phone A: Disconnect from partner
  2. Phone A: try to access Moments, Notes, etc.
  - **Expected:** Empty states everywhere; no previous-couple data leaks. Pair with new partner → fresh start, no old data merged.

---

## Tally

**Coverage targets:**
- ✅ All 11 feature areas (Time Capsules removed July 2026)
- ✅ Core daily-engagement features tested 2-phone (Daily merged)
- ✅ Security rules validated behaviourally
- ✅ iOS permission prompts verified
- ✅ Push notification reliability
- ✅ Race conditions for known concurrent paths
- ✅ July 2026 shipped features covered: Daily merge (interleave + combined counter + tagline + pills), WYR save-to-list, Fantasy Wishes match toast + inline +Add, Versus data-gated unlock, Intimacy Log backdate picker, Home unified nudge, Time Capsules removal

**Total: ~64 tests**
- 📱 Two-phone: ~32
- 🌍 LDR: 3
- ⚠️ Edge cases: ~22
- 💰 Paid-gate: 12
- 🔒 Security: 7
- 📡 EAS-only: ~22

**Estimated time: 4-6 hours with 2 phones, single tester + ~1h for push (📡 EAS-only, real device required).**

If beta with 5 real couples: distribute checklist sections (~13 tests each) across couples for parallel coverage.

---

> When this passes end-to-end, you're launch-ready. For deep verification before major releases or after big refactors, fall back to the full `TEST_CHECKLIST.md` (902 tests).
