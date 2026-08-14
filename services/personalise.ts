// Swap {partner} / {Partner} template placeholders in content strings for
// the partner's actual name. Content pools (Deep questions, dares, truths,
// WYR, challenge tasks, blueprint compatibility, daily picks) are authored
// with {partner} so the same string reads warm when the couple has named
// themselves and still makes sense when the name is missing.
//
// Fallback of "your partner" matches every ad-hoc `partner?.name ?? 'your
// partner'` usage across the app, so an un-named couple sees identical
// copy to the pre-template era.
//
// Intentional non-goals:
//   - No pronoun substitution ({they}, {them}, {their}). Standalone
//     pronouns in intimate directives (dares, truths, spicy daily picks,
//     love-language actions) read warmer as "them/their" than as an
//     interpolated name — see feedback_names_over_pronouns memory.
//   - No gendering. We don't know pronouns, so backreferences like
//     "themselves" stay as singular-they which is grammatically accepted.

export function personalise(text: string, partnerName: string | undefined | null): string {
  const name = partnerName?.trim() || 'your partner';
  // Capitalised form first so {Partner} → "Sara" not "your partner"→"Your
  // Partner" (which would title-case the fallback).
  const capitalised = name.charAt(0).toUpperCase() + name.slice(1);
  return text.replace(/\{Partner\}/g, capitalised).replace(/\{partner\}/g, name);
}
