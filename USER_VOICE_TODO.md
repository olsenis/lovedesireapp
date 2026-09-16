# USER_VOICE_TODO: everything the review mining says we should add or change

Actionable list derived from [USER_VOICE.md](USER_VOICE.md) (Sep 13 2026). Grouped by when. Each item: what, why (theme and evidence), where in the code, steps, test, effort. Tick boxes here; BUG_BASH and POST_LAUNCH point at this file rather than repeating it. Raw data and scripts: [research/README.md](research/README.md). Nothing below has been built unless its box is ticked.

Effort key: S under 1 h · M half a day · L a day or more.

---

## A. Before the first store build (code)

### A1. A new partner never inherits the old partner's data  `L`  ✅ Sep 14 2026 (callable + rules; device test pending in TEST_CHECKLIST §1)
- **Why.** USER_VOICE theme 1, P0. Lasting's 2-star review "UNPAIRED my account and somehow all of my OLD responses w my FORMER partner came up and he saw" is our current behaviour. Also a GDPR exposure (partner A's special-category data readable by stranger C).
- **Where.** `functions/src/index.ts` (cascade delete keeps the couple doc with `partnerLeftUid` / `partnerLeftAt` when one partner remains); `services/coupleService.ts` `acceptPairing` (comment: "Re-pair after Óli disconnect → partner1Uid is empty", fills the empty slot); `services/authService.ts` `disconnectFromCouple` (rotates the invite code, clears the slot); `firestore.rules` `isMemberOfCouple`.
- **Steps.**
  1. In `acceptPairing` (and the `joinCouple` callable if it takes the same path): if the couple doc has `partnerLeftUid` and the joiner's uid differs, do not fill the slot. Create a new couple doc for {remaining partner, joiner} with a fresh `createdAt` and `inviteCode`, point both profiles' `coupleId` at it, and stamp the old doc `archivedAt` + `archivedFor: remainingUid`.
  2. If the joiner **is** `partnerLeftUid`, fill the slot as today (reconciliation keeps history; Cozy Couples reviewers ask for exactly this).
  3. Rules: the archived doc stays readable only by uids in `partner1Uid` / `partner2Uid` at archive time (write them to `archivedMembers[]`), never by the new couple's members through the new coupleId. Client never lists archived couples for now.
  4. The remaining partner's **own** private-ish data that lives under the old couple (own Intimacy Log entries, own Moments) stays there; a later "previous chapters" screen can read it. Do not migrate in v1.
  5. Cloud Function: the cascade delete of an archived couple when its last member deletes their account.
- **Test.** TEST_LAUNCH + TEST_CHECKLIST §1: (a) Óli disconnects, Eva pairs a third test account → new coupleId, third account sees nothing of Óli's; (b) Óli disconnects, Óli re-pairs with Eva → same coupleId, history intact; (c) rules test with the emulator that the third account cannot read `couples/{old}/**`.
- **Docs.** CLAUDE.md data model (`archivedAt`, `archivedMembers`), Privacy Policy §"when a partner leaves" if the wording changes.

### A2. A lapsed subscription keeps read access to the couple's own data  `M`  ✅ Sep 14 2026 (`usePaidAccess` + `PremiumEndedBanner`; device walk in TEST_CHECKLIST §13)
- **Why.** Theme 3, P1. Cozy Couples' 2026 reviews ("We cant look old diary entries, old photos, old notes without paying", "lost over a years worth of photos, notes, and journal entries") turned a 4.84 app's recent page into "cash grab". Evergreen and Lovewick got the same for locking the used feature.
- **Where.** The paid-gate pattern in CLAUDE.md (`if (!subLoading && !isSubscribed) router.replace('/upgrade')`) on `app/intimacy-tracker.tsx`, `app/fantasy-wishes.tsx`, `app/blueprint.tsx` (The Lovers), `app/bingo.tsx`, `app/sensate.tsx`, `app/flash.tsx` (Tease).
- **Steps.**
  1. Define two gate levels: **write gate** (composer, voting, quiz, new card, new session, new Tease) and **read view** (list, stats, matches, result, completed cards). Intimacy Log, Fantasy Wishes matches, The Lovers result and Activity Cards history get the read view when `!isSubscribed && hasData`; everything else keeps the full gate.
  2. Read view shows one quiet line at the top: "Premium has ended. Everything you saved is still yours; new entries need Premium." with a link to `/upgrade`. No modal, no lock icon on the data.
  3. If the couple has no data in the feature, keep today's redirect (nothing to read).
  4. Rewrite the CLAUDE.md pattern: "paid screens gate writes; data the couple created is always readable".
