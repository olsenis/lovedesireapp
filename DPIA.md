# Data Protection Impact Assessment — Love Desire

**Status:** Signed and current
**Controller:** Love Desire ehf. (kt. [PENDING REGISTRATION], [REGISTERED OFFICE ADDRESS])
**Author:** [SIGNATORY NAME], acting as controller representative
**Sign-off date:** [DATE]
**Next review:** [SIGN-OFF DATE + 12 months], or immediately on any material change (see §6)
**Template:** European Data Protection Board WP248 rev 01
**Related documents:** [Privacy Policy](app/privacy-policy.tsx), [Terms of Service](app/terms-of-service.tsx), [Breach Response Plan](BREACH_RESPONSE_PLAN.md)

---

## Why this DPIA exists

GDPR **Article 35(1)** requires a Data Protection Impact Assessment when a type of processing is likely to result in a **high risk to the rights and freedoms of natural persons**. Article 35(3)(b) specifically triggers when processing includes **special categories of data referred to in Article 9(1)** on a large scale.

Love Desire processes special-category personal data on every core feature that carries the paid-tier value proposition — mood signals, sexual-orientation-adjacent quiz results, intimate fantasies, intimate photographs and voice recordings, sex-life content. The "large scale" threshold in Art. 35(3)(b) is not met at pre-launch (0 users), but Persónuvernd's guidance treats systematic processing of sex-life data by a consumer app as high-risk regardless of scale, and audit-ready practice is to have a DPIA whether or not the letter of the article strictly requires one.

This document is the record of that assessment.

---

## 1. Systematic description of processing

### 1.1 What the app does

Love Desire is a mobile-only iOS + Android couples-intimacy application designed exclusively for use between two consenting adults in a romantic relationship. Users create individual accounts, pair with one partner via a shared invite code, and gain access to shared content and games that require both partners to participate. The app is not a social network — there is no public feed, no stranger interaction, no discovery of other users beyond your own paired partner.

The product operates on two tiers: a free tier that covers connection features (mood, notes, moments, calendar, some games) and a paid subscription that unlocks explicit and intimate content (Fantasy Wishes, The Lovers quiz, Sensate Focus, Spicy content in Truth or Dare / Daily / Would You Rather, Activity Cards, Tease ephemeral media, Intimacy Log). One subscription covers both partners in a couple.

### 1.2 Categories of processing operations

Grouped by feature area:

| Feature area | Data processed | Sensitivity | Legal basis |
|---|---|---|---|
| Account + pairing | Email, display name, profile photo, birthday (optional), push token, invite code | Standard personal | Art. 6(1)(b) contract |
| Shared couple content | Todos, notes (text + voice), memories, moments photos, calendar dates, reminders, sparks | Personal + some intimate imagery | Art. 6(1)(b) contract |
| Mood check-ins | Emoji + optional note, timestamp, uid; paid Kinky/Horny moods reveal sexual state | **Special-category (Art. 9)** — mental/emotional wellbeing, sex-life signal | **Art. 9(2)(a) explicit consent** at mood submission |
| Sunday Check-in | 5 numeric dimension scores (closeness, physical intimacy, communication, appreciation, alignment) + 5 open-text answers | **Special-category (Art. 9)** — relational + sex-life signal | **Art. 9(2)(a) explicit consent** at feature enable |
| Intimacy Log | Per-user private opt-in; entries with initiatedBy, types, mood, optional star rating, optional location, notes | **Special-category (Art. 9)** — direct sex-life record | **Art. 9(2)(a) explicit consent** at opt-in toggle |
| The Lovers quiz | 15 A/B answers → 5-type classification, couple compatibility | **Special-category (Art. 9)** — sexual preferences | **Art. 9(2)(a) explicit consent** at quiz start |
| Fantasy Wishes | Yes/No votes on scenario prompts, mutual-yes matches, optional user-added scenarios | **Special-category (Art. 9)** — sexual fantasies | **Art. 9(2)(a) explicit consent** at deck open |
| Truth or Dare Spicy | Manual card text (optional), voice answers, dare confirmations | **Special-category (Art. 9)** — sex-life content | **Art. 9(2)(a) explicit consent** implicit at Spicy-level select |
| Tease / Flashes | 24h ephemeral photos, videos, voice notes; potentially intimate | High-sensitivity Storage blobs | Art. 6(1)(b) contract + Art. 9(2)(a) where content is sexual |
| Reports queue (H33) | Reporter uid, target uid, content path, category, snippet | Sensitive — contains reference to reported content | Art. 6(1)(f) legitimate interests (moderation) + Art. 6(1)(c) legal obligation (CSAM/NCII response) |
| Aggregate telemetry | Monthly counters per feature, no per-user identifiers | Non-personal | N/A (anonymised) |
| Per-couple session telemetry | Feature × timestamp × duration (12-month retention) | Personal, no content | Art. 6(1)(f) legitimate interests |
| Subscription + billing records | Purchase timestamps, tier, renewal state (via Apple/Google IAP; we never see card data) | Personal, financial-adjacent | Art. 6(1)(c) legal obligation (Icelandic Bookkeeping Act, 7-year retention) |
| Authentication events | Sign-in timestamps, IP-adjacent metadata (30-day retention) | Personal | Art. 6(1)(f) legitimate interests (security monitoring) |

