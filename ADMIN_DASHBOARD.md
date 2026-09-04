# Admin dashboard + aggregate stats tracking — spec

> **Status:** launch blocker. Design approved Aug 2026, implementation pending.
> **Owner:** developer (Óli). See [LAUNCH_STATUS.md](LAUNCH_STATUS.md) for scheduling.

Two interlocking pieces: an anonymous usage counter that lets us make data-driven post-launch decisions, and an admin-only surface to view those stats + subscription state + trigger a small set of privileged operations (grant/revoke premium, view user, delete account behind the scenes).

Both must land before App Store submission because (a) without stats, post-launch prioritisation is guessing, and (b) without an admin surface, every support/QA operation requires manual Firestore Console edits and any premium grant is invisible.

---

## Piece 1: Aggregate stats counter

### Design principles

- **Aggregate-only.** No uid, no coupleId, no content ever stored in the stats collection.
- **Fire-and-forget.** Instrumentation never blocks UX. `.catch(() => {})` on every write.
- **GDPR-safe by construction.** No personal data → no consent obligation, no user rights obligations. Privacy Policy discloses the collection for good hygiene, not legal requirement.
- **Monthly buckets.** One doc per month with integer counts. Time-series without infinite growth. Old months stay queryable for trend comparison.

### Data model

Firestore path: `stats/{yyyy-mm}` — e.g. `stats/2026-08`.

```
{
  screen_home:         5678,   // one screen_* per screen mount
  screen_daily:        2345,
  screen_notes:         987,
  screen_dares:         234,
  screen_pulse:          89,
  ... (~20 screen counts)
  dare_created:         567,   // one entry per key action
  dare_completed:       320,
  voice_note_created:   234,
  pulse_submitted:       89,
  mood_set:            2100,
  ... (~12 action counts)
}
```

### Service

`services/statsService.ts` — ~40 lines. Two exported functions:

```typescript
export async function trackEvent(name: string): Promise<void>
export async function trackScreen(name: string): Promise<void>  // convenience: trackEvent('screen_' + name)
```

Implementation is a single `setDoc(ref, { [name]: increment(1) }, { merge: true }).catch(() => {})`. No queue, no retry — best-effort telemetry. If Firebase is unreachable, the event is lost and that's fine.

### Firestore rules

Append to `firestore.rules`:

```
match /stats/{month} {
  allow write: if request.auth != null;  // any auth user can increment
  allow read: if false;                   // no client reads — admin dashboard uses a callable
}
```

Increment-only writes mean clients can't extract information about other users or specific events. Rules block reads outright.

### Instrumentation sites (~32 total)

**Screen mounts (~20)** — one `useEffect(() => { trackScreen('name') }, [])` per screen:
- (tabs): Home, Discover, Us, Profile
- Games: daily, truth-dare, would-you-rather, bingo, fantasy-wishes, versus, roulette, dares
- Rituals: sunday-checkin (state-union), moments, memories, love-notes (notes), journal, intimacy-log
- Insight: pulse, blueprint, sensate
- Utility: reminders, countdown, calendar

**Key actions (~12)** — high-intent events only, not every button:
- `dare_created`, `dare_accepted`, `dare_completed`
- `voice_note_created`, `voice_note_opened`
- `love_note_created`, `love_note_opened`
- `pulse_submitted`
- `versus_played` (game finished, not just started)
- `sunday_checkin_submitted`
- `sensate_stage_completed`
- `mood_set`

**Deliberately skipped:** modal opens, individual button taps within a screen, scroll depths. Noise not signal for our purposes.

---

## Piece 2: Admin dashboard

### Access control

**MVP:** hardcoded uid allowlist inside a Cloud Function.

```typescript
// functions/src/index.ts
const ADMIN_UIDS = new Set([
  'fL9brG7iuSe0XNomrRkDZ3N7PAl1',  // Óli (developer)
  // add Ola or other trusted uids as needed
]);
function assertAdmin(req: any): void {
  if (!req.auth || !ADMIN_UIDS.has(req.auth.uid)) {
    throw new HttpsError('permission-denied', 'Admin only.');
  }
}
```

