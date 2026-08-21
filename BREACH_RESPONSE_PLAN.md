# Data Breach Response Plan — Love Desire

**Status:** Active
**Owner:** Love Desire ehf. (currently Óli / `olsenis@gmail.com`)
**Last updated:** August 2026
**Backs the commitment made in:** [Privacy Policy §8](app/privacy-policy.tsx)

This is the operational playbook for handling a personal-data breach. It is designed to be executed under time pressure by whoever is holding the Incident Commander role. Read it before an incident, not during one.

If a breach is happening RIGHT NOW, jump to **[Section 4 — The 72-hour clock](#4-the-72-hour-clock)**.

---

## 1. Purpose & scope

### What this plan is for

Privacy Policy §8 legally commits us to two hard deadlines under GDPR:

> **In the event of a personal-data breach that is likely to result in a risk to your rights and freedoms, we will notify the Icelandic Data Protection Authority (Persónuvernd) within 72 hours of becoming aware of it, as required by GDPR Article 33. Where the breach is likely to result in a high risk to your rights, we will also inform affected users without undue delay, as required by GDPR Article 34.**

Without a documented response process, hitting the 72-hour Art. 33 window is a coin flip. This plan gives whoever picks up an incident a concrete decision tree, so we don't turn a data incident into a regulatory-fine incident.

### When to invoke this plan

Invoke immediately on any of the following:

- Confirmed unauthorised access to Firestore, Firebase Storage, or Firebase Auth
- Confirmed or suspected exfiltration of user data (any category)
- Confirmed data destruction or ransomware (unavailability is a breach under GDPR)
- A sub-processor (Google Cloud, Apple, Expo) has notified us of an incident affecting our data
- A researcher or user has credibly reported a security issue that appears to expose real data
- An admin uid was used maliciously or by an unauthorised party
- A Firestore-rules change or callable-function change has, in production, exposed data across the couple boundary

### What this plan is NOT

- Not a substitute for legal counsel. When Art. 33 notification is on the table, involve Icelandic legal counsel (placeholder in Section 10 — retain post-ehf-registration).
- Not a checklist for routine bug reports. If it's clearly not a data-security issue, follow the normal bug flow (`POLISH_TODO.md`).
- Not a substitute for the Report/moderation flow (H33) which handles USER-uploaded illegal content, not exposure of user data.

### Living document

This plan is expected to evolve. Every real incident should produce a post-mortem (Section 9) whose action items feed back into this document. Update the "Last updated" date at the top on every edit.

---

## 2. Detection sources — how we learn about a breach

Every incident starts with something noticing a symptom. Below are all currently-plausible detection channels, roughly ranked by how likely they are to be the first signal.

### External signals

- **User reports** to `privacy@lovedesireapp.com`, `abuse@lovedesireapp.com`, or `support@lovedesireapp.com`. Any email from a user that describes: seeing another couple's content, being unable to log in, credential emails they didn't request, receiving push notifications for a couple they aren't in, or "the app just showed me a photo I didn't upload" — treat as a possible breach until proven otherwise.
- **External researcher disclosure.** Someone security-testing our app finds an issue and reaches out. Currently no public disclosure channel exists; **strongly recommended follow-up (out of H37 scope):** add `/.well-known/security.txt` to the marketing site pointing to `security@lovedesireapp.com` with a plain-language disclosure policy.
- **Media / social media surfacing an issue** before we've been contacted. Rare, but treat as immediate P0 — the clock is already ticking loudly.

### Firebase console alerts

- **Firebase Authentication alerts** (Firebase Console → Authentication → Alerts): unusual sign-in patterns, credential-stuffing indicators, mass password resets. Verify these are enabled and route to `privacy@lovedesireapp.com`.
- **Cloud Firestore usage anomalies** (Console → Firestore → Usage): sudden read spikes may indicate exfiltration attempts.
- **Cloud Functions error rate** (Console → Functions → Logs): spike in `permission-denied` or `internal` errors on callables can indicate probing.
- **Firestore Security Rules changes** (Console → Firestore → Rules → History): every rule change is audited. Reviewing the history is part of the containment step.

### Google Cloud Security Command Center

- Enabled by default at the Standard tier for our GCP project. Surfaces findings like publicly-accessible Cloud Storage buckets, service-account key exposures, misconfigured IAM. Review weekly (not in H37 scope but flagged as an ops recommendation).
- Console: `https://console.cloud.google.com/security/command-center/findings` (filter by project `lovedesireapp-8c7f2`).

### Internal signals

- **Admin dashboard anomalies:** unusual rate-limit hits (functions/src/index.ts rateLimits collection), mass content deletions, admin action spikes on the `admin_*` counters in `stats/{month}`.
- **Report queue** (H33): a report from a user describing exposure of their data (not offensive content) may be your first signal — filter accordingly.
- **During development:** a `firestore.rules` test or a manual QA discovery that exposes data across the couple boundary. Do NOT deploy the fix quietly — treat it as a possible past-tense breach if any prior version of the rules had the same hole in production.

### Sub-processor breach disclosures

- **Google Cloud / Firebase:** Google notifies at `postmaster@lovedesireapp.com` (verify this alias exists — set up if not) via the Data Processing Amendment channel. Escalation: `https://cloud.google.com/support`.
- **Apple:** for App Store / IAP / Sign in with Apple incidents, via `developer@apple.com` and Apple Developer News.
- **Expo:** for push notification infrastructure, via `security@expo.dev` and Expo status page.

Our obligation on sub-processor disclosure is to pass the notification through to affected users if it materially affects their data with us. See Section 6 — Sub-processor breach playbook.

---

## 3. Response team & escalation

### Current reality: solo response

Right now the response team is one person (Óli, `olsenis@gmail.com`, primary admin uid `fL9brG7iuSe0XNomrRkDZ3N7PAl1`). Every role below currently collapses onto that one person. This is only sustainable at pre-launch scale (< ~10,000 users AND no serious incident yet).

**Trigger to add a second responder:**
- User base passes ~10,000, OR
- First real incident occurs (regardless of severity), OR
- We enter a regulated market that requires named DPO / DPO-equivalent

When triggered: either (a) hire / promote a second responder into an Incident Commander backup role, OR (b) retain external Icelandic legal counsel with 24/7 breach-response cover.

### Roles table

| Role | Responsibility | Currently held by |
|---|---|---|
| **Incident Commander** | Owns the incident end-to-end. Makes the go/no-go call on notifications. Runs the 72h clock. | Óli |
| **Technical Lead** | Investigates root cause, drives containment + remediation, snapshots evidence. | Óli |
| **Comms Lead** | Drafts Persónuvernd notification + user notifications + press-response holding statement if needed. | Óli |
| **Legal Lead** | Reviews notifications for legal exposure, interfaces with Persónuvernd if follow-up is required. | Vacant → external counsel post-ehf-registration |

### Escalation to external counsel

Escalate to external Icelandic data-protection counsel any time we determine (per Section 5 severity matrix) that:
- Art. 33 notification to Persónuvernd is required, OR
- Art. 34 notification to affected users is required, OR
- The incident may result in a fine, class action, or press coverage.

**Placeholder:** [EXTERNAL LEGAL COUNSEL — RETAIN POST-EHF-REGISTRATION]. Post-ehf, retain a firm and update this section with contact details.

### Escalation to sub-processors

- **Firebase / Google Cloud:** open a P1 support case via `https://console.cloud.google.com/support`. Enterprise-tier response is 1 hour for P1; verify our current tier and consider upgrading if launch scale warrants.
- **Apple:** for IAP-adjacent incidents, contact Apple Developer Program Support via the developer portal.
- **Expo:** for push infrastructure, `security@expo.dev`.

---

## 4. The 72-hour clock

**Critical:** the 72h clock starts when we **become aware** of the breach, NOT when the breach occurred. Discovering an old incident today = clock starts today.

The clock runs even outside working hours. If detection is at 22:00 on a Friday, the notification window closes at 22:00 the following Monday. Plan for weekend work.

### T+0 — Detection & activation (0-15 minutes)

- [ ] **Note the exact time you became aware.** This is T+0. Write it in the incident log (see below).
- [ ] **Start an incident log.** Create `incidents/YYYY-MM-DD-<short-slug>.md` in a private repo or a Google Doc. This is the running record. Include: T+0 timestamp, detection source, initial symptoms, actions taken so far.
- [ ] **Do NOT delete or "fix" anything yet.** Preserving evidence for investigation is more important than tidying. If you must act immediately for containment, snapshot state first (see next step).
- [ ] **Snapshot state.** Export current `firestore.rules` (already in git), current `functions/src/index.ts` (in git), current Storage bucket ACL (Cloud Console → Storage → Buckets → Permissions → copy JSON). Note current values of `ADMIN_UIDS` in `functions/src/index.ts:28` and `admin-web/src/adminService.ts:8`.
- [ ] **Announce activation.** Currently: solo, so this is a self-note. Post-team: notify the Incident Commander backup by any channel.

### T+0 to T+2h — Containment

Goal: stop the bleeding without destroying evidence.

- [ ] **If admin uid compromise suspected:** immediately remove the compromised uid from `ADMIN_UIDS` in both `functions/src/index.ts` AND `admin-web/src/adminService.ts`, then `npx firebase deploy --only functions --account lovedesireapp@gmail.com --project lovedesireapp-8c7f2`. This takes ~2-4 minutes.
- [ ] **If Firestore rules regression suspected:** deploy a tighter emergency ruleset that locks down the affected collection entirely (`allow read, write: if false`) while investigating. `npx firebase deploy --only firestore:rules --account lovedesireapp@gmail.com --project lovedesireapp-8c7f2`. Users experience the affected feature breaking; this is preferable to continued exposure.
- [ ] **If credential compromise suspected for specific users:** in Firebase Console → Authentication, revoke refresh tokens for the affected uids. Forces re-auth on next app open.
- [ ] **If Storage blob exposure via leaked signed URL:** the URL cannot be revoked directly, but you can rotate the signing key at the bucket level, which invalidates all outstanding signed URLs. Cloud Console → Storage → Buckets → Configuration → HMAC keys.
- [ ] **If mass exfiltration in progress:** disable the offending function or add IP-block Cloud Armor rules if attack pattern is identifiable. Nuclear option: temporarily disable Firebase Auth (all users signed out; only use if data exposure is worse than downtime).
- [ ] **Rotate any leaked secrets.** Firebase API keys, service-account JSON, any environment variables in `functions/` config. Cloud Console → APIs & Services → Credentials.
- [ ] **Log every action in the incident log with timestamps.**

### T+2h to T+24h — Investigation

Goal: understand what happened, what data was affected, how many users, and how.

- [ ] **Root cause.** What was the mechanism? (Compromised credential? Rule bug? Sub-processor incident? Insider access?)
- [ ] **Timeline.** When did the exposure window open? When did it close (if it has)?
- [ ] **Scope — data classes.** Which of the below were affected? Match against the data classes in Section 5 severity matrix:
  - Standard personal data (email, name, photo URL, birthday, push token)
  - Couple content (memories, todos, notes, moments, matches, dates, reminders)
  - Special-category / Art. 9 (mood check-ins, Sunday Check-in, Intimacy Log, The Lovers quiz, Fantasy Wishes votes, Truth or Dare Spicy audio + text)
  - Storage blobs (profile photos, moment photos, tease photo/video/voice, ToD audio)
  - Authentication events (30-day retention)
  - Reports (H33 moderation queue, 24-month retention)
  - Billing records (7-year retention per Icelandic Bookkeeping Act)
- [ ] **Scope — affected users.** Approximate count. Best-effort is fine at this stage; refine before notification.
- [ ] **Exfiltration vs exposure.** Did an unauthorised party read the data (exfiltration), or was it merely accessible if someone knew where to look (exposure)? Both are breaches under GDPR; the notification decision may differ.
- [ ] **Reproducibility.** If this is a rules-regression class of bug, can you reproduce with a test account? Log every step.
- [ ] **Firestore audit logs.** Cloud Console → Logging → Query for the affected collection path and the exposure window. Look for reads from unexpected uids or service accounts.
- [ ] **Preliminary write-up in the incident log** covering root cause, timeline, scope, exfiltration-vs-exposure judgement.

### T+24h to T+48h — Classification

Goal: apply the severity matrix (Section 5) to decide the notification requirements.

- [ ] **Art. 33 threshold check.** Is the breach "likely to result in a risk to the rights and freedoms of natural persons"? Refer to matrix. For a couples intimacy app processing special-category data, the answer is almost always YES unless the exposure was purely metadata (e.g. usage counts, no per-user data).
- [ ] **Art. 34 threshold check.** Is the breach "likely to result in a HIGH risk to the rights and freedoms of natural persons"? Refer to matrix. For our data classes, special-category exposure = almost always HIGH risk.
- [ ] **Document the classification decision in the incident log** with reasoning. Persónuvernd may ask to see this later.
- [ ] **Escalate to external counsel** (once retained) if either threshold is triggered.
- [ ] **Draft the Persónuvernd notification** using Section 7 template.
- [ ] **Draft the user notification** (if Art. 34 applies) using Section 8 template.

### T+48h to T+72h — Notification preparation

Goal: submit Persónuvernd notification comfortably before T+72.

- [ ] **Final review of the Persónuvernd notification.** External legal counsel review if retained. Verify: entity identity (kennitala once ehf registered), controller vs processor role (we are always the controller for user data), factual accuracy of nature-of-breach description.
- [ ] **Submit at `https://personuvernd.is` → "Tilkynningar um öryggisbrot"** (Notifications of security breaches). Keep the confirmation receipt.
- [ ] **Post-submission:** update the incident log with submission timestamp and Persónuvernd case number.

### T+72h onward — User notification + remediation

- [ ] **If Art. 34 triggered:** send user notifications. Email + in-app if we have the infrastructure by then. Content per Section 8 template.
- [ ] **Remediation.** Deploy the permanent fix (undo the emergency ruleset from containment, ship the actual patch, remove the affected admin from the allowlist permanently, etc.).
- [ ] **Restore any tightened emergency rules to their intended state** with the fix in place.
- [ ] **Continue investigation** if the root-cause picture is incomplete.

### T+72h to T+14 days — Post-incident review

- [ ] See Section 9. Post-mortem within 14 days.

---

## 5. Severity classification matrix

This matrix is the input to the T+24-to-T+48 classification step.

### Rows: data classes

| # | Data class | Sensitivity | Typical Art. 33 risk | Typical Art. 34 risk |
|---|---|---|---|---|
| 1 | Standard personal (email, name, photo URL, birthday, push token) | Medium | Yes if >100 users OR if enables identity-adjacent harm (phishing, doxxing) | No, unless combined with (5) or (6) |
| 2 | Couple content, non-sensitive (todos, dates, reminders) | Medium | Yes if any real user data | No |
| 3 | Couple content, personal (notes, moments/photos, matches, memories) | High | Yes | Yes for photos/moments (visual likeness), notes maybe |
| 4 | **Special-category / Art. 9** (mood, Sunday Check-in, Intimacy Log, The Lovers quiz, Fantasy Wishes votes, ToD Spicy audio/text) | **Very high** | **Always yes** | **Almost always yes** — sexuality / sex-life disclosure has real-world harm (relationship damage, workplace discrimination, family conflict, outing) |
| 5 | Storage blobs — intimate media (tease photos/videos/voice, some moments, ToD audio) | **Very high** | **Always yes** | **Always yes** — intimate imagery of identifiable individuals |
| 6 | Storage blobs — profile photos | High | Yes | Yes if >100 users (visual likeness enables doxxing, deepfake source material) |
| 7 | Authentication events (sign-in log, 30-day retention) | Low-medium | Yes if abused for phishing setup | Probably no |
| 8 | Reports / H33 moderation queue (24-month retention) | High (contains reporter+target uids, category, snippets of reported content) | Yes | Yes if a reporter is exposed to the reported party |
| 9 | Billing records (7-year retention per Icelandic Bookkeeping Act) | Low | Yes | No (Apple/Google IAP means we never hold card data) |

### Modifiers

Increase the risk grade one level for each that applies:

- Affected users include minors (should be zero — we're 18+ gated — but if the age-attestation was bypassed and a minor's data was exposed, this is a very-high-severity incident regardless of data class)
- Affected users include known-vulnerable groups (LGBTQ+ users in hostile jurisdictions is the primary concern; couples intimacy apps carry this risk category by nature)
- Attacker identity is unknown (worst case = organised abuse; best case = incidental exposure that nobody actually noticed)
- Data was published or offered for sale online (any dark-web or clear-web listing)
- Exposure window > 24 hours
- Affected count > 1,000 users

Decrease the risk grade one level for each that applies:

- Exposure was theoretical only (no evidence of actual access; still notify Art. 33, but Art. 34 may not apply)
- Data was encrypted at rest AND the attacker did not obtain keys (unusual but possible for Storage blobs with customer-managed keys — we don't currently use these)
- Fewer than 10 users affected AND we have contact with all of them AND we've verbally notified

### Decision rules

- If ANY row is affected → Art. 33 notification to Persónuvernd within 72h is default. Only skip if the "unlikely to result in a risk" exception clearly applies (be conservative — err on the side of notifying).
- If any of rows 3, 4, 5, 6, or 8 are affected AND count > 100 → Art. 34 user notification is default.
- Rows 4 and 5 alone → Art. 34 user notification regardless of count. The nature of the data is high-risk on its own.

### Documenting the classification

In the incident log, produce a short paragraph:

> Data classes affected: rows N and M.
> Modifiers applying: [list].
> Modifiers reducing: [list].
> Conclusion: Art. 33 = [yes/no], Art. 34 = [yes/no].
> Reasoning: [1-2 sentences].

Persónuvernd may ask for this later. It should be defensible even if the classification later turns out to have been over-conservative.

---

## 6. Data-class-specific playbooks

Below are per-scenario checklists layered on top of the general 72h clock. When multiple apply, run all.

### 6a. Firebase Storage blob exposure

**Scenario:** a Storage rules misconfiguration, leaked signed URL, or bucket ACL mistake exposed one or more user-uploaded intimate blobs (Tease, Moments, ToD audio) to unauthenticated or unauthorised access.

- [ ] Identify affected blobs. Cloud Console → Storage → Buckets → filter path by `couples/{coupleId}/flashes/` or `couples/{coupleId}/moments/` etc.
- [ ] Rotate the bucket's HMAC keys (Console → Storage → Buckets → Configuration → HMAC keys). This invalidates all outstanding signed URLs, breaking any exposed link.
- [ ] Restore bucket ACLs to the intended state (see repo `storage.rules` for the source of truth).
- [ ] Deploy corrected `storage.rules` if the misconfiguration was in code: `npx firebase deploy --only storage --account lovedesireapp@gmail.com --project lovedesireapp-8c7f2`.
- [ ] Identify affected couples via the Firestore documents referencing the blob URLs. Each blob lives at a path derived from the doc — for `couples/{coupleId}/flashes/{ts}_{uid}.{ext}`, the couple and uid are recoverable from the path itself.
- [ ] Classification: this is row 5 in the matrix — Art. 33 always, Art. 34 almost always.
- [ ] User notification: use Section 8 template variant "intimate media exposure".

### 6b. Firestore data exfiltration

**Scenario:** an attacker obtained read access to Firestore data they shouldn't have (compromised admin uid, rule regression, service-account leak, vulnerability in a callable function).

- [ ] Immediately close the access path (rotate the credential, tighten the rule, remove the uid from `ADMIN_UIDS`).
- [ ] Identify what was read. Cloud Console → Logging → Firestore audit logs. Query by principal (the compromised identity) and time window.
- [ ] Determine scope: which collections, how many docs, which users.
- [ ] If special-category data (`couples/{coupleId}/moods/*`, `couples/{coupleId}/stateUnion/*`, `couples/{coupleId}/intimacy/*`, `users/{uid}/private/blueprint`, `couples/{coupleId}/fantasyWishes/*`, `couples/{coupleId}/truthDare/*`) was read → matrix row 4 → Art. 33 always, Art. 34 almost always.
- [ ] If content was tampered (writes as well as reads), restore from Firebase's automated backups (Console → Firestore → Backups). Retention: 35 days per Privacy §6.
- [ ] User notification: use Section 8 template variant "data-class-specific exfiltration".

### 6c. Firebase Auth credential compromise

**Scenario:** we're notified of a credential-stuffing attack, a specific user's credentials appearing in a public leak, or unusual sign-in patterns on multiple accounts.

- [ ] Firebase Console → Authentication → filter affected uids.
- [ ] Revoke refresh tokens for affected uids (Auth → Users → menu → Revoke tokens). Users are signed out and must re-auth.
- [ ] Trigger a password-reset email to affected uids (Auth → Users → menu → Reset password). Content is Firebase's default; consider customising post-launch.
- [ ] Monitor for follow-up account takeover attempts (Firestore writes with `updatedAt` spikes on `users/{uid}` docs from the affected users; Auth sign-ins from new IPs).
- [ ] Classification: matrix row 7. Art. 33 depends on subsequent attack success. Typically yes if credential leak is confirmed; no if we caught it before any successful takeover.
- [ ] User notification: variant "credential compromise — please change your password".

### 6d. Admin uid abuse

**Scenario:** someone in the `ADMIN_UIDS` allowlist (currently just Óli) performed actions they shouldn't have, or an unauthorised party gained access to an admin's account.

- [ ] Remove the compromised uid from `ADMIN_UIDS` in BOTH `functions/src/index.ts:28-30` AND `admin-web/src/adminService.ts:8-10`. Redeploy functions: `npx firebase deploy --only functions --account lovedesireapp@gmail.com --project lovedesireapp-8c7f2`.
- [ ] Audit admin action logs — currently limited to counters in `stats/{month}` (`admin_grants`, `admin_revokes`, `admin_deletes` per ADMIN_DASHBOARD.md). Post-launch action item: add per-action audit log with target uid + timestamp.
- [ ] Determine which admin callables were invoked during the compromise window: `adminGrantPremium` / `adminRevokePremium` / `adminGetOverview` / `adminGetStats` / `adminSearchUser` / `adminGetSessionStats` / `adminGetTimeInsights` / `adminGetReports` / `adminResolveReport` (H33). Undo any state changes.
- [ ] Classification: matrix row 1 (if only stats + search were used) up to row 8 (if H33 reports were viewed). Art. 33 always for insider abuse. Art. 34 depends on which callables ran.
- [ ] User notification: variant "internal access misuse". Be candid — insider incidents are more reputationally damaging when discovered later than when disclosed proactively.

### 6e. Sub-processor breach

**Scenario:** Google Cloud, Apple, or Expo has notified us that their infrastructure had an incident affecting our data.

- [ ] Log the sub-processor notification in the incident log verbatim (email content, date received, reference number).
- [ ] Determine which of our data classes are affected via the sub-processor incident description.
- [ ] Our obligation to notify Persónuvernd is independent of the sub-processor's own notification — we are the controller, they are the processor. If the sub-processor incident affects any of our users' data at a level meeting the Art. 33 threshold, we notify separately.
- [ ] Sub-processor DPO contact list is in Section 10 — check with each for confirmations before public statements.
- [ ] Classification: use the matrix rows corresponding to the affected data. Consider modifiers: attacker identity is usually unknown for sub-processor incidents; exposure window may be long.

### 6f. Ransomware or data destruction

**Scenario:** encrypted data at rest becomes unavailable, or attacker demands ransom for restoration.

- [ ] DO NOT pay. Contact external counsel and Icelandic Police cyber unit first.
- [ ] Restore from Firebase's automated backups (Console → Firestore → Backups, 35-day rolling per Privacy §6). Storage blobs restore from Cloud Storage versioning if enabled — verify current versioning state.
- [ ] Unavailability of user data is a breach under GDPR (Art. 4(12) definition includes "loss of ... access to" personal data). Classification: matrix row applies to the DATA classes affected, not the incident type — same matrix.
- [ ] Art. 33 always if user-facing unavailability was significant. Art. 34 typically only if restore was incomplete AND user data was permanently lost.

---

## 7. Persónuvernd notification form template

Submit at `https://personuvernd.is` → "Tilkynningar um öryggisbrot" (Notifications of security breaches).

Copy the template below, fill placeholders in `[BRACKETS]`, review with legal counsel (once retained), then submit.

```
BREACH NOTIFICATION TO PERSÓNUVERND

1. CONTROLLER
   Name: Love Desire ehf.
   Kennitala: [PENDING REGISTRATION — insert once ehf. is registered]
   Registered office: [REGISTERED OFFICE ADDRESS]
   Data-protection contact: privacy@lovedesireapp.com
   DPO (formal): not designated — small controller under GDPR Art. 37 threshold.
                 Accountable point of contact is the address above.

2. INCIDENT SUMMARY
   Date and time we became aware (T+0): [YYYY-MM-DD HH:MM CET]
   Date and time incident began (estimated): [YYYY-MM-DD HH:MM CET]
   Date and time incident ended (or "ongoing"): [YYYY-MM-DD HH:MM CET | ongoing]
   Nature of breach: [confidentiality | integrity | availability] — [check all that apply]
   Brief description (2-3 sentences): [what happened, plain language]

3. AFFECTED DATA
   Categories of data subjects: users of Love Desire (couples app)
   Approximate number of data subjects affected: [N]
   Categories of personal data affected: [enumerate from Section 5 matrix rows]
   Special-category data (Art. 9) affected: [yes/no — if yes, which categories: sex life / sexual orientation / health / other]
   Approximate number of records affected: [N]

4. LIKELY CONSEQUENCES
   [1-2 paragraphs on what impact this could have on affected users.
    For special-category exposure, discuss risk of outing / discrimination /
    relationship harm. For standard personal exposure, discuss phishing /
    identity misuse risk.]

5. MEASURES TAKEN OR PROPOSED
   Containment (already done): [list actions from T+0 to T+2h step]
   Investigation status: [complete | ongoing]
   Remediation timeline: [when the fix will be permanent]
   User notifications: [planned yes/no; if yes, timing; if no, reasoning per Art. 34 threshold]

6. FURTHER INFORMATION
   Sub-processor involvement: [none | Google Cloud | Apple | Expo]
   Sub-processor incident reference: [if applicable]
   External counsel: [firm name once retained | not applicable]

7. UPDATES
   [If this is a follow-up notification adding information to a prior submission,
    reference the prior case number and note this is an update.]

Submitted by: [name], acting for Love Desire ehf.
Contact for follow-up: privacy@lovedesireapp.com | [phone if convenient]
```

**Notes:**
- If some details are unknown at T+72, submit what you have and note in section 7 that a follow-up will be sent when investigation completes. Persónuvernd expects "in phases" notification for complex incidents.
- Keep the submitted PDF / receipt. Store in a private location (not this public repo) and reference the case number in the incident log.

---

## 8. User notification templates

Two variants. Pick based on severity classification.

### 8a. Art. 34 mandatory notification (high-risk breach)

**Subject line:** Important security notice about your Love Desire account

**Email body:**

```
Hi [first name],

We're writing to let you know about a security incident that affected your
Love Desire account. We're required by law (GDPR Article 34) to inform
you because the incident could result in a high risk to your rights.

WHAT HAPPENED
[1-2 sentences in plain language. Avoid jargon.
 Example: "On [DATE], we discovered that [SPECIFIC DATA] was accessible
 without authentication for a period of [DURATION]."]

WHAT DATA WAS INVOLVED
[Bullet the specific categories affected. Be specific:
 - Your photos in Moments from [DATE RANGE]
 - Your intimate content shared through Tease from [DATE RANGE]
 - Your mood check-ins from [DATE RANGE]
 - etc.]

WHAT COULD HAPPEN
[1 paragraph on realistic worst case. For special-category exposure,
 acknowledge the possibility of the content reaching people you didn't
 intend to see it. Do not minimise. Do not catastrophise.]

WHAT WE'RE DOING
[Bullet the remediation steps you took, in past tense.
 - We closed the access path within [TIMEFRAME] of discovery.
 - We notified Persónuvernd (Icelandic Data Protection Authority) on [DATE].
 - We've [FIX APPLIED].
 - We're reviewing our security controls to prevent similar issues.]

WHAT YOU SHOULD DO
[Concrete steps the user should take. Examples:
 - Change your password (link).
 - Review your Moments and Teases and delete any you want removed.
 - Watch for suspicious emails asking about your Love Desire account.
 - Contact us if you have any concerns.]

QUESTIONS
Reply to this email or write to privacy@lovedesireapp.com. If you're not
satisfied with our handling of this incident, you have the right to lodge
a complaint with Persónuvernd (postur@personuvernd.is, https://personuvernd.is).

We're very sorry this happened. We take the trust you place in us
seriously, and we're taking this incident seriously.

Love Desire ehf.
```

**In-app message (shown as a full-screen modal on next launch):**

Same content, condensed to ~4 short paragraphs. Provide a "Read the full notice" link that opens the full email content.

### 8b. Precautionary courtesy notification (below Art. 34 threshold)

Optional but recommended for goodwill even where Art. 34 isn't legally triggered.

**Subject line:** A security update from Love Desire

**Email body:**

```
Hi [first name],

We had a security incident recently that involved a small amount of data
from your Love Desire account. We're not legally required to notify you
because the risk to you is low, but we want to be transparent about what
happened.

[Then same structure as 8a but softer tone throughout.]
```

**Timing:** send within one week of Art. 33 notification, once the situation is fully understood. Avoid rushing a "courtesy" notification and getting the facts wrong.

### Language notes

- English only for launch. Icelandic translation added when in-app UI is localised.
- Do not include the specific attack vector or attacker identity in user notifications. That level of detail belongs in the post-mortem, not the user comms.
- Do not pre-emptively offer compensation or a free premium period unless external counsel advises. It can be construed as admission of liability in some jurisdictions.

---

## 9. Post-incident review

Deliverable: within **14 days** of resolution, produce a post-mortem document at `incidents/YYYY-MM-DD-<slug>-postmortem.md` (private repo — this repo is public via git).

### Post-mortem template

```
# Post-mortem — [short incident title]

## Summary
[2-3 sentence executive summary]

## Timeline (all times in CET)
- YYYY-MM-DD HH:MM — [event]
- YYYY-MM-DD HH:MM — T+0: [detection]
- YYYY-MM-DD HH:MM — [containment complete]
- YYYY-MM-DD HH:MM — [investigation complete]
- YYYY-MM-DD HH:MM — [Persónuvernd notified] (case #[N])
- YYYY-MM-DD HH:MM — [users notified]
- YYYY-MM-DD HH:MM — [remediation complete]

## Root cause
[1-2 paragraphs. Prefer the "5 whys" approach — dig past the proximate
 cause to the underlying enabling condition.]

## Impact
- Users affected: [N]
- Data classes affected: [list]
- Duration of exposure: [hours/days]
- Notifications sent: Persónuvernd [yes/no], users [yes/no]

## What went well
- [list — this section matters, do not skip it]

## What did not go well
- [list — be candid]

## Action items
- [ ] Owner: [name] — Fix: [specific change to firestore.rules / functions / this plan]
- [ ] Owner: [name] — Fix: [add monitoring for X]
- [ ] Owner: [name] — Fix: [update BREACH_RESPONSE_PLAN.md Section Y]

## Lessons
[1 paragraph on the enduring lesson from this incident that isn't
 captured in a specific action item.]
```

### Where action items land

- **Code fixes** → normal PR flow. Reference the incident in the commit message.
- **Documentation fixes** → update this plan directly, bump the "Last updated" date.
- **Monitoring gaps** → Firebase console alert additions, or POST_LAUNCH.md queue entries for tooling work.
- **Process gaps** → update this plan's process sections (Sections 3, 4, 5).

---

## 10. Appendix — contact list

Keep this section up to date. Contacts drift.

### Regulator

- **Persónuvernd** (Icelandic Data Protection Authority)
  - Address: Rauðarárstígur 10, 105 Reykjavík, Iceland
  - Email: `postur@personuvernd.is`
  - Web: `https://personuvernd.is`
  - Breach notification: `https://personuvernd.is` → "Tilkynningar um öryggisbrot"

### Sub-processors (DPO / security contact)

- **Google Cloud / Firebase**
  - Support: `https://console.cloud.google.com/support`
  - Data Processing Amendment channel: notifications arrive at the primary billing contact on the GCP project. Verify this is monitored.
  - Cloud Console: `https://console.cloud.google.com/security/command-center/findings?project=lovedesireapp-8c7f2`
- **Apple** (App Store / IAP / Sign in with Apple)
  - Developer support: `https://developer.apple.com/contact/`
  - Security: `product-security@apple.com`
- **Expo** (Push notification infrastructure)
  - Security: `security@expo.dev`
  - Status page: `https://status.expo.dev`
  - Note: H40 is a pre-launch task to migrate off Expo Push to native FCM+APNs. Once shipped, Expo drops from this list.

### Internal contacts

- **Privacy questions / data-subject rights:** `privacy@lovedesireapp.com`
- **Abuse / content reports:** `abuse@lovedesireapp.com`
- **General support:** `support@lovedesireapp.com`
- **Security (recommended future addition):** `security@lovedesireapp.com` — set up alias when adding `/.well-known/security.txt` to marketing site.

### External counsel

- **[ICELANDIC DATA-PROTECTION COUNSEL — retain post-ehf-registration]**
  - Firm: [PENDING]
  - Named partner: [PENDING]
  - 24/7 breach line: [PENDING]
  - Non-urgent: [PENDING]

### Reference contacts

- **Icelandic Police cyber crime unit** (Ríkislögreglustjórinn) — for suspected criminal breaches (ransomware, credible attacker identity, etc.): `112` for emergencies, otherwise contact via `logreglan.is`.
- **NCMEC** (for CSAM reports arising from a breach that exposes such content): handled via H33 abuse-reporting channel; not typically breach-specific.

---

## Placeholders in this document

Grep for these markers when updating post-milestones:
- `[PENDING REGISTRATION]` — swap when Love Desire ehf. is registered (H32)
- `[REGISTERED OFFICE ADDRESS]` — swap when Love Desire ehf. is registered (H32)
- `[VSK-NR PENDING]` — swap when Love Desire ehf. VAT registration completes (H32)
- `[EXTERNAL LEGAL COUNSEL — RETAIN POST-EHF-REGISTRATION]` — swap when counsel retained
- Individual `[PENDING]` fields in Section 10 counsel block

Add this file to the H32 workflow's find-replace list — placeholders here mirror those in the 4 legal files.
