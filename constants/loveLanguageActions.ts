import { LoveLanguage } from './content';

// Concrete daily-doable actions per love language. Curated for low
// friction — anyone can attempt any of these without special setup
// or spending. Language keys match LoveLanguage from content.ts.
//
// Used by services/loveLanguageNudgeService.ts to pick 3 items each
// week deterministically (date + coupleId hash) so both partners see
// the same suggestions when they open the Sunday nudge.

export const LOVE_LANGUAGE_ACTIONS: Record<LoveLanguage, string[]> = {
  words: [
    'Send them a text listing 3 things you love about them',
    'Leave a voice memo saying "I appreciate you because..."',
    'Tell them something specific they did this week that you noticed',
    'Compliment their appearance without them prompting',
    'Write a short "you make my day better when..." note and leave it where they will find it',
    'Thank them out loud for something small they usually do',
    'Say "I love you" without any lead-up',
    'Tell them one quality you admire in them',
    'Repeat back something they told you last week, show you were listening',
    'Text them mid-day: "Just thinking about you"',
  ],
  acts: [
    'Make their coffee or tea the way they like it before they ask',
    'Take one small task off their plate today without mentioning it',
    'Fill up their car with fuel',
    'Pack their lunch or breakfast',
    'Do the dishes even if it is their turn',
    'Handle a chore they have been putting off',
    'Pick up something they need on your way home',
    'Set out their clothes for tomorrow',
    'Make the bed together in the morning',
    'Bring them something they did not know they needed, water, snack, phone charger',
  ],
  gifts: [
    'Bring home their favourite snack from the store',
    'Send them a link to something you know they would love, no reason',
    'Pick a flower on your walk and bring it home',
    'Buy the small thing they mentioned wanting weeks ago',
    'Save them the last piece of something you are both eating',
    'Leave a small treat on their pillow',
    'Send them a link to a show or book you think they would enjoy',
    'Bring them coffee from the good place, not the closest',
    'Wrap something small in fancy paper just because',
    'Save something they mentioned wanting, then surprise them with it later',
  ],
  time: [
    'Put your phone in another room for the next hour',
    'Ask about their day and actually listen without checking notifications',
    'Take a 20-minute walk together with no destination',
    'Cook a meal together, no TV in the background',
    'Watch the sunset together, no talking required',
    'Sit with them while they do something they love',
    'Plan a phone-free evening this week',
    'Have breakfast together without screens on',
    'Drive somewhere together with music instead of podcasts',
    'Lie in bed for 15 minutes after waking, no scrolling',
  ],
  touch: [
    'Hold their hand while walking somewhere',
    'Give them a 30-second hug, a real one, not a passing squeeze',
    'Rest your hand on their back while you are talking to them',
    'Give them a shoulder rub without them asking',
    'Kiss them on the forehead',
    'Sit close enough to touch, knees, thighs, arm to arm',
    'Play with their hair while watching TV',
    'Give them a foot rub tonight',
    'Cuddle for 10 minutes with no follow-up expectation',
    'Slow-dance in the kitchen to one song',
  ],
};
