// All static content for the app — questions, dares, date ideas, wishlist presets, quiz

// ─── QUESTIONS GAME ──────────────────────────────────────────────────────────

export type QuestionCategory = 'fun' | 'deep' | 'romantic' | 'spicy';

export interface Question {
  text: string;
  category: QuestionCategory;
}

export const QUESTION_CATEGORY_CONFIG: Record<QuestionCategory, { label: string; emoji: string; color: string }> = {
  fun:      { label: 'Fun',      emoji: '😄', color: '#FFF9C4' },
  deep:     { label: 'Deep',     emoji: '🌊', color: '#E3F2FD' },
  romantic: { label: 'Romantic', emoji: '🌹', color: '#FCE4EC' },
  spicy:    { label: 'Spicy',    emoji: '🌶️', color: '#FFCCBC' },
};

export const QUESTIONS: Question[] = [
  // Fun
  { text: "What's your most embarrassing moment?", category: 'fun' },
  { text: "If you could only eat one food for a year, what would it be?", category: 'fun' },
  { text: "What's the weirdest dream you've ever had?", category: 'fun' },
  { text: "If you had a superpower, what would it be and why?", category: 'fun' },
  { text: "What's a movie you've watched way too many times?", category: 'fun' },
  { text: "What would your gameshow be called?", category: 'fun' },
  { text: "What's the worst gift you've ever received?", category: 'fun' },
  { text: "If you were an animal, which one would you be?", category: 'fun' },
  // Deep
  { text: "What's something you've never told anyone?", category: 'deep' },
  { text: "What does your ideal future look like in 10 years?", category: 'deep' },
  { text: "What's your biggest fear in a relationship?", category: 'deep' },
  { text: "What's something you're still working on forgiving yourself for?", category: 'deep' },
  { text: "What does home mean to you?", category: 'deep' },
  { text: "What's a belief you hold that most people disagree with?", category: 'deep' },
  { text: "What's the kindest thing a stranger has ever done for you?", category: 'deep' },
  { text: "What are you most proud of in your life so far?", category: 'deep' },
  // Romantic
  { text: "What was the moment you knew you had feelings for me?", category: 'romantic' },
  { text: "What's your favorite memory of us together?", category: 'romantic' },
  { text: "What little thing do I do that makes you happiest?", category: 'romantic' },
  { text: "How do you feel most loved by me?", category: 'romantic' },
  { text: "What's a place you'd love to visit with me?", category: 'romantic' },
  { text: "Describe me using only three words.", category: 'romantic' },
  { text: "What song reminds you of us?", category: 'romantic' },
  { text: "What's something you appreciate about me that you haven't said recently?", category: 'romantic' },
  // Spicy
  { text: "What's something you'd love for us to try together?", category: 'spicy' },
  { text: "What's your favorite thing about our physical relationship?", category: 'spicy' },
  { text: "Where is your favorite place to be kissed?", category: 'spicy' },
  { text: "What's a fantasy you've been too shy to mention?", category: 'spicy' },
  { text: "What outfit on me drives you the most wild?", category: 'spicy' },
  { text: "What's something I do that turns you on without realizing it?", category: 'spicy' },
  { text: "Describe our best intimate moment in three words.", category: 'spicy' },
  { text: "What's one thing you'd love more of in our relationship?", category: 'spicy' },
];

// ─── DARE WHEEL ───────────────────────────────────────────────────────────────

export type DareLevel = 'sweet' | 'flirty' | 'spicy';

export interface Dare {
  text: string;
  level: DareLevel;
}

export const DARE_LEVEL_CONFIG: Record<DareLevel, { label: string; emoji: string; color: string; textColor: string }> = {
  sweet:  { label: 'Sweet',  emoji: '🌸', color: '#FCE4EC', textColor: '#880E4F' },
  flirty: { label: 'Flirty', emoji: '😏', color: '#F3E5F5', textColor: '#6A1B9A' },
  spicy:  { label: 'Spicy',  emoji: '🔥', color: '#FFCCBC', textColor: '#BF360C' },
};

