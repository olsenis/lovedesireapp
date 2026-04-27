// All static content for the app — questions, dares, date ideas, wishlist presets, quiz, blueprint, fantasy, challenge, truths

// ─── QUESTIONS GAME ──────────────────────────────────────────────────────────

export type QuestionCategory = 'fun' | 'deep' | 'romantic' | 'spicy' | 'therapy' | 'fantasy';

export interface Question {
  text: string;
  category: QuestionCategory;
}

export const QUESTION_CATEGORY_CONFIG: Record<QuestionCategory, { label: string; emoji: string; color: string }> = {
  fun:      { label: 'Fun',      emoji: '😄', color: '#FFF9C4' },
  deep:     { label: 'Deep',     emoji: '🌊', color: '#E3F2FD' },
  romantic: { label: 'Romantic', emoji: '🌹', color: '#FCE4EC' },
  spicy:    { label: 'Spicy',    emoji: '🌶️', color: '#FFCCBC' },
  therapy:  { label: 'Therapy',  emoji: '🧠', color: '#E8F5E9' },
  fantasy:  { label: 'Fantasy',  emoji: '✨', color: '#F3E5F5' },
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
  { text: "What's the most ridiculous lie you told as a kid?", category: 'fun' },
  { text: "If you could swap lives with any celebrity for a week, who?", category: 'fun' },
  { text: "What's a skill you wish you'd learned as a child?", category: 'fun' },
  { text: "What would your autobiography be titled?", category: 'fun' },
  { text: "What's the strangest thing you find oddly satisfying?", category: 'fun' },
  { text: "If you could only keep three apps on your phone, which would they be?", category: 'fun' },
  { text: "What's the most impulsive thing you've ever done?", category: 'fun' },
  { text: "If your life were a film genre right now, what would it be?", category: 'fun' },
  { text: "What's a trend you wish would come back?", category: 'fun' },
  { text: "What are you irrationally good at?", category: 'fun' },
  { text: "If you won €10,000 tomorrow, what's the first thing you'd spend it on?", category: 'fun' },
  { text: "What random piece of trivia do you know way too much about?", category: 'fun' },
  // Deep
  { text: "What's something you've never told anyone?", category: 'deep' },
  { text: "What does your ideal future look like in 10 years?", category: 'deep' },
  { text: "What's your biggest fear in a relationship?", category: 'deep' },
  { text: "What's something you're still working on forgiving yourself for?", category: 'deep' },
  { text: "What does home mean to you?", category: 'deep' },
  { text: "What's a belief you hold that most people disagree with?", category: 'deep' },
  { text: "What's the kindest thing a stranger has ever done for you?", category: 'deep' },
  { text: "What are you most proud of in your life so far?", category: 'deep' },
  { text: "What's a chapter of your life you rarely talk about?", category: 'deep' },
  { text: "What did childhood you dream of becoming — and how does that feel now?", category: 'deep' },
  { text: "What's the most important lesson a past relationship taught you?", category: 'deep' },
  { text: "What do you wish people understood about you that they often get wrong?", category: 'deep' },
  { text: "When do you feel most like your truest self?", category: 'deep' },
  { text: "What's something you deeply want but find hard to ask for?", category: 'deep' },
  { text: "What would you do differently if you knew no one would judge you?", category: 'deep' },
  { text: "What relationship in your life are you most grateful for, besides ours?", category: 'deep' },
  { text: "What's something you've been putting off that really matters to you?", category: 'deep' },
  { text: "What part of yourself took you the longest to accept?", category: 'deep' },
  { text: "What does success mean to you — and has that changed?", category: 'deep' },
  { text: "What's a fear you've overcome that you're quietly proud of?", category: 'deep' },
  // Romantic
  { text: "What was the moment you knew you had feelings for me?", category: 'romantic' },
  { text: "What's your favorite memory of us together?", category: 'romantic' },
  { text: "What little thing do I do that makes you happiest?", category: 'romantic' },
  { text: "How do you feel most loved by me?", category: 'romantic' },
  { text: "What's a place you'd love to visit with me?", category: 'romantic' },
  { text: "Describe me using only three words.", category: 'romantic' },
  { text: "What song reminds you of us?", category: 'romantic' },
  { text: "What's something you appreciate about me that you haven't said recently?", category: 'romantic' },
  { text: "What do you imagine us doing together five years from now?", category: 'romantic' },
  { text: "What's the first thing you noticed about me?", category: 'romantic' },
  { text: "When do you feel most connected to me?", category: 'romantic' },
  { text: "What's a dream you'd love for us to share?", category: 'romantic' },
  { text: "What's something you do now because of me that you didn't before?", category: 'romantic' },
  { text: "What's a small everyday moment with me that you secretly love?", category: 'romantic' },
  { text: "What's the bravest thing you've ever done for love?", category: 'romantic' },
  { text: "If you could freeze one moment we've shared, what would it be?", category: 'romantic' },
  { text: "What do you think our biggest strength as a couple is?", category: 'romantic' },
  { text: "What's something about us that you'd never want to change?", category: 'romantic' },
  { text: "How has loving me changed you?", category: 'romantic' },
  { text: "What's a tradition you'd love for us to start?", category: 'romantic' },
  // Spicy
  { text: "What's something you'd love for us to try together?", category: 'spicy' },
  { text: "What's your favorite thing about our physical relationship?", category: 'spicy' },
  { text: "Where is your favorite place to be kissed?", category: 'spicy' },
  { text: "What's a fantasy you've been too shy to mention?", category: 'spicy' },
  { text: "What outfit on me drives you the most wild?", category: 'spicy' },
  { text: "What's something I do that turns you on without realizing it?", category: 'spicy' },
  { text: "Describe our best intimate moment in three words.", category: 'spicy' },
  { text: "What's one thing you'd love more of in our relationship?", category: 'spicy' },
  { text: "What time of day do you feel most in the mood?", category: 'spicy' },
  { text: "What's the most adventurous thing you'd want us to try together?", category: 'spicy' },
  { text: "What does the perfect night in look like to you?", category: 'spicy' },
  { text: "What part of my body do you love the most?", category: 'spicy' },
  { text: "What would you want me to do more of?", category: 'spicy' },
  { text: "Is there a setting or location that feels especially exciting to you?", category: 'spicy' },
  { text: "What's something you'd love me to say to you in bed?", category: 'spicy' },
  { text: "What's your ideal way to start an intimate evening?", category: 'spicy' },
  { text: "What does desire feel like to you — how does it start?", category: 'spicy' },
  { text: "What's something small I could do that would drive you wild?", category: 'spicy' },
  { text: "If you could design a perfect intimate experience for us, what would it include?", category: 'spicy' },
  { text: "What's something you've been thinking about but haven't brought up yet?", category: 'spicy' },
  // Therapy (Gottman Love Map style)
  { text: "What is your partner's biggest dream right now?", category: 'therapy' },
  { text: "What has been stressing your partner most lately?", category: 'therapy' },
  { text: "What is your partner's greatest fear that they rarely mention?", category: 'therapy' },
  { text: "What makes your partner feel most proud of themselves?", category: 'therapy' },
  { text: "Who is your partner's closest friend outside of you?", category: 'therapy' },
  { text: "What does your partner find most meaningful in their daily life?", category: 'therapy' },
  { text: "What is something your partner is looking forward to right now?", category: 'therapy' },
  { text: "What childhood memory does your partner hold most dear?", category: 'therapy' },
  { text: "What would your partner say is the hardest thing about being them?", category: 'therapy' },
  { text: "What does your partner need most when they're having a bad day?", category: 'therapy' },
  { text: "What's something your partner has always wanted to try?", category: 'therapy' },
  { text: "What does your partner consider their greatest personal strength?", category: 'therapy' },
  { text: "What's something your partner secretly worries about?", category: 'therapy' },
  { text: "What does your partner need to feel truly seen by you?", category: 'therapy' },
  { text: "What's a value that's non-negotiable for your partner?", category: 'therapy' },
  { text: "What part of your partner do you think is underappreciated by others?", category: 'therapy' },
  { text: "What does your partner do to decompress when overwhelmed?", category: 'therapy' },
  { text: "What goal is your partner working toward right now?", category: 'therapy' },
  { text: "What's something your partner is quietly proud of?", category: 'therapy' },
  { text: "How does your partner most naturally express love?", category: 'therapy' },
  // Fantasy (safe exploration)
  { text: "Is there a location that's always felt exciting to you — a hotel, outdoors, somewhere specific?", category: 'fantasy' },
  { text: "Is there a role or persona that has ever appealed to you in a fantasy?", category: 'fantasy' },
  { text: "What kind of touch do you find most electric?", category: 'fantasy' },
  { text: "Is there anything you'd want to experience just once to see how it feels?", category: 'fantasy' },
  { text: "What's something that felt a bit taboo but that you're now more curious about?", category: 'fantasy' },
  { text: "What's the boldest thing you've ever wanted to suggest but haven't yet?", category: 'fantasy' },
  { text: "How do you feel about teasing and anticipation — do you love it or does it drive you crazy?", category: 'fantasy' },
  { text: "Is there a mood or vibe that puts you instantly in the mood?", category: 'fantasy' },
  { text: "What's something you find exciting in theory but haven't explored yet?", category: 'fantasy' },
  { text: "Is there a type of intimacy you've never experienced that you're curious about?", category: 'fantasy' },
  { text: "What's something you'd want us to plan in advance versus be completely spontaneous?", category: 'fantasy' },
  { text: "Are there elements of surprise or mystery that appeal to you?", category: 'fantasy' },
  { text: "Is there a dynamic you find intriguing — leading, being led, or something else?", category: 'fantasy' },
  { text: "Is there a particular sensation — temperature, texture, rhythm — that you find especially intense?", category: 'fantasy' },
  { text: "What's something you've seen or read that you found unexpectedly exciting?", category: 'fantasy' },
  { text: "Is there a scenario you've imagined that you'd feel comfortable exploring together someday?", category: 'fantasy' },
  { text: "What's a 'someday' fantasy you'd be willing to talk about right now?", category: 'fantasy' },
  { text: "Is there anything you've heard about that sounded surprisingly interesting to you?", category: 'fantasy' },
  { text: "What would make you feel completely safe to explore something new together?", category: 'fantasy' },
  { text: "What's a desire you carry quietly that you'd love your partner to know about?", category: 'fantasy' },
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
  { text: "Give them a genuine compliment about something non-physical.", level: 'sweet' },
  { text: "Cook or order their favorite meal today.", level: 'sweet' },
  { text: "Send them a voice message telling them why you're grateful for them.", level: 'sweet' },
  { text: "Spend 10 minutes doing something they love with zero complaints.", level: 'sweet' },
  { text: "Recall a specific time they made you laugh — tell them about it.", level: 'sweet' },
  { text: "Tell them one small thing they do that makes you feel safe.", level: 'sweet' },
  { text: "Offer to take one task completely off their plate today.", level: 'sweet' },
  { text: "Name three of their qualities that make them a wonderful partner.", level: 'sweet' },
  { text: "Give them a forehead kiss right now.", level: 'sweet' },
  { text: "Plan one thing you'll do together this week — something small but intentional.", level: 'sweet' },
  { text: "Send them a song that reminds you of them with a one-line note.", level: 'sweet' },
  { text: "Describe your favorite thing about them without using physical traits.", level: 'sweet' },
  { text: "Sit facing each other for 5 minutes and just breathe together.", level: 'sweet' },
  { text: "Tell them what you noticed about them when you first met.", level: 'sweet' },
  { text: "Ask them: 'What's one thing I could do that would make your week better?'", level: 'sweet' },
  { text: "Write down 5 words that describe how they make you feel.", level: 'sweet' },
  { text: "Tell them the last time you felt really proud of them.", level: 'sweet' },
  { text: "Give their hand a slow, intentional massage for 3 minutes.", level: 'sweet' },
  { text: "Make a list of 10 things you love about them and read it aloud.", level: 'sweet' },
  { text: "Ask them about a dream they have and listen without interrupting.", level: 'sweet' },
  { text: "Recreate a photo you took together — any photo.", level: 'sweet' },
  { text: "Plan a low-key evening doing exactly what they want.", level: 'sweet' },
  // Flirty
  { text: "Send them the flirtiest text you can right now.", level: 'flirty' },
  { text: "Whisper something you love about them in their ear.", level: 'flirty' },
  { text: "Give a slow dance to whatever song comes on next.", level: 'flirty' },
  { text: "Compliment their appearance in full detail — don't hold back.", level: 'flirty' },
  { text: "Give them a surprise kiss right now.", level: 'flirty' },
  { text: "Describe what attracted you to them the very first time.", level: 'flirty' },
  { text: "Recreate your first kiss.", level: 'flirty' },
  { text: "Tell them the most attractive thing they do without knowing.", level: 'flirty' },
  { text: "Maintain eye contact with them for 10 seconds — no breaking.", level: 'flirty' },
  { text: "Tell them exactly what you'd like to do with them tonight.", level: 'flirty' },
  { text: "Trace one finger slowly along their arm — take your time.", level: 'flirty' },
  { text: "Whisper a specific compliment about something you love about their body.", level: 'flirty' },
  { text: "Send a flirty voice memo right now — no typing allowed.", level: 'flirty' },
  { text: "Tell them your favorite thing about the way they kiss you.", level: 'flirty' },
  { text: "Run your fingers through their hair slowly.", level: 'flirty' },
  { text: "Sit as close as possible to them for the next 15 minutes.", level: 'flirty' },
  { text: "Tell them one reason you find them impossibly attractive today.", level: 'flirty' },
  { text: "Brush their neck with your fingertips and hold the moment.", level: 'flirty' },
  { text: "Make deliberate eye contact across the room and hold it.", level: 'flirty' },
  { text: "Say one thing you've been wanting to tell them but kept to yourself.", level: 'flirty' },
  { text: "Kiss their hand like you mean it.", level: 'flirty' },
  { text: "Describe the first time you found them truly irresistible.", level: 'flirty' },
  { text: "Give a 3-minute neck massage focused entirely on making them melt.", level: 'flirty' },
  { text: "Stand behind them and hold them for a full minute without saying anything.", level: 'flirty' },
  { text: "Put your hands on their face and look at them for 20 full seconds.", level: 'flirty' },
  { text: "Tell them what you were thinking the last time you found them irresistible.", level: 'flirty' },
  { text: "Text them something you've been thinking about but hadn't said.", level: 'flirty' },
  { text: "Take 5 minutes to kiss them wherever they point.", level: 'flirty' },
  { text: "Write them a two-line poem about something you love about them physically.", level: 'flirty' },
  { text: "Ask permission before your next move — make the question itself the dare.", level: 'flirty' },
  // Spicy
  { text: "Give a 15-minute full body massage.", level: 'spicy' },
  { text: "Tell them your favorite intimate memory of you two.", level: 'spicy' },
  { text: "Ask them for their secret wish for tonight.", level: 'spicy' },
  { text: "Plan a surprise intimate date for this weekend.", level: 'spicy' },
  { text: "Describe exactly what you'd do if you had the whole night together.", level: 'spicy' },
  { text: "Tell them one thing you've always wanted to try together.", level: 'spicy' },
  { text: "Kiss them for at least 30 seconds — no breaking allowed.", level: 'spicy' },
  { text: "Send a photo you think they'll love right now.", level: 'spicy' },
  { text: "Use only your lips and hands to explore their shoulders and neck for 5 minutes.", level: 'spicy' },
  { text: "Tell them in detail what you find irresistible about their body.", level: 'spicy' },
  { text: "Describe a specific fantasy you've thought about more than once.", level: 'spicy' },
  { text: "Blindfold them and use your hands to explore for 3 minutes.", level: 'spicy' },
  { text: "Give them a full body massage — only stop when they ask you to.", level: 'spicy' },
  { text: "Tell them the sexiest moment you remember from our relationship.", level: 'spicy' },
  { text: "Kiss every part of their neck and collarbone for 2 minutes straight.", level: 'spicy' },
  { text: "Take turns being in control — set a timer for 5 minutes each.", level: 'spicy' },
  { text: "Whisper something you've wanted to do tonight and watch their reaction.", level: 'spicy' },
  { text: "Use something cold and something warm during a massage — switch between them.", level: 'spicy' },
  { text: "Ask them to guide your hands to wherever they want them.", level: 'spicy' },
  { text: "Tell them one thing you want them to do to you tonight.", level: 'spicy' },
  { text: "Kiss them deeply, then pull back and tease — three times before going all in.", level: 'spicy' },
  { text: "Give a massage starting at their feet and working all the way up.", level: 'spicy' },
  { text: "Tell them exactly what you plan for tonight — in detail.", level: 'spicy' },
  { text: "Let them undress you — you cannot help or rush them.", level: 'spicy' },
  { text: "Set a 10-minute timer and do nothing but kiss.", level: 'spicy' },
  { text: "Try a new scenario tonight — something you've talked about but never tried.", level: 'spicy' },
  { text: "Leave them a voice note describing exactly what you want for the evening.", level: 'spicy' },
  { text: "Give a sensory experience — blindfold, feather, ice cube.", level: 'spicy' },
  { text: "Act out a small role-play scenario — pick any two roles and commit.", level: 'spicy' },
  { text: "Kiss the full length of their spine, slowly.", level: 'spicy' },
];

