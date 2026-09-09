# App Store Submission Material

Ready-to-paste text and decisions for App Store Connect. Update this file whenever a submission field changes so we have a single source of truth.

## App identity

- **Name + subtitle:** drafted in [MARKETING.md §2.2-2.3](MARKETING.md) with a `{APP_NAME}` token while H43 (rename) is open. Current draft: `{APP_NAME}: Couples Intimacy` / `Rituals, games & check-ins`. (The old subtitle `For couples who want more` was retired Aug 2026 for the tagline "A private app for two".)
- **Bundle ID (iOS):** `com.desire.app`
- **Package (Android):** `com.desire.app` (Android via APK sideload only, not Google Play)
- **Primary category:** Lifestyle
- **Secondary category:** Social Networking

## Subscription pricing

Decided August 2026.

- **Monthly:** **$9.99** — matches Paired, mid-market standard for couples apps
- **Annual:** **$59.99/yr** — ~50% off effective vs monthly ($5/mo), sub-averse win
- **Free trial:** **7 days** — Apple standard, needed because both partners must pair + try
- **Launch introductory offer:** **First month $4.99** (50% off) — reduces friction for early adopters, expires after ~90 days per Apple intro-rate rules
- **Lifetime tier:** none at launch — revisit post-launch if enough users ask
- **Revenue split:** Apple takes 30% first year, 15% after. Net: ~$6.99-$8.49/mo, ~$41.99-$50.99/yr

### App Store Connect setup

- Create subscription group: `Love Desire Premium`
- Base subscription: `com.desire.app.premium.monthly` at $9.99
- Auto-renewable subscription: `com.desire.app.premium.annual` at $59.99
- **Introductory offer** on both: 7 days free (`FREE_TRIAL`), for new subscribers only
- **Promotional offer** (launch campaign, ~first 90 days): "First month $4.99" — `PAY_AS_YOU_GO` for 1 month at $4.99

RevenueCat wraps both. Webhook writes to `couples/{coupleId}/isPremium` per the couple-level subscription pattern.

## Age rating

Answer the App Store Age Rating questionnaire as:

- **Frequent/Intense Mature or Suggestive Themes:** Yes (results in 17+)
- **Frequent/Intense Sexual Content or Nudity:** No (17+ is Apple's ceiling; the app self-attests 18+ separately at signup)
- Everything else: No

Final rating: **17+**. In-app age attestation is 18+ (see [CLAUDE.md](CLAUDE.md) "Age gate + explicit-content consent").

## Description, promo text, keywords

Moved to [MARKETING.md §2.4-2.10](MARKETING.md): keyword strings per locale (en-US, es-MX, en-GB, en-AU, 100 chars each), IAP display names, promotional text, and the full description with current feature names (Presence, Our Story, Memory Lane, Activity Cards). Paste from there.

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

Six free-tier screens with caption copy in [MARKETING.md §2.8](MARKETING.md). Rule kept from here: never show Fantasy Wishes / Spicy Daily / Fire challenge in screenshots, it invites the reviewer to misread an isolated item as advertising porn.

## Legal

Privacy Policy and Terms of Service must be hosted at a public URL before submission. Currently in-app only at `/privacy-policy` and `/terms-of-service`. Host on the marketing website (Vercel) before submitting.

- Privacy Policy URL: TODO (add to App Store Connect submission)
- Terms of Service URL: TODO

## Version fields

- **Version:** 1.0.0 (matches app.json)
- **Build:** auto-incremented by EAS
- **Copyright:** © 2026 Love Desire

## Domain + brand acquisition (do first, before submission)

Based on [BRAND_RESEARCH.md](BRAND_RESEARCH.md) — "Love Desire" is clear of trademark blocks and the primary domain is available. Execute in this order:

- [ ] **Register `lovedesireapp.com`** at Namecheap / Cloudflare Registrar / Vercel Domains (~$12/yr). Cloudflare is at-cost pricing, no upsells — probably the best value.
- [ ] **Defensively register `lovedesire.app` + `lovedesire.io`** (~$20-40/yr each). Prevents anyone squatting them mid-launch. Point at the same Vercel deployment or leave dark.
- [ ] **Do NOT chase `lovedesire.com`** — it's held by HugeDomains (squatter since 2003), premium price. `lovedesireapp.com` covers the App Store field without the squatter markup.
- [ ] **Register social handles** `@lovedesireapp` on:
  - [ ] Instagram
  - [ ] TikTok
  - [ ] Twitter/X (closest existing `@LoveDesire_info` is a defunct 2015-2019 Japanese band — safe to co-exist)
  - [ ] YouTube
- [ ] **DNS setup at Vercel:** once domain is registered, add it as a custom domain on Vercel project #2 (the `web/` marketing site). Vercel provisions SSL automatically.
- [ ] **Update `web/astro.config.mjs`** if the site URL differs from the default `lovedesireapp.com`.

## Post-launch trademark (3-6 months in)

- [ ] File USPTO trademark for "Love Desire" in Class 9 (downloadable software) + Class 42 (SaaS). ~$350 base filing fee per class. Only worth it if the app gets meaningful US traction. EU/EUIPO filing is a separate ~€200 if we want pan-EU coverage.

## App Store submission checklist

- [ ] All required screenshots taken (6.5" + 5.5")
- [ ] App icon 1024x1024 PNG (no alpha)
- [ ] Privacy Policy URL live on Vercel (`https://lovedesireapp.com/privacy-policy`)
- [ ] Terms of Service URL live on Vercel (`https://lovedesireapp.com/terms-of-service`)
- [ ] Support URL live on Vercel (`https://lovedesireapp.com/support`)
- [ ] Test account credentials created + verified (see reviewer notes above)
- [ ] Age rating questionnaire completed (see this doc)
- [ ] Reviewer notes pasted from this doc
- [ ] Keywords set from MARKETING.md §2.4 (all four locales)
- [ ] Description + promo text pasted from MARKETING.md §2.10
- [ ] EAS build submitted via `npx eas build --platform ios --profile production`
- [ ] Build uploaded to App Store Connect
- [ ] Final review of everything above before hitting "Submit for Review"