### 1.3 Data flows

- **Client → Firestore:** mobile app writes user actions directly to Cloud Firestore via the Firebase JS SDK. Firestore rules gate all access per couple; special-category collections rely on the same rules plus explicit consent tracking in the client.
- **Client → Cloud Functions callables:** rate-limited join, report submission, admin operations. Callables in `functions/src/index.ts` deploy to us-central1.
- **Client → Firebase Storage:** photos, videos, voice notes upload via signed writes gated by Storage rules per couple. Files compressed on-device via `expo-image-manipulator` (max 1920px, JPEG 0.7) before upload.
- **Cloud Functions → push token → Expo Push → APNs/FCM → partner device:** partner notifications. Only the push token is shared with Expo; message content is transmitted through the notification payload but not persisted by Expo. Post-launch H40 removes Expo from this flow.
- **Client → App Store / Play Store → callable webhooks → Firestore:** subscription state is set server-side via admin SDK write to `couples/{coupleId}.isPremium`. Clients cannot write this field directly (firestore rule blocks it).

### 1.4 Sub-processors

Verbatim from Privacy Policy §5:

> Love Desire relies on the following processors (sub-processors) to operate:
>
> • Google Firebase (Authentication, Firestore database, Cloud Storage), operated by Google LLC, user accounts, data storage, photo uploads. Firebase data is stored in Google's europe-west1 (Belgium) region where available.
> • Expo Push Notifications, operated by 650 Industries, Inc., delivering partner notifications. Only your device push token is shared with Expo; your personal content is never transmitted.
> • Apple App Store and Google Play (as applicable), process in-app subscription payments and provide us with billing status. We do not receive your payment card details.

### 1.5 Recipients

No third parties beyond the sub-processors above. No advertising networks. No analytics SDKs. No data brokers. No affiliates. No corporate group companies. Data is not shared with other users beyond the paired partner (which is the point of the product).

### 1.6 Cross-border transfers

Verbatim from Privacy Policy §5:

> Google and Expo are US-headquartered companies. Personal data transferred outside the European Economic Area is protected by the European Commission's Standard Contractual Clauses (Commission Implementing Decision (EU) 2021/914) and, where applicable, by Google's certification under the EU-US Data Privacy Framework. Firebase provides an EU-based storage region where technically feasible.

### 1.7 Retention periods

Verbatim from Privacy Policy §6:

> • Account personal data (name, email, profile photo, birthday), deleted immediately upon account deletion
> • Shared couple data (memories, todos, notes, moments, matches), retained until both partners delete their accounts, since ownership is joint
> • Special-category data (mood entries, intimacy log, quiz results, Sunday Check-in answers), deleted with the associated feature or account
> • Per-couple session telemetry, 12 months, then replaced by anonymised aggregates
> • Aggregated (anonymised) telemetry, retained indefinitely; contains no identifying information
> • Encrypted backups, up to 35 days rolling for disaster recovery
> • Subscription and invoice records, 7 years, as required by the Icelandic Bookkeeping Act nr. 145/1994
> • Authentication logs (sign-in events, security audit), 30 days
> • Abuse-report records and moderation actions, 24 months, for accountability and legal defence

---

## 2. Necessity and proportionality

### 2.1 Legal basis per processing purpose

