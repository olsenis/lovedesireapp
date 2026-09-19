# Voice: how the app talks

One page on tone and word choice for every user-facing string: buttons, cards, empty states, nudges, paywall, store copy, the website. Content pools (questions, dares, truths, Fantasy Wishes) have their own prompts in `memory/`; this is for the interface around them. Written Sep 13 2026 from what already works in the app; when a string here and a string in the app disagree, fix the app.

## The voice in one line

A friend who has been together a long time and is glad you asked. Plain, warm, a little dry. Never a coach, never a cheerleader, never a system.

## Rules that are already conventions

1. **English only** in the app. No em dashes anywhere in UI strings; use a comma or a full stop.
2. **Names, not pronouns.** `{partnerName}` or "your partner". Never they / them / their for the partner, except right after the name in the same sentence when swapping would sound stiff.
3. **Two, not "couples".** Inside the app the reader is one of two people: "the two of you", "you both", "{partnerName} and you". "Couples" is store and website vocabulary, for people who are not inside yet.
4. **No gamification words.** Streak, score (outside a game that keeps one), level up, XP, badge, unlock (for progress), reward, achievement. If the feature needs a number, say what it is: "Week 3", "5 of 5", "2 of 3 logged".
5. **No pressure words.** Don't miss, last chance, you haven't, it's been N days since. A quiet fact is fine ("Eva finished the Sunday check-in"), a reproach is not.
6. **No therapy framing.** Not "work on your relationship", "heal", "toxic", "growth". We are not a coach and we say so on the About page.
7. **Feature names are proper nouns** and stay exact: Sunday Check-in, Memory Lane, Fantasy Wishes, Truth or Dare, Would You Rather, Tonight's Date, Activity Cards, The Lovers, Presence, Our Story, Together List, Love Notes, Moments, Daily, Love taps. "Spark" is retired outside the Challenge program and the Lovers type.

## How we say the hard things

| Situation | Say | Not |
|---|---|---|
| Locked behind the subscription | "Spicy is part of Premium. One subscription covers you both." | "Unlock Spicy now!", "Upgrade to access" |
| Data-gated (Memory Lane) | "Memory Lane quizzes you on your own story, so it needs some first. It unlocks after 12 more days together." | "Locked. Come back later." |
| Empty state | "Nothing here yet. The first Moment is one tap away." | "No data", "You haven't added anything" |
| Waiting for the partner | "Waiting for Eva. Meanwhile:" + one or two things you can do alone | "Eva hasn't answered yet", a spinner with no way out |
| Something went wrong | "Could not save. Are you connected to the internet?" | "Error 500", "Oops! Something went wrong 😢" |
| Explicit content, before | "Before Spicy, both of you. This deck is explicit. Play only what you both want, skip anything, stop any time." | "Are you sure?", "Warning: adult content" |
| Explicit content, inside | Direct, adult, specific. No euphemisms, no baby talk, no slurs, no shame. | "naughty", "dirty", "bad girl/boy" |
| Privacy | "Only the two of you can see this." "Encrypted in transit and at rest." | "End-to-end encrypted", "zero-knowledge" (both untrue) |
| A ritual is done | The result itself, then quiet. "You called 2 of 3." | Confetti, "Amazing!!!", "Streak: 4" |
| Asking for a rating | Only the native sheet, only after a happy moment, never a pre-ask | "Enjoying the app? Rate us!" |
| On a lock screen (push) | The app and a name, never the words: "Tonight ✓ / You and Eva are on the same page.", "Eva updated a mood". Full wording only if the recipient turned Discreet off. | "You're both in the mood 🔥", "Eva is feeling 🥵 Horny", a card's text, a Tease caption |

## Small mechanics

- **Buttons say what happens.** "Save for later", "Send invite", "We're both in", "Not tonight". Not "OK", "Submit", "Continue" where a real verb exists.
- **One leading emoji on a card title is fine; none inside sentences.** The Lovers card is 🧬, Tonight is 🔥, the Sunday check-in is 🕯️. Do not decorate body text.
- **Time is relative and honest.** "Clears at 23:10", "Two weeks ago", "One more and your stats appear". Not "just now" forever, not "N days ago" as a nag.
- **Numbers stay small and true.** Never show a denominator that makes someone feel behind (394 Fantasy Wishes). Show progress only where progress is the point.
- **Sentence case** for buttons and labels ("Send invite"), Title Case only for feature names.
- **Short.** A card carries one sentence. A hint carries one clause. If a screen needs a paragraph, it needs a redesign.

## Store and website register

Same voice, one step more formal. "A private app for two." "Weekly rituals, nightly questions, weekend games." Say the anti-list plainly; the canonical sentence is "No ads. No streaks. One subscription covers both of you, and most of the app is free." Do not mention AI either way: the pools were drafted with AI help and curated by hand, and a claim in either direction invites the argument. plus, where there is room, "Works for any two people." and "Your history is never locked." Never promise outcomes ("stronger relationship in 30 days"); describe what happens. The About page's "Not for everyone" paragraph is the tone reference. Reach for the "Words users use when it works" list below before writing a new store or paywall line.

A plan that did not happen is never mentioned. Where someone says what they will do for their partner (Sunday Check-in's last step), the app shows only what was done, never a count, a miss or a reminder to the partner.

## Words we never use

streak · score (outside games) · unlock (for progress) · reward · badge · level up · journey · toxic · heal · fix · perfect · soulmate · spice up (as a verb) · naughty · dirty · miss you (from the app) · don't miss · last chance · hurry · today only · hack · grow together (as a slogan) · E2E · zero-knowledge · they/them for the partner · em dashes · homework · task (for anything the app asks; the 30-Day Challenge's day tasks are the one exception) · routine (as a noun for the app; "part of our routine" is the user's line, not ours) · chore · check in (as a verb outside the Sunday Check-in) · assignment · exercise (for a question or a game) · pattern · restorative · repair (as a noun) · feel seen · hold space · show up for

## Words users use when it works

From the review mining (USER_VOICE.md §8), the phrases couples reach for in five-star reviews. Write toward this register.

| They say | Where it fits |
|---|---|
| "not even five minutes a day", "manageable" | store subtitle, paywall, Daily empty state |
| "brought us closer", "reconnect" | store description, Sunday Check-in intro |
| "things we never knew", "questions you'd never think to bring up" | Daily, Memory Lane |
| "just for the two of us", "private, just for you two" | privacy lines, About page |
| "feels like flirting, not therapy" | Truth or Dare, Fantasy Wishes, the anti-list |
| "keeps things fresh" | Tonight's Date, Draw one for tonight |

Quote the register, not the sentence: a review line never goes into the app as if we said it. The complaint phrases ("cash grab", "everything behind a paywall", "lost my streak", "childish", "one question a day") are what the store copy answers, never what it says.
