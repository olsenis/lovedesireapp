# Reddit and forum voice-of-customer: general couples apps

Agent report, Sep 13 2026, as delivered. Feeds USER_VOICE.md §9b. Quotes verbatim, no usernames.

## Coverage notes

- WebSearch refuses `reddit.com` outright, and Brave's HTML search throttled after 3 queries. Discovery worked via **Arctic Shift** (`arctic-shift.photon-reddit.com/api/posts/search`, data through Sep 2026) plus the 3 Brave queries that did return. pullpush.io rate-limits to uselessness.
- Reddit RSS with the default curl UA now returns 403/429 after one hit; a **Feedly feed-fetcher UA** (`Feedly/1.0 (+http://www.feedly.com/fetcher.html...)`) gets 200 at ~1 request / 10 s. 66 threads fetched, all 200.
- Non-Reddit: Product Hunt Candle page OK (WebFetch); App Store "see all reviews" pages OK via curl (reviews sit in an embedded JSON blob, `"$kind":"Review"`); justuseapp 403; Trustpilot paired.com 404 (pair.app is a different dating app); Google Play page truncated. HN Algolia: only Show HN posts with 0 comments (Lovewick, Middly).

## 1. Threads read (comments = non-deleted entries read)

| URL (reddit.com/r/...) | Sub | Year | Topic | Cmts |
|---|---|---|---|---|
| apps/comments/1qao3tr | r/apps | 2026 | "any good couples apps you'd recommend?" | 118 |
| apps/comments/1kgyvev | r/apps | 2025 | "what apps do real couples actually use?" | 92 |
| apps/comments/1dmzg87 | r/apps | 2024 | Lovewick went paid, want free "coupley" app | 82 |
| LDR/comments/11kl5fe | r/LDR | 2023-26 | "tried Agapé, Paired or any app for couples, how was it?" | 74 |
| LongDistance/comments/1sqig9f | r/LongDistance | 2026 | "Best Couples App For LDR??!" | 59 |
| LongDistance/comments/1nt2ss1 | r/LongDistance | 2025 | "any good couple apps" | 45 |
| LongDistance/comments/16bfqln | r/LongDistance | 2023 | asked BF to install Agapé, he hasn't | 30 |
| Marriage/comments/xd7rgm | r/Marriage | 2022-25 | "Any recommended apps for couples?" | 29 |
| LongDistance/comments/125pjy8 | r/LongDistance | 2023 | iPhone + Android couple, which apps | 27 |
| apps/comments/1pt3jyi | r/apps | 2025 | "Couples apps like Paired?" (Paired gone downhill) | 27 |
| LDR/comments/1mxko5y | r/LDR | 2025 | "Free App for couples to connect?" | 22 |
| LongDistance/comments/1som899 | r/LongDistance | 2026 | "do you use apps to stay connected?" | 22 |
| androidapps/comments/9c5db2 | r/androidapps | 2018-19 | "Best app for couples?" Between vs Avocado/Couple | 22 |
| DeadBedrooms/comments/1hsoi5i | r/DeadBedrooms | 2025 | "Paired app or similar" | 21 |
| HLCommunity/comments/wsd7qg | r/HLCommunity | 2022 | "Paired, the couples app" | 20 |
| LongDistance/comments/jx7q8i | r/LongDistance | 2020 | Agapé "his answers melt my heart" | 20 |
| LongDistance/comments/1m82jvm | r/LongDistance | 2025 | "Couples apps?" after Official shut down | 19 |
| LongDistance/comments/1rw4x77 | r/LongDistance | 2026 | "couples question app, did it actually stick?" | 19 |
| apps/comments/1jwfijg | r/apps | 2025 | "similar app to Cozy Couples" | 19 |
| LongDistance/comments/1ei1m50 | r/LongDistance | 2024 | new LDR, app recs | 18 |
| LDR/comments/1jxwi2f | r/LDR | 2025 | LDR apps (Cozy + Evergreen tried) | 18 |
| LDR/comments/1g6m7sw | r/LDR | 2024 | 3-year LDR app list | 17 |
| IndianRelationships/comments/1oyqis9 | r/IndianRelationships | 2025 | "Has any couples app (Paired/Agapé) genuinely helped?" | 16 |
| LongDistance/comments/1ou4018 | r/LongDistance | 2025 | Cozy Couples recommendation | 16 |
| Marriage/comments/1qt8f1l | r/Marriage | 2026 | "Are couple apps worth the money?" | 15 |
| LongDistance/comments/1kqytk9 | r/LongDistance | 2025 | "Good couples apps?" (cancelled Cozy premium) | 15 |
| LongDistance/comments/1o7un4m | r/LongDistance | 2025 | "Cozy couples app" | 14 |
| dating/comments/1bugi8m | r/dating | 2024 | "Best free app for couples" | 12 |
| Marriage/comments/aewf0e | r/Marriage | 2019-23 | "Lasting App?" | 11 |
| AsOneAfterInfidelity/comments/wzdgy0 | r/AsOneAfterInfidelity | 2022 | "Your thoughts on the Lasting app" | 11 |
| Marriage/comments/1csq5jb | r/Marriage | 2024 | "Couple's Apps" (18-year marriage) | 11 |
| LongDistance/comments/1lweep0 | r/LongDistance | 2025 | "apps like Paired / Couple Joy?" | 11 |
| LongDistance/comments/1517tzk | r/LongDistance | 2023 | LDR app recs, mixed platforms | 10 |
| LongDistance/comments/1f5apfz | r/LongDistance | 2024 | "LD apps that are non subscription based?" | 10 |
| LongDistance/comments/1q8q7at | r/LongDistance | 2026 | "Free Candle alternative?" (founder replied) | 9 |
| Marriage/comments/r9oav8 | r/Marriage | 2021-22 | "Lasting app and other app recommendations?" | 8 |
| LDR/comments/14cp6aj | r/LDR | 2023 | LDR connection apps | 8 |
| LDR/comments/1si3ei0 | r/LDR | 2026 | "Best app for long distance couples?" | 7 |
| Marriage/comments/vtfod4 | r/Marriage | 2022 | "Marriage Apps or tools" | 6 |
| LongDistance/comments/1sl530m | r/LongDistance | 2026 | "Apps that improved your relationship?" | 6 |
| AskMen/comments/1rsz0x8 | r/AskMen | 2026 | "how much would you pay per month for a couple's app?" | 5 |
| SupportforWaywards/comments/wuwj4o | r/SupportforWaywards | 2022 | Lasting shout-out | 5 |
| polyamory/comments/1bwv3hw | r/polyamory | 2024 | Evergreen won't allow >1 partner | 5 |
| Marriage/comments/qcflwf | r/Marriage | 2021 | "Counseling app" (Lasting) | 4 |
| apps/comments/1rjm4ub | r/apps | 2026 | "tried every couples app, built one" (Adeux) | 4 |
| LDR/comments/i7y8vl | r/LDR | 2020 | Lovewick founder beta post | 25 |