Every admin callable begins with `assertAdmin(req)`. Client-side check is only for UX (hide the admin route from non-admins); the Cloud Function is the actual gate.

**Route:** `/admin` in-app. Not linked from any navigation. Reachable by typing the URL — same hidden-but-not-secret pattern as `/upgrade`. Security is the Cloud Function check, not URL obscurity.

**Post-launch upgrade path:** Firebase Auth custom claims (`admin: true` set via Firebase Console once, checked by rules + callables). Cleaner than hardcoded uids and scales if admin set grows beyond 1-2 people.

### Data displayed

**Overview strip** (top of screen)
- Total couples (Firestore count via callable)
- Total paid couples (`couples.where('isPremium', '==', true).count()`)
- Trial-vs-paid split (once RC webhook lands — post-launch)
- MRR estimate (paid couples × blended monthly rate)
- New signups this month (users where `createdAt >= month start`)

**Feature usage table** — reads `stats/{month}` doc via callable, renders sortable rows:
- Feature name / this-month count / vs last-month %
- Highlights: <10 opens/month flagged red (candidate to drop)
- Highlights: >20% MoM growth flagged green

**User search**
- Input: email
- Result: name, uid, couple id (if any), premium status, joined date
- Bounded (prefix match), rate-limited via existing pattern

**Recent activity log**
- Last 20 signups (email + joined date)
- Last 20 cancellations (once RC integrated — post-launch)

### Admin actions

