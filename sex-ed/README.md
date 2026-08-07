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
sourceInspiration: "Creator Name"  # who inspired the takeaway (fair use)
sourceUrl: "https://youtube.com/..."
publish: true                       # false = skip in sync
createdAt: 2026-08-07
---

Body text in markdown. Keep to 40-70 words split across 1-3 short paragraphs. Warm, second-person voice. Actionable. No jargon.
```

## Copyright / fair use policy

Never ship transcripts or verbatim quotes. Tips must be paraphrased in the developer's own words. Always credit the original creator via `sourceInspiration` + `sourceUrl` in frontmatter; the app UI surfaces those on the tip detail screen.

If a source is a paid course, do NOT extract from it — course terms usually forbid derivative work. Use only free / public educational content (public YouTube, podcasts, published books cited under fair use).

## Sync workflow

1. Watch/read → notes into `transcripts/{date}-{source}.md`
2. Draft candidate tips inside the transcript file or in `drafts/`
3. Move publish-ready tips into `tips/{category}/{slug}.md` with full frontmatter and `publish: true`
4. Run `npm run sync-sexed` (planned) → parses all `tips/**/*.md` with `publish: true` → writes `constants/sexEd.ts`
5. `npx tsc --noEmit` → commit + push