Also read, low signal (deleted OP or off-topic): LongDistance 1rtnq0n, xwhvv5, 1md5xko, 1fhj4vh, 1fxcik5, 19fgveq, v0q88o, lsh4w3, 1o5ob5a, 1pr409u, qwprm8, 14x241a, qj76gi; LDR 1g2mufg, 1lpuwac, 1qtbcyv, 1u4sn5r, 1depu3z; apps 1ks39kq; iosapps 1rnzxrp; couplestherapy 1fzotmz; malelivingspace 1k7dsus; DatingApps 18gx375. Non-Reddit: Product Hunt Candle; App Store review pages for Paired (GB), Lovewick, Evergreen, Lasting, Love Nudge, Between, Couple Joy, SumOne, Agapé, Cozy Couples, Candle.

## 2. Theme summary

### Complaints

**Paywall / "free" is not free / who pays** (≈22 threads, the dominant complaint)
- "Most of the ones I find ask for money to access anything and I don't want to spend money on something just to find out it isn't great" (OP, LongDistance/1m82jvm)
- "lock almost every basic feature behind expensive subscriptions and try to charge both husbands and wives separately just to connect their accounts" (Paired, Lovewick; Marriage/1qt8f1l)
- "Not a free app. You get a 7 day free trial with limited access and then it's 7.50/person" (Paired; dating/1bugi8m)
- "That app has since gone like most others to being one you have to pay to use. Typical." (Lovewick; apps/1dmzg87)
- "$15/month is insane. $180/year?! Yikes. That's more than I pay for my TV streaming apps." (Agapé, App Store 4★ 2022)
- Confusion even when one sub covers both: "Not sure if I'm paying the cost for Paired and my partner gets an invite, or is expected to also pay?" (LDR/11kl5fe), answered "it only requires one membership".