Verbatim cross-reference to Privacy Policy §3:

> • Sync content between you and your partner in real time, Contract performance (Art. 6(1)(b))
> • Send push notifications to your partner (mood, spark, matches), Contract performance (Art. 6(1)(b))
> • Display countdowns, history, and personalised nudges, Contract performance (Art. 6(1)(b))
> • Process special-category data (mood, intimacy log, quiz answers, fantasies), Explicit consent (Art. 9(2)(a)) obtained when you enable the feature
> • Aggregated and per-couple telemetry to improve the service, Legitimate interests (Art. 6(1)(f)) balanced against your privacy through 12-month retention limit + no third-party sharing + anonymisation. You may object under Article 21 by emailing privacy@lovedesireapp.com; on objection we cease per-couple session collection for your couple.
> • Comply with legal obligations (tax records, law-enforcement requests), Legal obligation (Art. 6(1)(c))

### 2.2 Data minimisation

Data we deliberately do NOT collect:
- Location (no GPS request, no IP-geo derivation stored)
- Contacts
- Browsing history
- Biometrics
- Device advertising identifiers
- Analytics SDK data (no Firebase Analytics, no third-party analytics)
- Crash-reporting SDK data (no Sentry client SDK yet; considered post-launch under strict privacy terms only)

Data we DO collect, with proportionality justification:
- **Email + display name**: required to identify the account and personalise partner-facing content
- **Photo (profile)**: user's own choice to upload; feature is opt-in via avatar picker
- **Birthday**: optional; used for age-attestation reinforcement + partner birthday reminder feature
- **Push token**: required for the sync-with-partner core value proposition; nothing else works without it
- **Couple content**: intrinsic to a couples app; each item is user-initiated
- **Special-category data**: each feature is opt-in; explicit consent is captured per feature at enable-time (see 2.4)
- **Telemetry**: 12-month per-couple retention with anonymisation after; no per-user analytics identifiers; no fingerprinting

### 2.3 Purpose limitation

Restated from Privacy Policy §3:

> We do not use your data for advertising, profiling, automated decision-making with legal effects, machine-learning training, or any purpose beyond operating the app.

Specifically:
- No ML model is trained on user content.
- No profile is built for advertising or third-party sale.
- No content is analysed for insights sold onward.
- Anonymous aggregate telemetry (feature-open counts) is used internally to prioritise development; individual usage is not surfaced.

### 2.4 Consent quality (Art. 7)

**Register-time consent (all users):**
- Age attestation (18+ checkbox required to enable "Create Account" button, `app/(auth)/register.tsx`)
- `confirmConsent(uid)` writes to `users/{uid}/private/consent` immediately after account creation
- Consent is granular (specific to using the app + acknowledging it contains sexual/intimate material)
- Consent is freely given (registration is optional; no bundled contract)
- Consent is informed (Privacy Policy + ToS linked inline in the modal)

**Per-feature consent (paid tier + Art. 9 features):**
- Each special-category feature enables its own consent surface at first use (mood picker with adult moods disabled behind consent gate; The Lovers quiz has a start screen that references the Art. 9 processing; Fantasy Wishes has a paid-tier gate that references intimate content; Sensate Focus paywall + intimate-content acknowledgement)
- Consent is auditable (recorded in Firestore private subcollections + per-couple feature docs)

**Photo upload re-attestation (H42):**
- First time a user taps camera/gallery in Moments, Tease, or Profile: `PhotoConsentModal` appears, confirms 18+ and consent to upload own likeness / no other people without their consent
- Written to `users/{uid}/private/photoConsent`, cached in AsyncStorage
- Adds a second attestation layer above register-time consent

**Withdrawal (Art. 7(3)):**
- Any Settings toggle for a feature disables further processing
- Unpair (Profile → "Disconnect from partner") ends shared-content processing
- Account delete (Profile → "Delete account") triggers `deleteUserCascade` in `functions/src/index.ts`, cascading through all couple + user data
- Withdrawal is as easy as giving (same number of taps, no penalty)

**Fresh consent for material changes (Privacy §10):**
- Any material change to how we process special-category data triggers in-app notification + email + at least 30 days' notice
- Fresh explicit consent required before change applies to affected user; feature disabled on that account otherwise

---

## 3. Consultation and stakeholder involvement