// ─── DATE NIGHT ROULETTE ──────────────────────────────────────────────────────

export interface DateIdea {
  title: string;
  description: string;
  emoji: string;
  type: 'home' | 'out' | 'adventure';
}

export const DATE_IDEAS: DateIdea[] = [
  // Home
  { title: "Cook Together", description: "Pick a new recipe you've never made and cook it together from scratch.", emoji: "🍳", type: 'home' },
  { title: "Blanket Fort Cinema", description: "Build a fort, make popcorn, and pick a movie each without telling the other until it starts.", emoji: "🎬", type: 'home' },
  { title: "Spa Night", description: "Take turns giving face masks, massages, and foot soaks. Full luxury at home.", emoji: "🧖", type: 'home' },
  { title: "Paint Night", description: "Get paints and canvases, put on music, and paint each other's portrait.", emoji: "🎨", type: 'home' },
  { title: "Board Game Marathon", description: "Pick 3 board games — loser of each round does a small dare.", emoji: "🎲", type: 'home' },
  { title: "Love Letter Night", description: "Each of you writes a handwritten love letter, then reads it aloud.", emoji: "💌", type: 'home' },
  { title: "Cocktail Lab", description: "Pick 3 ingredients each and invent your own drinks — score them out of 10.", emoji: "🍹", type: 'home' },
  { title: "Home Karaoke", description: "Belt out guilty pleasures with zero judgment. Loudest singer wins.", emoji: "🎤", type: 'home' },
  { title: "Bake-Off", description: "Each bake a dessert from scratch, blind taste test at the end.", emoji: "🎂", type: 'home' },
  { title: "Murder Mystery Dinner", description: "Download a mystery game and act it out over a homemade dinner.", emoji: "🕵️", type: 'home' },
  { title: "Indoor Camping", description: "Sleeping bags, makeshift s'mores, ghost stories, and a stargazing app.", emoji: "⛺", type: 'home' },
  { title: "Photo Shoot Night", description: "Dress up, use your phone as a camera, keep everything. No deleting.", emoji: "📸", type: 'home' },
  { title: "Memory Lane Night", description: "Scroll back through photos from the beginning — talk about every one.", emoji: "🗂️", type: 'home' },
  { title: "Wine & Cheese Tasting", description: "Pick 3 cheeses and 2 wines, write tasting notes — decide your favorites.", emoji: "🍷", type: 'home' },
  { title: "DIY Couples Quiz", description: "Each write 10 questions about yourselves, then quiz each other.", emoji: "🧩", type: 'home' },
  { title: "Reading Aloud", description: "Take turns reading a chapter of a book to each other in bed.", emoji: "📖", type: 'home' },
  // Out
  { title: "Night Walk", description: "Leave the phones at home and share a memory from each year you've known each other.", emoji: "🚶", type: 'out' },
  { title: "Recreate First Date", description: "Go back to where it all started — or recreate it at home if needed.", emoji: "💕", type: 'out' },
  { title: "Farmers Market Date", description: "Wander, taste everything, cook whatever you buy together that evening.", emoji: "🥦", type: 'out' },
  { title: "Bookshop Date", description: "Each find a book you think the other would love — no budget, no rules.", emoji: "📚", type: 'out' },
  { title: "Coffee Crawl", description: "Visit three different cafes in one afternoon and compare them.", emoji: "☕", type: 'out' },
  { title: "Gallery Wander", description: "Find a gallery or museum — no plan, just explore at your own pace.", emoji: "🖼️", type: 'out' },
  { title: "Comedy Night", description: "Book a comedy club. Shared laughter is the best intimacy reset.", emoji: "😂", type: 'out' },
  { title: "Karaoke Bar", description: "Possibly the most vulnerable thing two people can do together in public.", emoji: "🎙️", type: 'out' },
  { title: "Bowling or Mini Golf", description: "Winner picks what you do after. Play for real.", emoji: "🎳", type: 'out' },
  { title: "Vintage Shopping Date", description: "€20 each, one hour, find each other an outfit.", emoji: "🛍️", type: 'out' },
  { title: "Sunset Picnic", description: "Pack food you both love and find a park or viewpoint for golden hour.", emoji: "🌇", type: 'out' },
  { title: "New Neighbourhood", description: "Get off at an unfamiliar stop and just walk — no destination.", emoji: "🗺️", type: 'out' },
  { title: "Live Music", description: "Find any gig — any genre you wouldn't normally choose. Experience it together.", emoji: "🎶", type: 'out' },
  { title: "Late Night Diner", description: "Go somewhere after midnight and order everything that looks interesting.", emoji: "🍔", type: 'out' },
  { title: "Escape Room", description: "Communication under pressure. See what you're made of together.", emoji: "🔐", type: 'out' },
  { title: "Drive-In or Rooftop Cinema", description: "Old-school or elevated — either way, it's a proper night.", emoji: "🚗", type: 'out' },
  // Adventure
  { title: "Stargazing", description: "Grab blankets, find a dark spot, and just lie there looking up.", emoji: "🌟", type: 'adventure' },
  { title: "Sunrise Date", description: "Wake up early, bring coffee and pastries, and watch the sunrise together.", emoji: "🌅", type: 'adventure' },
  { title: "Spontaneous Road Trip", description: "Get in the car with no destination — just drive and see where you end up.", emoji: "🚗", type: 'adventure' },
  { title: "Picnic Under the Stars", description: "Pack a basket with food you both love and find a beautiful outdoor spot.", emoji: "🧺", type: 'adventure' },
  { title: "Hiking to a Viewpoint", description: "Pack a flask, earn the view, stay long enough to feel it.", emoji: "🥾", type: 'adventure' },
  { title: "Wild Swimming", description: "Find a natural spot — river, lake, sea — and jump in together.", emoji: "🏊", type: 'adventure' },
  { title: "Overnight Camping", description: "One night, no agenda, just the two of you and nowhere to be.", emoji: "🌲", type: 'adventure' },
  { title: "Bike Ride Somewhere New", description: "Ride until you find something worth stopping for.", emoji: "🚴", type: 'adventure' },
  { title: "Cliff Jump or Zip Line", description: "Face something scary together. The adrenaline bonds you.", emoji: "🪂", type: 'adventure' },
  { title: "Kayaking Together", description: "On a lake, a river, anywhere. Take turns navigating.", emoji: "🛶", type: 'adventure' },
  { title: "Hot Tub or Sauna", description: "Rent by the hour if needed. Heat, quiet, just the two of you.", emoji: "♨️", type: 'adventure' },
  { title: "Sunrise Swim", description: "Cold water, early morning, warm hearts. Worth it every time.", emoji: "🌊", type: 'adventure' },
  { title: "Travel to a New Town", description: "Pick a town neither of you has been to. Go for one day.", emoji: "🏘️", type: 'adventure' },
  { title: "Stargazing from a Rooftop", description: "Bring a star map app, a blanket, and nowhere to be until morning.", emoji: "🔭", type: 'adventure' },
  { title: "Foraging Walk", description: "Learn to identify 10 plants together. Cook whatever you find.", emoji: "🌿", type: 'adventure' },
  { title: "Snow Day", description: "Any winter activity — sledding, snowball fight, long walk. End with hot drinks.", emoji: "❄️", type: 'adventure' },
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
  { text: "Recreate our first date exactly", category: 'romantic' },
  { text: "Plan a month of small surprise gestures for each other", category: 'romantic' },
  { text: "Watch a whole series together over one weekend", category: 'romantic' },
  { text: "Spend a full day entirely without phones", category: 'romantic' },
  { text: "Have breakfast in bed and stay there all morning", category: 'romantic' },
  { text: "Make a playlist together that tells the story of us", category: 'romantic' },
  { text: "Get each other small, thoughtful gifts for no occasion", category: 'romantic' },
  { text: "Write a bucket list of 20 things we want to do together", category: 'romantic' },
  { text: "Take a proper couples portrait photo together", category: 'romantic' },
  { text: "Plan a romantic overnight stay somewhere nearby", category: 'romantic' },
  // Adventure
  { text: "Try a new sport or activity together", category: 'adventure' },
  { text: "Take a spontaneous road trip with no plan", category: 'adventure' },
  { text: "Go skinny dipping together", category: 'adventure' },
  { text: "Try a dance class together", category: 'adventure' },
  { text: "Camp overnight under the stars", category: 'adventure' },
  { text: "Go on a hiking trip together", category: 'adventure' },
  { text: "Try cold water swimming together", category: 'adventure' },
  { text: "Take a cooking class in a new cuisine", category: 'adventure' },
  { text: "Try a couples adrenaline experience — bungee, zip line, or skydive", category: 'adventure' },
  { text: "Learn something completely new together — a language, instrument, or skill", category: 'adventure' },
  { text: "Plan a mystery trip where only one person knows the destination", category: 'adventure' },
  { text: "Do a multi-day cycling or walking tour", category: 'adventure' },
  { text: "Visit a city neither of us has been to", category: 'adventure' },
  { text: "Try an escape room challenge together", category: 'adventure' },
  { text: "Go to a festival or event outside our comfort zone", category: 'adventure' },
  // Intimate
  { text: "Give each other a long full body massage", category: 'intimate' },
  { text: "Take a bath together with candles and music", category: 'intimate' },
  { text: "Leave flirty notes around the house for a week", category: 'intimate' },
  { text: "Spend a whole evening just touching and talking", category: 'intimate' },
  { text: "Read to each other in bed", category: 'intimate' },
  { text: "Sleep in and spend the morning in bed talking about everything", category: 'intimate' },
  { text: "Give each other sensory experiences — textures, temperatures, touch", category: 'intimate' },
  { text: "Write down everything we love about each other — exchange and read silently", category: 'intimate' },
  { text: "Spend an evening focused only on physical touch — no screens", category: 'intimate' },
  { text: "Try a guided couples breathing or meditation exercise together", category: 'intimate' },
  { text: "Give each other full facials and a proper skin care treatment", category: 'intimate' },
  { text: "Have a slow evening dance in the kitchen to our songs", category: 'intimate' },
  { text: "Sleep in total silence and just hold each other all night", category: 'intimate' },
  { text: "Give a foot and hand massage while talking about our week", category: 'intimate' },
  { text: "Share a bath and take turns washing each other's hair", category: 'intimate' },
  // Spicy
  { text: "Try something completely new together in the bedroom", category: 'spicy' },
  { text: "Do a sensory experience — blindfold massage", category: 'spicy' },
  { text: "Roleplay a fantasy scenario together", category: 'spicy' },
  { text: "Write each other intimate letters and read them aloud", category: 'spicy' },
  { text: "Take intimate photos together (private, just for us)", category: 'spicy' },
  { text: "Try a couples erotic game or card set together", category: 'spicy' },
  { text: "Send each other provocative voice messages during the day", category: 'spicy' },
  { text: "Explore toys or accessories we've both been curious about", category: 'spicy' },
  { text: "Act out a full fantasy scenario — from beginning to end", category: 'spicy' },
  { text: "Have a full 'yes night' — one partner sets the whole agenda", category: 'spicy' },
  { text: "Mirror each other's touch — one leads, one follows exactly", category: 'spicy' },
  { text: "Spend a whole weekend focused on rekindling physical intimacy", category: 'spicy' },
  { text: "Plan a hotel night entirely focused on pleasure", category: 'spicy' },
  { text: "Use ice, warmth, and touch in a full sensory massage", category: 'spicy' },
  { text: "Create a private couples playlist for intimate moments", category: 'spicy' },
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

// ─── EROTIC BLUEPRINT QUIZ ────────────────────────────────────────────────────

export type BlueprintType = 'sensual' | 'sexual' | 'energetic' | 'kinky' | 'shapeshifter';

export interface BlueprintQuestion {
  a: { text: string; type: BlueprintType };
  b: { text: string; type: BlueprintType };
}

export const BLUEPRINT_TYPE_CONFIG: Record<BlueprintType, {
  label: string; emoji: string; color: string;
  description: string; turnOns: string; turnOffs: string;
}> = {
  sensual:     { label: 'Sensual',      emoji: '🌸', color: '#FCE4EC', description: 'You come alive through all five senses — the right ambiance, scent, texture, and sound are everything.', turnOns: 'Candlelight, music, slow touch, whole-body connection, setting the mood', turnOffs: 'Being rushed, harsh environments, skipping foreplay' },
  sexual:      { label: 'Sexual',       emoji: '🔥', color: '#FFCCBC', description: 'You\'re direct, visual, and confident. You feel most alive with explicit, body-forward physical connection.', turnOns: 'Visual stimulation, directness, confident touch, nudity, physical presence', turnOffs: 'Overthinking, too much talking, slow burn without payoff' },
  energetic:   { label: 'Energetic',    emoji: '⚡', color: '#FFF9C4', description: 'Anticipation is your fuel. The charge between you — the almost — is often more exciting than the moment itself.', turnOns: 'Teasing, eye contact, not yet, emotional intensity, delayed gratification', turnOffs: 'Being grabbed without buildup, predictability, no anticipation' },
  kinky:       { label: 'Kinky',        emoji: '🖤', color: '#F3E5F5', description: 'Power, roleplay, taboo, and psychological depth turn you on. You need a partner who can safely explore edges with you.', turnOns: 'Dominance and submission, roleplay, restraint, psychological play, taboo scenarios', turnOffs: 'Vanilla without variation, feeling judged, no trust built first' },
  shapeshifter: { label: 'Shapeshifter', emoji: '🌀', color: '#E3F2FD', description: 'You\'re turned on by all of it. Variety and novelty keep you engaged — you can match any partner\'s energy.', turnOns: 'Surprise, variety, new experiences, different moods, unpredictability', turnOffs: 'Routine, repetition, a partner who only wants one thing' },
};

export const BLUEPRINT_QUESTIONS: BlueprintQuestion[] = [
  { a: { text: "Feeling every sensation — the warmth, the texture, the scent of the moment", type: 'sensual' }, b: { text: "Clear, direct, confident physical touch that doesn't hold back", type: 'sexual' } },
  { a: { text: "The slow buildup — the tension before anything happens", type: 'energetic' }, b: { text: "The full sensory experience — music, lighting, how the room feels", type: 'sensual' } },
  { a: { text: "A scene with clear roles — who leads, who follows", type: 'kinky' }, b: { text: "Spontaneous variety — you never know what comes next", type: 'shapeshifter' } },
  { a: { text: "Eye contact and the electricity of almost but not yet", type: 'energetic' }, b: { text: "Visually explicit, direct, no ambiguity", type: 'sexual' } },
  { a: { text: "Atmosphere, scent, warmth, textures — the full experience", type: 'sensual' }, b: { text: "Surrender — giving up control or taking it completely", type: 'kinky' } },
  { a: { text: "Something completely new you've never tried before", type: 'shapeshifter' }, b: { text: "The slow charge — flirting all day that leads to one moment", type: 'energetic' } },
  { a: { text: "Pure physical connection with nothing held back", type: 'sexual' }, b: { text: "A role you play that lets you be someone different", type: 'kinky' } },
  { a: { text: "Being completely present to every sensation on your skin", type: 'sensual' }, b: { text: "Total unpredictability — variety every time", type: 'shapeshifter' } },
  { a: { text: "The moment they look at you and you just know", type: 'energetic' }, b: { text: "Physical confidence — they know what they want and take it gently", type: 'sexual' } },
  { a: { text: "Power play — dominance and submission, clearly defined", type: 'kinky' }, b: { text: "Total presence — their hands, the warmth, every detail of touch", type: 'sensual' } },
  { a: { text: "Cycling through different moods — tender then bold then playful", type: 'shapeshifter' }, b: { text: "The anticipation that makes you ache before anything happens", type: 'energetic' } },
  { a: { text: "Direct physical intimacy — no games, just raw connection", type: 'sexual' }, b: { text: "A scenario, a script, a role to inhabit fully", type: 'kinky' } },
  { a: { text: "Warmth, slow touch, every sense fully engaged", type: 'sensual' }, b: { text: "A surprise — you have no idea what comes next", type: 'shapeshifter' } },
  { a: { text: "The charge of 'not yet' — being made to wait for it", type: 'energetic' }, b: { text: "Body-forward, direct, unapologetically physical", type: 'sexual' } },
  { a: { text: "Boundaries and rules that create a specific kind of freedom", type: 'kinky' }, b: { text: "Every experience feels like discovering a new side of your partner", type: 'shapeshifter' } },
];

// Compatibility bridge phrases for result screen
export const BLUEPRINT_COMPATIBILITY: Partial<Record<BlueprintType, Partial<Record<BlueprintType, string>>>> = {
  sensual:     { energetic: "Build the sensory experience slowly — your partner loves the tension before", sexual: "Ask your partner to slow down and savour the atmosphere with you", kinky: "Set a rich scene before any power play begins — your partner will love it" },
  energetic:   { sensual: "Give your partner a full sensory experience before the slow burn begins", sexual: "Build up before diving in — your partner wants the charge, you want the release", kinky: "Tease with power — the anticipation of what might happen is your shared playground" },
  sexual:      { sensual: "Let your partner set the scene — the payoff will be worth the wait", energetic: "Let them tease you — the buildup is their foreplay", kinky: "Your directness meets their desire for structure — agree on roles and play" },
  kinky:       { sensual: "Start in their world — atmosphere and touch — then introduce the power dynamic", energetic: "Use anticipation as your power — withholding is a form of dominance they'll love", sexual: "Your structure meets their directness — define the scene clearly and go" },
  shapeshifter: { sensual: "Bring variety to the sensory experience — new textures, new settings, new moods", energetic: "Surprise them with different kinds of tension — unpredictability is your superpower", sexual: "Keep them guessing — same energy, different scenarios every time" },
};

// ─── FANTASY MATCH ────────────────────────────────────────────────────────────

export type FantasyCategory = 'roleplay' | 'sensual' | 'bold' | 'adventurous';

export interface FantasyPreset {
  text: string;
  category: FantasyCategory;
}

export const FANTASY_CATEGORY_CONFIG: Record<FantasyCategory, { label: string; emoji: string; color: string }> = {
  roleplay:    { label: 'Roleplay',    emoji: '🎭', color: '#F3E5F5' },
  sensual:     { label: 'Sensual',     emoji: '🌸', color: '#FCE4EC' },
  bold:        { label: 'Bold',        emoji: '🔥', color: '#FFCCBC' },
  adventurous: { label: 'Adventurous', emoji: '🌍', color: '#E8F5E9' },
};

export const FANTASY_PRESETS: FantasyPreset[] = [
  // Roleplay
  { text: "Strangers meeting for the first time at a bar", category: 'roleplay' },
  { text: "Hotel check-in with a mysterious stranger", category: 'roleplay' },
  { text: "Boss and employee after hours", category: 'roleplay' },
  { text: "Royalty and devoted servant", category: 'roleplay' },
  { text: "Celebrity and fan meeting backstage", category: 'roleplay' },
  { text: "Forbidden attraction between neighbors", category: 'roleplay' },
  { text: "Photographer and model session", category: 'roleplay' },
  { text: "Traveler and local guide", category: 'roleplay' },
  { text: "Old flames reuniting after years apart", category: 'roleplay' },
  { text: "Spy and their target", category: 'roleplay' },
  { text: "Two strangers sharing a cabin on a night train", category: 'roleplay' },
  { text: "A masquerade — you don't know who the other person is", category: 'roleplay' },
  { text: "A dare game that goes further than expected", category: 'roleplay' },
  { text: "First night in a new city — no one knows who you are", category: 'roleplay' },
  { text: "A chance meeting that was always meant to happen", category: 'roleplay' },
  // Sensual
  { text: "Full-body massage by candlelight with no goal except touch", category: 'sensual' },
  { text: "A bath together where you wash each other slowly", category: 'sensual' },
  { text: "Lying together in complete silence, exploring touch for one hour", category: 'sensual' },
  { text: "A blindfolded sensory experience — warm, cold, soft, rough", category: 'sensual' },
  { text: "Dancing slowly together in the dark to a playlist made for that night", category: 'sensual' },
  { text: "Being undressed slowly with only their hands and lips", category: 'sensual' },
  { text: "A full evening where one partner is focused entirely on pleasuring the other", category: 'sensual' },
  { text: "Waking each other up with slow, gentle touch", category: 'sensual' },
  { text: "Spending an hour learning exactly what the other person loves", category: 'sensual' },
  { text: "A slow-burn evening — no rushing, no goal, just presence", category: 'sensual' },
  { text: "Feather-light touch across the whole body for 30 minutes", category: 'sensual' },
  { text: "Lying face to face breathing together until completely connected", category: 'sensual' },
  { text: "One partner controls the pace and pressure the entire evening", category: 'sensual' },
  { text: "A body-mapping exercise — discover every response together", category: 'sensual' },
  { text: "A candlelit massage where you both take turns", category: 'sensual' },
  // Bold
  { text: "A full night with the goal of trying one new thing together", category: 'bold' },
  { text: "Being completely in control for one full hour", category: 'bold' },
  { text: "Edging — building and pausing, over and over", category: 'bold' },
  { text: "Consensual light restraint — wrists, agreed in advance", category: 'bold' },
  { text: "Temperature play — ice and warmth explored together", category: 'bold' },
  { text: "Sensory deprivation — blindfold and stillness", category: 'bold' },
  { text: "A hotel room booked for nothing except pleasure", category: 'bold' },
  { text: "Being told exactly what to do for one whole evening", category: 'bold' },
  { text: "One partner chooses everything — the other agrees to it all beforehand", category: 'bold' },
  { text: "A private photo or video session together", category: 'bold' },
  { text: "Role reversal — whoever usually leads gives up control", category: 'bold' },
  { text: "Taking turns reading erotic scenarios aloud and reacting", category: 'bold' },
  { text: "A night with no agenda except full presence and pleasure", category: 'bold' },
  { text: "Voyeurism — being watched, or watching each other", category: 'bold' },
  { text: "A sensory experience using only one blindfold and one other prop", category: 'bold' },
  // Adventurous
  { text: "Outdoors under the stars — somewhere private and remote", category: 'adventurous' },
  { text: "On a rooftop or high vantage point at night", category: 'adventurous' },
  { text: "In water — pool, lake, or ocean", category: 'adventurous' },
  { text: "In a car in a remote location", category: 'adventurous' },
  { text: "A hotel where neither of you has ever been — completely anonymous", category: 'adventurous' },
  { text: "A cabin in the woods with no other people for miles", category: 'adventurous' },
  { text: "A hammock in a private garden", category: 'adventurous' },
  { text: "A balcony at night with a view", category: 'adventurous' },
  { text: "A private beach at dusk or dawn", category: 'adventurous' },
  { text: "An outdoor hot tub", category: 'adventurous' },
  { text: "In a field in the countryside at night under the sky", category: 'adventurous' },
  { text: "A remote coastal location — lighthouse, cliff, somewhere wild", category: 'adventurous' },
  { text: "A forest clearing in total privacy", category: 'adventurous' },
  { text: "Somewhere you've always thought about but never done", category: 'adventurous' },
  { text: "Any location that feels completely new to both of you", category: 'adventurous' },
];

// ─── 30-DAY INTIMACY CHALLENGE ────────────────────────────────────────────────

export type ChallengeProgram = 'reconnect' | 'spark' | 'fire' | 'desire';

export interface ChallengeTask {
  day: number;
  text: string;
}

export const CHALLENGE_PROGRAM_CONFIG: Record<ChallengeProgram, {
  label: string; emoji: string; color: string; textColor: string; description: string;
}> = {
  reconnect: { label: 'Reconnect', emoji: '🌱', color: '#E8F5E9', textColor: '#2E7D32', description: 'Emotional depth and gentle intimacy — rebuild the foundation' },
  spark:     { label: 'Spark',     emoji: '✨', color: '#FFF9C4', textColor: '#F57F17', description: 'Playful, flirty, and warm — reignite the energy between you' },
  fire:      { label: 'Fire',      emoji: '🔥', color: '#FFCCBC', textColor: '#BF360C', description: 'Bold, explicit, and unapologetic — for couples ready to burn bright' },
  desire:    { label: 'Desire',    emoji: '💋', color: '#FCE4EC', textColor: '#880E4F', description: 'A 30-day sexual exploration — technique, communication, and discovery' },
};

export const CHALLENGE_PROGRAMS: Record<ChallengeProgram, ChallengeTask[]> = {
  reconnect: [
    { day: 1,  text: "Send your partner a genuine compliment you've been meaning to say." },
    { day: 2,  text: "Share one thing that made you think of them today." },
    { day: 3,  text: "Make or order their absolute favorite meal — no occasion needed." },
    { day: 4,  text: "Spend 30 minutes doing something they love with your full attention." },
    { day: 5,  text: "Write down 5 things you love about them and read it aloud tonight." },
    { day: 6,  text: "Give a 15-minute shoulder and back massage." },
    { day: 7,  text: "Share a memory of a moment you felt closest to them." },
    { day: 8,  text: "Ask them about a dream they have and just listen — no advice." },
    { day: 9,  text: "Take a walk together with phones off and talk about your future." },
    { day: 10, text: "Pick a song that reminds you of them and tell them exactly why." },
    { day: 11, text: "Bring them coffee or breakfast exactly how they like it." },
    { day: 12, text: "Tell them one thing about them that you're quietly proud of." },
    { day: 13, text: "Do one task from their plate without mentioning it." },
    { day: 14, text: "Give a long, intentional hug — at least 20 seconds. Hold it." },
    { day: 15, text: "Plan a small surprise for them this week — tell them only 'something's coming'." },
    { day: 16, text: "Share something you've been carrying lately that you haven't said." },
    { day: 17, text: "Ask what they need most from you right now and really listen." },
    { day: 18, text: "Read to each other in bed — even just one page." },
    { day: 19, text: "Revisit your favorite shared memory — talk about it in detail." },
    { day: 20, text: "Leave a handwritten note somewhere they'll find it unexpectedly." },
    { day: 21, text: "Light candles, put on music, and spend an evening with zero screens." },
    { day: 22, text: "Tell them the moment you knew you loved them." },
    { day: 23, text: "Give a hand and foot massage while talking about your week." },
    { day: 24, text: "Make a list of 10 things you're grateful they do — share it." },
    { day: 25, text: "Recreate your first date, or a specific early moment together." },
    { day: 26, text: "Dance together — even if just in the kitchen for one song." },
    { day: 27, text: "Spend an evening just touching and talking — no agenda whatsoever." },
    { day: 28, text: "Write them a love letter you'll give to them on a future difficult day." },
    { day: 29, text: "Tell them one thing you've never said but always wanted them to know." },
    { day: 30, text: "Plan together — set one intention for your relationship going forward." },
  ],
  spark: [
    { day: 1,  text: "Send a flirty text out of nowhere — no context needed." },
    { day: 2,  text: "Give a proper slow dance to whatever song comes on next." },
    { day: 3,  text: "Tell them in detail what you find most attractive about them." },
    { day: 4,  text: "Whisper something in their ear you normally wouldn't say out loud." },
    { day: 5,  text: "Spend the day sending each other flirty check-ins." },
    { day: 6,  text: "Give a neck and shoulder massage — slowly, no rush." },
    { day: 7,  text: "Describe your favorite intimate memory of you two in detail." },
    { day: 8,  text: "Make out for 5 full minutes — no rushing past it." },
    { day: 9,  text: "Leave a note somewhere unexpected with exactly what you want." },
    { day: 10, text: "Ask them what they've been thinking about lately — actually listen." },
    { day: 11, text: "Compliment their body, specifically and genuinely." },
    { day: 12, text: "Plan a proper date night — no phones, no rushing." },
    { day: 13, text: "Run your fingers through their hair slowly for 5 minutes." },
    { day: 14, text: "Tell them one thing you've been thinking about trying together." },
    { day: 15, text: "Watch something in bed together, staying close the whole time." },
    { day: 16, text: "Give a full back and body massage — no destination, no rush." },
    { day: 17, text: "Ask: 'What would you want tonight to look like?' — then do it." },
    { day: 18, text: "Send a voice message telling them exactly what you love about them physically." },
    { day: 19, text: "Try something playful together — a game, a dare, a challenge." },
    { day: 20, text: "Make deliberate eye contact across the room and hold it until one of you breaks." },
    { day: 21, text: "Spend an evening with candles, music, and nowhere to be." },
    { day: 22, text: "Kiss every part of their neck and collarbone — take your time." },
    { day: 23, text: "Tell them one fantasy or desire you've had recently." },
    { day: 24, text: "Surprise them with a drawn bath, candles, and your company." },
    { day: 25, text: "Write down the 5 best moments from the last year — share them." },
    { day: 26, text: "Hold hands for an entire evening at home — all of it." },
    { day: 27, text: "Ask them what a perfect night would look like — plan it for this week." },
    { day: 28, text: "Take intimate photos together — private, playful, no judgment." },
    { day: 29, text: "Spend an entire evening focused only on each other's pleasure." },
    { day: 30, text: "Talk about what's changed between you — and what you want to create next." },
  ],
  fire: [
    { day: 1,  text: "Send a detailed message about what you want to do with them tonight." },
    { day: 2,  text: "Choose a Spicy dare from the Dare Wheel and do it tonight." },
    { day: 3,  text: "Tell them the boldest thing you've ever thought about trying with them." },
    { day: 4,  text: "Use only your lips and hands — commit to a full 30-minute experience." },
    { day: 5,  text: "Try extended foreplay — set a timer for 45 minutes before anything else." },
    { day: 6,  text: "Give a full sensory massage — blindfold, warmth, ice, and touch." },
    { day: 7,  text: "Share a fantasy in detail — have them respond with theirs." },
    { day: 8,  text: "Let them be completely in control for the whole evening." },
    { day: 9,  text: "Kiss them for 10 full minutes — nothing else." },
    { day: 10, text: "Use ice and warmth together during a massage." },
    { day: 11, text: "Do a full body exploration with no end goal — just mapping every response." },
    { day: 12, text: "Send an explicit voice note about tonight's intentions." },
    { day: 13, text: "Choose something from the Fantasy Match and make it happen tonight." },
    { day: 14, text: "Blindfold them and spend 20 minutes focused entirely on touch." },
    { day: 15, text: "Try role-play — pick any scenario, commit fully to it." },
    { day: 16, text: "Take turns being completely dominant — 30 minutes each." },
    { day: 17, text: "Create a playlist for intimacy — put it on and let it lead the evening." },
    { day: 18, text: "Try a position or scenario you've discussed but never done." },
    { day: 19, text: "Spend an evening entirely focused on their pleasure — yours comes later." },
    { day: 20, text: "Write erotic scenarios for each other and read them aloud." },
    { day: 21, text: "Book a hotel room and use every inch of it." },
    { day: 22, text: "Try consensual restraint — soft, intentional, fully agreed in advance." },
    { day: 23, text: "Tell them the most explicit thing you want and see what happens." },
    { day: 24, text: "Use a mirror and spend time watching each other." },
    { day: 25, text: "Build anticipation all day — touch without payoff — save everything for night." },
    { day: 26, text: "Try something new from the Bold category in Fantasy Match." },
    { day: 27, text: "Record an intimate audio message for each other to play later." },
    { day: 28, text: "Have a night with absolutely no agenda except full presence." },
    { day: 29, text: "Ask: 'Is there anything you've wanted that I haven't given you?' — give it." },
    { day: 30, text: "Celebrate what you've built — set your intention for the next month together." },
  ],
  desire: [
    { day: 1,  text: "Have sex at a different time than usual — morning, lunch, or right after work. No waiting until bedtime." },
    { day: 2,  text: "Browse sex positions together — online, a book, or a video. Pick a few that look interesting and tell your partner why. Keep it easy today." },
    { day: 3,  text: "Have sex twice today. Take a proper break in between." },
    { day: 4,  text: "Read erotica together before sex. Each of you finds a short story online — read them to each other." },
    { day: 5,  text: "Shower sex. Be extra soapy, take your time. Use proper water-based lube — shower water doesn't count." },
    { day: 6,  text: "Full body massage before initiating sex. Take your time — this is not a shortcut." },
    { day: 7,  text: "Quickie. 10 minutes or less. Somewhere fun — kitchen, hallway, wherever. Bonus: try for two in a day." },
    { day: 8,  text: "Go somewhere in the car — park, quiet road. Make out properly. Have car sex or go straight home after. Don't break any laws." },
    { day: 9,  text: "Sex while seated — chair or sofa, facing each other, then facing away. Try both." },
    { day: 10, text: "Sensual oil massage before sex. Lay down old towels or sheets. Take your time with the massage." },
    { day: 11, text: "Oral sex only. No 69. Tell your partner what's working. Keep going until you've both orgasmed." },
    { day: 12, text: "She's in charge — she decides everything, he does as he's told. Bonus: introduce ropes or handcuffs if you're both up for it." },
    { day: 13, text: "She brings him to orgasm without intercourse — hands, mouth, and body only. Bonus: try using other parts of the body creatively." },
    { day: 14, text: "Find a new place in the home for sex. Kitchen, bathroom, living room floor, wherever — just not the usual spot." },
    { day: 15, text: "Each of you brings yourself to orgasm in front of your partner, at the same time. Share what you're feeling. Observe and learn." },
    { day: 16, text: "Advanced positions — find two or three that are genuinely challenging. Look them up together first. Avoid injury." },
    { day: 17, text: "Add toys. Vibrators, rings, beads — whatever you have or want to try. This session is about finding what works. Bonus: a toy you can both use at the same time." },
    { day: 18, text: "Watch porn together — at least 30 minutes. Bonus: touch each other or have sex while watching. Start with something safe if this is new." },
    { day: 19, text: "Sex without intercourse — hands, mouth, toys, body. Both of you must orgasm." },
    { day: 20, text: "Share fantasies by message today — text or voice note, not at work. Then pick one to play out tonight. Bonus: costumes." },
    { day: 21, text: "Visit a sex shop together — online or in person. Both of you make at least one purchase. Toys, games, books, anything." },
    { day: 22, text: "He brings her to orgasm without intercourse — hands, mouth, toys only. Take your time." },
    { day: 23, text: "Take a breather. No challenges today — just have sex however you like." },
    { day: 24, text: "Sex game — dice, a spinner, or an app. Find something and play it properly." },
    { day: 25, text: "Slow sex. Move at quarter of your normal speed. This is a 45-minute minimum — slow and steady until you've both had at least one orgasm." },
    { day: 26, text: "He's in charge — he decides everything, she does as she's told. Bonus: introduce ropes or handcuffs if you're both up for it." },
    { day: 27, text: "Dinner out with under-the-table touching. Keep it discreet. Go straight to a hotel or home after for sex." },
    { day: 28, text: "Multiple orgasm day. After the first, take a short break with caressing, then go again. One is not enough today." },
    { day: 29, text: "Flip a coin — winner is dominant. Tell your partner 'do what you want with me' and mean it. Agree on a safe word first. Push your limits." },
    { day: 30, text: "Stay up as long as you can. Revisit your favourite moments from the 29 days. Aim for 5 orgasms or 5 rounds. Bonus day: caress, rest, then just fuck." },
  ],
};

// ─── TRUTH OR DARE — TRUTHS ───────────────────────────────────────────────────

export interface Truth {
  text: string;
  level: DareLevel;
}

export const TRUTHS: Truth[] = [
  // Sweet
  { text: "What's the most thoughtful thing I've ever done for you?", level: 'sweet' },
  { text: "What's a quality you love about me that you've never properly told me?", level: 'sweet' },
  { text: "What did you first notice about me when we met?", level: 'sweet' },
  { text: "What's your happiest memory of us together?", level: 'sweet' },
  { text: "What do I do that makes you feel most safe?", level: 'sweet' },
  { text: "When do you feel most proud of our relationship?", level: 'sweet' },
  { text: "What's something small I do that means more than I probably know?", level: 'sweet' },
  { text: "What's something about me that genuinely surprised you?", level: 'sweet' },
  { text: "What's a moment from our relationship you wish you could relive?", level: 'sweet' },
  { text: "What's something I've done that you've never properly thanked me for?", level: 'sweet' },
  // Flirty
  { text: "What's your favorite physical feature of mine?", level: 'flirty' },
  { text: "When did you last think about me in a romantic way?", level: 'flirty' },
  { text: "What's the most attractive thing I do without realizing it?", level: 'flirty' },
  { text: "What's the first thing you think about when I walk into a room?", level: 'flirty' },
  { text: "What's a compliment you've wanted to give me but haven't yet?", level: 'flirty' },
  { text: "What do I wear that you love the most?", level: 'flirty' },
  { text: "What's something I've done recently that you found irresistible?", level: 'flirty' },
  { text: "When have I been at my most attractive to you?", level: 'flirty' },
  { text: "What part of me do you find yourself looking at most?", level: 'flirty' },
  { text: "What's something you'd love me to do more of?", level: 'flirty' },
  // Spicy
  { text: "What's something you've thought about but never asked for?", level: 'spicy' },
  { text: "What's your favorite intimate memory of us — describe it.", level: 'spicy' },
  { text: "What's one thing you'd want to try that we haven't yet?", level: 'spicy' },
  { text: "What time or place has felt especially exciting to you?", level: 'spicy' },
  { text: "What's the boldest thing you've ever wanted to say to me?", level: 'spicy' },
  { text: "What would you want our perfect evening to look like in full detail?", level: 'spicy' },
  { text: "Is there a fantasy you've been curious about?", level: 'spicy' },
  { text: "What's one thing I could do that would drive you completely wild?", level: 'spicy' },
  { text: "What do you find most exciting about our physical relationship?", level: 'spicy' },
  { text: "What's something you've wanted to tell me but felt shy about?", level: 'spicy' },
];