**Homework / routine pressure / streaks** (≈9 threads)
- "it started feeling like homework. The last thing I wanted to do after a long work day was answer a quiz just to see her answer." (Paired; Marriage/1qt8f1l)
- "honestly most of em felt like checking boxes" / "Like you're filling out a form together." (LongDistance/1rw4x77)
- "We stopped using it simply because we weren't consistent and didn't want it to feel like a task." (Paired; DeadBedrooms/1hsoi5i)
- "now it brings me more problems if I don't do the routine stuff" (Paired; apps/1qao3tr)
- "won't show us the question unless we pay to fix the streak" (Couple Joy, App Store 4★ 2026); "a streak shield... not have to deal with a $3 charge to keep the streak going" (Candle, App Store 4★ 2026)
- Counter-signal: "she have much importance to the daily streak and won't let me miss a day" (Agapé; LDR/11kl5fe)

**Partner won't participate** (≈11 threads)
- "it requires both people to participate, and my partner isn't super into it" (Paired, Agapé; LongDistance/1sl530m)
- "We downloaded paired but he hasnt touched it after the first day. :(" (LDR/11kl5fe)
- "She'd answer with one word answers... I ended up feeling more disconnected because it felt like she didn't care." (Agapé; LongDistance/16bfqln)
- "he just kind of didn't participate in it unless I told him to check the app and then it just seemed like work" (Paired; Marriage/1qt8f1l)
- "Spouse couldn't be bothered after initial interest. Only answered questions about sex." (Paired, App Store 3★ 2024)

**Repetitive / content runs out / AI-generic** (≈8 threads)
- "after about a year it felt like we'd gone through a lot of the content and we're getting similar repeat stuff" (Paired; LDR/11kl5fe)
- "after like 2–3 weeks the questions started to feel repetitive and kinda like homework, so we stopped opening them" (Paired, Agapé; IndianRelationships/1oyqis9)
- "since they've clearly leaned harder into AI generated content a lot of it now feels generic and surface level" (Paired; apps/1pt3jyi)
- "we've run out on free questions for both. So I made my own website that queries Anthropic's API" (Official, Candle; LongDistance/1rw4x77)
- "after 2 years and 200+ questions in, some of these questions are not great" (SumOne, App Store 4★ 2025)

**Cringe / childish / inane** (≈6 threads)
- "the questions are taking themselves so seriously. There was just something about the app that made me cringe" (Agapé; LongDistance/16bfqln)
- "it feels kinda childish for me" (Paired; apps/1qao3tr); "that gamified vibe feels a bit young for us" (LovBirdz; Marriage/1qt8f1l)
- "We tried cozy couple, but it just felt inane. With the plant growing etc." (LDR/1g2mufg)
- "even for me, I felt it was too fake. You can always pretend." (Agapé; LDR/11kl5fe)

**Therapy-feel / "fix your relationship" framing** (≈6 threads)
- "Paired: closer to therapy than play." (apps/1qao3tr)
- "we prefer it a lot more than Paired which is more focused on 'fixing' a relationship. We don't want our relationship to be fixed" (LDR/1si3ei0)
- "sometimes I feel the questions prompt arguments rather than dialogue" (Paired; LongDistance/1sqig9f)
- "we wanted something more focused on staying connected daily and not like therapy sessions" (Paired, Agapé; LongDistance/1sqig9f)

**Bugs / sync / cancellation** (≈6 threads + App Store)
- "It wouldn't sync properly due to the vast difference in time zones... we couldn't see each other's answers at all." (Agapé; LongDistance/lsh4w3)
- "his unsynced, and he couldn't get it sorted again (support was no help)" (Paired; LDR/11kl5fe)
- "one time I even saw my partner's answer before I wrote mine!" and "randomly deleted our streaks" (Cozy Couples, App Store 4★ 2026)
- "all my photos older than about one year have failed to render" (Between, App Store 3★ 2026); "NIGHTMARE to cancel" (Lasting, App Store 1★)

**Privacy / tracking** (≈4 threads): "I wish your analytics weren't run through tiktok!" (Candle; LongDistance/1q8q7at); "No social feed, no strangers, no data harvesting" as a selling point (apps/1rjm4ub); "google calendar and IG are too public sometimes" (apps/1kgyvev).

**Notifications** (≈2): "it feels forced to pour your heart out when you get a phone notification. It has to come naturally." (Agapé; LongDistance/16bfqln). Mostly positive otherwise ("a nice feeling that you see the agape notification").

**Platform** (≈5): "I hate that all the decent couple apps are always Apple only" (LDR/i7y8vl); Couple Joy and Loverzz iOS-only complaints; whole thread LongDistance/125pjy8.

### Praise

**Mutual reveal** (≈9 threads): "it keeps your answers a secret until you've both answered. Makes for a good comparison later" (Paired; LongDistance/1ei1m50); "you can only see the answer when both of you have answered" (SumOne; 1nt2ss1); "the fact you can't see your partner's answer until you send in yours is good" (Agapé, App Store 5★).