- **Test.** Flip `isPremium` off on the QA couple in the console: Intimacy Log opens read-only with entries and stats, "We were intimate" hidden; Fantasy Wishes shows Matches, deck hidden; Lovers result visible, retake hidden. Flip back, everything returns. Add to TEST_LAUNCH "Dev flags and gate decisions".

### A3. Billing honesty on the paywall and in the store  `S`  ✅ Sep 14 2026 (paywall plan rows + trial-end line, Profile Manage subscription, description paragraph; RevenueCat hook-up point left in `handleStart`)
- **Why.** Theme 2, P2. 448 negative reviews across 13 apps; the angriest single cluster. Specific asks: price before download, trial end date, monthly vs yearly clarity, where to cancel.
- **Where.** `app/upgrade.tsx` (notes at the bottom: "One subscription covers both partners", "No streaks, no ads, no per-partner pricing. Cancel any time."); `constants/pricing.ts`; `app/profile.tsx`; MARKETING §2.10; `web/src/pages/pricing.astro`.
- **Steps.**
  1. Under the buy button: "Free until {date}, then {fmtUsd(annualUsd)} a year. Cancel before then and you pay nothing." with the date computed from `PRICING.trialDays`. Monthly button gets its own line. Once RevenueCat is in, read the live price, keep the sentence shape.
  2. Profile → a "Manage subscription" row (`Linking.openURL('https://apps.apple.com/account/subscriptions')` on iOS, `https://play.google.com/store/account/subscriptions` on Android) visible whenever `isSubscribed`.
  3. Store description states the price and the trial length in plain words (MARKETING §2.10 draft).
  4. `/pricing` already says "Cancel during the trial and you pay nothing"; add the same trial-end sentence shape.
- **Test.** Paywall date is tomorrow + 6 in the trial copy on a fresh account; Manage link opens the store subscriptions page on a device.

### A4. Discreet notifications  `S`  ✅ Sep 15 2026 (`notifyPartner` discreet variant chosen by the recipient's `discreetNotifications`, default on; eight sites; Profile switch; TEST_LAUNCH §7 both wordings)
- **Why.** Theme 11, P3. "REALLY isn't something you want on your notifications at work" (Paired, Aug 2026). Two of our push bodies are explicit on a lock screen.
- **Where.** `app/(tabs)/index.tsx` line with `"You're both in the mood 🔥"`; `app/fantasy-wishes.tsx` `'New match ✨', 'You have a shared fantasy wish'`; every other `notifyPartner(` call (mood, WYR, Daily, Truth or Dare, Notes, Moments, Sunday, Memory Lane, Tease); `app/profile.tsx` notifications switch (`profile.notificationsEnabled`).
- **Steps.**
  1. Reword the two explicit bodies to something that reads fine over a shoulder: Tonight → title "Tonight 🔥", body "{name} said yes too." is still explicit; use "Tonight ✓" / "You and {name} are on the same page." Fantasy Wishes → "Fantasy Wishes" / "Something new for the two of you."
  2. Add `profile.discreetNotifications` (default true) in Profile under the notifications switch, copy "Discreet notifications: keep the words on your lock screen neutral." When on, mood pushes drop the emoji + label ("{name} updated a mood"), Truth or Dare card previews drop the card text, Notes drop the message preview.
  3. Since `notifyPartner` is sent from the **sender's** phone, the flag must be read from the **recipient's** profile (`partner.discreetNotifications`) at send time; `useCouple` already exposes `partner`.
  4. Audit table of every push body in TEST_CHECKLIST §2.
- **Test.** Two phones, lock screen on the receiver, trigger each push with the toggle on and off.

