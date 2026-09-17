# Scratch Cards: position illustrations (design exploration, not shipped)

Part of USER_VOICE_TODO C15 / POST_LAUNCH "Scratch Cards". Nothing here is imported by the app yet.

## Changing the text

All names and description lines are in **`positions.json`**. Edit there, then run `python design/scratch-cards/build_positions.py`. Nothing else needs touching. The script warns when a line is longer than about 48 characters, because it would overflow the card.

## Files

- `positions.json`: the copy. `id`, `group`, `name`, `lines` (two). `sender` is only the name shown on the preview.
- `build_positions.py`: the shared card template and the drawings (`SCENES`, keyed by the same `id`). No copy in here.
- `positions/<group>/<id>.svg`: **art only, no text**. This is what the app would bundle; the app draws the name and lines itself as normal text, so copy can change, be localised or be fixed without redrawing anything.
- `all-cards/<id>.svg`: every finished card (drawing plus text) in ONE flat folder, for flipping through them all. Rebuilt on every run.
- `positions/<group>/<id>.preview.svg`: the whole card with the text, for looking at. Never shipped.
- Groups so far: `lying/` (spooning, missionary), `on-top/`, `from-behind/`, `seated/` (lotus), `standing/`. Add as the pool grows (`oral/`, `edge-of-bed/`).
- A limb that wraps OVER the other figure (legs around a waist, an arm over a shoulder) is drawn with `limbs()` after both `figure()` calls, so it sits on top. Keep every hip and foot on the ground line (y about 290) or the pose reads as floating.

In the app the copy would move to `constants/content.ts` as `SCRATCH_POSITIONS` (same shape as the JSON), next to the other pools, and the drawings to `assets/` or inline `react-native-svg` components.

Style, approved by Óli on Sep 17 2026: two abstract figures made of thick round-capped strokes and a circle for a head, rose `#E88FA8` and burgundy `#880E4F`, a pillow or a ground line so the pose reads. No faces, no genitals, no skin, no third colour. Top view for lying poses, side view for the rest. Name in Cormorant Garamond, one or two plain lines under it (max about 48 characters a line, or it overflows the card).

Before any of this ships: check App Store guideline 1.1.4 as it reads then, and two or three live apps with similar art. The drawings stay behind Premium and the Spicy consent card, and never appear in screenshots or previews.