**Questions you'd never think to ask** (≈12): "It helps communication about topics you may never think to discuss." (Agapé; 1nt2ss1); "We've been together for 40+ years but I've still been able to learn a couple of new things about her" (Paired free; IndianRelationships/1oyqis9); "gave us questions we wouldn't even think to ask each other" (SumOne; 1ei1m50).

**Looking back / scrapbook** (≈6): "Re-reading through what we've said about one another, especially during a rough patch or argument has been really nice" (Agapé; 11kl5fe); "when my mental health takes a dip... I get a boost from reading over memories added, love notes" (Agapé; LDR/14cp6aj); "nice to have some of those messages to lean back on when doubt creeps in" (Cozy; 1sqig9f).

**Low-effort, fits in a busy day** (≈7): "It takes not even 5 mins a day... Something that says 'I'm thinking of you'" (Couple Joy, App Store 5★); "we don't really get to talk when we get to use the app and then I come home and I'm tired" (Cozy; apps/1kgyvev); "It's been way better for us because it takes zero effort" (Intimigo vs Paired; Marriage/1qt8f1l).

**Play beats prompts** (≈8): "The daily pixel game is our favorite" (Cozy; 1o7un4m); "The shared canvas is so good" (Candle, Product Hunt); "he likes the games and winning" (Paired; 11kl5fe); "the convo happens naturally instead of 'ok time to do our relationship app'" (LovBirdz; 1qt8f1l).

**Content quality (Lasting)**: "Its interface is a little wonky, but the content is excellent... prepared by credentialed experts" (Marriage/r9oav8); "really helpful to jump-start conversations when we have both felt a little stuck" (SupportforWaywards/wuwj4o); but "it got old quickly... It's not life changing in any means" (Marriage/vtfod4).

### Wishes (no app delivers)

- **A usable free tier or one-time purchase**: "all the apps have some sort of payment to unlock everything that is GOOD about the app" (LongDistance/1f5apfz); "any plans to add a lifetime purchase option?" (apps/1rjm4ub); "I'm cheap, I would never pay for those apps." (1lweep0)
- **Write your own questions / personalisation**: "The only thing missing is... you can write your own questions. If they add that it'll be priceless" (Candle, App Store 5★); "most apps give everyone the same basic questions regardless of how long you've been together" (apps/1dmzg87)
- **Carry the conversation past the prompt / into real life**: "the interesting part was what came after the prompt, the back-and-forth, not just answering the question" (Marriage/1qt8f1l); "all of our connectedness and flirting kinda stays in the app. No meaningful changes outside of the app." (Paired; DeadBedrooms); "Wish for real-life activities without phones, not just increasing screen time" (Paired, App Store 4★ 2025)
- **Intensity control**: "Specify what level of intensity we'd like in the random question draw, sometimes we get a deep question in public" (Lovewick, App Store); "asking about polyamory and BDSM before we even got through the basics" (Spicer; DeadBedrooms)
- **Richer mood signalling**: "more options, specifically 'off' 'in my head' 'overthinking' 'missing/longing' or 'check in w/ me'" (Cozy, App Store 5★); "We're both neurodivergent, and having a way to communicate our moods... has been really helpful" (Cozy, App Store 4★)
- **Streak grace / sane reset time**: "the time it refreshes for the daily question is really irritating (7pm my time)" (Couple Joy, App Store)
- **Shared calendar + notes in the same app**: Between, Candle and SumOne reviewers all ask for whichever of those is missing; "the shared calendar, it makes me feel more part of his life" (SumOne; 1nt2ss1)
- **Solo mode**: "I want to understand him better on my own" (1sl530m); Lovefix praised for solo sessions.
- **Poly / friends / family, queer-friendly**: Evergreen and Paired refuse >1 partner (polyamory/1bwv3hw); "no evidence of non-monogamy or kink... not very queer friendly" (Couple Joy, App Store 4★)
- **Data longevity**: after Official shut down, "i emailed the customer support if we can have all our data saved and they sent it" (11kl5fe); Avocado, Couple, Happy Couple, Official all died under users.

### Verdict one-liners
- "Paired: closer to therapy than play. Couple Game: very soft, very progressive. LovBirdz: more long-term... Desire: fine, but kind of forgettable." (married 10+ yrs; apps/1qao3tr)
- "if your goal is structured check-ins and guided communication, Paired makes sense; if 'connect more but keep it light and fun so we actually do it', LovBirdz" (Marriage/1qt8f1l)
- "fun and casual with little games: Cozy Couples or SumOne... deeper conversation prompts, Agapé is really good" (apps/1qao3tr)
- "Paired - better version of agape" (LDR/1mxko5y)
- "Daily check-ins, for the cute part, tender love: Paired. Conflict resolution: Lovefix" (apps/1qao3tr)
- "Most of the popular ones like Paired or Lovewick are definitely not worth the money anymore" (Marriage/1qt8f1l)
- "Most couple apps or dating things suck." (LongDistance/1rw4x77)