### A5. Daily questions do not repeat  `M`  ✅ Sep 15 2026 (`excludeRecent` in seed.ts, 56-day window that shrinks per category, questions by text and picks by id, day docs created in a transaction; dev flag `DEV_SHORT_DAILY_NO_REPEAT`)
- **Why.** Theme 4, P4. Repetition is the decay complaint at 10 apps; our free Playful pool is 87 questions at 3 a day and `pickDailyQuestions` has no memory.
- **Where.** `services/dailyQuestionsService.ts` `pickDailyQuestions(date, coupleId, isLDR, bonusDraws)` and the code that creates `dailyQuestions/{date}` (transaction create-if-missing); `services/memoryLaneService.ts` `recentQuestionIds` as the pattern.
- **Steps.**
  1. When creating the day doc, read the last 56 `dailyQuestions/{date}` docs' item ids (one query, `orderBy(documentId, desc).limit(56)`), build the exclusion set, and pass it to `pickDailyQuestions` so the shuffle draws from `pool minus exclusion`; if fewer than `BASE_PER_CAT + MAX_BONUS_DRAWS * BONUS_PER_CAT` remain in a category, fall back to the full pool for that category.
  2. Keep the shuffle seeded by `date + coupleId + cat` so bonus draws still append deterministically; store the exclusion set's size in the doc for debugging.
  3. Both phones agree because the day doc is written once; a phone that reads an existing doc never recomputes.
  4. Same treatment for Daily Picks (`dailyWishService`) if the picks pool shows repeats in testing (Sweet 60 at 5 a day repeats inside two weeks).
- **Test.** Dev flag to shrink the window to 3 days; play four days on two phones; no id repeats across the four docs; a category with a tiny pool still fills.

### A6. Fantasy Wishes: category chips and "skip scenarios that involve other people"  `M`  ✅ Sep 15 2026 (categories as data on all 394 presets, per-couple choice on the couple doc, gentle-first deck order, ☰ sheet; the "other people" switch turned out unnecessary: the pool has no third-party scenarios, which is now a store-copy line)
- **Why.** §5 and §9a, P5. Spicer's most-cited 2026 one-star reason ("90% of the questions are not for couples that are happily married to each other"), Lovify's "skip topic", the DeadBedrooms fear of "polyamory and BDSM before we even got through the basics".
- **Where.** `app/fantasy-wishes.tsx` derived deck (`unvoted` → `front` minus `skipped`); `constants/content.ts` `FANTASY_WISHES_PRESETS` (4 categories; about 15 items mention a third person, stranger, swinging, threesome); `services/fantasyWishesService.ts`.
- **Steps.**
  1. Tag presets: add `others: true` to every item that involves a third person (grep threesome / stranger / another man / another woman / swing / cuckold / hotwife / "someone else"; write the list into the TEST_CHECKLIST).
  2. Couple-level settings doc `couples/{id}/fantasyWishes/settings` `{ categories: {sensual, roleplay, explicit, bdsm}: boolean, includeOthers: boolean, updatedBy, updatedAt }`, default all categories on, `includeOthers` **off** for new couples (opt-in, not opt-out). Rules: members only, keys exact.
  3. A settings sheet from the deck header: four chips + one switch, with the copy "Turn off anything that is not for the two of you. Nothing is deleted; turned-off cards just stay out of the deck." Either partner can change it; the deck on both phones filters on the settings.
  4. Deck order for a couple with no votes yet: Sensual first, then Roleplay, Explicit, BDSM (today: createdAt order).
- **Test.** Two phones: turn Explicit off on one, the other's deck drops those cards on the next snapshot; matches already made stay visible; `includeOthers` off hides every tagged item.

### A7. App lock  `S`  ✅ Sep 15 2026 (`expo-local-authentication`, device-local switch in Profile → Privacy, lock on cold start and after 60 s, blank cover in the app switcher, on/off both authenticate)
- **Why.** §5 and §9a, P6. Between's privacy praise ("You can add a privacy code so kids won't read the messages"), Nice's "no passcode" complaint, kids-on-the-phone in three threads.
- **Where.** New `hooks/useAppLock.tsx` + a full-screen overlay in `app/_layout.tsx`; Profile switch `profile.appLock` (device-local in AsyncStorage, not Firestore, so a partner cannot toggle it remotely); `expo-local-authentication` (`npm install expo-local-authentication --legacy-peer-deps`; works in Expo Go).
- **Steps.**
  1. On cold start and when returning from background after 60 s with the switch on: show a cream overlay with the app mark and "Unlock", call `authenticateAsync({ promptMessage: 'Unlock' })`; on failure keep the overlay with a retry, never fall back to no lock.
  2. Blur the app switcher snapshot (overlay on `AppState` `inactive`).
  3. Profile copy: "Lock the app. Face ID or your phone passcode every time the app opens."
