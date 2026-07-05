# Love Desire — App Overview

A private couples app for intimacy, connection, and playful exploration. Built with Expo + Firebase.

---

## The 4 tabs

### 🏠 Home
The daily pulse of your relationship.

- **Couple card** — both partners' avatars, days together, and today's mood
- **How are you feeling?** — 10 mood emojis (Happy, In love, Kinky, Horny etc.). Partner sees your mood in real time
- **Jump in** — quick links to the most-used features

---

### ✅ Together
A shared to-do list, always in sync.

- 4 categories: 🏠 Daily Life · 💑 Date Ideas · 🔥 Intimacy · 🌟 Goals
- Both partners can add, check off, and delete items
- Changes appear instantly on both phones

---

### 🧭 Discover
Games and challenges for the two of you.

#### Games
| Feature | What it does |
|---------|-------------|
| 🎯 **Truth or Dare** | Two modes: "Together Right Here" (one phone, quick dare spin) and "Wherever You Are" (two phones, turn-based with audio answers, works great LDR). Truths **311** + Dares **189** across Sweet / Flirty / Spicy |
| 💬 **Questions Game** | 3/day per category, private answers, reveal when both answered. **474** questions across Playful (free), Deep and Spicy (paid) |
| 🆚 **Versus** | Guess your partner's binary answers from Questions Game history |
| 🤔 **Would You Rather** | Simultaneous answer reveal. **191** questions across Playful / Romantic / Spicy |
| 🃏 **Activity Cards** | 25 face-down cards per month. Turn-based reveal with passes system |
| ✨ **Fantasy Wishes** | Explicit double-blind voting on **394** presets. Only mutual Yes ever surfaces |
| 🌹 **Daily Picks** | 5 new picks per day per category. Mutual Yes → adds to Together List |
| 🎰 **Date Night Roulette** | Spin for one of **130** date ideas (home / out / adventure, LDR virtual filter) |

#### Challenges
| Feature | What it does |
|---------|-------------|
| 🗓️ **30-Day Challenge** | 4 programs × 30 daily tasks. Before starting: each partner can swap 2 days. During: 2 veto days each. Programs: Reconnect / Spark / Fire / Desire (18+) |
| 🎰 **Date Night Roulette** | Spin for a date idea. 48 ideas across Home / Out / Adventure |

---

### 💕 Love
Deeper connection tools.

#### Intimacy
| Feature | What it does |
|---------|-------------|
| 🧬 **Erotic Blueprint Quiz** | 15 questions → one of 5 types (Sensual, Sexual, Energetic, Kinky, Shapeshifter). When both complete it: shows partner's type + full compatibility guidance (summary, challenge, 3 tips) |
| 🫁 **Sensate Focus** | 3-stage guided touch sessions from sex therapy (Masters & Johnson). With timer and rotating prompts |

#### Connection
| Feature | What it does |
|---------|-------------|
| 💌 **Love Notes** | Write a timed note. Choose when it unlocks (tonight, tomorrow morning, this weekend, in 1 week). Partner gets a push notification |
| 📸 **Memories** | Private shared photo album with captions |
| ⏳ **Countdowns** | Track important dates — anniversaries, trips, milestones |
| 🔔 **Flirt Reminders** | Scheduled daily nudges sent as real push notifications |

#### Insights
| Feature | What it does |
|---------|-------------|
| 💬 **Love Language Quiz** | 10 questions → your love language (Words / Acts / Gifts / Time / Touch) |
| 🌡️ **Relationship Pulse** | Private satisfaction check-in. 10 dimensions rated 1-5. Gives a suggestion based on your lowest score |

---

## Push notifications

Partner is notified when you:
- Set your daily mood
- Send a Love Note
- Mark a Challenge day done
- Create a Wishlist or Fantasy match

Flirt Reminders fire as scheduled local notifications at the time and days you set.

---

## Tech stack

- **Expo SDK 54** + TypeScript + Expo Router v6 (file-based routing)
- **Firebase** — Auth + Firestore (real-time listeners throughout)
- **expo-notifications** — local scheduling + Expo Push Service for partner notifications
- **expo-image** / **expo-image-picker** for photos

---

## Development

```bash
npm start          # Expo dev server
npm run web        # Browser preview (fastest)
npx tsc --noEmit   # Type check
```

Install packages with `--legacy-peer-deps` due to react-dom peer conflict.
