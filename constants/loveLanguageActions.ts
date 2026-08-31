import { LoveLanguage } from './content';

// Concrete daily-doable actions per love language. Curated for low
// friction — anyone can attempt any of these without special setup
// or spending. Language keys match LoveLanguage from content.ts.
//
// Used by services/loveLanguageNudgeService.ts to pick 3 items each
// week deterministically (date + coupleId hash) so both partners see
// the same suggestions when they open the Monday nudge.
//
// Copy uses the `{partner}` token so love-language-nudge.tsx can
// personalise it with the actual partner name at render time (via
// services/personalise). Follow-on "they/them" is allowed once the
// name has already been surfaced in the same sentence — see the
// [feedback_names_over_pronouns] rule in memory.
//
// Pool size: 20 per language (100 total). Enough that the weekly
// deterministic pick won't feel repetitive for many months even
// though each week is a random-order shuffle of the same pool.

export const LOVE_LANGUAGE_ACTIONS: Record<LoveLanguage, string[]> = {
  words: [
    'Send {partner} a text listing 3 things you love',
    'Leave {partner} a voice memo saying "I appreciate you because..."',
    'Tell {partner} something specific they did this week that you noticed',
    "Compliment {partner}'s appearance without any prompting",
    'Write {partner} a short "you make my day better when..." note and leave it where they will find it',
    'Thank {partner} out loud for something small they usually do',
    'Say "I love you" to {partner} without any lead-up',
    'Tell {partner} one specific quality you admire',
    'Repeat back something {partner} told you last week, show you were listening',
    'Text {partner} mid-day: "Just thinking about you"',
    'Tell {partner} one thing you noticed today that they did well',
    'Send {partner} a photo of something and say "reminded me of you"',
    'Post an appreciative note somewhere {partner} will see it: fridge, lock screen, DM',
    'Give {partner} credit out loud when they helped with something',
    "Compliment {partner}'s laugh, mind, something non-physical",
    "Repeat {partner}'s favourite quote back, unprompted",
    'Text {partner} a memory of the two of you that still makes you smile',
    'Tell {partner} one hope you have for the two of you',
    'Say "thank you for being you" to {partner} without needing a reason',
    'Introduce {partner} proudly, not just by name',
  ],
  acts: [
    "Make {partner}'s coffee or tea the way they like it before they ask",
    "Take one small task off {partner}'s plate today without mentioning it",
    "Fill up {partner}'s car with fuel",
    "Pack {partner}'s lunch or breakfast",
    "Do the dishes even if it is {partner}'s turn",
    'Handle a chore {partner} has been putting off',
    'Pick up something {partner} needs on your way home',
    "Set out {partner}'s clothes for tomorrow",
    'Make the bed together with {partner} in the morning',
    'Bring {partner} something they did not know they needed: water, snack, phone charger',
    "Fold {partner}'s laundry and put it away",
    'Load the dishwasher without {partner} asking',
    "Charge {partner}'s phone when it is dying",
    "Grab {partner}'s bag or coat when you are leaving together",
    "Refill {partner}'s water while they are working",
    "Handle the trash tonight even if it is not your night",
    'Wipe down the counters after cooking with {partner}',
    'Bring {partner} a warm blanket when they look cold',
    'Answer a message {partner} has been dreading, together',
    'Cancel one thing on {partner}\'s calendar they secretly wish they did not have to do',
  ],
  gifts: [
    "Bring home {partner}'s favourite snack from the store",
    'Send {partner} a link to something you know they would love, no reason',
    'Pick a flower on your walk and bring it home to {partner}',
    'Buy the small thing {partner} mentioned wanting weeks ago',
    'Save {partner} the last piece of something you are both eating',
    "Leave a small treat on {partner}'s pillow",
    'Send {partner} a link to a show or book you think they would enjoy',
    'Bring {partner} coffee from the good place, not the closest',
    'Wrap something small in fancy paper for {partner}, just because',
    'Save something {partner} mentioned wanting, surprise-give it later',
    'Save an article you read to send {partner} later',
    'Buy {partner} coffee on your morning run',
    'Bring home a leaf, shell, or stone you found on your walk for {partner}',
    'Screenshot a meme that made you laugh, send it to {partner}',
    'Add a treat to your grocery order that only {partner} would notice',
    'Frame a small photo you and {partner} both like',
    'Buy the fancy version of something {partner} uses daily',
    "Pick up {partner}'s favourite takeout unprompted",
    "Leave a note in {partner}'s book, jacket pocket, or lunchbox",
    'Order that thing {partner} has been "going to buy for months"',
  ],
  time: [
    'Put your phone in another room for the next hour with {partner}',
    "Ask {partner} how the day really went and actually listen, no phone",
    'Take a 20-minute walk with {partner}, no destination',
    'Cook a meal with {partner}, no TV in the background',
    'Watch the sunset with {partner}, no talking required',
    'Sit with {partner} while they do something they love',
    'Plan a phone-free evening with {partner} this week',
    'Have breakfast with {partner} without screens on',
    'Drive somewhere with {partner}, music instead of podcasts',
    'Lie in bed with {partner} for 15 minutes after waking, no scrolling',
    'Turn off the TV and just talk with {partner} for 15 minutes',
    'Sit outside with {partner}, no phones, coffee or tea in hand',
    'Play a board game or card game with {partner} tonight',
    'Show up to something {partner} cares about, a workout, hobby, or event',
    'Ask {partner} a "would you rather" question and actually discuss the answer',
    "Cook {partner}'s favourite meal side by side",
    'Take a bath or shower with {partner}, no agenda',
    'Look through old photos with {partner} for 10 minutes',
    "Plan a small trip with {partner}, even just tomorrow's dinner counts",
    'Wake up 15 minutes early so you have time with {partner} before the day starts',
  ],
  touch: [
    "Hold {partner}'s hand while walking somewhere",
    'Give {partner} a 30-second hug, a real one, not a passing squeeze',
    "Rest your hand on {partner}'s back while you are talking",
    'Give {partner} a shoulder rub, no asking needed',
    'Kiss {partner} on the forehead',
    'Sit close enough to touch {partner}: knees, thighs, arm to arm',
    "Play with {partner}'s hair while watching TV",
    'Give {partner} a foot rub tonight',
    'Cuddle with {partner} for 10 minutes with no follow-up expectation',
    'Slow-dance with {partner} in the kitchen to one song',
    "Kiss {partner} on the back of the neck when passing in the kitchen",
    "Rest your head on {partner}'s shoulder while sitting together",
    "Trace {partner}'s arm or back lightly while you are talking",
    'Hug {partner} from behind unexpectedly',
    "Interlock fingers with {partner} when you are driving together",
    'Give {partner} a real welcome-home hug at the door, not a wave',
    'Sit on the same couch with {partner}, close, not on opposite ends',
    "Squeeze {partner}'s hand three times, silent \"I love you\"",
    'Give {partner} a scalp rub for 60 seconds',
    'Lean into {partner} during the boring parts of a movie',
  ],
};
