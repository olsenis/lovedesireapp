# User voice: what couples say about couples apps, and what we change

Compiled Sep 13 2026 from 18,320 store reviews of 30 couples apps (App Store US / GB / CA / AU via the customer-reviews feed, both sorts, up to 10 pages each; Google Play via `google-play-scraper`, 300 most helpful per app), plus Reddit threads found by search and read through each thread's `.rss` (§9). Every quote is verbatim from a stored review or a thread, under 25 words, attributed by app, store and month, never by username. Raw data and the scripts are in [research/](research/README.md) (data gitignored, rerunnable); the two Reddit passes are kept in full under `research/agent_reports/`. The actions are tracked in [USER_VOICE_TODO.md](USER_VOICE_TODO.md). Companion to [COMPETITORS.md](COMPETITORS.md) (profiles, pricing, what each app does) and feeds [MARKETING.md](MARKETING.md) §1 and §2 and [POST_LAUNCH.md](POST_LAUNCH.md) C1.

How to read the numbers: reviews were keyword-tagged against ~30 themes, then the 1 to 3 star set of every app with more than 1,000 ratings was skimmed by hand for the quotes and for themes the keywords miss. Counts are indicative (a review about "streaks" can be praise or rage), storefronts are English only, and the "most recent" sort skews positive. The App Store feed caps at 500 per storefront per sort, so Paired's 1,551 iOS reviews are a sample of 207,000; Between's 1,876 is most of its recent history.

## 1. The sample

| App | Reviews read | 1 to 3 stars | Store rating (count) | Category |
|---|---|---|---|---|
| Paired | 1,851 | 51% | 4.73 (207k) | daily question, quizzes, the leader |
| Between | 2,176 | 14% | 4.80 (21k) | private messenger, calendar, album |
| Couple Joy | 1,278 | 20% | 4.86 (37k) | quizzes, widgets, distance map |
| Cozy Couples | 1,213 | 22% | 4.84 (45k) | mood, pet, diary, mini games |
| Nice, Intimacy Tracker | 1,073 | 14% | 4.52 (4.9k) | sex tracker, one-time purchase |
| SumOne | 1,025 | 26% | 4.88 (18k) | daily question, egg pet, ads |
| Agapé | 1,000 | 25% | 4.80 (26k) | daily question, scrapbook |
| Couples Games & Challenges (Chouic) | 981 | 33% | 4.89 (23k) | truth or dare, one phone |
| Spicer | 771 | 21% | 4.60 (3.8k) | double-blind sex ideas |
| Couple Game | 759 | 57% | 4.49 (5.7k) | guess-the-answer quiz, ads |
| Love Nudge | 757 | 53% | 4.58 (18k) | love-language tank, goals |
| Desire, Couples Game | 754 | 30% | 4.31 (776) | dares, coins |
| Evergreen | 751 | 30% | 4.82 (54k) | daily prompt, growth plan |
| Candle | 745 | 35% | 4.76 (11k) | daily question, widgets, streak |
| Lasting | 649 | 40% | 4.68 (25k) | marriage counselling sessions |
| Intimately Us | 547 | 8% | 4.89 (3.5k) | Christian intimacy, challenges |
| Coral | 450 | 59% | 4.56 (3.5k) | sex-ed courses, chat |
| Lovify | 386 | 35% | 4.78 (1.8k) | live quiz rooms, ads |
| Flamme | 357 | 32% | 4.72 (416) | daily question, AI coach |
| Lovewick | 250 | 34% | 4.77 (1.9k) | question cards, milestones |
| DeepQ | 236 | 27% | 4.45 (4.0k) | question packs, weekly price |
| LovBirdz | 203 | 45% | 4.81 (687) | quiz game, tokens |
| Spark'd, Pikant, Cherished, Cuddle, koopla, In The Mood, Sexify, Intimately (SMAZENKA) | 109 total | | | too few to mine, read whole |

Google Play matched the wrong app for koopla, Kindu, Nice, Spicer and Sexify; those are App Store only here. In The Mood has no reviews at all.

## 2. The twelve things couples say

Ranked by how many apps carry the theme in their negative reviews and how often. "Where we stand" names the screen, service or doc that proves it.

### 1. "It broke, and I lost our stuff" (20 of 22 apps, 925 negative reviews)

The single biggest cluster is not features, it is reliability and data. Between: "they had a glitch that deleted 38,000 PHOTOS!! YEARS WORTH!! My wedding photos included!!" (iOS, Feb 2026). Nice: "Six years of entries gone just because I deleted the app when switching phones" (iOS, Oct 2025). Cozy Couples: "we lost over a years worth of photos, notes, and journal entries" (Play, Aug 2026). Candle: "The app sent 'answers' to my partner that I never sent, VERY PROBLEMATIC" (Play, Aug 2026). Cozy Couples again: "one time I even saw my partner's answer before I wrote mine!" (iOS, Aug 2026). And Lasting, the one that matters most to us: "UNPAIRED my account and somehow all of my OLD responses w my FORMER partner came up and he saw" (Play, May 2024).

**Where we stand.** Everything is in Firestore, nothing is device-only, so a phone swap loses nothing. Mutual reveal is enforced by rules on Daily, Sunday Check-in and Memory Lane. **But the Lasting scenario is live in our code**: after a disconnect, `functions/src/index.ts` keeps the couple doc and its shared history for the remaining partner, and `acceptPairing` in `services/coupleService.ts` fills the empty slot with whoever joins next. A new partner inherits the previous partner's Intimacy Log entries, Fantasy Wishes votes, Sunday answers, Love Notes and Moments. Fix before launch (§7, P0).

### 2. "You charged me" (13 apps, 448 negative reviews, the angriest cluster)