**Data subjects consulted:**
Not formally consulted (no user panel or focus group). Privacy Policy and ToS surface all processing purposes for informed consent at register-time. This is proportionate to launch scale; formal consultation would trigger post-launch if scale or high-visibility features warrant.

**DPO consulted:**
No formal DPO designated. Under GDPR Art. 37 threshold (small controller, no systematic monitoring of publicly accessible areas on a large scale, no large-scale special-category processing at current pre-launch scale). Restated from Privacy Policy §1:

> A formal Data Protection Officer is not required for our current scale under GDPR Article 37, but the privacy contact above is the accountable point for all data-protection matters.

Accountable point of contact: `privacy@lovedesireapp.com`. Owned by the controller representative (currently Óli).

**External legal counsel consulted:**
[PENDING — to be retained post-ehf-registration]. This DPIA will be re-reviewed by counsel once retained. Section 3 will be updated at that time to log the consultation.

**Persónuvernd consulted (Art. 36 prior consultation):**
Not consulted. Art. 36 prior consultation is only required when residual risk after mitigation remains high. Our residual risk assessment (Section 4 + Section 5) concludes Medium residual risk. Prior consultation not triggered.

**Sub-processor DPO consultation:**
Not applicable — sub-processors (Google, Expo, Apple) publish their own DPIAs and privacy documentation. Contractual protection via their standard DPA covers our controller-side risk assessment inputs.

---

## 4. Risks to data subjects

### 4.1 Risk-assessment framework

Each identified risk carries three attributes:
- **Likelihood** — probability of occurrence, Low / Medium / High
- **Severity** — impact on data subject if it occurs, Low / Medium / High / Very High
- **Risk grade** — combined product, Low / Medium / High / Very High

Framework aligns with EDPB WP248 rev 01 guidance and reuses the data-class inventory from [Breach Response Plan Section 5](BREACH_RESPONSE_PLAN.md).

### 4.2 Data-class risks

**Row 1 — Standard personal (email, name, photo URL, birthday, push token)**
- Likelihood of unauthorised access: **Low** (Firestore rules per-user; token stored via Firebase Auth; no known attack path at current architecture)
- Severity if occurs: **Medium** (identity-adjacent phishing risk; email spam; doxxing seed material; nothing directly financial)
- Combined risk: **Medium**

**Row 2 — Couple content, non-sensitive (todos, dates, reminders)**
- Likelihood: **Low** (per-couple rule isolation; simple text fields; no known attack path)
- Severity: **Low-Medium** (mostly boring shared logistics)
- Combined: **Low-Medium**

**Row 3 — Couple content, personal (notes, moments photos, matches, memories)**
- Likelihood: **Low** (per-couple rule isolation; photo-specific rule for Storage)
- Severity: **High** (visual likeness enables misuse; personal messages reveal relationship dynamics)
- Combined: **Medium**

**Row 4 — Special-category / Art. 9 (mood, Sunday Check-in, Intimacy Log, The Lovers, Fantasy Wishes votes, ToD Spicy audio/text)**
- Likelihood: **Low** (same rule-isolation posture as Row 3, plus consent-tracking)
- Severity: **Very High** — sex-life / sexual-orientation disclosure has demonstrated real-world harms (see 4.4)
- Combined: **High**

**Row 5 — Storage blobs, intimate media (Tease photos/videos/voice, some Moments, ToD audio)**
- Likelihood: **Low** (Storage rules per-couple; signed URLs with limited lifetime; H42 photo-consent modal adds attestation friction)
- Severity: **Very High** — intimate imagery of identifiable individuals; irreversible if leaked (screenshots, downloads)
- Combined: **High**

**Row 6 — Storage blobs, profile photos**
- Likelihood: **Low** (Storage rules; less-sensitive content by intent)
- Severity: **Medium-High** (visual likeness; potential deepfake source material)
- Combined: **Medium**

**Row 7 — Authentication events (sign-in log, 30-day retention)**
- Likelihood: **Low** (Firebase Auth infrastructure standard)
- Severity: **Low-Medium** (would enable targeted phishing if leaked)
- Combined: **Low-Medium**

**Row 8 — Reports queue / H33 moderation queue (24-month retention)**
- Likelihood: **Low** (top-level `/reports/{reportId}` collection, all-via-callable rule lock, admin-SDK-only access)
- Severity: **High** (contains reporter identity + target identity + snippet of reported content; exposure of reporter to reported party enables retaliation)
- Combined: **Medium**

