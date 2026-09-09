# Marketing, ASO and go-to-market

Source of truth for everything about being found and being chosen: positioning, App Store metadata, channels, Apple Search Ads, KPIs, budget. Other docs point here. Started Sep 9 2026 from the ASO discussion and the H43 naming work.

**Update rule:** edit this file in the same commit as any App Store Connect metadata change, on any name change (H43), and after each monthly keyword review (§2.11). Everything below is a working draft, not a decision: App Store copy is cheap to change until the first submission and expensive after (ASO history, deep links).

**Name token:** the app name is written as `{APP_NAME}` wherever it appears in metadata, because H43 (rename, see [POLISH_TODO.md](POLISH_TODO.md#L103)) is undecided. Character counts are shown for both current candidates: **Love Desire** (11 chars) and **Tenero** (6 chars). When the name is locked, find-and-replace the token and re-check every count.

Related: [APP_STORE_SUBMISSION.md](APP_STORE_SUBMISSION.md) (submission checklist, reviewer notes, age rating, pricing setup), [BRAND_RESEARCH.md](BRAND_RESEARCH.md) (Love Desire clearance, Aug 2026), [LAUNCH_STATUS.md](LAUNCH_STATUS.md), `memory/competitive_research.md`, `memory/app_vision.md`.

---

## 1. Positioning

**Tagline (decided Aug 2026):** *A private app for two.* Used on the website hero, footer, meta description. Superseded "For couples who want more".

**One-line pitch:** Weekly rituals, nightly questions, weekend games, for two people who are already together. Nothing to swipe, no one else inside.

**Who it is for:** couples 25 to 45, cohabiting or long-distance, who want a shared habit rather than a chat app. Self-selected: they already talk, they want more to talk about. Not for people looking for a partner, not a therapy substitute.

**Proof points (numbers from [README.md](README.md), keep in sync):**

| Claim | Number |
|---|---|
| Conversation questions across Playful / Deep / Spicy | 474 |
| Truths + dares across Sweet / Flirty / Spicy | 310 + 274 |
| Fantasy Wishes scenarios (paid) | 294 |
| Date ideas incl. virtual for long distance | 130 |
| Would You Rather questions + themed packs | 191 + 6 packs |
| 30-day programs | 4 x 30 days |

**The anti-list is the product.** These are promises the website already makes on `/pricing` ("What you'll never see") and `/about`; repeat them everywhere:
- No public feed, no strangers, no ads
- No streaks, no points, no leaderboards
- No weekly pricing, no coin packs, no per-partner pricing: one subscription covers both
- Explicit content behind an 18+ attestation and the paid tier, text only

**Privacy angle (from `memory/launch_todo.md`):** say "private", "only the two of you", "encrypted in transit and at rest". **Never** say "end-to-end encrypted" or "zero-knowledge"; neither is true (Firebase, server-readable).

**Competitor contrast (how we describe the shelf, not what we say publicly):**

| App | What it is | Where we differ |
|---|---|---|
| Paired | daily questions + therapist-written courses | we have rituals and games, they have courses; they are "work on it", we are "enjoy it" |
| Coral | sex-ed and intimacy exercises | we are the whole week, not the bedroom only |
| Desire, Couples Game | dare-sending game, 12 years old, AI | single mechanic; we own the name collision problem (H43) |
| Between | couples messenger + calendar | we deliberately have no chat |
| Kindu, Happy Couple | dead or dormant | their users are looking for a replacement |

Our slot: **rituals + play + quiet insight, in one private space, near or far.** LDR is a distinctive feature (about a quarter of the app), not the niche (decided May 2026).

---

## 2. ASO, App Store

### 2.1 How ranking works, in the order that matters

1. **Title (30 chars)** carries the most keyword weight. Then **subtitle (30)**, then the hidden **keyword field (100)**, then **in-app purchase display names**. Apple combines words across fields ("love" in the title + "language" in keywords matches "love language"), so never repeat a word across fields.
2. **Ratings**: count, velocity and average, per storefront. A new app has none; the first 50 matter more than the next 500.
3. **Conversion**: the share of people who see the listing and install. Icon, first three screenshots, subtitle. Higher conversion lifts rank for the same keyword.
4. **Download velocity**: installs per day, organic and paid both count.

Consequence: **no new app wins "couples app"**; the first page belongs to apps with millions of installs. The brand name never wins generic searches either, whatever it is. Where the name matters is exact-match search after word of mouth (see H43). Our wins come from **long-tail phrases** (§2.6) where we have a feature and competitors have a keyword.

### 2.2 Title

Format: `{APP_NAME}: <two keywords>`. The brand stays one unit so the exact phrase ranks; the suffix carries the searchable words.

| Candidate | Love Desire | Tenero | Note |
|---|---|---|---|
| `{APP_NAME}: Couples & Intimacy` | **31, too long** | 26 | best keywords, only fits a short name |
| `{APP_NAME}: Couples Intimacy` | 29 | 24 | recommended for Love Desire |
| `{APP_NAME}: Rituals for Two` | 28 | 23 | on-brand, weaker keyword ("rituals" is low volume) |
| `{APP_NAME}: For Couples` | 24 | 19 | safe, wastes chars |

**Draft:** `{APP_NAME}: Couples Intimacy` (Love Desire 29 / Tenero 24).

### 2.3 Subtitle

| Candidate | Chars | Note |
|---|---|---|
| `Rituals, games & check-ins` | 26 | recommended, three feature families, no overlap with title |
| `Check-ins, games & date nights` | 30 | "date night" is a searched phrase, fills the field |
| `Weekly rituals, nightly games` | 29 | reads well, fewer distinct keywords |
| `A private app for two` | 21 | the tagline, zero keyword value; keep it for the website, not here |

**Draft:** `Rituals, games & check-ins` (26). Retires `For couples who want more` from APP_STORE_SUBMISSION.

### 2.4 Keyword field, 100 chars per locale

Rules: comma-separated, **no space after commas**, singular only (Apple matches plurals), no words already in title or subtitle, no competitor names (guideline 2.3.7, rejected at review), no "app" or "free". Counts below are exact.

Locale trick: each storefront indexes more than one locale's keyword field. **US reads en-US and es-MX. UK reads en-GB and en-AU. Iceland, Nordics and most of Europe read en-GB.** Filling all four gives 200 chars per storefront instead of 100. Spanish keywords in es-MX are indexed for US searches typed in English too.

| Locale | Chars | String |
|---|---|---|
| en-US | 95 | `relationship,language,quiz,long distance,ldr,date night,truth or dare,marriage,partner,question` |
| es-MX | 96 | `pareja,relacion,intimidad,amor,novio,novia,pregunta,juego,distancia,cita,matrimonio,reto,romance` |
| en-GB | 97 | `relationship,language,quiz,long distance,date idea,truth or dare,wife,husband,anniversary,romance` |
| en-AU | 95 | `couple game,relationship,quiz,long distance,girlfriend,boyfriend,date night,connection,question` |

Assumes title `{APP_NAME}: Couples Intimacy` and subtitle `Rituals, games & check-ins`, so "couples", "intimacy", "rituals", "games", "check-ins" and (for Love Desire) "love", "desire" are already indexed and deliberately absent above. **If the name becomes Tenero, add `love` to en-US and en-GB** (it is no longer in the title).

### 2.5 In-app purchase names are indexed

Display names of subscriptions appear in search results and count as keywords. Product IDs do not change.

| Product ID | Display name (draft) |
|---|---|
| `com.desire.app.premium.monthly` | `Couples Premium, Monthly` |
| `com.desire.app.premium.annual` | `Couples Premium, Annual` |

Subscription group: keep `{APP_NAME} Premium`.

### 2.6 Long-tail map: feature to phrase to custom product page

Apple allows **35 custom product pages**, each with its own screenshots and promo text, each reachable from a Search Ads campaign or a link. One page per feature intent, in this order of expected volume:

| Search phrase | Feature | Page hero |
|---|---|---|
| truth or dare for couples | Truth or Dare, two-phone mode | the picker screen, Sweet/Flirty visible |
| would you rather couples | Would You Rather | reveal screen, both answers |
| love language quiz | Love Language Quiz + weekly nudge | result card |
| date night ideas | Tonight's Date + Daily | spin result |
| long distance relationship app | LDR: partner time, visit countdown, virtual dates | Home LDR banner |
| couples quiz | The Lovers (paid) + Memory Lane | Memory Lane score card |
| sunday check-in / weekly check-in couples | Sunday Check-in | side-by-side reveal |
| intimacy tracker | Intimacy Log (paid, opt-in) | Stats tab, no explicit pills |
| fantasy list couples / yes no maybe list | Fantasy Wishes (paid) | matches screen, tame items only |
| daily questions for couples | Daily | Playful question reveal |

Build the first five before launch, the rest from search-term data (§2.11).

### 2.7 Category

**Primary: Lifestyle** (Paired, Coral, Desire Couples Game all sit there; that is where the intent is). **Secondary: Health & Fitness** (Paired's secondary; charts there are less crowded). Revisit after 60 days if the Lifestyle chart position is invisible and Health & Fitness would chart.

### 2.8 Screenshots

Six, free-tier surfaces only, taken from a premium admin account so nothing is locked (rationale in APP_STORE_SUBMISSION: never show Spicy content, it invites the reviewer to misread the app). **The first three carry the pitch**; most people never swipe further. Caption copy per screenshot, 5 to 7 words, no em dashes:

| # | Screen | Caption |
|---|---|---|
| 1 | Sunday Check-in reveal, both answers side by side | Five questions. Answered alone, read together. |
| 2 | Home with couple card + "Waiting for you" nudge | One private space for two. |
| 3 | Tonight's Date spin + result card | Tonight decided in one spin. |
| 4 | Love Language result | Learn how your partner hears love. |
| 5 | Moments grid, past photo pairs | One photo a day, side by side. |
| 6 | Together List with tame presets | Things you both said yes to. |

Sizes: 6.7" and 6.5" (Pro Max), 5.5" (older). Also one 1024x1024 icon without alpha. **None taken yet.**

### 2.9 Ratings prompt

Use `expo-store-review` (`StoreReview.requestReview()`), which calls Apple's native sheet. Apple shows it at most **3 times per 365 days** per device, so spend it well:
- Only after a moment that just went well: a Fantasy Wishes match, a Sunday Check-in reveal, a Memory Lane score, a completed 30-day program.
- Never on Home, never on open, never after a paywall.
- Gate: at least 7 days since install and at least 3 rituals completed, tracked locally.
- **Code follow-up, ~1 hour, not built yet** (§10).

### 2.10 Description and promo text

**Promotional text** (170 chars max, editable without a new build, shows above the description):

> Weekly rituals, nightly questions, weekend games. Only the two of you can see any of it. One subscription covers both partners, 7 days free.

(140 chars.)

**Description** (first three lines show before "more"): the version in APP_STORE_SUBMISSION was written before several renames. Corrected feature names: **Presence** (was Sensate Focus), **The Lovers** (unchanged), **Our Story** (milestones timeline), **Memory Lane** (new, Sep 2026), **Activity Cards** (was Bingo). Draft:

> {APP_NAME} is a private space for two people who want to keep choosing each other.
>
> **Every week**
> Sunday Check-in: five questions, answered alone, revealed together. A love-language nudge on Monday. Memory Lane, a quiz about your own story, once the two of you have one.
>
> **Every day**
> Daily questions and picks in three registers, Playful, Deep and Spicy. Moments, one photo a day, side by side. Mood your partner can see. Love Notes that open at the right time.
>
> **When you have an evening**
> Truth or Dare and Would You Rather across two phones. Tonight's Date, one spin. Activity Cards, 25 face-down cards a month. Fantasy Wishes, a private yes/no list where only mutual yes is ever revealed.
>
> **When you want to understand each other**
> The Lovers, an intimacy-style quiz for both of you. Presence, guided slow touch. Our Story, your milestones on one timeline.
>
> **Near or far**
> Your partner's local time on Home, a visit countdown, and questions and dates that work over distance.
>
> **What we don't do**
> No feed, no strangers, no ads, no streaks. Pairing needs a code you share yourselves. Explicit content is text only, behind an 18+ attestation and the paid tier. One subscription covers both of you.

### 2.11 Measurement and monthly review

- **App Store Connect → Analytics → Acquisition → Sources** shows App Store Search vs Browse vs Referrer per country. **Search terms** are visible for the top terms once volume exists.
- **App Store Connect → Trends** for ratings per storefront.
- Monthly: re-rank the four keyword strings by which terms produced installs, swap the bottom two words, note the change here with the date.
- Optional paid tool: AppFigures (~$10/mo) for keyword rank tracking across countries. Not needed until there is traffic.

---

## 3. Google Play

Not applicable. Android ships as a signed APK from the website (`/android`), decided May 2026 (CLAUDE.md, Distribution strategy). Android discovery is therefore web search (§4), not store search. No Play Console metadata to maintain.

---

## 4. Website and web search

The Astro site in `web/` (nine pages, live at lovedesireapp-web.vercel.app, domain lovedesireapp.com bought Aug 9 2026) is the only surface Google indexes, and the only Android funnel.

- **Per-feature landing pages** mirror §2.6: one URL per long-tail phrase (`/truth-or-dare-for-couples`, `/long-distance`, `/sunday-check-in`), each with a screenshot, 200 words, and both store CTAs. Google long-tail is winnable months before App Store long-tail is.
- **Missing today** (from LAUNCH_STATUS): the Open Graph image (`/og-image.png` is referenced but does not exist, so every shared link renders blank), a real app screenshot in the hero instead of the quote card, a proper favicon.
- **Smart App Banner:** `<meta name="apple-itunes-app" content="app-id=APPLE_ID">` in `BaseLayout.astro` once the App Store ID exists; iOS Safari then shows a native install banner on every page.
- **Blog** from the `sex-ed/` tip vault post-launch: each tip is a page, each page is a search entry. Not before launch.

All of these are code tasks, listed in §10.

---

## 5. Built-in distribution

- **Pairing is the growth loop.** Every user who finishes onboarding invites exactly one person, so the product has a viral coefficient of about 1 by design, before any marketing. Protect the pairing funnel above everything: it is measured in the admin dashboard (pair-completion rate).
- **Invite copy.** Today the code is shown with a copy button and a QR (`app/(auth)/pairing.tsx`); there is no native share sheet. Follow-up: a "Send invite" button using `Share.share` with `"Join me on {APP_NAME}: lovedesireapp.com/join?code=XXXXXX"`, and a `/join` page on the site that shows the store badge and the code. Small code task (§10).
- **Share cards** (post-launch): an opt-in image for moments worth showing a friend, the Sunday reveal, the Love Language result, Year in Review. Never automatic, never containing the partner's answers without both tapping share. This is the only "social" the app will ever have.
- **No paid referral.** Cash or credit for invites is on the dark-pattern list next to streaks.

---

## 6. Launch channels and sequence (global from day one)

| When | Channel | What | Owner |
|---|---|---|---|
| T-42 | App Store featuring | Nominate via App Store Connect → Featuring nomination form (6 to 8 weeks ahead, tell the story: one person, one couple, no feed). Long shot, free. | Óli |
| T-30 | Social handles | Register `@lovedesireapp` (or `@{name}app`) on Instagram, TikTok, X, YouTube. Still unregistered. | Óli |
| T-21 | TestFlight | Friends and family, 10 to 20 couples, collect the first written reviews for launch day. | both |
| T-14 | Press kit | One page on the site: 3 screenshots, icon, 100-word and 300-word blurbs, founder line, contact. | Claude drafts |
| T-7 | Icelandic press | Vísir / mbl / Viðskiptablaðið tech desks: "Icelandic couple builds a couples app, launches globally". Human-interest beats product. | Óli |
| T-7 | Nordic tech | Nordic tech newsletters and podcasts, same angle. | Óli |
| T-0 | Product Hunt | Launch post, first comment explains the anti-list. Ask TestFlight couples to comment. | both |
| T-0 | Reddit | r/LongDistance, r/relationship_advice, r/couples: read each sub's self-promo rule first, post as a story not an ad, answer every comment. | Óli |
| T-0 to T+30 | Apple Search Ads | §8, brand defence plus a small generic test. | Óli |
| T+1 onward | TikTok / Instagram | One format only: the Sunday Check-in reveal, 20 seconds, two phones, one question. Never explicit content, always the 18+ note in bio. Two per week is enough. | both |
| T+30 | Review | Search terms, keyword swap, custom product pages 6 to 10. | Claude |

Icelandic-first was considered and rejected (Sep 9 2026): the app is English-only and the Icelandic storefront is too small to teach us anything. Iceland is still the easiest press.

---

## 7. Social media

- Handles: `@lovedesireapp` on Instagram, TikTok, X, YouTube (BRAND_RESEARCH found them free in Aug 2026; still unregistered). If H43 renames, register `@{name}app` the same day the domains are bought.
- Content rules: no explicit content, ever (platform bans and the 17+ rating). Names, not pronouns. The voice is the `/about` page: plain, warm, slightly dry.
- Cadence: two posts a week is sustainable for two people; zero is fine before launch.

---

## 8. Apple Search Ads

Three layers, run from App Store Connect → Search Ads, Advanced (not Basic, so we choose keywords).

| Layer | Keywords | Why | Budget |
|---|---|---|---|
| Brand defence | our own name | cheap, stops competitors bidding on us, ~$0.10 to 0.50 per tap | $1/day |
| Competitor conquest | paired, coral, desire couples game, between | allowed in Search Ads (not in metadata), 2 to 5x brand cost, converts when our listing looks different enough | $3/day test |
| Generic | couples app, couples game, relationship app | expensive, $2 to 5 per tap in the US, only worth it with a strong listing and ratings | $5/day test, after 50 ratings |

Measure cost per install and cost per trial against LTV: annual $59.99 minus Apple's cut is ~$42; monthly $9.99 net ~$7. A paid install that costs more than $10 to 15 does not pay back on the first year. **Do not bid on "desire" until H43 is decided** (POLISH_TODO L105: spend on that word partly buys installs for the 12-year-old competitor).

---

## 9. KPIs and budget

**KPIs (weekly, from the admin dashboard Retention tab and App Store Connect):**

| Metric | Source | First target |
|---|---|---|
| Installs / week | App Store Connect | trend, no target |
| Pair-completion rate (paired / registered) | admin | > 60% |
| D7 / D30 retention | admin Retention tab | D7 > 35%, D30 > 20% |
| Trial → paid | RevenueCat | > 30% |
| Ratings count and average, US + UK + IS | App Store Connect | 50 ratings at 4.5+ in 90 days |
| Keyword rank for 5 phrases (§2.6) | App Store search by hand or AppFigures | top 20 for two of them in 90 days |

**Budget (annual, before any real ad spend):**

| Item | Cost |
|---|---|
| Domains (.com bought; .app + .is for the final name) | ~$40 |
| Apple Developer Program | $99 |
| Apple Search Ads, capped | $150/month during the first 90 days |
| AppFigures (optional, from month 3) | $10/month |
| Trademark (post-launch, only with traction) | $350 USPTO per class, ~€200 EUIPO |

---

## 10. Open decisions and follow-ups

**Decisions (user):**
- H43 app name: Love Desire vs Tenero vs Belisa vs Kyssa (POLISH_TODO H43 has three shortlists). Blocks final metadata, handles, Search Ads.
- Register social handles (15 min).
- Whether to nominate for App Store featuring (free, 6 to 8 weeks ahead).

**Code follow-ups (not started):**
1. Ratings prompt with `expo-store-review`, gated per §2.9. ~1 h.
2. Website: OG image, hero screenshot, favicon, Smart App Banner meta once the App Store ID exists. ~2 h.
3. "Send invite" share sheet in pairing + `/join` page on the site. ~1.5 h.
4. Share cards (post-launch).
5. Per-feature landing pages on the site (post-launch, after §2.11 data).
6. Screenshots: six, per §2.8, from a premium admin account on a Pro Max simulator or device.
