# Launch status snapshot

Where we are, what's next, what's blocking. Update this file whenever a major line-item flips. Skim this in 30 seconds to know launch state.

> **Last updated:** August 2026

## 🎯 Current phase: Quality iteration (pre-launch)

Launch pressure released — user decision to prioritise "app worth talking about" over ship-fast. Apple Dev enrollment deferred until app is solid. Ongoing:

- **Entertainment redesign roadmap** — 10 items sequenced by viral / emotional-payoff impact. See [ENTERTAINMENT_REVIEW.md § Active work roadmap](ENTERTAINMENT_REVIEW.md). Currently in progress: **#1 Voice Notes in Love Notes**. One item at a time, change → test → approve → commit before next.
- **Security review v3 fixes** landed: H1, M2, L2, L4, I2, NV1, NV3, NV4, NV5, NV6, NV7, S2 (auto-discovery cascade), NV9. Deferred: S1 (RC webhook, blocked on RC setup), S3/S4 (cleanup scaling), S5 (auth trigger), S6/NV2 (push token stalker path — reviewer strongly argued for promotion, deferred to post-real-device-testing), S7 (App Check).
- **Bug bash** queued after entertainment redesign roadmap has 3-4 items shipped.

---

## ✅ Done

### App (mobile)
- Core features complete: rituals, games, insight, LDR mode (see [APP_MAP.md](APP_MAP.md) for full tree)
- Screen-level paywall gates on all 6 paid screens (Fantasy Wishes, Sensate, Blueprint, Activity Cards, Intimacy Tracker, plus Fire/Desire challenge)
- Couple-level subscription model — one paid tier covers both partners (`couples/{coupleId}/isPremium`)
- BDSM consent-language audit (10 Fantasy Wishes items) passed
- Free-tier content sweep — no explicit language in Sweet/Flirty/Playful pools
- Test walkthrough Sections 1-11 passed on Vercel dev preview (see [TEST_LAUNCH.md](TEST_LAUNCH.md))
- Age gate + 18+ attestation flow implemented
- GDPR account delete + re-pair flows verified

### Marketing site (`web/`)
- Astro + Tailwind scaffold
- 9 pages live: `/`, `/features`, `/pricing`, `/faq`, `/about`, `/support`, `/android`, `/privacy-policy`, `/terms-of-service`
- Copy pass complete: em dashes removed, escaped apostrophes fixed, 20+ AI-cliche rewrites applied from editorial review agent
- Vercel project `lovedesireapp-web` deployed at `lovedesireapp-web.vercel.app`
- All support/legal emails switched from `olsenis@gmail.com` to `support@lovedesireapp.com`