export const DARES: Dare[] = [
  // Sweet
  { text: "Give your partner a 10-second hug right now.", level: 'sweet' },
  { text: "Make their favorite hot drink without being asked.", level: 'sweet' },
  { text: "Tell them 3 specific things you love about them.", level: 'sweet' },
  { text: "Give a 5-minute shoulder massage.", level: 'sweet' },
  { text: "Leave a love note somewhere they'll find it later.", level: 'sweet' },
  { text: "Tell them about a memory that always makes you smile.", level: 'sweet' },
  { text: "Hold hands for the next 10 minutes no matter what.", level: 'sweet' },
  { text: "Look into their eyes for 30 seconds without laughing.", level: 'sweet' },
  // Flirty
  { text: "Send them the flirtiest text you can right now.", level: 'flirty' },
  { text: "Whisper something you love about them in their ear.", level: 'flirty' },
  { text: "Give a slow dance to whatever song comes on next.", level: 'flirty' },
  { text: "Compliment their appearance in full detail — don't hold back.", level: 'flirty' },
  { text: "Give them a surprise kiss right now.", level: 'flirty' },
  { text: "Describe what attracted you to them the very first time.", level: 'flirty' },
  { text: "Recreate your first kiss.", level: 'flirty' },
  { text: "Tell them the most attractive thing they do without knowing.", level: 'flirty' },
  // Spicy
  { text: "Give a 15-minute full body massage.", level: 'spicy' },
  { text: "Tell them your favorite intimate memory of you two.", level: 'spicy' },
  { text: "Ask them for their secret wish for tonight.", level: 'spicy' },
  { text: "Plan a surprise intimate date for this weekend.", level: 'spicy' },
  { text: "Describe exactly what you'd do if you had the whole night together.", level: 'spicy' },
  { text: "Tell them one thing you've always wanted to try together.", level: 'spicy' },
  { text: "Kiss them for at least 30 seconds — no breaking allowed.", level: 'spicy' },
  { text: "Send a photo you think they'll love right now.", level: 'spicy' },
];

// ─── DATE NIGHT ROULETTE ──────────────────────────────────────────────────────

export interface DateIdea {
  title: string;
  description: string;
  emoji: string;
  type: 'home' | 'out' | 'adventure';
}

export const DATE_IDEAS: DateIdea[] = [
  { title: "Cook Together", description: "Pick a new recipe you've never made and cook it together from scratch.", emoji: "🍳", type: 'home' },
  { title: "Blanket Fort Cinema", description: "Build a fort, make popcorn, and pick a movie each without telling the other until it starts.", emoji: "🎬", type: 'home' },
  { title: "Spa Night", description: "Take turns giving face masks, massages, and foot soaks. Full luxury at home.", emoji: "🧖", type: 'home' },
  { title: "Stargazing", description: "Grab blankets, find a dark spot, and just lie there looking up.", emoji: "🌟", type: 'adventure' },
  { title: "Paint Night", description: "Get paints and canvases, put on music, and paint each other's portrait.", emoji: "🎨", type: 'home' },
  { title: "Night Walk", description: "Leave the phones at home and take a walk sharing a memory from each year you've known each other.", emoji: "🚶", type: 'out' },
  { title: "Recreate First Date", description: "Go back to where it all started — or recreate it at home if needed.", emoji: "💕", type: 'out' },
  { title: "Sunrise Date", description: "Wake up early, bring coffee and pastries, and watch the sunrise together.", emoji: "🌅", type: 'adventure' },
  { title: "Board Game Marathon", description: "Pick 3 board games — loser of each round does a small dare.", emoji: "🎲", type: 'home' },
  { title: "Love Letter Night", description: "Each of you writes a handwritten love letter, then reads it aloud.", emoji: "💌", type: 'home' },
  { title: "Spontaneous Road Trip", description: "Get in the car with no destination — just drive and see where you end up.", emoji: "🚗", type: 'adventure' },
  { title: "Picnic Under the Stars", description: "Pack a basket with food you both love and find a beautiful outdoor spot.", emoji: "🧺", type: 'adventure' },
];

// ─── PRESET WISHLIST ITEMS ─────────────────────────────────────────────────────

import { WishCategory } from '../services/wishlistService';

export interface PresetWish {
  text: string;
  category: WishCategory;
}