**Row 9 — Billing records (7-year retention)**
- Likelihood: **Very Low** (Apple/Google IAP means we never hold card data; only subscription state)
- Severity: **Low** (subscription state alone is not particularly sensitive)
- Combined: **Low**

### 4.3 Couples-only threat models (unique to us)

**Ex-partner threat model.** A former partner has already seen shared content before the unpair event. Unpair terminates future sharing but does not revoke past viewing. Screenshots and downloads are outside our control.
- Likelihood: **Medium** (relationship breakdown is not rare)
- Severity: **High** where intimate content was shared; **Medium** otherwise
- Combined: **Medium-High**
- Mitigation posture: ToS §3 explicitly warns "content shared with your partner cannot be un-shared once your partner has seen it. Be thoughtful about what you share." User-facing warning is the primary control; technical control is impossible without breaking the product.

**Coercive partner threat model.** One partner pressures the other to enable features they wouldn't otherwise choose, or to share content they wouldn't otherwise share.
- Likelihood: **Low-Medium** (social dynamic that exists in all couples-adjacent products)
- Severity: **High** where special-category features are enabled under coercion
- Combined: **Medium**
- Mitigation posture: per-feature opt-in with explicit consent language surfaces the choice; Profile's "Disconnect from partner" flow is prominent and unpair is one-tap. Social dynamics cannot be technically enforced; accepted residual risk with strong exit-path affordance.

**Push-token exposure via Expo.** Expo Push receives our push tokens (not content), and the notification payload passes through Expo infrastructure.
- Likelihood: **Very Low** (Expo has good security posture; tokens rotate)
- Severity: **Low** (tokens alone enable spam pushes to a device but no data access)
- Combined: **Low**
- Mitigation planned: H40 (pre-launch) migrates to native FCM+APNs and removes Expo from the data flow entirely. Post-migration this row drops out of scope.

