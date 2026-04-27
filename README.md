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
| 🎲 **Dare Wheel** | Spin for one dare — Sweet / Flirty / Spicy. 90 dares total |
| 💬 **Questions Game** | Card game where both answer. 6 categories, 120 questions (Fun, Deep, Romantic, Spicy, Therapy, Fantasy) |
| 🃏 **Truth or Dare Together** | Turn-based 2-player game. Choose Truth or Dare each round |
| ✨ **Fantasy Match** | Double-blind — rate 60 fantasy scenarios privately. Only mutual Yes is ever revealed |
| 🌹 **Shared Wishlist** | Same double-blind system for 60 shared experience wishes |

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