Trial and billing anger is the top reason for 1-star reviews at Lasting (21% of its negatives), Paired (171 reviews), Coral, Couple Game, Evergreen and Agapé. The specific complaints repeat across every app: price not shown before download ("because it has a 7 day free trial it shows up under the free apps", Lasting iOS Jun 2026), charged for the year when they meant the month (Candle iOS Aug 2026), no reminder before the trial ends ("they don't give a heads up when your free trial is about to end", Candle), cannot find where to cancel ("The app sends you to the website. The website sends you to the app", Lasting iOS Jan 2025), and Cozy Couples' 7-day trial charging on day 6.

**Where we stand.** RevenueCat + StoreKit means Apple owns the cancel path, which removes the worst of it. The paywall (`app/upgrade.tsx`) says "Cancel any time" but does not show the trial end date or the exact renewal price next to the button, and Profile has no "Manage subscription" link. The store description does not state the price. All three are cheap (§7, P2).

### 3. "Everything worth using is locked" and "then they locked what we already had" (paywall in 6 apps, price in 5, 476 reviews)

Two different complaints. The first is a thin free tier: Paired "we only get one question per day and 99% of EVERYTHING you have to PAY FOR" (iOS, Sep 2026), Couple Joy "basically a demo" (iOS, Jun 2026), DeepQ "$7.99 per week which is an insane ask" (iOS, Nov 2025). The second, and the one that turns 5-star users into 1-star reviewers overnight, is paywalling the couple's own past: Cozy Couples in 2026 hid diary entries, photos and notes older than 14 days behind the subscription and its recent reviews are a wall of "Cash grab" ("We cant look old diary entries, old photos, old notes without paying", iOS Sep 2026); Evergreen "the only feature that anyone uses get locked behind a pay wall" (iOS, Aug 2025); Lovewick "took the questions, arguably the ONLY reason my husband and I use the app" (iOS, Dec 2024).

