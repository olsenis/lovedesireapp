# Bug bash + launch-prep tracker

Live tracker of pending tests, roadmap items, and shipped-since-last-launch work. Different from:
- [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md) — per-feature comprehensive checklist (walk through every feature with 2 phones)
- [`POLISH_TODO.md`](POLISH_TODO.md) — polish-item history (H-series, entertainment roadmap items)

**Update rule:** as items ship / pass / block, move them between sections. Keep completed items for a couple of days as history, then trim to `POLISH_TODO.md` shipped notes or delete.

---

## 🟡 In progress

- [ ] **Test Bingo activities render partner name** (not literal `{partner}`) after `d830fed`. Open Activity Cards, verify the 3 activities with `{partner}` in text now show "Ola7" (or partner's actual name).

## ⏳ Pending — regression tests for recent commits

- [ ] **Together List (todo screen) partner name** — save a Bingo / Daily / Fantasy Wishes matched item that contains `{partner}` → open Together List → verify text shows partner name, not literal `{partner}` (`d830fed`)
- [x] **T-or-D `{partner}` POV substitution** — ✅ PASSED across Sweet / Flirty / Spicy after hard-refresh + Vercel deploy landed (`9c4d6b1`).
- [x] **New manual T-or-D mode** — ✅ PASSED. Wherever You Are picker shows draw-random + write-your-own rows, TextInput opens, Send flows through playCard (`fafc46a`).

## ⏳ Pending — Bug bash Round 2 remainder

- [ ] **#7 T-or-D Truth flow** — text answer path + audio recording path (record → upload → reveal on both phones) + score bump + next turn transition
- [ ] **#7 T-or-D Skip flow** — picker `↺ Try another` (max 2 redraws) + doer "Skip this one" (turn switches, no score change, `skipsUsed` increments per uid)
- [ ] **#7 WYR full flow** — Playful / Romantic / Spicy start, private answer, side-by-side reveal, match banner, save-to-list, session persistence across app close/reopen
- [ ] **#7 Bingo full flow** — 5×5 grid renders face-down, flip + 2 picker passes, pending state, receiver Accept vs Skip, completed green state, reset month
- [ ] **#9 Auth flows** — register (with 18+ checkbox + consent write) + login + pairing (invite code generation + entry) + couple-connect + password reset via email

## ⏳ Pending — Manual content read-through (user, self-paced)

- [ ] **Read every content-pool text by hand** — the automated sweeps caught structural issues (em dashes, `{partner}` tokens, first-position pronouns, POV substitution) but only a human can catch tone / typos / awkward phrasing / anything that "reads off" in context. Scope: DARES (274) · TRUTHS (310) · QUESTIONS (474) · DAILY_WISH_ITEMS (254) · FANTASY_WISHES_PRESETS (294) · BINGO_ACTIVITIES (55). Approach: read a category at a time, flag any that need rewriting, batch-fix. Estimate ~2-3h across several sessions.

## ⏳ Pending — Bug bash Round 3

- [x] **Copy sweep** across all screens — ✅ shipped `b1bb14a`. Round 3 agent audit found 8 lingering issues + 1 defensive opportunity. All fixed: challenge.tsx error message (leaked "Permission denied, check Firebase rules"), profile.tsx pairing error fallback (leaked reason codes), inactive-partner hint on Home, T-or-D sent-truth banner, Us tab "Speak their language" card, state-union wait hint, 2 sensate guided prompts, T-or-D mode picker sub. Also defensive-wrapped `versus.tsx` question text in personalise(). **Zero em dashes** and **zero unwrapped `{partner}` tokens** confirmed clean across app/ and components/.
- [ ] **LDR mode toggle test** — Profile → flip `isLongDistance` on/off → verify T-or-D pool filters (LDR sees `ldr + either`, non-LDR sees `physical + either`), Home ritual copy adapts, Notes / Countdowns / Roulette LDR variants surface correctly
- [ ] **Unpaid user coverage** — create QA account with `couples/{id}.isPremium = false` in Firebase Console → verify gates on Discover / Us / paywalled screens / category gates in Daily + WYR + T-or-D + Challenge. Deferred to a dedicated session since user is currently on paid tier.

## ⏳ Launch-prep chain (after bug bash passes)

- [ ] **RevenueCat integration** + webhook writes `couples/{id}.isPremium` — client cannot write these two fields, verified in `firestore.rules`. Need RevenueCat project + product SKUs + StoreKit config on Apple side + webhook endpoint (Firebase Function).
- [ ] **Cloudflare Email routing** for `support@lovedesireapp` (or chosen domain) — needed for App Store submission contact + user support inbox
- [ ] **Apple Developer enrollment** ($99/year) + EAS build (production profile) + TestFlight submission + App Review (age rating 17+, in-app 18+ attestation)

---

## ✅ Shipped this session (Aug 2026)

- `b1bb14a` — Round 3 copy sweep: 9 findings fixed (leaked internal errors, bare pronouns on Home + T-or-D + love hub + state-union + sensate + profile) + defensive personalise() on versus
- `b10c986` — CLAUDE.md companion-docs index (so future sessions know BUG_BASH / POLISH_TODO / TEST_CHECKLIST / etc. exist)
- `51dedba` — Created BUG_BASH.md (this file)
- `d830fed` — Bingo + Together List `personalise()` fix for literal `{partner}` render
- `9c4d6b1` — T-or-D targetName fix (`{partner}` substitutes with picker's name from both phones' viewpoint)
- `fafc46a` — H19: Delete async dares entirely + add manual truth/dare authoring in Wherever You Are
- `bf1d830` — Async Dares setSending state reset on success (silent-noop fix — superseded by H19 deletion)
- `95cf706` — H18: AsyncDaresPanel folded into T-or-D picker (superseded by H19)
- `c02cc62` — Home nudge completed-dare deep-links to `/dares?tab=sent` (superseded by H19)
- `6ffa204` — T-or-D stale pre-H14 dare session unblock (guard on `phase === 'done'` not `dareConfirmed.includes(uid)`)
- `ff2099a` — H17: [Play] [Dare Log] top-tab pair (superseded by H19)
- `3a99c23` — H16: 3-way dare context (`ldr` / `either` / `physical`) replaces boolean `remote?`
- `704a560` — H15: LDR filter + 85 new remote-safe dares authored via 3 parallel agents
- `9e7664e` — H14: T-or-D merge (fold `/dares` into picker) + single-tap dare confirmation
- `0287c49` — Content: rotating-role rewrites in DARES + FANTASY_WISHES to remove "them/their" where role is rotating (not partner-specific)
- `243a895` — H13: Daily matches Home nudge (fires when both voted yes on today's pick but user hasn't saved it) + full DARES pronoun sweep (198 first-position pronoun conversions across DARES/CHALLENGE/DAILY_WISH/WYR/FW/BINGO/QUESTIONS)
- `bf8fa4b` — Em dash sweep (34 replacements across 17 user-visible files)
- `a70d732` — UI framing pronoun sweep (inline "your partner" → partner name)
- `e8fb2cb` — Full content-pool pronoun sweep + wire `personalise()` everywhere
- `#6 Daily flow` — Bug bash Round 2 item — PASSED
