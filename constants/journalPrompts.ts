// Journal prompts — one rotates in per week, deterministic per couple so
// both partners see the same starting question. Mix of light + medium +
// slightly deeper. Every prompt is safe as a "first prompt a couple ever
// sees" — no heavy therapy questions on week 1.
//
// {partner} placeholder is swapped at render time via the helper in
// services/journalPromptsService.ts so content stays static and
// personalisation is a display concern.

export const JOURNAL_PROMPTS: readonly string[] = [
  // Light — noticing, gratitude, warmth
  `Something small this week that made you smile`,
  `A moment this week you'd want to remember in a year`,
  `Something {partner} did this week that landed`,
  `A tiny ritual you two share that others probably wouldn't notice`,
  `Something you're grateful for that isn't the obvious thing`,
  `A song, meal, or place that reminded you of {partner} recently`,
  `A compliment you thought about giving {partner} but didn't say out loud`,
  `Something that made you laugh together this week`,
  `A moment this week when you felt seen by {partner}`,

  // Medium — reflection, connection, curiosity
  `When did you feel most yourselves together this week?`,
  `What are you looking forward to sharing with {partner} soon?`,
  `Something {partner} does that you hope never changes`,
  `A conversation you meant to have but didn't yet`,
  `What did you learn about {partner} recently that surprised you?`,
  `A thing you're figuring out about yourself lately`,
  `Something you and {partner} do together that feels like home`,
  `A quiet moment this week you're glad you had`,
  `Something you handled better than you would have a year ago`,
  `A small thing you're proud of {partner} for this week`,

  // Slightly deeper — reflection with warmth, still safe for week 1
  `What has {partner} been carrying lately that you notice?`,
  `Something you two are figuring out together right now`,
  `A way you two have grown closer in the last month`,
  `Something you appreciate about how you two disagree`,
  `A hope you have for the two of you this year`,
  `Something you want to make more space for together`,
];