export const PRESET_WISHES: PresetWish[] = [
  // Romantic
  { text: "Cook dinner together by candlelight", category: 'romantic' },
  { text: "Spend a whole lazy Sunday in bed", category: 'romantic' },
  { text: "Take a weekend trip somewhere new", category: 'romantic' },
  { text: "Write each other love letters to keep forever", category: 'romantic' },
  { text: "Watch the sunrise or sunset together", category: 'romantic' },
  // Adventure
  { text: "Try a new sport or activity together", category: 'adventure' },
  { text: "Take a spontaneous road trip with no plan", category: 'adventure' },
  { text: "Go skinny dipping together", category: 'adventure' },
  { text: "Try a dance class together", category: 'adventure' },
  { text: "Camp overnight under the stars", category: 'adventure' },
  // Intimate
  { text: "Give each other a long full body massage", category: 'intimate' },
  { text: "Take a bath together with candles and music", category: 'intimate' },
  { text: "Leave flirty notes around the house for a week", category: 'intimate' },
  { text: "Spend a whole evening just touching and talking", category: 'intimate' },
  { text: "Read to each other in bed", category: 'intimate' },
  // Spicy
  { text: "Try something completely new together in the bedroom", category: 'spicy' },
  { text: "Do a sensory experience — blindfold massage", category: 'spicy' },
  { text: "Roleplay a fantasy scenario together", category: 'spicy' },
  { text: "Write each other intimate letters and read them aloud", category: 'spicy' },
  { text: "Take intimate photos together (private, just for you)", category: 'spicy' },
];

// ─── LOVE LANGUAGE QUIZ ───────────────────────────────────────────────────────

export type LoveLanguage = 'words' | 'acts' | 'gifts' | 'time' | 'touch';

export const LOVE_LANGUAGE_LABELS: Record<LoveLanguage, { label: string; emoji: string; description: string }> = {
  words: { label: 'Words of Affirmation', emoji: '💬', description: 'You feel loved when you hear "I love you", receive compliments, and are encouraged with words.' },
  acts:  { label: 'Acts of Service',      emoji: '🙌', description: 'You feel loved when someone does things for you — cooking, helping, making your life easier.' },
  gifts: { label: 'Receiving Gifts',      emoji: '🎁', description: 'You feel loved through thoughtful gifts — it\'s the thought and effort that matters most.' },
  time:  { label: 'Quality Time',         emoji: '⏱️', description: 'You feel loved when someone gives you their full, undivided attention.' },
  touch: { label: 'Physical Touch',       emoji: '🤝', description: 'You feel loved through physical connection — hugs, holding hands, being close.' },
};

export interface QuizQuestion {
  a: { text: string; language: LoveLanguage };
  b: { text: string; language: LoveLanguage };
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { a: { text: "Hearing 'I'm so proud of you'", language: 'words' }, b: { text: "A warm, long hug", language: 'touch' } },
  { a: { text: "My partner doing chores without being asked", language: 'acts' }, b: { text: "A small unexpected gift", language: 'gifts' } },
  { a: { text: "Spending an evening with no phones", language: 'time' }, b: { text: "Being told I'm loved", language: 'words' } },
  { a: { text: "A thoughtful birthday surprise", language: 'gifts' }, b: { text: "My partner helping when I'm overwhelmed", language: 'acts' } },
  { a: { text: "Holding hands on a walk", language: 'touch' }, b: { text: "Dedicated time talking about our lives", language: 'time' } },
  { a: { text: "Getting a 'thinking of you' text", language: 'words' }, b: { text: "A spontaneous day trip together", language: 'time' } },
  { a: { text: "Being cooked my favorite meal", language: 'acts' }, b: { text: "A hug from behind when I'm busy", language: 'touch' } },
  { a: { text: "Receiving flowers or something thoughtful", language: 'gifts' }, b: { text: "Being told what they love about me", language: 'words' } },
  { a: { text: "Sitting close while watching a movie", language: 'touch' }, b: { text: "My partner running an errand to help me", language: 'acts' } },
  { a: { text: "A handwritten card on a special day", language: 'gifts' }, b: { text: "A whole day with no interruptions together", language: 'time' } },
];