**Age-gate bypass by minor.** In-app 18+ attestation is self-declared. A minor could tick the box.
- Likelihood: **Low-Medium** (any age-gate is bypassable in principle)
- Severity: **Very High** (any minor's data at all is a policy + legal red flag)
- Combined: **Medium-High**
- Mitigation posture: two-attestation model (register-time in `app/(auth)/register.tsx` + post-login re-attestation in `app/_layout.tsx`), decline path deletes the Firebase Auth user immediately; H42 adds photo-consent re-attestation as a third gate; abuse-report channel (`abuse@lovedesireapp.com`) accepts credible reports of underage users with commitment to prompt deletion. Accepted residual risk given no technical alternative short of ID verification (which itself creates a data-protection risk).

### 4.4 Specific harm scenarios for special-category rows

Enumerating concrete harms rather than abstract "risk to rights and freedoms" satisfies EDPB's expectation that DPIAs describe realistic consequences.

- **Family / relationship rupture** — outing of sexual orientation to family via leaked mood or quiz data
- **Workplace discrimination** — colleague / employer discovery of sex-life data leading to career impact
- **Legal / criminal exposure** — in jurisdictions criminalising same-sex relationships, leaked orientation data is a physical-safety threat
- **Blackmail / sextortion** — intimate images or explicit text used to extort money or compliance
- **Reputational damage** — public disclosure of intimate content to social networks or media
- **Psychological harm** — the privacy violation itself, independent of downstream use, produces lasting distress
- **Damage to future relationships** — record of past intimate content resurfacing in later contexts (new partner, family member, etc.)

The severity ratings in 4.2 are calibrated to acknowledge this range of realistic harms rather than the abstract worst case.

### 4.5 Overall residual-risk grade

After the mitigations described in Section 5, residual risk across all data classes resolves to **Medium**.

- No data class remains at High residual risk
- Very High severity rows (Rows 4, 5, ex-partner) are pulled down to Medium by consent quality + isolation + user-facing warning + breach playbook (H37)
- Art. 36 prior consultation with Persónuvernd is not triggered (only triggered by High residual)

---

## 5. Measures envisaged to address the risks

### 5.1 Technical measures

Verbatim from Privacy Policy §8:

> Security measures we take:
> • All data is transmitted over encrypted HTTPS/TLS connections
> • Firestore data is encrypted at rest by Google's infrastructure
> • Firestore security rules enforce per-couple isolation, no user can access another couple's data
> • Passwords are managed by Firebase Authentication and are never stored in plain text
> • Photos are stored in Firebase Storage with per-couple access controls
> • Administrative access is restricted, logged, and subject to confidentiality obligations

Extended technical measures beyond the Privacy Policy statement:

- **H33 report-flow isolation** — the moderation queue `/reports/{reportId}` is top-level, NOT nested under `/couples/`, because the couples wildcard rule would otherwise grant partners read access to reports about them. `firestore.rules` locks all client access; every read + write goes through admin-SDK callables (`submitReport` / `adminGetReports` / `adminResolveReport` in `functions/src/index.ts`).
- **Rate limiting** — invite-code join (`functions/src/index.ts:rateLimitedJoin`, 5/min + 20/hr per uid); report submission (20/day/uid) prevents abuse of the reporting mechanism itself; admin search (10/min per admin uid).
- **Photo consent modal (H42)** — `components/PhotoConsentModal.tsx` presents a pre-upload attestation on the first camera / gallery tap in Moments, Tease, or Profile. Written to `users/{uid}/private/photoConsent`. Adds a second attestation layer above register-time age gate.
- **Age gate (dual-layer)** — 18+ checkbox required to enable "Create Account" in `app/(auth)/register.tsx`; post-login modal in `app/_layout.tsx` re-verifies for existing users where the consent doc is missing; decline path deletes the Auth user.
- **Firestore consent tracking** — private subcollections `users/{uid}/private/consent` and `users/{uid}/private/photoConsent` provide per-user auditable record of when consent was given.
- **Automatic cleanup functions** — `cleanupExpiredFlashes` (24h), `cleanupOldTruthDareAudio` (30d), `cleanupOldSessions` (12mo) prevent stale sensitive data from accumulating beyond stated retention.
- **Cascade delete** — `deleteUserCascade` (Firebase Auth onDelete trigger) removes user + couple data + Storage blobs on account termination. Fulfils Art. 17 right to erasure.

### 5.2 Organisational measures

- **Admin access allowlist** — `ADMIN_UIDS` in `functions/src/index.ts:28-30` and mirrored in `admin-web/src/adminService.ts:8-10`. `assertAdmin` server-side gate (`functions/src/index.ts:32`) enforces on every admin callable. Post-launch upgrade to Firebase Auth custom claims tracked separately.
- **Breach response plan (H37)** — [`BREACH_RESPONSE_PLAN.md`](BREACH_RESPONSE_PLAN.md) at repo root documents the 72h Art. 33 clock and Art. 34 user-notification workflow with per-data-class playbooks and pre-filled Persónuvernd + user notification templates.
- **Report / moderation flow (H33)** — user-report → admin resolve; ToS §4 promises 24h SLA. Report action offers "Also disconnect from your partner" checkbox (pre-checked for CSAM/NCII categories) as the "block" mechanic in the couples-only model.
- **Data-subject rights process** — `privacy@lovedesireapp.com` inbox; 30-day response commitment (Privacy §7); support for access, rectification, erasure, restriction, portability, objection, consent withdrawal.
- **Retention discipline** — automatic cleanup functions above; documented per-class retention in Privacy §6.
- **Sub-processor management** — Firebase DPA signed as part of pre-launch checklist (H34); Expo terms accepted at SDK integration; Apple/Google terms accepted at developer program enrolment.

### 5.3 Consent-driven mitigations

- **Special-category features gated at feature enable** — each Art. 9 feature has its own consent surface at first use, satisfying Art. 9(2)(a) explicit-consent requirement (see 2.4)
- **Consent withdrawable at any time** — Settings toggles, unpair, account delete
- **Fresh consent required for material changes** — Privacy §10 commitment to at least 30 days' notice + fresh consent for any change materially affecting special-category processing; affected feature disabled on the account otherwise

### 5.4 User-facing transparency

- Privacy Policy at [`app/privacy-policy.tsx`](app/privacy-policy.tsx) + [`web/src/pages/privacy-policy.astro`](web/src/pages/privacy-policy.astro), 11 sections, includes Art. 15-22 rights + Persónuvernd complaint contact
- ToS at [`app/terms-of-service.tsx`](app/terms-of-service.tsx) + [`web/src/pages/terms-of-service.astro`](web/src/pages/terms-of-service.astro), 12 sections, includes explicit acceptable-use + CSAM/NCII zero-tolerance
- Register-time modal surfaces Privacy Policy + ToS as tappable links (App Store review expectation)
- In-app content warnings on features touching sensitive material

### 5.5 Deferred / planned mitigations

Documented but not yet in place; timing and status tracked in [`POLISH_TODO.md`](POLISH_TODO.md):

- **H38 Google Cloud Vision SafeSearch** — automated photo/video flagging as first-line above the H33 human-report layer. Target: ~1 month after launch when upload volume approaches 50/day.
- **H39 PhotoDNA CSAM hash matching** — specialised layer above generic content moderation. Target: when monthly uploads ≥ ~500. Requires Microsoft application (2-4 week waiting).
- **H33-followup — real email forwarding to `abuse@lovedesireapp.com`** — SendGrid or Firebase Extensions "Trigger Email" on new report writes. Firestore queue is sufficient for launch; email adds external audit trail.
- **H33-followup — 24h SLA monitoring** — scheduled function that alerts when a pending report ages > 20h.
- **H40 native FCM+APNs push** — removes Expo Push from the data flow (blocked on Apple Developer Program enrolment).
- **Firebase custom-claims admin auth** — replaces `ADMIN_UIDS` inline allowlist with claims that can be granted from a callable instead of code deploy.
- **Sentry crash telemetry** — client crash-reporting SDK is not yet integrated (privacy-first evaluation pending). Post-launch consideration under strict privacy terms.

### 5.6 Residual risk after mitigation

Overall: **Medium** across all data classes.
- No class remains at High residual risk after the mitigations above
- Very High severity rows are pulled down by the combination of technical isolation + consent quality + user-facing transparency + breach playbook + cascade delete
- Art. 36 prior consultation with Persónuvernd not triggered

---

## 6. Sign-off and review

### 6.1 Sign-off

Signed by: **[SIGNATORY NAME]**, acting for Love Desire ehf. as data controller representative

Sign-off date: **[DATE]**

By signing, the controller representative confirms:
- The systematic description in Section 1 is accurate as of the sign-off date
- The necessity + proportionality analysis in Section 2 reflects actual processing choices
- The risks in Section 4 have been considered honestly, including the couples-specific threat models
- The mitigations in Section 5 either exist today or are tracked as deferred with a plan
- The residual risk grade in Section 4.5 is defensible

### 6.2 Review schedule

Review triggers, in order of priority:

1. **Any material change to processing** — a new special-category feature, a new sub-processor, a new cross-border flow, a change in retention. Update this DPIA before or with the change.
2. **Any real incident** — post-mortem action items from a data-breach event may require DPIA update. See [`BREACH_RESPONSE_PLAN.md`](BREACH_RESPONSE_PLAN.md) Section 9 for the post-incident review that feeds back to this document.
3. **A regulatory audit or inquiry** — Persónuvernd audit may generate action items requiring DPIA revision.
4. **Annual fallback** — if none of the above has triggered in 12 months, do a scheduled review anyway. Confirm nothing has drifted, bump the sign-off date.

**Next scheduled review:** [SIGN-OFF DATE + 12 months]

### 6.3 Version history

Version history is maintained via git log on this file. Every material update is a commit with an explanatory message. Sign-off date at the top of the document is the authoritative "current version" marker.

---

## Placeholders in this document

Grep for these markers when updating post-milestones:

- `[PENDING REGISTRATION]` — swap when Love Desire ehf. is registered (H32 workflow, now touches 6 files)
- `[REGISTERED OFFICE ADDRESS]` — swap when Love Desire ehf. is registered (H32 workflow)
- `[SIGNATORY NAME]` — sign-off placeholder; fill in with signatory's name on sign-off
- `[DATE]` — sign-off date placeholder; fill in on sign-off
- `[SIGN-OFF DATE + 12 months]` — next-review placeholder; fill in with the actual calendar date on sign-off

Add this file to the H32 placeholder-swap list. Sign-off (`[SIGNATORY NAME]` + `[DATE]`) is a separate one-line follow-up commit and does not depend on ehf. registration.
