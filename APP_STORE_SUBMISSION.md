# App Store Submission Material

Ready-to-paste text and decisions for App Store Connect. Update this file whenever a submission field changes so we have a single source of truth.

## App identity

- **Name (max 30 chars):** `Love Desire` (11 chars)
- **Subtitle (max 30 chars):** `For couples who want more` (25 chars)
- **Bundle ID (iOS):** `com.desire.app`
- **Package (Android):** `com.desire.app` (Android via APK sideload only, not Google Play)
- **Primary category:** Lifestyle
- **Secondary category:** Social Networking

## Age rating

Answer the App Store Age Rating questionnaire as:

- **Frequent/Intense Mature or Suggestive Themes:** Yes (results in 17+)
- **Frequent/Intense Sexual Content or Nudity:** No (17+ is Apple's ceiling; the app self-attests 18+ separately at signup)
- Everything else: No

Final rating: **17+**. In-app age attestation is 18+ (see [CLAUDE.md](CLAUDE.md) "Age gate + explicit-content consent").

## Description (App Store)

**Short version (first 3 lines shown before "more"):**

> Love Desire is a private couples app for two. Grow together with weekly rituals, daily conversation starters, playful games, and quiet insight tools that meet you where you are.
>
> One subscription covers both partners. Explicit content is behind a paywall and an 18+ attestation.

**Full description:**

> Love Desire is a private space for two people who want to keep choosing each other.
>
> **Daily rhythm**
> - Mood check-ins your partner sees
> - Sunday Check-in: 5 questions each week, answered privately, revealed together
> - Moments: your BeReal-style daily photo, side-by-side reveal
> - Love Notes that unlock on the right moment
>
> **Get closer**
> - Truth or Dare, Would You Rather, Fantasy Wishes: play together across two phones
> - Daily picks + questions: three curated categories (Playful, Deep, Spicy)
> - The Lovers: your intimacy type + how you fit together
> - Sensate Focus: guided touch sessions
>
> **Long distance ready**
> - Partner's local time on your home screen
> - Next-visit countdown + pre-visit hype nudges
> - LDR-tagged questions and virtual date filter
>
> **What we don't do**
> - No public feed, no strangers, no ads
> - Pairing requires a code you share out-of-band
> - Explicit content is text-only, paywalled, and behind an 18+ attestation

## Keywords (max 100 chars, comma-separated)

`couples, intimacy, relationship, date night, love language, ldr, long distance, questions, mood, ritual`

(96 chars — leaves room for tuning)

## Reviewer notes (App Store Connect submission form)

Paste into "Notes for the Reviewer" verbatim:

> **Test credentials**
> Email: `reviewer-test@lovedesireapp.com` (TODO: create before submit)
> Password: (TODO)
> To pair a second reviewer account use the in-app invite code flow — one account generates a code in Profile, the other enters it under "I have a code."
>
> **Why UGC moderation flow is architected the way it is**
> This is a 1:1 couples app — pairing requires a 6-digit invite code that partners share out-of-band (SMS, in person). There is no public feed, no discovery, no way for a stranger to send content to any user. The "block abusive user" primitive Guideline 1.2 requires exists as "Disconnect from partner" in Profile (one tap, immediate — deletes the couple bond and clears data access on both sides). Every free-text UGC surface (Fantasy Wishes, Journal, Love Notes, Together List, etc.) is only readable by the two paired partners; nothing is ever exposed to a third party.
>
> **Explicit content**
> Explicit content is behind a mandatory 18+ age attestation at signup (declined = the Firebase Auth account is deleted immediately) plus a paid subscription. Non-subscribers cannot access any explicit content in the app. All content is text-only, no visual pornography, no user-generated visual content beyond couple's own photos in Moments/Tease which are only visible to the pair.
>
> **Payment**
> Subscription is handled via RevenueCat integration — one paid tier covers both partners on a couple. Firebase Firestore doc `couples/{coupleId}/isPremium` is the client-visible flag, written only by the RevenueCat webhook.

## Screenshot strategy

App Store requires 6.5" (iPhone Pro Max) and 5.5" (older) screenshots. Take from a premium admin account so paid features render:

**Only free-tier surfaces — never Fantasy Wishes / Spicy Daily / Fire challenge etc.:**

1. **Home** — couple card + Insight for you + Waiting for you nudges
2. **Sunday Check-in reveal** — both partners' answers side by side
3. **Love Language quiz result** — with primary language + tip on Home
4. **Tonight's Date spin** — 💘 wheel + a date result card
5. **Together List** — with tame preset items visible
6. **Moments grid** — past photo pairs

**Reason to keep Spicy content out of screenshots:** reduces reviewer's opportunity to misread an isolated item as advertising porn. Everything above sells the emotional/relational value.

## Legal

Privacy Policy and Terms of Service must be hosted at a public URL before submission. Currently in-app only at `/privacy-policy` and `/terms-of-service`. Host on the marketing website (Vercel) before submitting.

- Privacy Policy URL: TODO (add to App Store Connect submission)
- Terms of Service URL: TODO

## Version fields

- **Version:** 1.0.0 (matches app.json)
- **Build:** auto-incremented by EAS
- **Copyright:** © 2026 Love Desire

## Submission checklist

- [ ] All required screenshots taken (6.5" + 5.5")
- [ ] App icon 1024x1024 PNG (no alpha)
- [ ] Privacy Policy URL live on Vercel
- [ ] Terms of Service URL live on Vercel
- [ ] Test account credentials created + verified
- [ ] Age rating questionnaire completed
- [ ] Reviewer notes pasted from this doc
- [ ] Keywords set from this doc
- [ ] Description pasted from this doc
- [ ] EAS build submitted via `npx eas build --platform ios --profile production`
- [ ] Build uploaded to App Store Connect
- [ ] Final review of everything above before hitting "Submit for Review"
