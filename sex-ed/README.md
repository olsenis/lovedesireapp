# Sex Ed content vault

Curation workspace for the paid Sex Ed feature. Folder is inside the Obsidian vault (repo root) so raw research notes live alongside publish-ready tips — but only the tips get committed.

## Folder rules

- **`transcripts/`** — raw YouTube / podcast / article notes. **GITIGNORED.** Copyright-sensitive research material, never ships. Use freely as personal reference.
- **`drafts/`** — in-progress tip writing. **GITIGNORED.** Move here when starting to draft, promote to `tips/` when publish-ready.
- **`tips/{category}/`** — publish-ready tips in the developer's own words. **COMMITTED to git.** These are the source of truth the sync script reads to generate `constants/sexEd.ts`.

## Categories

| Folder | Focus |
|---|---|
| `understanding-pleasure/` | Physiology, arousal, how bodies respond |
| `presence-mindset/` | In your body, out of your head, less pressure |
| `communication/` | Talking about sex, needs, boundaries |
| `techniques-touch/` | Physical approach, what to try |
| `overcoming-blocks/` | Past experiences, tension, trust, healing |
| `long-distance/` | LDR-specific tips |
| `emotional-intimacy/` | Connection outside/alongside sex |
| `sexual-health/` | Wellbeing, cycles, medical |

Add subfolders under each as pool grows if useful (e.g. `techniques-touch/oral/`, `techniques-touch/manual/`).

## Tip file format

Each tip = one markdown file with YAML frontmatter + body.

```yaml
---
id: up-001                          # unique short id, category-prefix-###
title: "Arousal is a whole-body process"
category: understanding-pleasure    # must match folder name
tags: [arousal, foreplay, technique]
anatomy: any                        # any | vulva | penis  (see Audience below)
surface: [library, sensate]         # where the tip appears (see Surfaces below)
action: "sensate"                   # optional — "Try this" deep link target
sourceInspiration: "Creator Name"  # only for named experts (see Attribution)
sourceUrl: "https://youtube.com/..."
publish: true                       # false = skip in sync
createdAt: 2026-08-07
---

Body text in markdown. Keep to 40-70 words split across 1-3 short paragraphs. Warm, second-person voice. Actionable. No jargon.
```

## Audience: who is reading

`UserProfile` carries no gender field, and it should stay that way — gender and
sexual orientation are special-category data under GDPR Art. 9, and adding them
would pull the privacy policy and our data-minimisation story along with them.

Instead every tip carries an `anatomy` tag:

| Value | Meaning |
|---|---|
| `any` | Works regardless of bodies. **Default. Prefer this.** |
| `vulva` | Physiology-specific to a partner with a vulva |
| `penis` | Physiology-specific to a partner with a penis |

The app asks once, as a local display preference ("what would you like to read
about?"), never stored in Firestore as a profile attribute. Users can change it
any time and it is not synced to the partner.

**Write in second person to the reader about "your partner".** Never "her" or
"him". The source material is almost entirely written from one direction (man
pleases woman) — that framing must not survive into a tip.

**Balance rule:** no category ships with more than 60% of its tips tagged toward
a single anatomy. If a category tilts, the fix is more sourcing from the other
direction, not deleting tips.

## Source vetting

Not every transcript in the stash is usable. Triage every source into one of
three tiers before drafting (running triage lives in `drafts/SOURCE_TRIAGE.md`):

**Tier 1 — use directly.** Educators, clinicians and sex-positive channels that
teach physiology, pacing, communication, consent. Tone is instructional, not
conquest-flavoured. Safe to paraphrase and attribute.

**Tier 2 — usable, heavier rewrite.** Explicit technique content whose substance
is sound but whose packaging is clickbait (emoji titles, "GUARANTEED", porn
references). The knowledge ships; the voice does not. Retitle clinically.

**Tier 3 — do not use.** Pickup / manosphere / "control the dynamic" material.
Even when a real idea sits underneath (desire discrepancy, responsive desire,
anticipation), the framing treats a partner as a target to be worked on. That is
the opposite of what Desire is for, and both partners can see the same screen.
If the underlying idea is worth having, source it from a Tier 1 source instead
and never credit the Tier 3 one.

## Copyright / fair use policy

Never ship transcripts or verbatim quotes. Ideas are not copyrightable; wording
is. Tips must be paraphrased in the developer's own words.

**Attribution is narrower than "always credit".** Crediting a source in the app
links the Desire brand to that source, so:

- **Credit named experts** — clinicians, sex educators, therapists, authors.
  `sourceInspiration` + `sourceUrl` set, surfaced in the tip detail view.
- **Do not credit aggregator or entertainment channels** that are themselves
  restating general knowledge. For established concepts (dual control model,
  responsive vs spontaneous desire) cite the originating researcher or book,
  not the video that summarised it.
- **Never credit a Tier 3 source.** If a tip can only be attributed to one, the
  tip is not ready to ship.

If a source is a paid course, do NOT extract from it — course terms usually forbid derivative work. Use only free / public educational content (public YouTube, podcasts, published books cited under fair use).

## Surfaces: where a tip appears

Tips are not only a library. `surface` is a list, and a tip may appear in more
than one place:

| Value | Where |
|---|---|
| `library` | The browsable Sex Ed section (Phase 2) |
| `sensate` | Inline during a Sensate Focus stage |
| `lovers-<type>` | On The Lovers result for that type (`lovers-feeling` etc.) |
| `fantasy-wishes` | Inline in Fantasy Wishes |
| `daily-spicy` | Inline on the Daily Spicy tab |
| `weekly` | Eligible for the Home "This week's read" slot |

`action` optionally names a deep-link target so the tip detail can offer a
"Try this" button that puts the idea into use (a Together List item, opening
Sensate, starting a Daily category).

## Sync workflow

1. Watch/read → notes into `transcripts/{date}-{source}.md`
2. Draft candidate tips inside the transcript file or in `drafts/`
3. Move publish-ready tips into `tips/{category}/{slug}.md` with full frontmatter and `publish: true`
4. Run `npm run sync-sexed` (planned) → parses all `tips/**/*.md` with `publish: true` → writes `constants/sexEd.ts`
5. `npx tsc --noEmit` → commit + push

Ship order for the app side (embedded surfaces first, library second) is in
[POST_LAUNCH.md](../POST_LAUNCH.md) under "Sex Ed section for paid subscribers".