- **Test.** iOS and Android: enable, background 60 s, foreground → prompt; cancel → still locked; disable → no prompt.

### A8. Say it in the store and on the paywall  `S`  ✅ Sep 15 2026 (description anti-list block + "any two people" + "history never locked", captions 2 and 6, long-distance subtitle candidate, site hero and About; AI is not mentioned either way, decided Sep 15: the pools were drafted with AI help and curated by hand)
- **Why.** Themes 3, 5, 6, 10 and §9b, P7. Users search for and reward "no ads", "no streaks", "one subscription", "free" (and punish AI slop, which we answer by not shipping any, not by claiming it); even Paired's one-sub-covers-both is misread as "7.50/person".
- **Where.** MARKETING §2.8 (screenshot captions), §2.10 (description + promo text), APP_STORE_SUBMISSION, `web/src/pages/index.astro` and `pricing.astro`, `app/upgrade.tsx` (keep both notes).
- **Steps.** Description opens with the anti-list in one line: "No ads. No streaks. One subscription covers both of you, and most of the app is free." (AI not mentioned, decided Sep 15.) Add "Works for any two people." and "Your history is never locked." Screenshot caption: "Most of the app is free." Subtitle A/B list adds a "long distance" variant. Price and trial length stated once in the description.
- **Test.** Copy review against VOICE.md; the description under 4,000 chars.

### A9. Fantasy Wishes help card: the honest line about inference  `S`  ✅ Sep 15 2026 (HelpModal description + tip)
- **Why.** §9a point 3: users ask "will they be able to see EVERYTHING I answered 'no' to?" and know a yes-to-everything partner can infer answers. Saying it plainly is a trust move.
- **Where.** `app/fantasy-wishes.tsx` HelpModal copy (`useHelp('fantasy-wishes')`), plus the on-entry consent copy in `services/spicyConsentService.ts` if it fits.
- **Steps.** Add one sentence: "A No is never shown. A match only appears when you both say Yes, which also means a partner who says Yes to everything would learn your Yeses. Play it straight." Plus "Only the two of you can see matches."
- **Test.** Help card renders on a fresh account; no em dashes.

### A10. Tests and gates that follow from A1 to A9  `S`  ⬜
- TEST_LAUNCH: unpair → new partner, unpair → same partner, lapsed subscription read views, app lock, discreet pushes on a lock screen, FW settings on two phones, Daily no-repeat with the shrunk window.
- TEST_CHECKLIST: the push-body audit table (A4), the `others` tag list (A6).
- CLAUDE.md: paid-gate pattern rewritten (A2), data model rows (A1, A6), hooks row (A7).

---

## B. Before launch, no code (copy, docs, process)

- **B1. VOICE.md**  `S`  ⬜ Add to "words we never use": homework, task, routine (as a noun for the app), "work on your relationship" (already), "check in" as a verb outside the Sunday ritual. Add a "words users use when it works" list from USER_VOICE §8 (five minutes a day, brought us closer, things we never knew, just for the two of us, feels like flirting not therapy).
- **B2. MARKETING §6 and §2.9**  `S`  ⬜ Astroturf note: half of the Sep 2026 r/apps thread is founders; real users name Cozy Couples, SumOne, Couple Joy, Paired, Agapé. Review-reply routine: every review answered within 48 h for the first 90 days, three template openings (thanks + specific; sorry + what we changed + version; question + how to reach us), never argue, never ask for a re-rating.
- **B3. Free tier declared permanent**  `S`  ✅ Sep 15 2026 (/pricing free column + MARKETING §1). One sentence in MARKETING §1 and on `/pricing`: "What is free today stays free." Paired, Lovewick and Cozy Couples each lost their best reviews by withdrawing free features (§9b point 1). This is a promise, so it needs D2 first.
- **B4. Android parity line**  `S`  ⬜ MARKETING §3: the APK ships the same build number as the App Store version in the same week; the site's manifest shows both. "it sometimes lags behind in features from the Apple version" is the sideload complaint.
- **B5. APP_STORE_SUBMISSION**  `S`  ⬜ Price and trial in the description field; subtitle candidates with "long distance"; the review-reply routine linked.
- **B6. NAMING / H43**  `S`  ⬜ Already added: the "name alone would prove to be a deterrent" quote under next step 4. Decision still Óli's (D1).