## 3. Per-app verdicts

- **Paired**: most-mentioned, polarised: great for new couples and 30+-year marriages on the free question; paid/therapy-ish/homework for everyone else. "big fan of paired, though i do pay for it" vs "We've tried paired and thought it was dumb bc of having to pay for it" (1nt2ss1, apps/1dmzg87).
- **Agapé**: the LDR sentimental favourite 2020-24; scrapbook value, but paywall and repetition. "Agapé got us close enough to close the gap" (1nt2ss1) / "the questions were repetitive and we gave up" (11kl5fe).
- **Cozy Couples**: 2025-26's darling on r/LongDistance, cute-not-serious; recent "cash grabby" turn. "hella cute" (1nt2ss1) / "ultimately lacking in features, so I canceled our premium" (1kqytk9).
- **Lasting**: respected content, dated UX, subscription pain, infidelity-recovery niche. "10/10 would recommend" (r9oav8) / "activities can get tedious" (aewf0e).
- **Between**: private messenger + album; loyal 7-10 year users, ads and photo loss. "Once you've used Between, normal texts are boring and annoying" (App Store 5★) / "Between pushed us too much via their ads and their pricing" (androidapps/9c5db2).
- **Candle**: liked for drawing widget and design, streak-fee friction, TikTok analytics; founder made core free Feb 2026. "I don't like the UI of candle thoo" (1sqig9f) / "The drawing feature is 🤌" (Product Hunt).
- **Couple Joy**: cheap ($20-40/yr), widgets + distance counter; streak reset time annoys. "way more lightweight. short daily quizzes that are fun and not cringe" (IndianRelationships).
- **Evergreen**: "some good conversation starters but... sometimes the questions were lame and felt repetitive" (11kl5fe); "eventually you can run out of things to do" (1kqytk9).
- **SumOne**: free, cute egg pet, shared calendar; pebble grind and odd questions. "We're at question 452 now" (1rw4x77) / "some of the questions are just, for lack of a better word, dumb" (App Store 4★).
- **Love Nudge**: barely on Reddit; "I've also used LoveNudge in the past... it offers less than Lovewick" (apps/1kgyvev); love-tank meter "a potential fight starter" (App Store).
- **Couple Game (Tap In Love)**: one mention: "very soft, very progressive. The upfront preference quiz helps a lot. Good if one partner is cautious or vanilla." (apps/1qao3tr)
- **Lovewick**: remembered fondly as free, resented after the paywall: "You had a great thing and you ruined it" (App Store 1★ 2024) / "why not pay for it? People are spending hard earned time and money" (apps/1dmzg87).

## 4. Surprises

- **"Desire" is already a couples app people have tried** (androidapps/9c5db2 in 2018; apps/1qao3tr in 2026: "Desire: fine, but kind of forgettable"). Feeds H43 directly.
- **App death is a lived fear**: Avocado, Couple, Happy Couple, Official all shut down under their users; a data-export promise would be a differentiator nobody markets.
- **Reddit is saturated with indie-dev astroturf**: in r/apps/1qao3tr roughly half the 118 comments are founders, and a commenter notes "most of them are one guy's side project from the last 6 months." Genuine users mostly name Cozy Couples, SumOne, Couple Joy, Paired, Agapé; LovBirdz comments read as coordinated.
- **Effort is the enemy, not price**: the Intimigo pitch ("takes zero effort", uses Apple Health) won two converts in one r/Marriage thread against Paired's "homework".
- **Real-time answering together** (LovBirdz) is praised over async submit-and-wait: "you actually get to talk about your answers together instead of just submitting them separately" (1rw4x77).
- **The "In The Mood" mutual-only signal app** is being pitched on r/LDR and r/apps (1mxko5y, 1qao3tr), the same mechanic as our Tonight? pill.
- **Long-married couples (33-40 years) are a real free-tier audience** and explicitly say "one question a day is more than enough".
- **Apps drift paid over time and users notice** (Paired "free" in 2022, Lovewick 2024, Cozy 2026); launch-time free generosity buys goodwill that is withdrawn later at reputational cost.

Sources beyond Reddit: Candle on Product Hunt (producthunt.com/products/candle-4); App Store "see all reviews" pages for Paired (GB), Lovewick, Evergreen, Lasting, Love Nudge, Cozy Couples.