**For launch (5 callables):**
- `adminGrantPremium(coupleId)` — sets `couples/{id}.isPremium = true` + `premiumSince: now`. Bypasses client-write block via admin SDK. Increments `admin_grants` in current month's stats doc as an audit trail.
- `adminRevokePremium(coupleId)` — inverse. Used for refunds pre-RC integration.
- `adminGetOverview()` — returns the top-strip counts.
- `adminGetStats(month)` — reads `stats/{month}` (client can't read directly).
- `adminSearchUser(email)` — returns basic profile of matching user. Rate-limited.

**Deferred to v1.1 (design carefully first):**
- `adminDeleteUser(uid)` — nuclear. Triggers proper deleteUserCascade via `admin.auth().deleteUser()`. Requires type-to-confirm UI + confirmation cooldown. Log deletion source separately for audit.
- `adminResetCoupleData(coupleId, subcollection)` — targeted subcollection wipe (e.g. clear one couple's Moments after abuse report). Needs preview of what will be deleted + audit log.
- `adminExportUserData(uid)` — GDPR Article 20 (data portability). Generates JSON dump. Requires safe delivery (signed URL, expires).
- `adminGrantPremiumDuration(coupleId, days)` — time-limited promo grants that auto-expire. Requires scheduled Cloud Function to check expiry.

### H33 moderation (Aug 21) — 3 callables + Reports queue tab

**New callables** (all `assertAdmin`-gated, all `invoker:'public'` v2):
- `submitReport({ contentType, contentPath, contentSnippet, contentStorageUrl, category, detail, targetUid, coupleId, disconnect })` — server-authoritative write to `/reports/{reportId}` with rate limit (20/day/uid) + couple-membership validation + can't-report-own-content guard. If `disconnect === true`, atomically unpairs the reporter's couple via `disconnectCoupleAdmin` helper (mirrors client's `disconnectFromCouple` but admin-SDK). Client-facing but exposed to admin dashboard by shape only.
- `adminGetReports({ status?, limit? })` — returns pending (or filtered) reports enriched with reporter/target email via `admin.auth().getUser`. Default limit 50, max 200.
- `adminResolveReport({ reportId, action, notes? })` — actions: `dismiss` | `remove_content` (deletes Firestore doc at `contentPath` + Storage blob if `contentStorageUrl`) | `disconnect_couple` (unpairs the target user). Updates report doc with `status` + `resolvedAt` + `resolvedBy` + `resolveNotes`. Refuses non-`pending` reports.

**New Firestore collection** `/reports/{reportId}` — top-level (NOT under `/couples/`) so the couples wildcard rule doesn't grant partners read access. Rule locks it entirely (`allow read, create, update, delete: if false`); every access goes through the callables above. Shape:
```
reporterUid, coupleId, targetUid, contentType, contentPath, contentSnippet,
contentStorageUrl?, category, detail?, disconnected, status,
createdAt, resolvedAt?, resolvedBy?, resolveNotes?
```

**Admin UI:** new "Reports queue" section between "Feature usage" and "Time-of-day heatmap" in `AdminScreen.tsx`, rendered via `components/ReportsTab.tsx`. Status-filter row (Pending / Dismissed / Content removed / Couple disconnected), row list with category color-pill + reporter/target emails + content snippet + reporter's optional detail. Row click opens detail modal with content path + Storage blob link (opens in new tab) + admin-notes textarea + 3 resolve action buttons. Non-pending reports show read-only status info instead of action buttons.

### Tech implementation

**In-app route** (not separate subdomain). Reuses Vercel deploy, familiar auth, single codebase. Admin-only JS still ships in the user bundle, but the code is small (~500 lines) and sensitive operations live in Cloud Functions.

**Files to create/modify:**
- **NEW:** `app/admin.tsx` (~400 lines) — dashboard screen with sections + action buttons
- **NEW:** `services/adminService.ts` (~80 lines) — typed callable wrappers
- **MOD:** `functions/src/index.ts` — 5 new admin callable functions + `assertAdmin` helper (~120 lines added)
- **MOD:** `firestore.rules` — add `/stats/{month}` block (write-only for auth, no read)

**No changes to firestore.rules for admin ops themselves** — those go through Cloud Functions (admin SDK bypasses rules), not direct client writes.

---

## Legal disclosure

Privacy Policy + Terms of Service both mention the aggregate stats collection. Small addition, one bullet each. Same copy across app and marketing site.

**Copy** (appended to Privacy Policy §2 "Data we collect"):

> We collect anonymous aggregate usage counts — for example, how many times a feature is opened across all users each month — to help us understand which features to improve. These counts include no identifying information about individual users or their content.

**Locations:**
- `app/privacy-policy.tsx` — in-app
- `app/terms-of-service.tsx` — brief mirror mention under data section if applicable
- `web/src/pages/privacy-policy.astro` — marketing site
- `web/src/pages/terms-of-service.astro` — marketing site

---

## Implementation phases

**Phase 1: Stats counter foundation — ✅ SHIPPED Aug 2026**
- Commits `3497d50` (baseline) + `e64ee82` (wave 2 — active-couples counter + ~30 more events)
- `services/statsService.ts` — `trackEvent` / `trackScreen` / `markCoupleActive` (all fire-and-forget with silent catch, monthly UTC bucket)
- `hooks/useTrackScreen.ts` — mount-only hook wrapper
- `firestore.rules` — `/stats/{month}` (write-only) + `/activeCouples/{month}/couples/{coupleId}` (write gated on isMemberOfCouple)
- Instrumentation across 34 screens + ~40 key actions (see full list in commit `e64ee82` body)
- MAU/WAU via `activeCouples/{month}/couples/*` count query, no per-couple leakage

**Phase 2: Admin callables — ✅ SHIPPED Aug 2026**
- Commit `e320080`, deployed to `us-central1`
- `functions/src/index.ts`: `ADMIN_UIDS` allowlist Set + `assertAdmin(req)` helper + 5 callables:
  - `adminGetOverview` — parallel `.count().get()` for totalUsers, totalCouples, pairedCouples, paidCouples, activeCouplesThisMonth, signupsThisMonth, mrrEstimate
  - `adminGetStats(month)` — reads `stats/{month}` doc, bypasses client read block
  - `adminGrantPremium(coupleId)` — writes `isPremium=true` + `premiumSince` serverTimestamp, increments `admin_grants` audit counter
  - `adminRevokePremium(coupleId)` — inverse, increments `admin_revokes`
  - `adminSearchUser(email)` — `admin.auth().getUserByEmail` + Firestore profile + partner lookup; rate-limited 10/min per admin via existing `rateLimits` collection
- `services/adminService.ts`: typed `httpsCallable` wrappers + `isCurrentUserAdmin(uid)` UX helper
- All callables use `invoker: 'public'` per the Cloud Run IAM requirement documented in `memory/firebase_functions_v2_iam.md`

**Phase 3: In-app admin UI — SUPERSEDED (Aug 2026)**
Shipped briefly at commit `4903b93` as `app/admin.tsx`. Reverted in Phase 4 after realising admin didn't belong inside the mobile bundle (App Store hygiene, admin ergonomics on desktop, iteration speed). Kept here for history.

**Phase 4: Standalone admin web app — ✅ SHIPPED Aug 2026**
- Commit `TBD`, standalone Vite + React + TypeScript SPA at `admin-web/`
- Deployed as a separate Vercel project pointing at `admin-web/` root directory
- Same 5 Cloud Function callables from Phase 2 (unchanged, no redeploy)
- Same three sections as Phase 3 (overview strip / feature usage / user lookup) but web-native (HTML/CSS, real tables, real keyboard, browser scroll)
- Firebase Auth email + password login → `isCurrentUserAdmin` client gate → `assertAdmin` server gate
- Zero admin code in the mobile bundle — `app/admin.tsx` + `services/adminService.ts` deleted, `metro.config.js` blocks `admin-web/`
- Optional post-launch: attach `admin.lovedesireapp.com` subdomain, gate with Cloudflare Access

**Total actual time: ~6h across 4 phases + wave 2 stats extension.**

---

## Verification

After phase 3:

**Stats tracking works:**
1. Open Home, Discover, /dares, /pulse in sequence
2. Firebase Console → Firestore → `stats/2026-08` → confirm `screen_home`, `screen_discover`, `screen_dares`, `screen_pulse` all incremented by 1
3. Send a dare, mark complete → confirm `dare_created` + `dare_completed` incremented

**Admin dashboard works:**
1. Navigate to `/admin` while logged in as an admin uid → dashboard renders
2. Navigate to `/admin` while logged in as non-admin uid → callable rejects, screen shows "Permission denied" state
3. Overview shows correct total counts vs Firebase Console values
4. User search: enter Ola's email → returns her profile info
5. Grant premium: click "Grant premium" on a QA couple → couple doc's `isPremium` flips to true → paid features unlock in that couple's client

**Privacy Policy visible on both surfaces:**
- App: Profile → Privacy Policy shows the aggregate-stats mention
- Marketing site: /privacy-policy contains the same paragraph

**No admin operation succeeds without auth:**
- Manually POST to admin callable URL without ID token → 401 unauthenticated
- POST with non-admin ID token → 403 permission-denied

---

## Retention analytics (Sep 3 2026)

Extension of the aggregate telemetry model that keeps `coupleId`-only granularity but adds finer time buckets so we can measure retention properly. Motivation: user's gut-read that median lifecycle is ~1 month, and we needed data before shipping more retention-focused features.

### Data model (added)

- `activeCouples/{yyyy-mm-dd}/couples/{coupleId}` — day-bucket presence. Written on every `markCoupleActive` call alongside the existing monthly marker. Powers DAU, cohort retention curves, days-since-last-active distributions. Rules-covered by the existing `activeCouples/{month}/couples/{coupleId}` wildcard.
- `couples/{coupleId}.firstRitualCompletedAt` — timestamp set atomically by `markFirstRitualIfUnset` in `services/coupleService.ts`. Fires `first_ritual_completed` event exactly once per couple. Used by the funnel.

### Events added

- Onboarding funnel: `onboarding_started`, `onboarding_photo_added`, `onboarding_name_added`, `pairing_screen_viewed`, `first_ritual_completed`
- Flow starts (paired with existing `*_completed`): `sunday_checkin_started`, `wyr_session_started`, `truth_dare_session_started`, `blueprint_started`
- Push: `notifications_opt_in`, `notifications_opt_out` (fires only on first prompt)
- Reserved for post-H44: `purchase_started`, `purchase_completed`, `subscription_cancelled`, `notification_opened`

### Callables added (functions/src/index.ts)

- `adminGetCohortRetention(cohortMonth)` — D0-D30 activity curve per signup month.
- `adminGetDauMau(startDate, endDate)` — daily DAU + 28-day rolling MAU + stickiness ratio.
- `adminGetFunnelStats(month)` — the 9-step funnel with drop-off percentages.
- `adminGetFeatureFrequency(month)` — screen_* opens per active couple, sorted desc.
- `cleanupOldDailyBuckets` — scheduled daily, purges day-buckets >12mo old.

### Admin web (admin-web/src/components/RetentionTab.tsx)

New Retention tab rendered at the bottom of AdminScreen with 4 cards: cohort curve, DAU/MAU trend, funnel, feature frequency. Month + date-range controls at top, Reload button, all data loads on first mount.

### Verification

- Use the app for 3 days on a QA couple → confirm `activeCouples/2026-09-{03,04,05}/couples/{qa-couple-id}` docs appear.
- Trigger each new event manually (onboarding flow, quiz starts, push opt-in) → confirm counters increment in `stats/2026-09`.
- Run `adminGetDauMau(2026-09-01, 2026-09-30)` in the admin-web SPA → data appears.
- Confirm no `uid` field on any new document.

---

## Non-goals

- **Not client-side analytics dashboard** — no in-app charts/graphs for MVP. Firebase Console + admin table is enough.
- **Not third-party analytics** (Amplitude, Mixpanel) — everything server-side under our own Firestore. Cheaper, simpler, no data sharing.
- **Not Firebase Analytics** — its auto-collection ships lots of telemetry that adds GDPR complexity we don't need.
- **Not real-time dashboards** — stats update on next admin refresh, not live-stream. Cost-cheap.
- **Not per-user analytics** — deliberately. Nothing at the individual UID level. Retention analytics landed Sep 3 2026 but stayed at coupleId granularity: day-bucket presence at `activeCouples/{yyyy-mm-dd}/couples/{coupleId}` powers DAU + cohort curves + funnel + feature-frequency without adding per-user timelines. `users/{uid}.lastActiveAt` and per-user activity logs are still explicitly out.
- **Not deleting users from admin dashboard in MVP** — high-risk destructive action, deserves careful design (type-to-confirm, cooldown, cascading effects preview). Deferred to v1.1.

---

## Post-launch enhancements queued

Track separately in [POST_LAUNCH.md](POST_LAUNCH.md) once MVP is live:

- Custom claim–based admin instead of hardcoded uids
- Real-time dashboard subscriptions
- ~~Per-feature retention curves~~ — shipped Sep 3 2026 via day-bucket at `activeCouples/{yyyy-mm-dd}/couples/{coupleId}` + four new admin callables (adminGetCohortRetention, adminGetDauMau, adminGetFunnelStats, adminGetFeatureFrequency). Rule was RELAXED from "monthly bucket only" to "day bucket at coupleId granularity" — still no per-user timeline.
- CSV export of stats for spreadsheet analysis
- Alert rules (email/Slack when a feature drops below threshold, when signups spike, when refund rate rises)
- Admin action audit log — dedicated `adminActions/{ts}` collection with what/who/why, viewable in dashboard
- The four deferred actions above (deleteUser, resetCoupleData, exportUserData, grantPremiumDuration)