### Brand + domains
- Name: **Love Desire** (verified clear of trademark blocks in [BRAND_RESEARCH.md](BRAND_RESEARCH.md))
- Tagline: **"A private app for two"** (was "For couples who want more" — swapped per editorial agent's feedback for something more concrete)
- Primary domain **lovedesireapp.com** purchased (via Cloudflare Registrar, olsenis@gmail.com)

### Pricing (decided August 2026)
- Monthly: $9.99
- Annual: $59.99 (~50% off effective)
- Free trial: 7 days
- Launch promo: first month $4.99 (~90-day window)
- No lifetime tier at launch — revisit post-launch if demand shows
- Full setup instructions in [APP_STORE_SUBMISSION.md](APP_STORE_SUBMISSION.md)

---

## 🚧 In progress (user-side tasks)

| Task | Owner | Blocker? | Notes |
|------|-------|----------|-------|
| Register `lovedesire.app` defensively (~$14/yr) | User | No | Cloudflare, same account as .com |
| Cloudflare Email Routing: `support@lovedesireapp.com` → `olsenis@gmail.com` | User | Yes for launch | ~10 min in Cloudflare dashboard |
| Reserve `@lovedesireapp` on Instagram / TikTok / Twitter/X / YouTube | User | No | Defensive, free, 15 min total |
| Assign `lovedesireapp.com` custom domain to Vercel project `lovedesireapp-web` | User | Yes for launch | Requires domain purchased first |

---

## 🔒 Launch-blockers (before App Store submission)

### 1. Apple Developer account (~$99/yr)
Must be enrolled + team configured before EAS can produce a production iOS build. Enrollment takes 1-2 business days.

### 2. EAS iOS production build
- Run `npx eas build --platform ios --profile production` from repo root
- First build requires Apple Dev credentials linked to EAS
- Output uploads to TestFlight automatically

### 3. Real iPhone testing via TestFlight
- Install on Óli + Ola devices via TestFlight
- Verify:
  - Push notifications actually fire (impossible to test in Expo Go)
  - Camera + microphone + photo library permissions
  - Sign-in with real Apple ID flow
  - Any iOS-specific rendering bugs
- Budget 1 week to catch real-device issues before submission

### 4. RevenueCat integration
Currently the /upgrade screen is a placeholder ("Coming soon"). Before launch:
- Set up RevenueCat account + link to Apple App Store Connect subscription products
- Wire `react-native-purchases` into the app
- Webhook writes to `couples/{coupleId}/isPremium` per the couple-level pattern (see [CLAUDE.md](CLAUDE.md))
- Test the subscribe → premium unlock flow end-to-end on real devices

### 5. App Store submission material
- Screenshots (6 required for 6.5" + 5.5" iPhones)
- App icon 1024x1024 (exists but verify no alpha channel)
- Full text ready in [APP_STORE_SUBMISSION.md](APP_STORE_SUBMISSION.md)

### 6. Marketing site custom domain
- Point `lovedesireapp.com` at Vercel project (post-purchase step)
- Verify SSL auto-provisions
- Update Support URL + Privacy Policy URL in App Store Connect

### 7a. Aggregate stats counter — ✅ SHIPPED
Commits `3497d50` + `e64ee82`. Anonymous per-feature counter at `stats/{yyyy-mm}` (write-only from client) + active-couples marker at `activeCouples/{month}/couples/{coupleId}` for MAU. 34 screens + ~40 actions instrumented. Full design + inventory in [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md).

### 7b. Admin callables (Phase 2 of admin dashboard) — ✅ SHIPPED
Commit `e320080`, deployed to `us-central1`. 5 `assertAdmin`-gated callables: `adminGetOverview` / `adminGetStats` / `adminGrantPremium` / `adminRevokePremium` / `adminSearchUser`. Client wrappers in `services/adminService.ts` + `isCurrentUserAdmin` UX helper. Full design in [ADMIN_DASHBOARD.md § Piece 2](ADMIN_DASHBOARD.md).

### 7c. Admin dashboard UI (Phase 3 of admin dashboard) — ✅ SHIPPED
Commit `4903b93`. Protected `/admin` route (hidden, not linked in nav) with route guard `isCurrentUserAdmin(user?.uid)`. Three sections in a ScrollView: overview strip (6 stat tiles + MRR), feature usage (tabbed Screens/Actions/Admin with MoM % + red-flag / green-flag colouring), user lookup (email search + Grant/Revoke via ConfirmModal). Pull-to-refresh reloads all three. Delete-user / reset-couple-data / data-export deferred to v1.1.

### 8. Android APK build + hosting
Per [CLAUDE.md](CLAUDE.md) distribution strategy, Android is NOT on Google Play — the signed APK is hosted on our marketing site. Before launch:
- Run `npx eas build --platform android --profile production` — outputs signed APK (not AAB — we want the direct-install format, not Play Store bundle)
- Upload APK to `web/public/` (or Cloudflare R2 / other CDN if large)
- Create `web/public/latest.json` version manifest: `{ "version": "1.0.0", "url": "...apk", "notes": "..." }`
- Update `/android` page: replace the disabled download button with the real APK URL, remove the "Coming with launch" placeholder text
- Test the download → install → sign-up flow on a real Android device

---

## 📋 Nice-to-have before launch (Phase 3 marketing polish)

Not launch-blockers, but ship these before or with launch for a stronger first impression:

- **Screenshots on marketing site** — replace hero visual placeholder + features page placeholder with real app screenshots (same 6 as App Store submission)
- **Mobile responsive sweep** — test all 9 pages on iPhone SE (375px), iPhone Pro Max (430px), iPad. Fix anything that breaks.
- **OG image** (`og-image.png` at 1200x630) for social sharing — currently missing
- **Favicon polish** — current is a placeholder heart SVG, could upgrade to app-icon-matching design
- **Load-time optimization** — Astro static output is already fast, but audit via PageSpeed Insights before launch
- **Iterate on copy** — after user reads live pages, likely more phrasing tweaks

---

## 🚫 Explicitly deferred (POST-launch)

All in [POST_LAUNCH.md](POST_LAUNCH.md). Highlights:

- **Sex Ed section** for paid tier — content vault set up at `sex-ed/`, feature deferred pending real user demand signal
- **UGC moderation** infrastructure — only build if Apple flags 1.2 during review
- **Dark mode** — add if reviewers or users complain
- **Home widgets** (iOS/Android) — deferred, no widget dev bandwidth
- **LDR content pass** for WYR/ToD/Fantasy Wishes/Sunday Check-in — add if LDR pairs actually engage with those games
- **Deeper moments history** (beyond 4 months) — add if users request

Full deferral list with revisit triggers in POST_LAUNCH.md.

---

## 🎯 Recommended sequence (from today)

If we do things in the order that unblocks the most parallel work:

1. **User: Cloudflare Email Routing** (5-10 min) → email works end-to-end
2. **User: Apple Developer enrollment** ($99, submit application today, waits 1-2 days)
3. **User: register defensive domains + social handles** (30 min total)
4. **User: assign `lovedesireapp.com` to Vercel** (2 min after domain purchase)
5. **Me: Phase 3 screenshots + polish** (~half day, once real screenshots are in hand)
6. **User: RevenueCat account setup** while Apple enrollment pending (~1 hour)
7. **Me + user: RevenueCat integration in app** (once Apple team ID + product IDs exist, ~2-3 hours)
8. **User: EAS production iOS + Android builds** (after Apple + RevenueCat both wired)
   - iOS → uploads to TestFlight automatically
   - Android → produces signed APK for direct hosting on marketing site
9. **User: TestFlight testing on real iPhone + Android APK testing on real Android** (1 week)
10. **User: upload Android APK + version manifest to `web/public/`** — enables /android page CTA
11. **User: App Store submission**
12. **Apple review** (24-72 hours typical)
13. **App live 🎉** — simultaneously assign custom domain, marketing site goes live for iOS + Android APK download

**Estimated time from today to live app: 2-3 weeks.**

Bottleneck is Apple review + real-device testing time, not code.

---

## Files that live in the vault (Obsidian-visible)

Documentation living in the repo (also readable via Obsidian since the repo root is the vault):

- `CLAUDE.md` — architecture, design decisions, code patterns for future contributors
- `APP_MAP.md` — screen tree + navigation
- `TEST_LAUNCH.md` — full test walkthrough (state of pre-launch verification)
- `TEST_CHECKLIST.md` — long-form test doc (superset of TEST_LAUNCH)
- `POST_LAUNCH.md` — deferred features with revisit triggers
- `APP_STORE_SUBMISSION.md` — everything needed for App Store Connect form
- `BRAND_RESEARCH.md` — trademark + domain + app collision research
- **`LAUNCH_STATUS.md`** — this file, the 30-second snapshot
- `README.md` — public repo intro
- `sex-ed/README.md` — content curation workspace docs
- `web/README.md` — marketing site dev/deploy docs

Memory files (`~/.claude/projects/g--forrit-Desire/memory/`) — user preferences, per-session context, feedback patterns.