---

## C. After launch, in this order (features)

| # | Item | Why (evidence) | Where | Effort | Status |
|---|---|---|---|---|---|
| C1 | Home-screen widgets (today's Moment or the partner's mood; iOS + Android) | 166 positive widget mentions; Couple Joy 98; Candle and Cozy Couples live on them | new native targets, EAS build; POST_LAUNCH "Home screen widgets" spec | L | ⬜ |
| ✅ C2 (Sep 15) | Heart react + optional one-line reply on a revealed answer: Daily questions and picks, Fantasy Wishes matches, Sunday Check-in (Memory Lane later); `components/ReactionRow.tsx`; reply pushes with a discreet body | 259 "wish I could discuss / react" mentions across 10 apps; Cozy's "heart react for the diary"; forums: "the interesting part was what came after the prompt" | `dailyQuestionsService` (`markDiscussed` exists), `stateUnionService` entries, `memoryLaneService`; one `reactions{uid:{gi:'❤️'}}` + `replies{uid:{gi:text}}` field per doc; rules keys exact, reply ≤ 200 chars | M | ⬜ |
| C3 | Past answers archive: a browsable list of Daily and Sunday answers by week | 95 "look back / old answers" mentions; Agapé's scrapbook is what its loyal users cite; Evergreen "no ability to see how our relationship has grown" | new `app/answers-archive.tsx` reading `dailyQuestions` and `stateUnion` by date range; entry from Our Story | M | ⬜ |
| C4 | Custom mood label + the neurodivergent set | Cozy Couples' most repeated wish (dozens): "more moods", "custom moods", "'off', 'in my head', 'overthinking', 'missing you', 'check in with me'" | `services/moodService.ts` MOOD_LABELS + a `customLabel` on the entry; Home mood picker | S | ⬜ |
| C5 | Lifetime SKU test | Between, Nice, SumOne, Spark'd reviewers praise or ask for one; "recurring memberships are stressful" | RevenueCat product; `constants/pricing.ts`; paywall third option; decide price (D3) | S code, D3 first | ⬜ |
| ✅ C6 (Sep 16) | Solo first week: Home for a user who installed alone ("While you wait" card, Tonight's Picks hidden until paired) | Theme 12 and forums: the installer waits days for the partner; "I want to understand him better on my own" | `app/(tabs)/index.tsx` unpaired state: what to set up (name, photo, Special Days, first Note to send with the invite), quiz alone, invite resend | M | ⬜ |
| C7 | Self-serve data export in Profile (decided Sep 14: post-launch; in-app read access, A2, is the answer to lapsed subscriptions, download is the "if we die" promise) | §9b: four couples apps died under their users; "i emailed the customer support if we can have all our data saved"; nobody markets it | callable that zips the couple's docs + Storage URLs to a signed link; Profile row; Privacy Policy line | M | ⬜ |
| C8 | Intensity control on random draws | Lovewick "sometimes we get a deep question in public"; Spicer/Coral "too explicit too early" | per-user "max level" for Truth or Dare Together Right Here spins and Daily category visibility; respects the Spicy consent | S | ⬜ |
| C9 | "Who initiates this week" in the Sunday predictions step | r/sexover30 2024: "deciding who will initiate or 'own'", "opt in / opt out sessions"; scheduling beats spontaneous initiation for busy couples | `app/state-union.tsx` predictions step: one optional line, revealed with the rest; feeds Tonight | S | ⬜ |
| C10 | Life-stage tags (LDR, parenting, reconnecting, engaged, 20+ years) on question pools; per-partner body configuration for explicit content; LDR question category toggle | Theme 9 ("for new couples"), §5 (koopla body config), Cozy's "long distance category" wish | content tagging pass in `constants/content.ts`; filter in Daily and Truth or Dare; Profile fields | M content, S code | ⬜ |
| ~~C11~~ | ~~Google Play listing~~ Struck Sep 14 (D4: no Play, explicit content). The answer to "Apple only" complaints is the APK with the parity promise (B4). | | | | 🚫 |
| C12 | "Draw one of our matches": a random pick from Fantasy Wishes matches | r/sexover30 wish; turns the match list into a Tonight suggestion | `app/fantasy-wishes.tsx` Matches tab button | S | ⬜ |
| C13 | Reply to every review for 90 days | Candle, Couple Joy and Desire earn five-star reviews by answering | App Store Connect + Play console routine (B2) | S weekly | ⬜ |
| ✅ C2b (Sep 16) | "Ask {partner} something": one couple-written question a day in Daily, appended to the deck, same mutual reveal (the write-your-own wish, 48 mentions, 44 positive; we have it in WYR, Activity Cards and Truth or Dare, not in Daily) | USER_VOICE §9b wishes; "if they add that it'll be priceless" (Candle review) | `dailyQuestionsService` + `app/daily.tsx` add sheet; rules: items append by a member | M | ⬜ |
| C14 | Add questions and picks, free tier first: Playful questions 87 → 150+, Sweet picks 60 → 100, then WYR Playful / Romantic (added Sep 15 by Óli) | A5 gives 56 days without repeats only when the pool allows it; Playful keeps ~25 days, Sweet picks ~11. Repetition was the decay complaint at ten apps (§2.4) | `constants/content.ts` with `memory/question_writer_prompt.md`; POST_LAUNCH "Grow content pools" has the per-pool targets | M content | ⬜ |

Kept from POST_LAUNCH C1 and still valid: one-year-ago card, post-date sealed line, "how do you think {partner} felt", props filter on Spicy dares.

---

## D. Decisions for Óli (not code)

- **D1. App name (H43).** Still open (Sep 14). New input: the higher-desire partner proposes the app and gets "one shot"; a name that reads as a sex app makes the first ask harder ("the name of the app alone would prove to be a deterrent", r/sexover30). NAMING.md next steps.
- **D2. Free tier permanence.** Decided Sep 14: what is free at launch stays free after launch. Features added post-launch may be free or Premium, decided per feature. B3 goes ahead with that wording.
- **D3. Lifetime SKU.** Decided Sep 14: yes, do it (C5). Price still open; suggestion $79.99 next to $39.99 a year, revisit after the first 200 ratings.
- **D4. Google Play.** Decided Sep 14: no. Play bans the explicit tier and a split build is not worth it. Sideload APK with the parity promise (B4). C11 struck.
- **D5. Review replies.** Decided Sep 14: Óli answers, Claude drafts; everything goes out under Óli's name. Cadence and templates in B2.

---

## E. Research upkeep

- **E1. Monthly rerun**  ⬜ `research/README.md` routine: pull, `themes`, `counts`, diff against USER_VOICE §2 and §3, update the header date. 30 minutes, mostly waiting.
- **E2. New competitors**  ⬜ Any app that crosses 1,000 ratings or shows up in a new Reddit thread goes into `reviews_pull.py` APPS and `gplay/pull.mjs` TERMS.
- **E3. Our own reviews**  ⬜ Once live: pull our own App Store feed with the same script (add our id) and tag it with the same themes, so our complaints are measured on the same scale as the shelf.

---

## Effort summary

| Block | Items | Code time |
|---|---|---|
| A (pre-launch code) | A1 to A10 | about 22 h: A1 8, A2 4, A5 3, A6 3, A3 2, A7 2, A4 1, A8 + A9 + A10 1 |
| B (pre-launch docs) | B1 to B6 | about 3 h |
| C (post-launch) | C1 to C13 | sized per row; C1 alone is a week with native targets |
| D | decisions | Óli |
| E | upkeep | 30 min a month |
