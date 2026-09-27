# Hints

Every first-visit "How it works" card in the app, as a person reads it (the partner shown as "Ola").

**GENERATED, do not edit here.** The text lives in each screen's `<HelpModal>`; change it there and run `node design/hints/extract_hints.js`. Generated 2026-09-27, 21 cards.

Length budget: at most 4 tips, each under about 84 characters, description plus tips under about 400. Writing rules are in CLAUDE.md under "Help system".

| Card | Key | Where | Tips | Characters | Budget |
|---|---|---|---|---|---|
| 30-Day Challenge | `challenge` | [app/challenge.tsx:562](app/challenge.tsx#L562) | 4 | 372 | ok |
| Activity Cards | `bingo` | [app/bingo.tsx:499](app/bingo.tsx#L499) | 4 | 289 | ok |
| Daily | `daily` | [app/daily.tsx:878](app/daily.tsx#L878) | 4 | 364 | ok |
| Fantasy Wishes | `fantasy-wishes` | [app/fantasy-wishes.tsx:585](app/fantasy-wishes.tsx#L585) | 4 | 362 | ok |
| Intimacy Log | `intimacy-log` | [app/intimacy-tracker.tsx:391](app/intimacy-tracker.tsx#L391) | 4 | 304 | ok |
| Love Language Quiz | `love-language` | [app/quiz.tsx:275](app/quiz.tsx#L275) | 4 | 279 | ok |
| Love Notes | `love-notes` | [app/notes.tsx:811](app/notes.tsx#L811) | 4 | 292 | ok |
| Memory Lane | `memory-lane` | [app/memory-lane.tsx:239](app/memory-lane.tsx#L239) | 4 | 283 | ok |
| Moments | `moments` | [app/moments.tsx:301](app/moments.tsx#L301) | 3 | 185 | ok |
| Mood History | `mood-history` | [app/mood-history.tsx:262](app/mood-history.tsx#L262) | 4 | 255 | ok |
| Our Story | `our-story` | [app/our-story.tsx:831](app/our-story.tsx#L831) | 3 | 243 | ok |
| Presence | `presence` | [app/sensate.tsx:888](app/sensate.tsx#L888) | 4 | 329 | ok |
| Reminders | `reminders` | [app/reminders.tsx:232](app/reminders.tsx#L232) | 4 | 261 | ok |
| Special Days | `special-days` | [app/calendar.tsx:343](app/calendar.tsx#L343) | 4 | 338 | ok |
| Sunday Check-in | `sunday-checkin` | [app/state-union.tsx:730](app/state-union.tsx#L730) | 4 | 317 | ok |
| Tease | `tease` | [app/flashes.tsx:504](app/flashes.tsx#L504) | 4 | 257 | ok |
| The Lovers | `blueprint` | [app/blueprint.tsx:285](app/blueprint.tsx#L285) | 4 | 364 | ok |
| Together List | `together-list` | [app/(tabs)/todo.tsx:378](app/(tabs)/todo.tsx#L378) | 4 | 315 | ok |
| Tonight's Date | `date-night` | [app/roulette.tsx:256](app/roulette.tsx#L256) | 4 | 290 | ok |
| Truth or Dare | `truth-dare` | [app/truth-dare.tsx:558](app/truth-dare.tsx#L558) | 4 | 309 | ok |
| Would You Rather | `would-you-rather` | [app/would-you-rather.tsx:673](app/would-you-rather.tsx#L673) | 4 | 283 | ok |

## 30-Day Challenge

`challenge` · [app/challenge.tsx:562](app/challenge.tsx#L562)

> One small thing a day for 30 days, done by both of you. Pick Reconnect, Spark, Fire or Desire.

- Before you start, each of you can edit 2 days. Refresh suggests another idea
- A day counts when both of you have tapped Mark as done ✓
- 🎲 Veto (2 each) drops the day's plan so you can just have sex instead
- Reconnect and Spark are free. Fire and Desire are Premium, and Desire is 18+

## Activity Cards

`bingo` · [app/bingo.tsx:499](app/bingo.tsx#L499)

> 25 face-down cards, each with something to do together. You take turns picking.

- Your turn: tap a card. You can pass twice and put it back
- Send it to Ola, who can do it now, keep it for later, or skip once
- + Add your own card puts your ideas into the next deck
- ↺ New deals a fresh deck any time

## Daily

`daily` · [app/daily.tsx:878](app/daily.tsx#L878)

> A few picks to vote on and a few questions to answer, new every day. Nothing is shown until you have both answered.

- Picks: Yes or Not for me. A Yes from both can go to your Together List
- Questions stay private until Ola has answered too
- Write your own question › adds one to today's cards, once a day
- Your past answers are kept in Our Story. Deep and Spicy are Premium

## Fantasy Wishes

`fantasy-wishes` · [app/fantasy-wishes.tsx:585](app/fantasy-wishes.tsx#L585)

> Explicit scenarios for the two of you. You each vote in private, and only a Yes from both is ever shown.

- Yes or No, one card at a time. Ola never sees your votes
- Skip for later if you are not sure. ☰ turns off whole categories
- A Yes from both lands in Matches, where 🎲 draws one for tonight
- Someone who says Yes to everything would see all your Yeses. Vote honestly

## Intimacy Log

`intimacy-log` · [app/intimacy-tracker.tsx:391](app/intimacy-tracker.tsx#L391)

> A private record of your closeness, shared by the two of you and nobody else.

- Tap We were intimate, fill in what you like, and add one thing worth remembering
- Both of you see every entry, each from your own side
- Stats appear once there are 3 entries
- If Premium ever ends, everything you logged stays readable

## Love Language Quiz

`love-language` · [app/quiz.tsx:275](app/quiz.tsx#L275)

> 10 questions that reveal how you feel most loved: words, acts, gifts, time or touch.

- A or B. Pick the one that feels right first
- Ola sees your result without you sending anything
- Every Monday you get three small things to do in Ola's language
- Retake it whenever it stops feeling true

## Love Notes

`love-notes` · [app/notes.tsx:811](app/notes.tsx#L811)

> Write something Ola can only open when the moment comes.

- Tap Write and choose when it opens: now, tonight, this weekend or a date
- Or tie it to a moment: a mood Ola logs, When you miss me, When you can't sleep
- Ola sees that a note is waiting, never what it says
- Tap a note that is ready to open it

## Memory Lane

`memory-lane` · [app/memory-lane.tsx:239](app/memory-lane.tsx#L239)

> Five questions a week, made from your own history in the app: photos, answers, moods, firsts.

- Your questions are about Ola, and Ola gets a different set about you
- You see right away whether you remembered
- When both of you are done, the two results sit side by side
- A new round every week

## Moments

`moments` · [app/moments.tsx:301](app/moments.tsx#L301)

> One photo a day from each of you, of whatever today looks like.

- Your photo stays hidden until Ola has taken one too
- One a day each, so it takes seconds
- Earlier days stay under Past moments

## Mood History

`mood-history` · [app/mood-history.tsx:262](app/mood-history.tsx#L262)

> Both of your moods over the last weeks, side by side.

- Set today's mood here or on Home
- 💬 Own words lets you say it your way, and Ola sees exactly that
- Mine shows your last 30 days, Together shows both of you day by day
- Tap Ola's mood on Home to open Together

## Our Story

`our-story` · [app/our-story.tsx:831](app/our-story.tsx#L831)

> Your timeline: the firsts the app noticed and the ones you add yourselves.

- Firsts fill in on their own as you use the app
- Tap one to add a note, + Add for a milestone of your own
- Your archive below keeps matches, past weeks and every Daily answer

## Presence

`presence` · [app/sensate.tsx:888](app/sensate.tsx#L888)

> A slow-touch practice in four stages, for when you want to feel close again with no pressure.

- Four stages, in order, over weeks: Discover, Connect, Together, Flow
- Each stage tells you what to do. Touch, notice, and let that be all
- Try a stage twice before you move on. Once a week works well
- There is no goal and nothing to get right

## Reminders

`reminders` · [app/reminders.tsx:232](app/reminders.tsx#L232)

> Reminders you set for yourself to do something sweet for Ola. They arrive as notifications on this phone.

- Tap a suggestion or + New, then set a time
- Weekly on the days you pick, or once on a date
- The switch pauses a reminder without deleting it
- Ola never sees these

## Special Days

`special-days` · [app/calendar.tsx:343](app/calendar.tsx#L343)

> The dates that matter to the two of you, in the order they are coming.

- Add anniversaries, birthdays, firsts and small rituals
- Keep it a surprise 🤫 hides what the day is from Ola until it arrives
- Your anniversary and birthdays appear on their own once the dates are set
- 🔔 on a row reminds you a week before and on the day, on this phone only

## Sunday Check-in

`sunday-checkin` · [app/state-union.tsx:730](app/state-union.tsx#L730)

> Once a week: five quick ratings and five questions. Everything stays private until you have both finished.

- Rate the week from 1 to 5, then answer in your own words. Short is fine
- When both are done, your answers appear side by side
- Leave a ❤️ or a reply under an answer
- The last step is optional and stays hidden from Ola

## Tease

`tease` · [app/flashes.tsx:504](app/flashes.tsx#L504)

> Something small from your day, for Ola's eyes only.

- 🎙 🎥 📷 at the bottom: a voice note, a video up to 30 seconds, or a photo
- ⊞ at the top picks one you already have on your phone
- Add a short caption if you like
- Everything is gone after 24 hours, opened or not

## The Lovers

`blueprint` · [app/blueprint.tsx:285](app/blueprint.tsx#L285)

> 15 quick questions about how you feel most alive in intimacy. When you have both finished, you see how your two styles meet.

- Five styles: Feeling, Sexual, Spark, Kinky, Explorer. None is better
- Pick what feels right first. There are no right answers
- Together you get three things to try, each can go to your Together List
- On Fridays, Home shows one tip for the weekend

## Together List

`together-list` · [app/(tabs)/todo.tsx:378](app/(tabs)/todo.tsx#L378)

> One shared list that both of you add to and tick off, live on both phones.

- Tap + Add, then pick Daily Life, Date Ideas, Intimacy or Goals
- Tap the circle when it is done. Ola sees it right away
- A Yes from both in Daily, a match or a Lovers tip can be saved here
- Suggestions from Ola wait at the top until you answer them

## Tonight's Date

`date-night` · [app/roulette.tsx:256](app/roulette.tsx#L256)

> Let chance pick the plan. Spin for a date idea at home, out, or somewhere new.

- Filter by At Home, Going Out or Adventure
- Tap Spin for a Date! Not tonight? Try again ↻
- Give a date stars once you have done it, then show only your highest rated
- Or scroll to All date ideas and tap the one you want

## Truth or Dare

`truth-dare` · [app/truth-dare.tsx:558](app/truth-dare.tsx#L558)

> One phone between you, or each on your own phone. You pick the card, Ola plays it.

- Together Right Here: spin and play on this phone
- Wherever You Are: draw a Truth or a Dare, or tap ✏️ to write your own
- Ola answers a Truth, or taps Dare completed
- Sweet and Flirty are free. Spicy is Premium and asks you both first

## Would You Rather

`would-you-rather` · [app/would-you-rather.tsx:673](app/would-you-rather.tsx#L673)

> You both answer the same question and see each other's pick at the same moment.

- Your answer stays hidden until Ola has answered too
- Five a day, so there is something left for tomorrow
- Write one of your own for Ola, or play a themed pack
- A match worth keeping can go to your Together List