**Where we stand.** Our free tier is wide (Daily Playful 3 questions + 5 picks a day, Truth or Dare two levels, Would You Rather two levels, Sunday Check-in, Memory Lane, Moments, Notes, Tonight's Date, two Challenge programs, Special Days). That is a real advantage and the store copy should count it. But every paid screen uses the screen-level gate, so a couple whose subscription lapses loses **read** access to their own Intimacy Log, Fantasy Wishes matches and The Lovers result. That is the Cozy Couples move (§7, P1).

### 4. "The questions repeat" and "we ran out" (10 apps, 211 reviews)

Paired: "Don't plan to use this app for more than 18 months. After that they run out of content" (iOS, Jun 2026) and "The same context of questions keep appearing super close to one another" (Cozy Couples, iOS Jul 2026). Spicer: "questions she had no interest in or that kept repeating" (iOS, May 2026). Agapé, Candle, Lovify, Evergreen and Lovewick all carry it. The praise side is the mirror image: Lovewick users loved "10 questions a day" until it was cut.

**Where we stand.** Pools are large (474 questions, 274 dares, 310 truths, 191 WYR, 294 Fantasy Wishes) and Memory Lane grows with use. But `pickDailyQuestions` in `services/dailyQuestionsService.ts` shuffles per date with no memory of what the couple has answered, and the free Playful pool is 87 questions at 3 a day, so repeats start inside the first month. Memory Lane already has the no-repeat pattern (`recentQuestionIds`); Daily needs the same (§7, P4).

### 5. "Ads" (15 apps, 232 negative reviews) and "it's AI now" (26 reviews, 20 negative)

Ads are the top complaint at SumOne (18% of negatives, "The ads are getting longer and longer"), Couple Game (18%, "I can't even get passed the adds to even play") and Lovify. AI is newer and sharper: Couple Joy "70% of these are AI. Many of the prompts/questions are repetitive" (iOS, Mar 2026) and "won't be renewing after the month is over" once the paid questions turned out to be "AI slop" (Play, May 2026); Candle "ew ew ew ew why are you using ai now" (Play, Jun 2026); Flamme "since they have decided to incorporate AI into the app we have decided to distance ourselves" (Play, Jan 2026); LovBirdz "Pretty sure the questions in the new update are AI generated. There's a noticable decline in quality" (Play, Aug 2025).

**Where we stand.** No ads, no AI-written content, and every pool was authored by hand from the prompts in `memory/`. Neither fact is in the store copy yet. Users are actively looking for it and punishing its absence; say it (§7, P7).

### 6. "Lost my streak" (7 apps, 298 mentions; 98 explicitly about losing one)

Streaks cut both ways in the data. Praise: "1 year of paired - 365 day streak" (iOS, Feb 2026), Cozy Couples 783-day streaks. Rage: "we lost our 80 day streak on a day we both played" (Cozy Couples, iOS Sep 2026), "80 days of answering questions and then it just all disappears because I miss ONE day" (Paired, Play Aug 2026), "instead of it looking like progress it just looks" like loss (Evergreen, Play Feb 2026), Candle "Make Streaks optional, please" (iOS, Jun 2026) and "Do not take over my dynamic island for streak" (iOS, Sep 2026). Cozy Couples and Paired sell streak repair, and both get 1-star reviews for it.

**Where we stand.** No streaks, by design ([VOICE.md](VOICE.md) rule 4, app_vision). The reviews confirm the choice and confirm it must be **stated**: the pride side of streaks ("day 365") can be served with an unbreakable number ("Week 41 together") that never resets. We show weeks since the first Sunday Check-in on the Thursday history card already.

### 7. "I wish I could talk to my partner about the answer" (10 apps, 259 mentions)

Not a request for a chat app. It is the moment after a reveal: "I wish there was a 'heart react' for the daily diary because some of the things my partner has said deserve to be favorited" (Cozy Couples, iOS Aug 2026), "when they put a comment in the diary I would love to be able to react to it" (Play, Sep 2026), Evergreen "A quick way to comment on them without needing to screenshot and send over text" (Play, Jun 2023), Paired "The inability to chat, sometimes makes answering questions feel like a chore" (iOS, Sep 2024), Flamme "more ability to discuss answers and share" (Play, Jan 2026). Between, the app that is a chat, gets 93 of these because people want threads and reactions inside it.

**Where we stand.** No chat, by design (app_vision, [COMPETITORS.md](COMPETITORS.md) §5), and the data does not argue for one: it argues for a one-tap reaction and an optional one-line reply on a revealed answer. Daily has a "discussed" toggle (`markDiscussed`), nothing on Sunday Check-in or Memory Lane. Post-launch, but early (§7, post-launch #2).

### 8. "Where are our old answers?" (95 mentions) and "one year ago" (SumOne, Agapé)

Agapé: "is there a way to access my 400+ conversations?" (iOS, Jan 2026) and praise for the scrapbook "to look back on previous prompts and conversations" (iOS, Feb 2024). Lovewick "a great way to look back at our answers" (iOS, Mar 2026). Evergreen "We're on day 300 and there's no ability to see how our relationship has grown over time" (iOS, Jan 2024). Cozy Couples' 14-day window is its most hated design.

**Where we stand.** Our Story, Moments, Special Days, mood history and Memory Lane are all look-back surfaces, and Memory Lane is the only one in the market that turns the history into a game. There is no browse view of past Daily or Sunday answers. Post-launch (§7).

### 9. "Cheesy, for teenagers, for new couples" (62 mentions across 12 apps)

"the questions are really cheesy and aren't the styling of how my partner and I operate... who these questions are really for except maybe uptight Christians" (Paired, Play Jul 2026). "It's probably best for couples in the first 5 - 10 years of marriage" (Paired, iOS Aug 2026). "If you've been together for any reasonable amount of time and are over the age of 21 the questions come across as pretty childish" (SumOne, iOS Aug 2023). "Great if you're a highschool / college kid. Terrible if you're over the age of 30" (Lovify, Play Mar 2024). Chouic's truth-or-dare: "created for dating couples that are exploring each other... not worth the money for a happily married" couple (iOS, Feb 2025). Paired's newest wish: "wish they had one for folks in very long-term relationships" (iOS, Aug 2026).

**Where we stand.** The Deep pool (241) and Sunday Check-in sets were written for people who already know each other, and the 18+ tier is the clearest "not for teenagers" signal on the shelf. Tone is governed by [VOICE.md](VOICE.md). The life-stage tags in POST_LAUNCH C1 #6 are the structural answer; the marketing answer is to say "for couples who have been together a while" somewhere in the description.

### 10. "Nothing here for us" (LGBTQ and gender, 92 mentions, 55 negative)

Between: "There needs to be a Non Binary gender option" (iOS, Feb 2023) and four more like it; Coral "Waaaaay too Hetero-normative" (iOS, Apr 2020) and a trans user "misgendered the entire time... it just makes us dysphoric" (iOS, Jun 2020); Desire "I can't even get started unless I choose a binary gender" (iOS, Feb 2019); Couple Game "Only wish it was more WLW friendly" (iOS, Apr 2024); Couple Joy "just wish it was gender neutral" (Play, Aug 2026); LovBirdz "we get misgendered sometimes" (iOS, Feb 2026); Paired carries 23 mentions.

**Where we stand.** No gender field anywhere in signup or profile, names instead of pronouns in every string (the Aug 2026 convention), and the content pools are written to `{partner}`. Five explicit items mention a cock ring; nothing else assumes anatomy. This is a quiet strength; one line in the description ("works for any two people") makes it a visible one. koopla's per-partner body configuration (COMPETITORS §3) stays post-launch.

### 11. "The notification came at work" (38 mentions) and "it nags" (39)

Paired: an explicit question "REALLY isn't something you want on your notifications at work. I wish there was an option to not get those kinds of q's" (Play, Aug 2026). Love Nudge "sent a notification to look at my love tank in the middle of the night" (iOS, Apr 2019). Agapé "Notification spam" (iOS, Oct 2023). Between "a daily nag for something" (iOS, Apr 2018). Paired "This app spams me with reminders all the time, and so I miss out when a partner actually shares something" (Play, Apr 2026).

**Where we stand.** We send few pushes, all triggered by the partner acting, plus the Sunday and Monday local reminders. Two bodies are explicit on a lock screen: "You're both in the mood 🔥 / {name} said tonight too" and "New match ✨ / You have a shared fantasy wish". Profile has a single notifications on/off switch, no quiet hours. Discreet wording is a five-minute fix; a "Discreet notifications" toggle is an hour (§7, P3).

### 12. "My partner won't use it" (24 mentions, but in every thread)

Small in store reviews because the person who gives up does not review; loud on Reddit (§9). Store voice: "Desperately seeking my spouse to participate... Then he couldn't be bothered" (Paired, GB Sep 2026), "Even if my partner never chooses to use the app with me (which ultimately lead to me canceling the membership" (Paired, Play Jan 2024), Intimately Us "I wish I wasn't the only one of us using it tho" (Play, Dec 2025), Spicer "Thought it might help with my marriage but my wife never downloaded it" (iOS, May 2024). The praise side names what works: "It helps my shy boyfriend display the affection he has for me through answering detailed questions" (Agapé, Play Mar 2023), "Really helping open my bashful husband up" (Spicer, iOS Apr 2024).

**Where we stand.** WhileYouWait, Love Notes, Moments, Our Story and Special Days all work solo; the invite is a share sheet with a deep link; one subscription covers both so the reluctant partner costs nothing. What is missing is a first-week story for the person who installed alone: the Home screen assumes a pair. Post-launch (§7).

## 3. What earns five stars

The praise side, by breadth, is remarkably uniform across the category:

| What people credit | Apps (of 30) | Reviews | Typical line |
|---|---|---|---|
| Fun, laughing together | 23 | 3,372 | "Got me and my wife laughing and trying to be a little competitive" (Couple Game) |
| Brought us closer / reconnected | 20 | 1,068 | "My husband and I had become totally disconnected for a long time" (Paired) |
| Long distance | 15 | 946 | "First LDR so it has its ups and downs, however this app helps keep us connected" (Cozy Couples) |
| A daily ritual, small and manageable | 13 | 1,151 | "It takes not even 5 mins a day to interact with each other" (Couple Joy) |
| Learned something we didn't know | 12 | 244 | "We've been together for 8 years and thought we knew everything about each other... turns out we really don't" (Lovify) |
| Design, calm, easy | 12 | 755 | "aesthetically pleasing and simplistically designed... helpful and calming" (Cozy Couples) |
| Deeper conversation without pressure | 9 | 445 | "ask questions you'd never think to bring up in conversation" (Paired) |
| Sex life | 6 | 672 | "gone from having sex maybe once a month to every day" (Spicer) |
| Private, just for two | 1 (Between) | 300 | "a private social media just for me and my partner" (Couple Joy) |
| The developer answers | 2 | 350 | "they actually listen to your suggestions and improve it" (Candle) |

Three things stand out. **Long distance is the largest single praise context**, bigger than any feature; a quarter of all positive reviews mention it. Cozy Couples' most repeated wish is "a long distance category to cater the questions to us" (iOS, Sep 2026); we have LDR-tagged questions, virtual date ideas, LDR dares, a partner clock and the visit lifecycle, and the keyword field already carries "long distance". **"Learned something" and "deeper without pressure" are the words for the mutual reveal**; nobody praises the mechanic, they praise the outcome. **Developer replies are worth ratings**: Candle, Couple Joy and Desire all have five-star reviews that exist because someone answered.

## 4. Per-app digests

Rating split is 1 to 3 stars as a share of what we read. "Take" is what to copy, avoid, or where we are already ahead.

**Paired** (51% negative in our sample, skewed by the helpful sort). Praise: daily ritual, reconnecting, "opened up conversations in an emotionally safe way". Complaints, in order: billing (171), repetitive content after a year, streak loss, price ("$40... $86"), "cheesy", therapy feel ("Probably great for people in couples therapy", iOS Feb 2026), one question a day free, no way to discuss an answer. **Take:** the leader's users want long-term-couple content, a wider free tier, and a way to react to an answer. Its "3 questions a day" praise matches our Daily exactly.

**Between** (14%). Praise: privacy ("just for the two of us", 178 mentions), lifetime purchase ("recurring memberships are stressful"), calendar, album. Complaints: bugs and crashes (22% of negatives), lost photos, ads after paying, no video calls, gender options. **Take:** the one-time purchase is loved and lowers churn anxiety; a lifetime SKU is worth testing post-launch. Private album + passcode is the privacy story people repeat.

**Couple Joy** (20%). Praise: widgets (98 mentions, the most of any app), distance map, "5 mins a day". Complaints: widget behind paywall, AI-written questions (12), price, "one question per day". **Take:** widgets are the retention surface; AI content is a liability people can smell.

**Cozy Couples** (22%). Praise: moods with a note ("even if he doesn't want to directly talk about it"), the diary, calm design, neurodivergent couples. Wishes: **more moods, custom moods** (dozens), react to a diary entry, LDR question category. Complaints: 2026 paywall on old entries, streak loss, repetitive. **Take:** mood is a first-class feature for this audience; our mood card with a note is the same idea, and custom mood labels are cheap. Never paywall history.

**Agapé** (25%). Praise: scrapbook, daily question, works for shy partners. Complaints: forced to invite 3 people or pay, no monthly plan, repetitive after a year, streak reset. **Take:** the scrapbook (every answer kept, browsable) is what its loyal users cite; a browse view of past answers belongs on our list.

**SumOne** (26%). Praise: daily question, egg pet, cross-platform ("works for both android and iPhone which is great"). Complaints: ads (18%), guilt mechanics ("It makes you feel guilty for not using it"), childish for over-21s, currency prices. **Take:** avoid; cross-platform parity is praised, which is an argument for Play distribution later.

**Love Nudge** (53%). Praise: love-language concept, free. Complaints: bugs (22%), "yet another way to nag your spouse when you're bored", goals you cannot tick off. **Take:** our love-language nudge is weekly and one-way for a reason; tracking "did you do it" turns it into homework.

**Candle** (35%). Praise: widgets, thumb kiss, LDR (28% of positives), responsive team. Complaints: bugs (20%), billing, streak in the Dynamic Island, AI images, paywall creep. **Take:** the fastest-growing 2025 app lives on widgets and replies to reviews; both are cheap for us post-launch.

**Evergreen** (30%). Praise: daily prompt, "saved my relationship", free tier lets you try. Complaints: paywall creep, streak loss, no view of growth over time, "campy questions". **Take:** "see how our relationship has grown over time" is a Memory Lane / Sunday history argument.

**Couple Game** (57%). Praise: guessing the partner's answer, laughing. Complaints: ads (18%), premium that does not unlock, both partners pay, answers leak, waiting. **Take:** our guess-in-Daily and mutual reveal are the same mechanic done right.

**Couples Games & Challenges, Chouic** (33%). Praise: sex life, "create your own truth and dares". Complaints: subscription on a party game, repetitive, "for dating couples", children can reach it. **Take:** custom truths and dares are praised; we have them in the live game. Age gating matters to reviewers.

**Lasting** (40%). Praise: sessions, "learned so much". Complaints: billing (21%), cannot cancel, "$89/6 months", the former-partner data leak. **Take:** the leak is our P0. Therapy pricing draws therapy expectations.

**Nice, Intimacy Tracker** (14%). Praise: one-time payment, privacy-focused, discreet icon, stats ("obvious when things are bit quiet in the bedroom"). Wishes: passcode, partner sync that works, tracking a "no". Complaints: sync broke in 2026, lost six years on reinstall. **Take:** our Intimacy Log is shared by design and cloud-stored; the wishes for app lock and "log a no" are worth noting.

**Spicer** (21%). Praise: "Completely opened up our marriage", helps a bashful partner, D/s calendar. Complaints: repetitive (10%), **questions about other people with no opt-out** ("90% of the questions are not for couples that are happily married to each other", iOS Apr 2026; "This app has done nothing but increase my sexual insecurity", iOS Mar 2023), 2-hour waits between questions, answers leaking through "Change Answers". **Take:** Fantasy Wishes needs a "skip scenarios that involve other people" switch; our deck already avoids the timer gate.

**Intimately Us** (8%, the happiest app in the sample). Praise: daily challenges, "we just got married again" after kids, learning section. Complaints: Christian framing excludes some, AI pronoun errors, 2026 lock-everything update. **Take:** a values-aligned audience forgives a lot; our equivalent is the explicit, adult, no-shame register.

**Coral** (59%). Praise: content quality, "feels like flirting not therapy". Complaints: bugs (34%), review nags ("constant nags to leave a review despite just starting", iOS Apr 2024), billing, gender options, a chat that showed strangers' messages. **Take:** never pre-ask for a rating; our `reviewPromptService` gates on 7 days and 3 happy moments.

**Desire, Couples Game** (30%). Praise: dares, "romantic, fun and private", the developer reads comments. Complaints: 5 dares a day cap "killed the mood", removed the spicy categories, coins, clinical redesign, LGBTQ signup. **Take:** caps on the paid experience are hated; our WYR daily cap is on the free tier only.

**Lovify, Flamme, Lovewick, DeepQ, LovBirdz**: small samples, same story. Lovify and LovBirdz are punished for sync bugs and AI-flavoured questions; Flamme for a hidden trial and an AI coach; Lovewick for moving its 10 free questions behind $10/month; DeepQ for $7.99/week. Spark'd (61 reviews, one negative) is worth a look as the tone reference for a married audience: "sparks discussion about sex that is not always comfortable but necessary".

## 5. The intimacy sub-market

What people who install a sex or intimacy app say, from Spicer, Nice, Intimately Us, Coral, Chouic, Desire, koopla, Sexify and the intimacy lines in the general apps:

- **The win is permission, not content.** "Normally aren't open sexually in person, so this lets us express ourselves in an anonymous way" (Spicer, iOS Sep 2024). "gives him a safe space to express thing" (Spicer, Apr 2024). "We save all of our intimate links and discussions within this app... together 40 years" (Spicer, Sep 2026). Fantasy Wishes is exactly this, and the Intimacy Log's monthly narrative is Nice's "obvious when things are a bit quiet" in prose.
- **The loss is the wrong scenario in front of the wrong person.** Spicer's monogamy complaints, Coral's "grab an ice cube and hair brush" for someone who wanted to feel confident, Lovify's partner "uncomfortable with the intimacy topic" with no skip, Intimately Us asking for "safety options for those with betrayal trauma, past abuse". Our once-a-day joint consent card and the per-level split help; a category opt-out inside Fantasy Wishes is the missing piece.
- **Too tame is a real complaint too.** Chouic "not intended for married couples", Desire "too few... too tame", LovBirdz "'Sexy mode' is too childish", Sexify "too tame". Our Spicy register is explicit by rule (memory/explicit_content_prompt.md); that is the right side of this line.
- **Tracking wants a "no".** Nice's most specific wish: "no category for tracking saying no to sex" and "track that without messing up my stats". Not for now, but it explains the audience: they want honesty, not a score.
- **Discretion is a feature.** Nice's "App logo is private on the phone so no one else would know", Between's passcode, Coral's lock that "shows you what was on screen before it locked". An app lock is table stakes for anything with an Intimacy Log (§7, P6).
- **Waiting kills the mood.** Desire's 5-dares-a-day cap, Spicer's 2-hour timer, Chouic's "Finished in 30 minutes max". Our caps sit on free tiers only and Fantasy Wishes paces with a friendly prompt, not a wall.

## 6. Gap table

✅ have it · 🟡 partial · ❌ missing · 🚫 declined by design

| What users ask for | Us | Proof |
|---|---|---|
| Nothing lost on reinstall or phone swap | ✅ | all state in Firestore |
| Mutual reveal that cannot leak | ✅ | rules on Daily, Sunday, Memory Lane |
| A new partner never sees the old partner's data | ❌ | `acceptPairing` fills the empty slot of the old couple doc |
| Re-pair with the **same** partner keeps history | ✅ | same mechanism, on purpose |
| Price and trial end date on the paywall, cancel in one tap | 🟡 | "Cancel any time" only, no Manage link |
| Wide free tier | ✅ | CLAUDE.md free tier list |
| Own data stays readable if the subscription lapses | ❌ | screen-level gate on Intimacy Log, Fantasy Wishes, The Lovers |
| No repeats within a month | 🟡 | Memory Lane yes; Daily no |
| No ads, no AI content | ✅ | nothing to add, needs saying |
| No streaks, but something that counts up | 🟡 | Thursday history card only |
| React to or answer a revealed answer | ❌ | `markDiscussed` only |
| Browse past answers | 🟡 | Memory Lane, Our Story, mood history; no Daily archive |
| Content for long-term couples, not teenagers | ✅ | Deep pool, Sunday sets, 18+ tier |
| No gender wall, no misgendering | ✅ | no gender field, names not pronouns |
| Discreet lock-screen notifications | 🟡 | two explicit push bodies |
| Quiet hours | ❌ | single on/off switch |
| App lock (Face ID / passcode) | ❌ | no `expo-local-authentication` |
| Skip scenarios involving other people | ❌ | Fantasy Wishes has no category filter |
| Joint consent before explicit play | ✅ | `useSpicyConsent` |
| Long-distance support | ✅ | LDR tags, virtual dates, partner clock, visit lifecycle |
| Widgets | ❌ | POST_LAUNCH #1 |
| Custom questions and dares | 🟡 | WYR custom, Activity Cards custom, live T/D authoring; not Daily |
| Custom moods | ❌ | fixed emoji set with a note |
| One-time / lifetime purchase | ❌ | subscription only |
| Cross-platform without sideloading | 🟡 | Android is a sideload APK |
| Developer replies to reviews | n/a yet | put it in the launch routine |

## 7. Ranked improvements

Evidence strength × cost × fit with app_vision. The user picks; nothing here has been built.

### Before the first store build

| # | Change | Evidence | Effort |
|---|---|---|---|
| P0 | **New partner never inherits the old partner's data.** In `acceptPairing`, if the couple doc has `partnerLeftUid` and the joiner is not that uid, create a fresh couple for the pair (or move the remaining partner's solo data into it). Re-pairing with the same uid keeps history. Add both cases to TEST_LAUNCH. | Lasting's data-leak review; theme 1; also a GDPR exposure | ~4 h |
| P1 | **Lapsed subscription keeps read access to own data.** Intimacy Log entries, Fantasy Wishes matches and The Lovers result open read-only when `isPremium` is false; only new entries, new votes and the quiz are gated. Write the rule into CLAUDE.md's paid-gate pattern. | Cozy Couples 2026, Evergreen, Lovewick; theme 3 | ~4 h |
| P2 | **Billing honesty.** Paywall shows the trial end date and the exact renewal price above the button; Profile gets "Manage subscription" (deep link to the store's subscription page); the store description states the price. | 448 negative reviews across 13 apps; theme 2 | ~2 h |
| P3 | **Discreet notifications.** Reword the Tonight and Fantasy Wishes pushes so nothing explicit appears on a lock screen ("{name} left something for you" style), and add a "Discreet notifications" toggle that applies the same to mood pushes. | Theme 11; Paired Aug 2026 | ~1 h |
| P4 | **Daily no-repeat.** Exclude questions the couple answered in the last 8 weeks from `pickDailyQuestions`, same shape as Memory Lane's `recentQuestionIds`, seeded so both phones agree. | Theme 4; our 87-question free pool | ~3 h |
| P5 | **Fantasy Wishes "not for us" switch.** One toggle above the deck, "Skip scenarios that involve other people", plus category chips (Sensual / Roleplay / Explicit / BDSM) so a couple can turn a category off. | Spicer's top 2026 complaint; Lovify; theme 5 in §5 | ~3 h |
| P6 | **App lock.** Face ID / passcode on open, off by default, one switch in Profile, via `expo-local-authentication`. | Between (178 privacy mentions), Nice, Coral; §5 | ~2 h |
| P7 | **Say it in the store copy.** "No ads. No AI-written questions. No streaks. One subscription for both. Most of the app is free. Your history is never locked." One line for "works for any two people". Description names the price. | Themes 3, 5, 6, 10 | ~1 h, MARKETING §2 |

### After launch, in this order

1. Home-screen widgets (unchanged #1; 166 positive mentions, Couple Joy alone 98).
2. **React or reply on a revealed answer**: a heart and an optional one-line reply on Daily, Sunday Check-in and Memory Lane answers; push to the partner. Covers most of the 259 "wish I could discuss" mentions without a chat tab.
3. **Past answers archive**: a browsable list of Daily and Sunday answers by week (Agapé's scrapbook).
4. **Custom mood label** on the mood card (Cozy Couples' most repeated wish).
5. **Lifetime SKU** test (Between, Nice, SumOne, Spark'd all get praise or requests for one).
6. **Solo first week**: Home for a user who installed alone (what to set up, what to send with the invite), before the partner joins.
7. Life-stage tags (C1 #6), per-partner body configuration for explicit content (koopla), an LDR question category toggle.
8. Google Play listing, if the sideload numbers say Android users are bouncing (cross-platform is praised at SumOne and Couple Joy).
9. Reply to every review in the first 90 days (Candle, Couple Joy, Desire earn ratings this way).
10. Self-serve data export in Profile (four couples apps died under their users; nobody markets the promise, §9b).

### Asked for, declined by design

Chat tab (Between's 93 wishes; app_vision), streaks and streak repair (theme 6), pets and currencies (SumOne, Cozy Couples), relationship scores, AI-generated content or an AI coach (theme 5), ads-supported free tier (asked for by Evergreen and Paired reviewers, but ads are the top complaint at three apps), per-partner premium, a 24-hour wait timer between questions (Spicer, Desire).

## 8. Copy we can lift

Phrases users reach for when the app works, useful for MARKETING §2 and VOICE.md:

- "takes not even 5 mins a day" · "a fun and manageable daily ritual" · "part of our routine now"
- "brought us closer" · "reconnect" · "we just got married again" · "opened up conversations in an emotionally safe way"
- "things we never knew" · "questions you'd never think to bring up" · "learned so much about my wife"
- "just for the two of us" · "our own private social media" · "private, just for you two"
- "feels like flirting not therapy" (Coral) · "not always comfortable but necessary" (Spark'd)
- "keep the fire burning" · "spice things up" · "keeps things fresh"
- for the anti-list: "cash grab", "everything behind a paywall", "AI slop", "lost my streak", "for teenagers", "one question a day", "childish"

Search terms that appear in reviews without prompting: couples app, relationship app, long distance, LDR, date night, intimacy, spice, questions for couples, truth or dare, marriage app, get to know each other.

## 9. Forums

Reddit was read two ways: the arctic_shift archive for the intimacy threads (reddit.com blocks non-browser clients; search, listing and `.rss` endpoints returned 403 or 429), and each thread's `.rss` with a feed-reader user agent at one request per ten seconds for the general threads (66 threads, all fetched). Threads were found through web search and the archive's post search. Four threads (r/apps "free couples app", r/iOSAppsMarketing "Flamme vs Paired", r/ldssexuality "non-cheesy apps", r/Marriage "sexting app") are mostly developers and bots and were discounted. Quotes are verbatim, under 25 words, no usernames.

### 9a. Intimacy and sex apps (56 threads, about 1,000 comments; r/sexover30, r/DeadBedrooms, r/MarriedSex, r/Marriage, r/sex, r/LongDistance, r/Christianmarriage, r/ldssexuality, r/AsOneAfterInfidelity)

**What the forums add that the store reviews do not:**

1. **The person who proposes the app is almost always the higher-desire partner, and the app becomes the desire gap in miniature.** "The Spicer app is something HLs will tend to enjoy a lot but LLs won't enjoy much at all" (r/DeadBedrooms, 2022). The most upvoted advice in eleven threads is about how to bring it up: "I have to be very careful how I bring up books, apps, etc. to avoid my wife feeling like I'm pressuring her into sex"; "I wanna suggest one, but I feel i might only have one shot" (r/DeadBedrooms, 2024); "all she heard was 'look at this app that wants us to have more sex'" (Intimately Us, r/Christianmarriage, 2021). One husband installed it on his wife's phone and dialled the heat down before showing her. And on our namesake: "the name of the app alone would prove to be a deterrent" (Desire, r/sexover30, 2023). That line belongs in the H43 file.
2. **Waiting reads as rejection.** "just to wait and watch all day hoping for the notification that she completed her half" (r/DeadBedrooms, 2026); "Now instead of one rejection every couple of nights when I would try to initiate, I was being rejected multiple times a day." Couples deleted the app "after a day or two. Best case scenario a few weeks." This is the strongest argument in the whole research for WhileYouWait, for the mutual-only Tonight signal (a no is never seen), and for keeping partner-lag nudges off the Home screen.
3. **Double-blind matching is the praised mechanic, and its leak is a known worry.** "That way you won't feel shy/embarrassed by your own kinks if your partner doesn't know about them" (Spicer, r/sex, 2019). But: "will they be able to see EVERYTHING I answered 'no' to?" and "he can deduce what questions did you reply 'Yes' to if he said no and the result doesn't show" (r/sex, 2021); "Can one person just check all the answers to reveal every last answer from their partner?" (r/sexover30, 2018). Fantasy Wishes has the same exposure by construction (a yes-to-everything partner unmasks the other). Suggested mitigations in the threads: flag it to both when one partner says yes to nearly everything, or show only a rate. Worth a line in the FW help card and a post-launch think.
4. **Even the partner who scoffs changes behaviour.** "My LLW tried Spicer but said, 'It's stupid, and I hate it!'" and still tried two new things that week (r/MarriedSex, 2024); "maybe you say no to the vast majority of stuff but maybe there are one or two surprises". And the success stories are real: "Stuff we've never done before in nine years of being together. felt like I was 21 and just met her again" (Spicer, r/sexover30, 2019).
5. **Too explicit too early loses the cautious partner.** "I was afraid it would scare him off by asking about polyamory and BDSM before we even got through the basics" (r/DeadBedrooms, 2025); "having it crank up the heat in the first three rounds... That can be a bit much" (Intimately Us). Praised where it exists: "you pick difficulty levels and still have some idea of what's coming. That made it easier to say yes" (koopla, 2026); "the preference questionnaire upfront, so nothing feels forced or awkward" (Couple Game). Our three levels, the Spicy consent card and the Fantasy Wishes category opt-out (P5) are the answer; the deck should also start Sensual before Explicit and BDSM for a new couple.
6. **Ambiguous who-does-what wording.** "The questions aren't always clear about who is performing the action in the bedroom" (Spicer, r/sexover30, 2022); "it's really male centric and kinda centers kink" (r/DeadBedrooms, 2022). Our Intimacy Log direction ("For Eva / For you") and `{partner}`-addressed dares already handle most of this; the per-partner body configuration stays on the post-launch list.
7. **Pacing beats abundance.** "we liked the daily prompt it sent each of us... So don't buy the full version": unlocking everything killed the ritual (Spicer, r/AsOneAfterInfidelity, 2023); "I'd advice against turning all the packs on at once because you get overloaded" (r/sexover30, 2021). Mojo-style one-shot quizzes "just ended up on a shelf". Fantasy Wishes' 8-vote pacing and the weekly calendar are the right shape.
8. **Homework and staying inside the app.** "it started feeling like homework. The last thing I wanted to do after a long work day was answer a quiz" (Paired, r/Marriage, 2026); "all of our connectedness and flirting kinda stays in the app. No meaningful changes outside of the app" (r/DeadBedrooms, 2025); "this kind of gamification of relationship makes the base nature of the relationship inherently transactional" (2022). Praise for the opposite: "the convo happens naturally instead of 'ok time to do our relationship app'" (LovBirdz, 2026). Every ritual of ours should end off the phone (Together List, Tonight's Date, dares are physical by rule).
9. **Privacy of explicit data is said out loud here.** "I don't want me and my spouse putting such conversations into an app run by any organization, Christian or not" (r/Christianmarriage, 2022); "sharing sensitive information often feels weird, because the apps don't really talk about privacy" (r/apps, 2024); "if I delete my spicer app is my partner notified?" Kids on the phone recur: "our kids were always borrowing our cell phones and reading our flirty texts". Signal, not any couples app, wins every sexting thread. Supports P6 (app lock) and a plain privacy line inside the explicit screens.
10. **Google Play bans it, and everyone knows.** "Google Play store block anything sexual, we know, we tried" (a developer, r/sex, 2024); "Android users have to download the APK from the website... it sometimes lags behind in features from the Apple version" (Spicer). Our iOS-store plus Android-APK plan is the category norm; feature parity between the two is the complaint to avoid.

**Wishes with no good answer on the shelf:** a mutual-only "in the mood" tap that resets each morning (specified almost exactly in r/Marriage, June 2025, with the pushback "Still gotta verbalize what you want"); scheduling and "who initiates" as part of a Sunday check-in ("deciding who will initiate or 'own'", "opt in / opt out sessions", r/sexover30, 2024); a random surprise drawn from the matches; editable past answers; asynchronous dares for long distance; a tracker that is not a "rate your partner" gimmick. We have the first (Tonight), the fifth (Wherever You Are) and a version of the sixth (Intimacy Log); the Sunday "who initiates this week" line is a cheap addition to the predictions step.

**Per-app, from the forums:** Spicer is the default r/sexover30 recommendation and the app most often installed on a partner's phone and ignored; Coral "seems abandoned" by 2025; Intimately Us is loved in Christian and LDS subs for calendar and tone but escalates too fast in its games; Kindu is "cheesy and cumbersome" and "the developers stopped trying"; Desire "the recent update has ruined the whole thing" (2019) and "hasn't really grabbed either of us" (2024); LovBirdz "feels more like quality time than self-improvement chores"; Flamme's one concrete praise is its "in the mood" button. Nice, Sexify, Lovify, DeepQ, Chouic and In The Mood do not come up at all.

### 9b. General couples apps (66 threads; r/apps, r/LongDistance, r/LDR, r/Marriage, r/DeadBedrooms, r/IndianRelationships, r/dating, r/androidapps, r/AskMen, plus Product Hunt and the App Store "see all reviews" pages)

The forum voice agrees with the store reviews on the big four (paywall, homework, partner won't play, repetition) and adds six things:

1. **"Free" that turns paid is remembered as betrayal.** Lovewick (2024), Paired ("free" in 2022), Cozy Couples (2026): "That app has since gone like most others to being one you have to pay to use. Typical." (r/apps, 2024); "You had a great thing and you ruined it" (Lovewick, App Store, 2024); "Most of the popular ones like Paired or Lovewick are definitely not worth the money anymore" (r/Marriage, 2026). Launch-time generosity buys goodwill that is expensive to withdraw. Our free tier should be decided as permanent, and said so.
2. **Even when one subscription covers both, people do not know it.** "Not sure if I'm paying the cost for Paired and my partner gets an invite, or is expected to also pay?" (r/LDR, 2023). "7.50/person" is how Paired's price is repeated (r/dating, 2024). The paywall line "One subscription covers both partners" needs to be on the store page too, not only inside the app.
3. **Effort is the enemy, not price.** "It's been way better for us because it takes zero effort" won two converts against Paired in one r/Marriage thread (2026); "honestly most of em felt like checking boxes. Like you're filling out a form together" (r/LongDistance, 2026); "the interesting part was what came after the prompt, the back-and-forth, not just answering the question"; "Wish for real-life activities without phones, not just increasing screen time" (Paired, App Store, 2025). Praise goes to play over prompts: "The daily pixel game is our favorite" (Cozy Couples), "The shared canvas is so good" (Candle), "you actually get to talk about your answers together instead of just submitting them separately" (LovBirdz, 2026). Our live two-phone modes and the physical-dare rule are on the right side; the reaction-on-answer item (post-launch #2) is the cheap way to give the "back-and-forth" a home.
4. **"Fix your relationship" framing repels couples who are fine.** "we prefer it a lot more than Paired which is more focused on 'fixing' a relationship. We don't want our relationship to be fixed" (r/LDR, 2026); "sometimes I feel the questions prompt arguments rather than dialogue" (r/LongDistance, 2026); "Paired: closer to therapy than play" (r/apps, 2026). Confirms [VOICE.md](VOICE.md) rule 6 and the About page's "Not for everyone" paragraph.
5. **Apps die, and users remember losing their history.** Avocado, Couple, Happy Couple and Official all shut down under their users; "i emailed the customer support if we can have all our data saved and they sent it" (Official, r/LDR). Nobody markets a data-export promise. We have GDPR export by request; a self-serve export in Profile would be a visible differentiator, post-launch.
6. **Cross-platform is a daily complaint.** "I hate that all the decent couple apps are always Apple only" (r/LDR, 2020); a whole thread on iPhone + Android couples (r/LongDistance, 2023). Our Android APK exists, but "it sometimes lags behind in features from the Apple version" is the complaint to design against.

Smaller signals: a "deep question in public" wish for intensity control on random draws (Lovewick); mood options for neurodivergent couples ("'off', 'in my head', 'overthinking', 'missing/longing' or 'check in w/ me'", Cozy Couples, App Store); the streak reset time ("7pm my time") as a recurring irritation, which our 04:00 Tonight expiry and date-keyed Daily avoid; long-married couples (33 to 40 years) as a real free-tier audience for whom "one question a day is more than enough"; and the mutual-only "in the mood" mechanic being pitched on r/LDR and r/apps by another app, the same shape as our Tonight pill.

**Astroturf warning for MARKETING §6:** in the Sep 2026 r/apps thread roughly half of 118 comments are founders; r/iOSAppsMarketing and one r/ldssexuality thread are almost entirely seeded. Real users name Cozy Couples, SumOne, Couple Joy, Paired and Agapé. The Reddit posting rule stands: answer first, name ours last, never open with "I built".

**Verdicts worth keeping:** "if your goal is structured check-ins and guided communication, Paired makes sense; if 'connect more but keep it light and fun so we actually do it', LovBirdz" (r/Marriage, 2026). "fun and casual with little games: Cozy Couples or SumOne... deeper conversation prompts, Agapé is really good" (r/apps, 2026). "Most couple apps or dating things suck." (r/LongDistance, 2026). Our slot is the one nobody names: the weekly calendar that is play on most days and a check-in on one.

## Appendix: method

- App Store: `https://itunes.apple.com/{cc}/rss/customerreviews/id={id}/sortBy={mostRecent|mostHelpful}/page={1..10}/json` for cc in us, gb, ca, au; deduplicated on review id. Ids in COMPETITORS.md and the scratchpad pull script.
- Google Play: `google-play-scraper` v10, `reviews({sort: HELPFULNESS, num: 300})`, app matched by search term and checked by title.
- Coding: regex themes in the scratchpad `reviews_code.py`; per-app reports; human skim of the 1 to 3 star sets for apps above 1,000 ratings.
- Reddit: search discovery (WebSearch), then `https://www.reddit.com/r/<sub>/comments/<id>/.rss`; search and listing endpoints are blocked.
- Limits: English storefronts only; feed caps at 500 per storefront per sort; "most recent" skews positive; keyword counts are approximate; Play sample is helpfulness-sorted so it over-represents complaints.
