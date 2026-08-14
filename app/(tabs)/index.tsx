import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useCouple } from '../../hooks/useCouple';
import { logout } from '../../services/authService';
import { notifyPartner } from '../../services/notificationService';
import { ALL_MOODS, MOOD_LABELS, MoodEmoji, setMood, getTodaysMood, subscribeToMoods, MoodEntry } from '../../services/moodService';
import { subscribeChallenge, ChallengeState } from '../../services/challengeService';
import { subscribeSensateProgress, SensateProgress } from '../../services/sensateService';
import { subscribeNotes, LoveNote, unlockMoodNotes, unlockVisitNotes } from '../../services/noteService';
import { subscribeFantasyWishes, FantasyWishesItem, isFWMatch } from '../../services/fantasyWishesService';
import { subscribeDailyQuestions, DailyQuestionDoc } from '../../services/dailyQuestionsService';
import { subscribeDailyWishes, DailyWishDoc } from '../../services/dailyWishService';
import { subscribeWYR, WYRSession } from '../../services/wyrService';
import { subscribeIntimacyLog, IntimacyEntry } from '../../services/intimacyService';
import { SparkEntry, SPARK_OPTIONS, subscribeRecentSparks, sendSpark, markSparkSeen } from '../../services/sparkService';
import { FlashEntry, subscribeFlashes, formatCountdown } from '../../services/flashService';
import { MomentEntry, subscribeMoments } from '../../services/momentService';
import { ActivityCardsSession, subscribeActivityCards } from '../../services/bingoService';
import { Dare, subscribeDares } from '../../services/dareService';
import { Todo, subscribeTodos } from '../../services/todoService';
import { Memory, subscribeMemories } from '../../services/memoryService';
import {
  StateUnionDoc,
  subscribeStateUnion,
  getCurrentWeekId,
  answeredCount as suAnsweredCount,
  hasUserCompleted as suHasUserCompleted,
} from '../../services/stateUnionService';
import { CHALLENGE_PROGRAM_CONFIG, LOVE_LANGUAGE_LABELS, LoveLanguage } from '../../constants/content';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';
import { PartnerAvatar } from '../../components/PartnerAvatar';
import { useTrackScreen } from '../../hooks/useTrackScreen';
import { trackEvent } from '../../services/statsService';

// Personalised greeting when the user has a name on their profile —
// warmer first impression than a generic salutation. Falls back to the
// bare greeting during onboarding before a name is set.
function getGreeting(name?: string): string {
  const h = new Date().getHours();
  const base = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `${base}, ${firstName}` : base;
}

function getTogetherSince(couple: { createdAt: number; startDate?: number }): string {
  const from = couple.startDate ?? couple.createdAt;
  return new Date(from).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function getAnniversary(couple: { createdAt: number; startDate?: number }): { dateLabel: string; daysUntil: number; years: number } {
  const from = couple.startDate ?? couple.createdAt;
  const start = new Date(from);
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), start.getMonth(), start.getDate());
  const next = thisYear >= now ? thisYear : new Date(now.getFullYear() + 1, start.getMonth(), start.getDate());
  const daysUntil = Math.ceil((next.getTime() - now.getTime()) / 86400000);
  const years = next.getFullYear() - start.getFullYear();
  const dateLabel = next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return { dateLabel, daysUntil, years };
}

// Returns next-visit countdown info, or null if no date set / already past
function getNextVisit(nextVisitDate?: number): { dateLabel: string; daysUntil: number } | null {
  if (!nextVisitDate) return null;
  const target = new Date(nextVisitDate);
  const now = new Date();
  const daysUntil = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  if (daysUntil < 0) return null;
  const dateLabel = target.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return { dateLabel, daysUntil };
}

type LangTip = { tip: string; cta: string; route: string };

// LDR-specific tips that rotate into the insight card when the couple is
// long distance. These sit alongside (not replacing) love-language tips so
// LDR pairs see genuinely distance-aware suggestions on some days.
const LDR_TIPS: LangTip[] = [
  { tip: `Send your partner a morning spark with your first coffee.`, cta: 'Send a spark', route: '/(tabs)?openSpark=1' },
  { tip: `Video call over dinner tonight, one candle each.`, cta: '', route: '' },
  { tip: `Watch the same episode at the same time, hit play together.`, cta: '', route: '' },
  { tip: `Send a voice note instead of a text today. Your voice lands differently.`, cta: 'Open Tease', route: '/flashes' },
  { tip: `Sync your calendars for next weekend, pick one thing to look forward to.`, cta: 'Open Special Days', route: '/calendar' },
  { tip: `Cook the same recipe tonight, video-call while you eat.`, cta: '', route: '' },
  { tip: `Write a Love Note timed to unlock tomorrow morning.`, cta: 'Write a Love Note', route: '/notes' },
  { tip: `Share a short playlist of what's been on repeat for you this week.`, cta: '', route: '' },
];

// Daily-rotating tips per partner's love language. Picks one per day based on day-of-year.
function getLanguageTip(language: string | undefined, partnerName: string): LangTip | null {
  if (!language) return null;
  const day = Math.floor(Date.now() / 86400000);
  const tipsByLanguage: Record<string, LangTip[]> = {
    words: [
      { tip: `Tell ${partnerName} one specific thing you love about who they are.`, cta: 'Write a Love Note', route: '/notes' },
      { tip: `Send ${partnerName} a voice note. Hearing it lands differently than reading it.`, cta: 'Open Tease', route: '/flashes' },
      { tip: `Send a spark with words that name what you appreciate today.`, cta: 'Send a spark', route: '/(tabs)?openSpark=1' },
      { tip: `Answer a question in Daily today with words ${partnerName} hasn't heard yet.`, cta: 'Open Daily', route: '/daily' },
    ],
    acts: [
      { tip: `Do one small thing for ${partnerName} they didn't ask for. Notice what.`, cta: 'Add to Together List', route: '/todo' },
      { tip: `Take one task off ${partnerName}'s plate today. Don't announce it.`, cta: 'Open list', route: '/todo' },
      { tip: `Plan a small surprise. Acts of Service is felt in unprompted effort.`, cta: 'Open Special Days', route: '/calendar' },
    ],
    gifts: [
      { tip: `It's the thought, not the price. Send ${partnerName} a Tease photo of something that made you think of them today.`, cta: 'Send a Tease', route: '/flashes' },
      { tip: `Schedule a Love Note unlocked for tonight with one specific thing you got ${partnerName} in mind.`, cta: 'Write a Love Note', route: '/notes' },
      { tip: `Pick something from Playful in Daily and treat it like a small gift today.`, cta: 'Open Daily', route: '/daily?category=playful' },
    ],
    time: [
      { tip: `Carve out 30 phone-free minutes with ${partnerName} today. Save it in Special Days so it's real.`, cta: 'Open Special Days', route: '/calendar' },
      { tip: `Do a slow Sunday Check-in tonight. Quality time is the love language and the check-in lives there.`, cta: 'Start the check-in', route: '/state-union' },
      { tip: `Spin Tonight's Date together. Pick something that lasts longer than dinner.`, cta: 'Draw a date', route: '/roulette' },
      { tip: `Play Daily tonight. Three questions, no phones, eye contact.`, cta: 'Open Daily', route: '/daily' },
    ],
    touch: [
      { tip: `Try a Sensate Focus stage tonight. Touch without goal is exactly ${partnerName}'s language.`, cta: 'Open Sensate', route: '/sensate' },
      { tip: `Long hug today. 20 seconds at least. Don't talk during it.`, cta: '', route: '' },
      { tip: `Hands on, eye contact, slow. Pick one Dare from Sweet level for tonight.`, cta: 'Open Truth or Dare', route: '/truth-dare' },
    ],
  };
  const tips = tipsByLanguage[language];
  if (!tips || tips.length === 0) return null;
  return tips[day % tips.length];
}

// Format time in a given IANA timezone, returns "HH:MM" or null if invalid
function timeInZone(tz?: string): string | null {
  if (!tz) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  } catch {
    return null;
  }
}

// Local hour (0-23) in the given IANA timezone, or null if unknown.
function hourInZone(tz?: string): number | null {
  if (!tz) return null;
  try {
    const hs = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date());
    const n = parseInt(hs, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// Overlap window when both partners are typically awake, based on a naive
// 07:00-23:00 awake day. Returns a "HH:00 - HH:00 your time" string for the
// partner-awake window projected onto the local clock, or null if there is
// no overlap or timezones are missing / identical.
function getOverlapWindow(myTz?: string, partnerTz?: string): string | null {
  if (!myTz || !partnerTz || myTz === partnerTz) return null;
  const myH = hourInZone(myTz);
  const pH = hourInZone(partnerTz);
  if (myH === null || pH === null) return null;
  // Partner's local hours 07..22 (inclusive) = awake. Convert each hour to
  // "my clock" by adding the timezone diff (myH - pH).
  const diff = myH - pH;
  const awakePartnerHoursMine: number[] = [];
  for (let h = 7; h <= 22; h++) {
    const mine = ((h + diff) % 24 + 24) % 24;
    awakePartnerHoursMine.push(mine);
  }
  // Intersect with my awake window 07..22.
  const mineAwake = new Set<number>();
  for (let h = 7; h <= 22; h++) mineAwake.add(h);
  const overlap = awakePartnerHoursMine.filter((h) => mineAwake.has(h)).sort((a, b) => a - b);
  if (overlap.length === 0) return null;
  // Detect largest contiguous run so we don't format a disjoint set.
  let bestStart = overlap[0], bestEnd = overlap[0];
  let curStart = overlap[0], curEnd = overlap[0];
  for (let i = 1; i < overlap.length; i++) {
    if (overlap[i] === curEnd + 1) {
      curEnd = overlap[i];
    } else {
      if (curEnd - curStart > bestEnd - bestStart) { bestStart = curStart; bestEnd = curEnd; }
      curStart = overlap[i]; curEnd = overlap[i];
    }
  }
  if (curEnd - curStart > bestEnd - bestStart) { bestStart = curStart; bestEnd = curEnd; }
  const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return `${pad(bestStart)} – ${pad(bestEnd + 1)}`;
}

// Days apart proxy: uses couple.createdAt as an anchor for "since we joined
// as a couple", or nextVisitDate (past) as "since we last saw each other"
// when set. Returns null if we don't have a useful anchor.
function getDaysApart(createdAt?: number, nextVisitDate?: number): number | null {
  const anchor = nextVisitDate && nextVisitDate < Date.now() ? nextVisitDate : createdAt;
  if (!anchor) return null;
  const days = Math.floor((Date.now() - anchor) / 86400000);
  return days > 0 ? days : null;
}

interface NudgeItem {
  emoji: string;
  title: string;
  subtitle: string;
  route: string;
  bg: string;
}


export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { couple, partner, loading: coupleLoading } = useCouple(user?.uid, profile?.coupleId);
  const { isSubscribed } = useSubscription();
  useTrackScreen('home');
  const ADULT_MOODS: MoodEmoji[] = ['😈', '🥵'];
  const visibleMoods = ALL_MOODS.filter(m => isSubscribed || !ADULT_MOODS.includes(m));

  const [myMood, setMyMood] = useState<MoodEntry | null>(null);
  const [partnerMood, setPartnerMood] = useState<MoodEntry | null>(null);

  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [fwItems, setFwItems] = useState<FantasyWishesItem[]>([]);
  const [dailyQDoc, setDailyQDoc] = useState<DailyQuestionDoc | null>(null);
  const [dailyWishDoc, setDailyWishDoc] = useState<DailyWishDoc | null>(null);
  const [wyrSession, setWyrSession] = useState<WYRSession | null>(null);
  const [intimacyEntries, setIntimacyEntries] = useState<IntimacyEntry[]>([]);
  const [recentSparks, setRecentSparks] = useState<SparkEntry[]>([]);
  const [sparkSent, setSparkSent] = useState(false);
  const [showSparkPicker, setShowSparkPicker] = useState(false);
  // Support `?openSpark=1` deep link so tips or nudges elsewhere in the
  // app can navigate Home and pop the Spark picker in one step. Uses a
  // ref to fire once per param arrival, so navigating away and back
  // doesn't re-open the modal repeatedly.
  const params = useLocalSearchParams<{ openSpark?: string }>();
  const openSparkHandledRef = useRef<string | null>(null);
  useEffect(() => {
    const flag = params?.openSpark ?? null;
    if (flag && openSparkHandledRef.current !== flag) {
      openSparkHandledRef.current = flag;
      setShowSparkPicker(true);
    }
  }, [params?.openSpark]);

  // "Insight for you" dismiss-for-the-day. Once the user taps the CTA,
  // hide the card until midnight local so the day feels closed. Uses
  // AsyncStorage so the dismissal survives app relaunches within the
  // same day. Per-device (no partner sync needed — each partner has
  // their own home).
  const INSIGHT_DISMISS_KEY = 'insight_dismissed_date';
  const todayLocalYmd = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [insightDismissedToday, setInsightDismissedToday] = useState(false);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(INSIGHT_DISMISS_KEY).then((val) => {
      if (cancelled) return;
      if (val && val === todayLocalYmd()) setInsightDismissedToday(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const dismissInsightForToday = () => {
    setInsightDismissedToday(true);
    AsyncStorage.setItem(INSIGHT_DISMISS_KEY, todayLocalYmd()).catch(() => {});
  };
  const [memories, setMemories] = useState<Memory[]>([]);
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);
  const [moments, setMoments] = useState<MomentEntry[]>([]);
  const [suDoc, setSuDoc] = useState<StateUnionDoc | null>(null);
  const [bingoSession, setBingoSession] = useState<ActivityCardsSession | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [sensateProgress, setSensateProgress] = useState<SensateProgress | null>(null);
  const [dares, setDares] = useState<Dare[]>([]);

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  // Mood subscription
  useEffect(() => {
    if (!user || !coupleId) return;
    getTodaysMood(coupleId, user.uid).then(setMyMood);
    const unsub = subscribeToMoods(coupleId, (moods) => {
      setMyMood(moods.find((m) => m.uid === user.uid) ?? null);
      setPartnerMood(moods.find((m) => m.uid !== user.uid) ?? null);
    });
    return unsub;
  }, [user, coupleId]);

  // Activity subscriptions for nudges
  useEffect(() => {
    if (!coupleId) return;
    const u1 = subscribeChallenge(coupleId, setChallengeState);
    const u2 = subscribeNotes(coupleId, setNotes);
    const u3 = subscribeFantasyWishes(coupleId, setFwItems);
    const u4 = subscribeDailyQuestions(coupleId, setDailyQDoc, { isLDR: !!couple?.isLongDistance });
    const u5 = subscribeDailyWishes(coupleId, setDailyWishDoc);
    const u6 = subscribeWYR(coupleId, setWyrSession);
    const u7 = subscribeIntimacyLog(coupleId, setIntimacyEntries);
    const u8 = subscribeRecentSparks(coupleId, setRecentSparks);
    const u10 = subscribeMemories(coupleId, setMemories);
    const u11 = subscribeFlashes(coupleId, setFlashes);
    const u12 = subscribeMoments(coupleId, setMoments);
    const u13 = subscribeStateUnion(coupleId, getCurrentWeekId(), setSuDoc);
    const u14 = subscribeActivityCards(coupleId, user?.uid ?? '', setBingoSession);
    const u15 = subscribeTodos(coupleId, setTodos);
    const u16 = subscribeSensateProgress(coupleId, setSensateProgress);
    const u17 = subscribeDares(coupleId, setDares);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); u10(); u11(); u12(); u13(); u14(); u15(); u16(); u17(); };
  }, [coupleId, couple?.isLongDistance, user?.uid]);

  const handleSendSpark = async (emoji: string, message: string) => {
    if (!coupleId || !partnerId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSparkSent(true);
    await sendSpark(coupleId, uid, emoji, message);
    notifyPartner(coupleId, uid, `${profile?.name ?? 'Your partner'} sent you love ❤️`, `${emoji} ${message}`).catch(() => {});
    setTimeout(() => setSparkSent(false), 3000);
  };

  // Incoming spark from partner (unseen, last 24h)
  const incomingSpark = useMemo(
    () => recentSparks.find(s => s.fromUid !== uid && !s.seen && (Date.now() - s.createdAt) < 86400000) ?? null,
    [recentSparks, uid]
  );


  const handleMoodPick = async (emoji: MoodEmoji) => {
    if (!user || !coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await setMood(coupleId, user.uid, emoji);
      trackEvent('mood_set');
      setMyMood({ id: 'optimistic', uid: user.uid, emoji, createdAt: Date.now() });
      notifyPartner(coupleId, user.uid, 'New mood 💫', `${profile?.name ?? 'Your partner'} is feeling ${emoji} ${MOOD_LABELS[emoji]}`).catch(() => {});
      unlockMoodNotes(coupleId, user.uid, emoji).catch(() => {});
    } catch (e) {
      console.error('setMood failed:', e);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const isConnected = !!couple?.partner2Uid;
  const togetherSince = useMemo(() => (couple ? getTogetherSince(couple) : ''), [couple]);
  const anniversary = useMemo(() => (couple ? getAnniversary(couple) : null), [couple]);
  const isLDR = !!couple?.isLongDistance;

  // When the next visit date has arrived (or passed), unlock any "When I arrive" notes
  useEffect(() => {
    if (!coupleId || !uid || !couple?.nextVisitDate) return;
    if (couple.nextVisitDate <= Date.now()) {
      unlockVisitNotes(coupleId, uid).catch(() => {});
    }
  }, [coupleId, uid, couple?.nextVisitDate]);
  const nextVisit = useMemo(() => getNextVisit(couple?.nextVisitDate), [couple?.nextVisitDate]);
  // Show both pills only if both events fall within 60 days; otherwise show whichever is closer
  // Next-visit pill is only meaningful in LDR mode. Even if nextVisitDate is still
  // set in Firestore from when LDR was on, the user has turned it off — hide it.
  const visibleNextVisit = isLDR ? nextVisit : null;
  const showBothEvents = !!(anniversary && visibleNextVisit && anniversary.daysUntil <= 60 && visibleNextVisit.daysUntil <= 60);
  const showNextVisitOnly = !!visibleNextVisit && (!anniversary || (!showBothEvents && visibleNextVisit.daysUntil <= anniversary.daysUntil));
  const showAnniversaryOnly = !!anniversary && (!visibleNextVisit || (!showBothEvents && anniversary.daysUntil < visibleNextVisit.daysUntil));
  const myTimezone = isLDR ? timeInZone(profile?.timezone) : null;
  const partnerTimezone = isLDR ? timeInZone(partner?.timezone) : null;
  // LDR ambient status: days-apart proxy + overlap window between the two
  // awake days. Both derived from cheap computations, no extra queries.
  const daysApart = isLDR ? getDaysApart(couple?.createdAt, couple?.nextVisitDate) : null;
  const overlapWindow = isLDR ? getOverlapWindow(profile?.timezone, partner?.timezone) : null;

  // Build nudge items (memoized — only rebuilds when one of the sources actually changes)
  const nudges = useMemo<NudgeItem[]>(() => {
    const list: NudgeItem[] = [];

    // Challenge: partner marked today but user hasn't
    if (challengeState?.phase === 'active' && partnerId) {
    const day = challengeState.currentDay;
    // completedBy entries can be a plain uid (marked done) or `veto:<uid>` (vetoed).
    // Match strictly by partnerId so the user doesn't see "your turn" when THEY
    // vetoed the day themselves — previously `id.startsWith('veto:')` matched
    // any veto regardless of author.
    const iMarked = (challengeState.completedBy[day] ?? []).some(id => id === uid || id === `veto:${uid}`);
    const partnerMarked = (challengeState.completedBy[day] ?? []).some(id => id === partnerId || id === `veto:${partnerId}`);
    if (partnerMarked && !iMarked) {
      const cfg = challengeState.program ? CHALLENGE_PROGRAM_CONFIG[challengeState.program] : null;
      list.push({
        emoji: cfg?.emoji ?? '🗓️',
        title: `Challenge day ${day}`,
        subtitle: `${partner?.name ?? 'Partner'} marked it done, your turn ✓`,
        route: '/challenge',
        bg: cfg?.color ?? '#FFF9C4',
      });
    }
  }

  // Love Notes: unread notes ready to open. Differentiates voice notes
  // (🎤 + "voice message" copy) so they read distinctly from text notes
  // in the nudge stack. "Just unlocked" phrasing on very recent unlocks
  // (<5 min) creates the moment-of-magic the silent unlock would otherwise
  // miss — user picks mood, comes back to Home, sees "🎤 just unlocked".
  const readyNotes = notes.filter(n => n.fromUid !== uid && Date.now() >= n.openAt && !n.opened);
  if (readyNotes.length > 0) {
    const hasVoice = readyNotes.some((n) => n.mediaType === 'voice');
    const justUnlocked = readyNotes.some((n) => Date.now() - n.openAt < 5 * 60 * 1000);
    const mediaWord = hasVoice
      ? (readyNotes.length > 1 ? 'messages' : 'A voice message')
      : (readyNotes.length > 1 ? `${readyNotes.length} messages` : 'A message');
    const verb = justUnlocked ? 'just unlocked' : 'is ready';
    list.push({
      emoji: hasVoice ? '🎤' : '💌',
      title: hasVoice
        ? `Voice note${readyNotes.length > 1 ? 's' : ''} waiting`
        : `Love note${readyNotes.length > 1 ? 's' : ''} waiting`,
      subtitle: `${mediaWord} from ${partner?.name ?? 'your partner'} ${verb}`,
      route: '/notes',
      bg: Colors.blush,
    });
  }

  // Async Dares — pending dares for me (partner sent a challenge) and
  // recently-completed dares from partner (they just did the thing you dared
  // them to). Both drive back to /dares. Pending count in title lets user
  // triage without opening.
  const pendingDaresForMe = dares.filter((d) => d.toUid === uid && d.status === 'pending');
  const freshlyCompletedFromPartner = dares.filter((d) =>
    d.fromUid === uid && d.status === 'completed' && d.completedAt && Date.now() - d.completedAt < 24 * 3600000
  );
  if (pendingDaresForMe.length > 0) {
    const first = pendingDaresForMe[0];
    list.push({
      emoji: '🎁',
      title: pendingDaresForMe.length > 1
        ? `${pendingDaresForMe.length} dares from ${partner?.name ?? 'your partner'}`
        : `A dare from ${partner?.name ?? 'your partner'}`,
      subtitle: first.prompt.length > 60 ? first.prompt.slice(0, 57) + '...' : first.prompt,
      route: '/dares',
      bg: '#FFF3E0',
    });
  }
  if (freshlyCompletedFromPartner.length > 0) {
    list.push({
      emoji: '🎉',
      title: `${partner?.name ?? 'Your partner'} completed your dare`,
      subtitle: freshlyCompletedFromPartner.length > 1
        ? `${freshlyCompletedFromPartner.length} of your dares, tap to see`
        : 'Tap to see how it went',
      route: '/dares',
      bg: '#F3E5F5',
    });
  }

  // Fantasy Wishes: any mutual matches
  const fwMatches = fwItems.filter(i => partnerId && isFWMatch(i, uid, partnerId));
  if (fwMatches.length > 0) {
    list.push({
      emoji: '✨',
      title: `${fwMatches.length} ${fwMatches.length === 1 ? 'match' : 'matches'}`,
      subtitle: 'You both want the same thing, tap to see',
      route: '/fantasy-wishes',
      bg: '#F3E5F5',
    });
  }

  // Daily (unified): partner has ANSWERED or VOTED on items user hasn't
  // touched. Replaces two prior nudges (Questions Game + Daily Picks) that
  // now share a route.
  //
  // Two fixes bundled with the merge:
  //  1. Old Q nudge triggered on `discussed[partnerId]` — but the UI never
  //     exposed a "mark discussed" action anywhere, so the trigger key
  //     was set only by legacy code paths and the nudge effectively rarely
  //     fired. Switched to `answers` which is what users actually produce.
  //  2. Old DP nudge fired when `myVoteCount < 20` — schema is only 15
  //     items per day, so any partial voter got stuck-nudged forever.
  //     Switched to a per-item "did partner touch this, did I not" diff
  //     which naturally clears once caller catches up.
  //
  // Route has no ?category= — /daily's auto-selector picks the cat where
  // partner is ahead (questions ranked above actions), so the tap lands on
  // the most-urgent cat without the nudge itself having to decide.
  if (partnerId) {
    let questionsAhead = 0;
    if (dailyQDoc) {
      const partnerAns = dailyQDoc.answers?.[partnerId] ?? {};
      const myAns = dailyQDoc.answers?.[uid] ?? {};
      questionsAhead = Object.keys(partnerAns).filter((k) => !(k in myAns)).length;
    }
    let picksAhead = 0;
    if (dailyWishDoc) {
      const partnerVotes = dailyWishDoc.votes[partnerId] ?? {};
      const myVotes = dailyWishDoc.votes[uid] ?? {};
      picksAhead = Object.keys(partnerVotes).filter((k) => !(k in myVotes)).length;
    }
    if (questionsAhead > 0 || picksAhead > 0) {
      const parts: string[] = [];
      if (questionsAhead > 0) parts.push(`${questionsAhead} question${questionsAhead === 1 ? '' : 's'}`);
      if (picksAhead > 0) parts.push(`${picksAhead} pick${picksAhead === 1 ? '' : 's'}`);
      list.push({
        emoji: '💫',
        title: 'Daily is waiting',
        subtitle: `${partner?.name ?? 'Partner'} is ahead by ${parts.join(' + ')} today`,
        route: '/daily',
        bg: Colors.blush,
      });
    }
  }

  // Sensate Focus: gently surface a return-to prompt if the couple has
  // done at least one cycle (proves they engaged with it) but hasn't
  // touched any stage in a while. Threshold: 14 days of quiet since the
  // most recent session across any stage. Only fires when cyclesCompleted
  // >= 1 so first-time users aren't pushed toward a paid feature they
  // haven't opted into.
  if (sensateProgress && (sensateProgress.cyclesCompleted ?? 0) >= 1) {
    const dates = [sensateProgress.stage1.lastDate, sensateProgress.stage2.lastDate, sensateProgress.stage3.lastDate]
      .filter(Boolean)
      .sort()
      .reverse();
    const mostRecent = dates[0];
    if (mostRecent) {
      const daysSince = Math.floor((Date.now() - new Date(mostRecent).getTime()) / 86400000);
      if (daysSince >= 14) {
        list.push({
          emoji: '🫁',
          title: 'Sensate Focus',
          subtitle: `${daysSince} days since your last session, consider returning`,
          route: '/sensate',
          bg: '#FAEEF2',
        });
      }
    }
  }

  // Fantasy Wishes: partner has voted on items you haven't seen yet.
  // Suppressed when the matches nudge above already fires — same
  // destination, same emoji, so two ✨ cards in a row was pure noise.
  // Matches nudge wins because it's the higher-value signal (a specific
  // reward to claim vs an ambient "keep going" hint).
  if (partnerId && fwItems.length > 0 && fwMatches.length === 0) {
    const partnerVoted = fwItems.filter(i => !!i.votes[partnerId]).length;
    const myVoted = fwItems.filter(i => !!i.votes[uid]).length;
    if (partnerVoted > myVoted) {
      list.push({
        emoji: '✨',
        title: 'Fantasy Wishes',
        subtitle: `${partner?.name ?? 'Partner'} is exploring, vote to find your matches`,
        route: '/fantasy-wishes',
        bg: '#F3E5F5',
      });
    }
  }

  // Would You Rather: partner answered but I haven't
  if (wyrSession && partnerId) {
    const partnerAnswered = !!wyrSession.answers[partnerId];
    const iAnswered = !!wyrSession.answers[uid];
    if (partnerAnswered && !iAnswered) {
      list.push({
        emoji: '🤔',
        title: 'Would You Rather',
        subtitle: `${partner?.name ?? 'Partner'} picked, now it's your turn`,
        route: '/would-you-rather',
        bg: '#FFF9C4',
      });
    }
  }

  // Smart intimacy nudge — only if feature enabled AND entries exist AND > 7 days ago
  if (profile?.features?.intimacyLog && partnerId && intimacyEntries.length > 0) {
    const last = intimacyEntries[0].createdAt;
    const daysSince = Math.floor((Date.now() - last) / 86400000);
    if (daysSince >= 7) {
      // Priority 1: mutual Fantasy Wish
      const fwMatch = fwItems.find(i => isFWMatch(i, uid, partnerId));
      // Priority 2: shared Daily Pick today
      const myVotes = (dailyWishDoc?.votes[uid] ?? {}) as Record<string, string>;
      const partnerVotes = (dailyWishDoc?.votes[partnerId] ?? {}) as Record<string, string>;
      const sharedPick = Object.keys(myVotes).find(k => myVotes[k] === 'yes' && partnerVotes[k] === 'yes') ?? null;

      const subtitle = fwMatch
        ? `You both want to try something from your Fantasy Wishes — maybe tonight?`
        : sharedPick
        ? `You both picked something today — why not make it happen?`
        : `It's been ${daysSince} days — some time together tonight?`;

      list.push({
        emoji: '💝',
        title: 'Intimate moment',
        subtitle,
        route: '/intimacy-tracker',
        bg: '#FFF0F3',
      });
    }
  }

  // Moments: show daily prompt if user hasn't captured today yet
  const today = new Date().toISOString().slice(0, 10);
  const todayMoment = moments.find(m => m.date === today);
  const partnerCapturedToday = !!(todayMoment && partnerId && todayMoment.photos?.[partnerId]);
  const iCapturedToday = !!(todayMoment && todayMoment.photos?.[uid]);
  if (!iCapturedToday) {
    list.push({
      emoji: '📸',
      title: partnerCapturedToday
        ? `${partner?.name ?? 'Partner'} captured today's moment`
        : "Capture today's moment",
      subtitle: partnerCapturedToday
        ? 'Take yours to reveal both photos'
        : 'Both of you take a photo, reveal together',
      route: '/moments',
      bg: Colors.blush,
    });
  }

  // Year in Review window (Dec 28 → Jan 7) — surface the recap
  {
    const today = new Date();
    const m = today.getMonth();
    const d = today.getDate();
    const inWindow = (m === 11 && d >= 28) || (m === 0 && d <= 7);
    if (inWindow && partnerId) {
      const yearTitle = m === 11 ? today.getFullYear() : today.getFullYear() - 1;
      list.unshift({
        emoji: '✨',
        title: `Your ${yearTitle} Year in Review`,
        subtitle: 'Swipeable cards · screenshot to share',
        route: '/year-in-review',
        bg: '#FFF4E8',
      });
    }
  }

  // Together List — partner suggested an item and is waiting for my accept/reject
  const pendingTodos = todos.filter((t) => t.status === 'pending' && t.createdBy !== uid);
  if (pendingTodos.length > 0) {
    list.push({
      emoji: '✨',
      title: `${partner?.name ?? 'Partner'} suggested ${pendingTodos.length === 1 ? 'something' : `${pendingTodos.length} things`}`,
      subtitle: pendingTodos.length === 1 ? `"${pendingTodos[0].text.slice(0, 60)}"` : 'Accept or decline in Together List',
      route: '/todo',
      bg: '#FFF4E8',
    });
  }

  // Activity Cards (Bingo) — partner picked a card and I'm the receiver.
  // Use typeof number check to guard against undefined/null pendingCard
  // (older session docs created before the resetActivityCards fix may not have the field).
  if (bingoSession && partnerId && typeof bingoSession.pendingCard === 'number' && bingoSession.turnUid === uid) {
    const cardText = bingoSession.squares?.[bingoSession.pendingCard] ?? 'a challenge';
    list.push({
      emoji: '🃏',
      title: `${partner?.name ?? 'Partner'} picked a card for you`,
      subtitle: `"${cardText.slice(0, 60)}${cardText.length > 60 ? '...' : ''}"`,
      route: '/bingo',
      bg: Colors.blush,
    });
  }

  // Sunday Check-in (State of the Union) — weekly ritual prompt
  if (partnerId) {
    const iCompleted = suHasUserCompleted(suDoc, uid);
    const partnerCompleted = suHasUserCompleted(suDoc, partnerId);
    const partnerProgress = suAnsweredCount(suDoc, partnerId);
    const today = new Date();
    const isSunday = today.getDay() === 0;
    if (partnerCompleted && !iCompleted) {
      // Partner is waiting for you
      list.push({
        emoji: '💗',
        title: `${partner?.name ?? 'Partner'} finished the Sunday check-in`,
        subtitle: 'Answer 5 questions to reveal both sides',
        route: '/state-union',
        bg: Colors.blush,
      });
    } else if (!iCompleted && partnerProgress > 0) {
      // Partner started but hasn't finished — gentle nudge
      list.push({
        emoji: '💞',
        title: 'Sunday check-in started',
        subtitle: `${partner?.name ?? 'Partner'} is answering — start when you can`,
        route: '/state-union',
        bg: Colors.blush,
      });
    } else if (isSunday && !iCompleted) {
      // It's Sunday and nobody has started — surface the ritual
      list.push({
        emoji: '🌅',
        title: 'Sunday check-in',
        subtitle: '5 questions to keep you close this week',
        route: '/state-union',
        bg: '#FFF0F3',
      });
    }
  }

  // Care package reminder (LDR, first 3 days of each month) — monthly cadence
  if (isLDR && partner?.name) {
    const today = new Date();
    if (today.getDate() <= 3) {
      list.push({
        emoji: '🎁',
        title: 'Care package time?',
        subtitle: `Send ${partner.name} something small in the mail this month`,
        route: '/notes',
        bg: '#FFF4E8',
      });
    }
  }

  // LDR: persistent nudge to set next visit date when none is on file.
  // Complements the couple-card pill above (higher on the screen) so the
  // ask remains visible even after the user has scrolled past the header.
  if (isLDR && !couple?.nextVisitDate) {
    list.push({
      emoji: '✈️',
      title: 'Set your next visit',
      subtitle: 'Unlocks a daily hype nudge for both of you in the run-up',
      route: '/profile',
      bg: '#FFF4E8',
    });
  }

  // Post-visit recovery (LDR, 1-3 days after the last set visit date) — rotating daily prompt.
  // We use the raw nextVisitDate in the past, since getNextVisit() returns null once it's passed.
  if (isLDR && couple?.nextVisitDate && couple.nextVisitDate < Date.now()) {
    const daysSince = Math.floor((Date.now() - couple.nextVisitDate) / 86400000);
    if (daysSince >= 1 && daysSince <= 3) {
      const them = partner?.name ?? 'them';
      const postvisit = [
        { emoji: '✨', title: 'Visit memory drop',          sub: `Share your favorite photos from seeing ${them}`, route: '/moments' },
        { emoji: '📅', title: 'Day 2 apart',               sub: 'Plan one thing to look forward to together this week', route: '/calendar' },
        { emoji: '✈️', title: 'Day 3 apart',               sub: 'Start mapping the dates for your next visit', route: '/calendar' },
      ];
      const p = postvisit[daysSince - 1];
      if (p) list.unshift({ emoji: p.emoji, title: p.title, subtitle: p.sub, route: p.route, bg: Colors.blush });
    }
  }

  // Pre-visit excitement (LDR, 1-7 days before next visit) — rotating daily prompt
  if (isLDR && nextVisit && nextVisit.daysUntil >= 1 && nextVisit.daysUntil <= 7) {
    const them = partner?.name ?? 'them';
    const previsit = [
      { emoji: '💞', title: 'Tomorrow',   sub: `Last sleep before you see ${them}. Leave a note for the morning.`, route: '/notes' },
      { emoji: '✨', title: '2 days',     sub: 'List one thing you want to talk about in person', route: '/notes' },
      { emoji: '🌹', title: '3 days',     sub: "Pick something in Daily you'd both love to try together", route: '/daily?category=playful' },
      { emoji: '📸', title: '4 days',     sub: "Send a teaser of what's coming", route: '/flashes' },
      { emoji: '💌', title: '5 days',     sub: `Write a note for when ${them} arrives`, route: '/notes' },
      { emoji: '🎁', title: '6 days',     sub: `Plan a small surprise for ${them}`, route: '/notes' },
      { emoji: '✈️', title: 'One week',   sub: `Write one thing you're excited to do with ${them}`, route: '/notes' },
    ];
    const p = previsit[nextVisit.daysUntil - 1];
    if (p) list.unshift({ emoji: p.emoji, title: p.title, subtitle: p.sub, route: p.route, bg: Colors.blush });
  }

  // Flashes: unviewed incoming flash from partner
  const incomingFlash = flashes.find(f => f.fromUid !== uid && !f.viewed) ?? null;
  if (incomingFlash) {
    list.unshift({
      emoji: '📸',
      title: `${partner?.name ?? 'Partner'} sent you a tease`,
      subtitle: `Disappears in ${formatCountdown(incomingFlash.expiresAt)} · tap to view`,
      route: '/flashes',
      bg: Colors.blush,
    });
  }

  // Sunday Love-Language ritual — closes the loop for the push notification
  // that fires at Sun 09:00. Any other way of opening the app on Sunday
  // (tab tap, task-switcher return, background push after dismissal) shows
  // nothing without this card. Unshifted so it leads the stack — same tier
  // as the weekly LDR pre/post-visit ritual cards. Partner must have a
  // loveLanguage set; without one there's nothing to speak to.
  const partnerLang = (partner as any)?.loveLanguage as string | undefined;
  if (partnerId && partnerLang && new Date().getDay() === 0) {
    list.unshift({
      emoji: '💕',
      title: `Speak ${partner?.name ?? 'your partner'}'s language today`,
      subtitle: '3 fresh ways to try this week ✨',
      route: '/love-language-nudge',
      bg: Colors.blush,
    });
  }

    return list;
  }, [challengeState, partnerId, partner?.name, (partner as any)?.loveLanguage, uid, notes, fwItems, dailyQDoc, dailyWishDoc, wyrSession, intimacyEntries, profile?.features?.intimacyLog, moments, flashes, isLDR, nextVisit, couple?.nextVisitDate, suDoc, bingoSession, todos, sensateProgress, dares]);

  // ── On this day ───────────────────────────────────────────────────────────────
  const { onThisDay, onThisDayYears } = useMemo(() => {
    const now = new Date();
    const todayMD = `${now.getMonth()}-${now.getDate()}`;
    const found = memories.find(m => {
      const d = new Date(m.createdAt);
      return `${d.getMonth()}-${d.getDate()}` === todayMD && d.getFullYear() < now.getFullYear();
    }) ?? null;
    const years = found ? now.getFullYear() - new Date(found.createdAt).getFullYear() : 0;
    return { onThisDay: found, onThisDayYears: years };
  }, [memories]);

  // ── Onboarding nudges ────────────────────────────────────────────────────────

  // 1. Name missing
  const nameMissing = isConnected && (!profile?.name || profile.name.trim() === '');

  // 2. Start date not set (couple exists but no startDate)
  const startDateMissing = isConnected && couple && !couple.startDate;

  if (coupleLoading || !profile) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingLogo}>Desire</Text>
        <Text style={styles.loadingHeart}>♥</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenWrap}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting(profile?.name)}</Text>
          <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={() => router.push('/profile' as any)} accessibilityRole="button">
          <Text style={styles.signOut}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Partner hero card */}
      {isConnected ? (
        <LinearGradient
          colors={['#7a0b46', '#880E4F', '#6a0a3e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coupleCard}
        >
          <Text style={styles.heartWatermark}>♥</Text>
          <View style={styles.coupleRow}>
            <View style={styles.avatarCol}>
              <View style={styles.avatarRing}>
                <PartnerAvatar name={profile?.name ?? '?'} photoURL={profile?.photoURL} size={64} />
              </View>
              <Text style={styles.avatarNameLight}>{profile?.name}</Text>
              {myTimezone && <Text style={styles.tzClock}>{myTimezone}</Text>}
              <TouchableOpacity style={styles.moodPill} onPress={() => router.push('/mood-history' as any)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Mood history">
                <Text style={styles.moodPillEmoji}>{myMood?.emoji ?? '+'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.middleCol}>
              <Text style={styles.sinceLabel}>together since</Text>
              <Text style={styles.sinceDate}>{togetherSince}</Text>
              {(showBothEvents || showAnniversaryOnly) && anniversary && (
                <View style={styles.anniversaryPill}>
                  <Text style={styles.anniversaryText}>
                    {anniversary.daysUntil <= 1 ? '🎉 Today!' : `🎉 ${anniversary.dateLabel}`}
                  </Text>
                  <Text style={styles.anniversaryDays}>
                    {anniversary.daysUntil <= 1 ? `${anniversary.years} years` : `in ${anniversary.daysUntil} days · ${anniversary.years} yrs`}
                  </Text>
                </View>
              )}
              {(showBothEvents || showNextVisitOnly) && visibleNextVisit && (
                <View style={[styles.anniversaryPill, { marginTop: showBothEvents ? 4 : 0 }]}>
                  <Text style={styles.anniversaryText}>
                    {visibleNextVisit.daysUntil === 0 ? '✈️ Today!' : `✈️ ${visibleNextVisit.dateLabel}`}
                  </Text>
                  <Text style={styles.anniversaryDays}>
                    {visibleNextVisit.daysUntil === 0 ? 'next visit' : `in ${visibleNextVisit.daysUntil} days · next visit`}
                  </Text>
                </View>
              )}
              {/* LDR: prompt to set a next-visit date if none is on file. The whole
                  pre-visit hype nudge system depends on this being set, so surface
                  it right in the couple card so it's the obvious next step. */}
              {isLDR && !couple?.nextVisitDate && (
                <TouchableOpacity
                  style={[styles.anniversaryPill, { marginTop: 4 }]}
                  onPress={() => router.push('/profile' as any)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Set next visit date"
                >
                  <Text style={styles.anniversaryText}>✈️ Set next visit →</Text>
                  <Text style={styles.anniversaryDays}>unlocks countdown + hype</Text>
                </TouchableOpacity>
              )}
              {/* LDR: days-apart proxy + overlap window. Kept subtle (no pill
                  chrome) so they read as an ambient status line under the
                  headline, not as another action to take. */}
              {isLDR && daysApart !== null && (
                <Text style={styles.ldrStatusLine}>✨ {daysApart} {daysApart === 1 ? 'day' : 'days'} apart</Text>
              )}
              {isLDR && overlapWindow && (
                <Text style={styles.ldrStatusLine}>🕒 Both awake {overlapWindow} your time</Text>
              )}
            </View>
            <View style={styles.avatarCol}>
              <View style={styles.avatarRing}>
                <PartnerAvatar name={partner?.name ?? '?'} photoURL={partner?.photoURL} size={64} />
              </View>
              <Text style={styles.avatarNameLight}>{partner?.name ?? '...'}</Text>
              {partnerTimezone && <Text style={styles.tzClock}>{partnerTimezone}</Text>}
              <View style={styles.moodPill}>
                <Text style={styles.moodPillEmoji}>{partnerMood?.emoji ?? '·'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      ) : (
        <TouchableOpacity style={styles.connectBanner} onPress={() => router.push('/(auth)/pairing')} accessibilityRole="button">
          <Text style={styles.connectEmoji}>💌</Text>
          <Text style={styles.connectText}>Invite your partner to connect</Text>
          {couple?.inviteCode && (
            <View style={styles.codeBox}>
              <Text style={styles.connectCode}>{couple.inviteCode}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Daily insight card — based on partner's Love Language quiz result.
          Hidden for the rest of the day once the user acts on the CTA,
          so the day feels closed. Reappears with a fresh tip tomorrow.
          When Long Distance is on, every 3rd day rotates in a
          distance-specific tip instead of a love-language one, so LDR
          pairs see genuinely distance-aware suggestions regularly.
          Hidden on Sundays when the partner has a loveLanguage — Sunday's
          nudge stack owns the LL surface with the weekly ritual card
          (see the useMemo above), so a daily tip on the same theme would
          be redundant same-theme noise. */}
      {!insightDismissedToday && !(new Date().getDay() === 0 && partnerId && (partner as any)?.loveLanguage) && (() => {
        const dayN = Math.floor(Date.now() / 86400000);
        const isLdrDay = isLDR && dayN % 3 === 0;
        const tip = isLdrDay
          ? LDR_TIPS[dayN % LDR_TIPS.length]
          : getLanguageTip((partner as any)?.loveLanguage, partner?.name ?? 'them');
        if (!tip) return null;
        // Human-readable label for the eyebrow. Was leaking the raw
        // profile key ("WORDS") — now maps via LOVE_LANGUAGE_LABELS so
        // it reads "WORDS OF AFFIRMATION" etc.
        const langKey = (partner as any)?.loveLanguage as LoveLanguage | undefined;
        const langMeta = isLdrDay
          ? 'LONG DISTANCE'
          : (langKey ? LOVE_LANGUAGE_LABELS[langKey]?.label ?? '' : '');
        const handleTipPress = () => {
          if (!tip.route) return;
          // Route-based CTAs that stay on Home (e.g. the Spark picker) can't
          // rely on a remount, so trigger their local state directly.
          if (tip.route.startsWith('/(tabs)?openSpark')) {
            setShowSparkPicker(true);
          } else {
            router.push(tip.route as any);
          }
          dismissInsightForToday();
        };
        return (
          <TouchableOpacity
            style={styles.insightCard}
            onPress={handleTipPress}
            activeOpacity={tip.route ? 0.85 : 1}
            accessibilityRole={tip.route ? 'button' : undefined}
          >
            <Text style={styles.insightEyebrow}>INSIGHT{langMeta ? ` · ${langMeta.toUpperCase()}` : ''}</Text>
            <Text style={styles.insightTip}>{tip.tip}</Text>
            {tip.cta ? <Text style={styles.insightCta}>{tip.cta} →</Text> : null}
          </TouchableOpacity>
        );
      })()}

      {/* Incoming spark banner */}
      {incomingSpark && (
        <TouchableOpacity
          style={styles.sparkBanner}
          onPress={() => coupleId && markSparkSeen(coupleId, incomingSpark.id)}
          activeOpacity={0.85}
         accessibilityRole="button">
          <Text style={styles.sparkBannerEmoji}>{incomingSpark.emoji}</Text>
          <View style={styles.sparkBannerText}>
            <Text style={styles.sparkBannerTitle}>{partner?.name ?? 'Your partner'} sent you love</Text>
            <Text style={styles.sparkBannerMsg}>{incomingSpark.message}</Text>
          </View>
          <Text style={styles.sparkBannerClose}>✕</Text>
        </TouchableOpacity>
      )}

      {/* On this day */}
      {onThisDay && (
        <TouchableOpacity style={styles.onThisDayCard} onPress={() => router.push('/moments' as any)} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.onThisDayEmoji}>📸</Text>
          <View style={styles.onThisDayText}>
            <Text style={styles.onThisDayTitle}>On this day, {onThisDayYears} {onThisDayYears === 1 ? 'year' : 'years'} ago</Text>
            <Text style={styles.onThisDaySub} numberOfLines={1}>{onThisDay.caption || 'A memory from your past'}</Text>
          </View>
          <Text style={styles.onboardArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Onboarding: missing name */}
      {nameMissing && (
        <TouchableOpacity style={styles.onboardCard} onPress={() => router.push('/profile' as any)} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.onboardEmoji}>👤</Text>
          <View style={styles.onboardText}>
            <Text style={styles.onboardTitle}>Add your name</Text>
            <Text style={styles.onboardSub}>So your partner knows it's you</Text>
          </View>
          <Text style={styles.onboardArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Onboarding: set start date */}
      {startDateMissing && !nameMissing && (
        <TouchableOpacity style={styles.onboardCard} onPress={() => router.push('/profile' as any)} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.onboardEmoji}>📅</Text>
          <View style={styles.onboardText}>
            <Text style={styles.onboardTitle}>When did you get together?</Text>
            <Text style={styles.onboardSub}>Set your start date in Profile</Text>
          </View>
          <Text style={styles.onboardArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Mood section — only show when no mood set today */}
      {!myMood && (
      <View style={styles.moodSection}>
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <View style={styles.moodGrid}>
            {visibleMoods.map((emoji) => (
              <TouchableOpacity key={emoji} style={styles.moodBtn} onPress={() => handleMoodPick(emoji)} activeOpacity={0.7} accessibilityRole="button">
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodLabel}>{MOOD_LABELS[emoji]}</Text>
              </TouchableOpacity>
            ))}
            {!isSubscribed && ADULT_MOODS.map((emoji) => (
              <TouchableOpacity key={emoji} style={[styles.moodBtn, { opacity: 0.4 }]} onPress={() => { trackEvent('upgrade_cta_tapped'); router.push('/upgrade' as any); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Locked mood, upgrade to unlock">
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodLabel}>🔒</Text>
              </TouchableOpacity>
            ))}
          </View>
      </View>
      )}

      {/* Tonight's Ritual section removed July 2026 — Questions Game merged
          into Daily and its own dedicated ritual row became redundant with
          the Daily row in Tonight's Picks below. */}

      {/* ─── QUICK ─── */}
      {isConnected && (
        <>
          <View style={styles.sectionDivider}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>Quick</Text>
            <View style={styles.sectionLine} />
          </View>

          <View style={styles.quickCard}>
            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => !sparkSent && setShowSparkPicker(true)}
              activeOpacity={0.7}
             accessibilityRole="button">
              <Text style={styles.quickIcon}>{sparkSent ? '✓' : '❤️'}</Text>
              <Text style={styles.quickLabel}>{sparkSent ? 'Sent' : 'Love'}</Text>
            </TouchableOpacity>
            <View style={styles.quickDivider} />
            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => router.push('/flashes?send=1' as any)}
              activeOpacity={0.7}
             accessibilityRole="button">
              <Text style={styles.quickIcon}>📸</Text>
              <Text style={styles.quickLabel}>Tease</Text>
            </TouchableOpacity>
            <View style={styles.quickDivider} />
            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => router.push('/notes' as any)}
              activeOpacity={0.7}
             accessibilityRole="button">
              <Text style={styles.quickIcon}>💌</Text>
              <Text style={styles.quickLabel}>Note</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ─── YOUR LIST ─── surfaced from Us tab (which used to hide it) so it's
           always one tap away. Shows current active count + hint when partner
           has queued suggestions. */}
      {isConnected && (() => {
        const activeTodos = todos.filter((t) => !t.completed && t.status !== 'rejected' && t.status !== 'pending');
        const partnerSuggestions = todos.filter((t) => t.status === 'pending' && t.createdBy !== uid).length;
        return (
          <>
            <View style={styles.sectionDivider}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionLabel}>Together List</Text>
              <View style={styles.sectionLine} />
            </View>
            <TouchableOpacity style={styles.gameRow} onPress={() => router.push('/todo' as any)} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.gameEmoji}>✅</Text>
              <View style={styles.gameText}>
                <Text style={styles.gameTitle}>Together List</Text>
                <Text style={styles.gameSub}>
                  {partnerSuggestions > 0
                    ? `${partnerSuggestions} suggestion${partnerSuggestions === 1 ? '' : 's'} waiting · ${activeTodos.length} open`
                    : activeTodos.length === 0
                    ? 'Add something you want to do together'
                    : `${activeTodos.length} open · daily life, dates, intimacy, goals`}
                </Text>
              </View>
              <Text style={styles.gameArrow}>›</Text>
            </TouchableOpacity>
          </>
        );
      })()}

      {/* ─── TONIGHT'S PICKS ─── curated launchpad, 3 highest-fun games.
           Discover tab holds the full menu (WYR, Tonight's Date, Bingo, Challenge,
           etc.). Home duplicating the full list dilutes the "tonight's pick"
           signal — kept lean with Daily (best daily rhythm, merges picks +
           questions), Truth or Dare (highest-rated interaction), and Fantasy
           Wishes (paid premium showcase). */}
      <View style={styles.sectionDivider}>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionLabel}>Tonight's Picks</Text>
        <View style={styles.sectionLine} />
      </View>

      <TouchableOpacity style={styles.gameRow} onPress={() => router.push('/daily' as any)} activeOpacity={0.85} accessibilityRole="button">
        <Text style={styles.gameEmoji}>💫</Text>
        <View style={styles.gameText}>
          <Text style={styles.gameTitle}>Daily</Text>
          <Text style={styles.gameSub}>Fresh picks and questions every day</Text>
        </View>
        <Text style={styles.gameArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.gameRow} onPress={() => router.push('/truth-dare' as any)} activeOpacity={0.85} accessibilityRole="button">
        <Text style={styles.gameEmoji}>🎯</Text>
        <View style={styles.gameText}>
          <Text style={styles.gameTitle}>Truth or Dare</Text>
          <Text style={styles.gameSub}>Two ways to play, one phone or two</Text>
        </View>
        <Text style={styles.gameArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.gameRow} onPress={() => router.push('/fantasy-wishes' as any)} activeOpacity={0.85} accessibilityRole="button">
        <Text style={styles.gameEmoji}>✨</Text>
        <View style={styles.gameText}>
          <Text style={styles.gameTitle}>Fantasy Wishes</Text>
          <Text style={styles.gameSub}>Double-blind voting {!isSubscribed && '· 🔒'}</Text>
        </View>
        <Text style={styles.gameArrow}>›</Text>
      </TouchableOpacity>

      {/* Async Dares launcher — was previously only reachable via Home
          nudges (which only fire when a dare is in flight). Home had no
          way to SEND a dare unless one was already pending. Tile added
          Aug 2026 to close that discoverability gap. */}
      <TouchableOpacity style={styles.gameRow} onPress={() => router.push('/dares' as any)} activeOpacity={0.85} accessibilityRole="button">
        <Text style={styles.gameEmoji}>🎁</Text>
        <View style={styles.gameText}>
          <Text style={styles.gameTitle}>Dares</Text>
          <Text style={styles.gameSub}>Send a challenge, watch it get done</Text>
        </View>
        <Text style={styles.gameArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.seeAllGamesRow} onPress={() => router.push('/(tabs)/discover' as any)} activeOpacity={0.7} accessibilityRole="button">
        <Text style={styles.seeAllGamesText}>See all games →</Text>
      </TouchableOpacity>

      {/* Waiting for you nudges */}
      {nudges.length > 0 && (
        <>
          <Text style={styles.nudgeLabel}>Waiting for you</Text>
          {nudges.map((n, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.nudgeCard, { backgroundColor: n.bg }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(n.route as any); }}
              activeOpacity={0.85}
             accessibilityRole="button">
              <Text style={styles.nudgeEmoji}>{n.emoji}</Text>
              <View style={styles.nudgeText}>
                <Text style={styles.nudgeTitle}>{n.title}</Text>
                <Text style={styles.nudgeSub}>{n.subtitle}</Text>
              </View>
              <Text style={styles.nudgeArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </>
      )}


    </ScrollView>

    {/* Spark picker modal */}
    <Modal visible={showSparkPicker} transparent animationType="slide" onRequestClose={() => setShowSparkPicker(false)}>
      <View style={styles.sparkOverlay}>
        <View style={styles.sparkSheet}>
          <View style={styles.sparkSheetHandle} />
          <Text style={styles.sparkSheetTitle}>Send {partner?.name ?? 'your partner'} love</Text>
          {SPARK_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.emoji}
              style={styles.sparkOptionRow}
              onPress={() => { setShowSparkPicker(false); handleSendSpark(opt.emoji, opt.message); }}
              activeOpacity={0.8}
             accessibilityRole="button">
              <Text style={styles.sparkOptionEmoji}>{opt.emoji}</Text>
              <Text style={styles.sparkOptionText}>{opt.message}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.sparkCancelBtn} onPress={() => setShowSparkPicker(false)} accessibilityRole="button">
            <Text style={styles.sparkCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingLogo: { fontFamily: Fonts.heading, fontSize: 42, color: Colors.burgundy, letterSpacing: 2 },
  loadingHeart: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.rose },
  screenWrap: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  container: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  greeting: { fontFamily: Fonts.headingItalic, fontSize: 24, color: Colors.burgundy, letterSpacing: 0.3 },
  headerDate: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },

  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Spacing.lg, marginBottom: Spacing.md },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.muted, letterSpacing: 2.5, textTransform: 'uppercase' },

  ritualRow: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  ritualOrnament: { fontSize: 22, color: Colors.burgundy, width: 32, textAlign: 'center' },
  ritualText: { flex: 1 },
  ritualTitle: { fontFamily: Fonts.headingItalic, fontSize: 20, color: Colors.burgundy },
  ritualSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 1 },
  ritualArrow: { fontFamily: Fonts.body, fontSize: 18, color: Colors.muted },

  quickCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  quickItem: { alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  quickIcon: { fontSize: 22 },
  quickLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.burgundy, letterSpacing: 1.2, textTransform: 'uppercase' },
  quickDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  gameRow: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, ...Shadow.sm },
  gameEmoji: { fontSize: 24, width: 32 },
  gameText: { flex: 1 },
  gameTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.burgundy, fontWeight: '500' },
  gameSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 1 },
  gameArrow: { fontFamily: Fonts.body, fontSize: 18, color: Colors.muted },
  seeAllGamesRow: { alignItems: 'center', paddingVertical: Spacing.sm, marginTop: 2, marginBottom: Spacing.sm },
  seeAllGamesText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, letterSpacing: 0.5 },
  name: { fontFamily: Fonts.heading, fontSize: 34, color: Colors.burgundy, lineHeight: 38, marginTop: 2 },
  signOutBtn: { paddingTop: 6 },
  signOut: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  coupleCard: { borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, overflow: 'hidden', ...Shadow.md },
  heartWatermark: { position: 'absolute', fontSize: 130, color: 'rgba(255,255,255,0.04)', top: -22, right: -8, lineHeight: 140 },
  coupleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarCol: { alignItems: 'center', gap: 8 },
  avatarRing: { borderRadius: Radius.full, borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)', padding: 3 },
  avatarNameLight: { fontFamily: Fonts.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  tzClock: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1, letterSpacing: 0.3 },
  moodPill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  moodPillEmoji: { fontSize: 18 },
  middleCol: { alignItems: 'center', gap: 4 },
  sinceLabel: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  sinceDate: { fontFamily: Fonts.heading, fontSize: 20, color: '#FFFFFF', textAlign: 'center', lineHeight: 24 },
  anniversaryPill: { alignItems: 'center', gap: 1, marginTop: 2 },
  anniversaryText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  anniversaryDays: { fontFamily: Fonts.bodyItalic, fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  ldrStatusLine: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 4 },

  connectBanner: { backgroundColor: Colors.blush, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.rose, gap: Spacing.sm },
  connectEmoji: { fontSize: 32 },
  connectText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  codeBox: { backgroundColor: 'rgba(136,14,79,0.08)', borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginTop: 4 },
  connectCode: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.burgundy, letterSpacing: 8 },

  moodSection: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  changeText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  moodBtn: { alignItems: 'center', width: '22%', paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.border },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontFamily: Fonts.body, fontSize: 9, color: Colors.muted, textAlign: 'center', marginTop: 2 },
  moodSelected: { paddingVertical: Spacing.sm, gap: 6 },
  moodSelectedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  moodSelectedEmoji: { fontSize: 28 },
  moodSelectedLabel: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text },
  partnerMoodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  partnerMoodEmoji: { fontSize: 16 },
  partnerMoodText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  dailyWishCard: { backgroundColor: Colors.blush, borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.rose, ...Shadow.sm },
  dailyWishLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dailyWishEmoji: { fontSize: 32 },
  dailyWishTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.burgundy },
  dailyWishSub: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, marginTop: 2 },
  dailyWishArrow: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.muted },

  nudgeLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  nudgeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  nudgeEmoji: { fontSize: 28 },
  nudgeText: { flex: 1 },
  nudgeTitle: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.text },
  nudgeSub: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, marginTop: 2 },
  nudgeArrow: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.muted },


  sparkBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.blush, borderRadius: Radius.xl, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.rose, ...Shadow.sm },
  insightCard: {
    backgroundColor: '#FFF4E8', borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: '#E8C9A0',
    gap: 6,
  },
  insightEyebrow: { fontFamily: Fonts.bodyBold, fontSize: 10, color: '#8B6B3A', letterSpacing: 2, textTransform: 'uppercase' },
  insightTip: { fontFamily: Fonts.headingItalic, fontSize: 18, color: Colors.burgundy, lineHeight: 26 },
  insightCta: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, marginTop: 4 },
  sparkBannerEmoji: { fontSize: 28 },
  sparkBannerText: { flex: 1 },
  sparkBannerTitle: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  sparkBannerMsg: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  sparkBannerClose: { fontFamily: Fonts.body, fontSize: 16, color: Colors.muted, padding: Spacing.xs },

  onThisDayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9C4', borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: '#F9A825', gap: Spacing.md, ...Shadow.sm },
  onThisDayEmoji: { fontSize: 28 },
  onThisDayText: { flex: 1 },
  onThisDayTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: '#E65100' },
  onThisDaySub: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 2 },

  onboardCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.blush, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.rose, gap: Spacing.md, ...Shadow.sm },
  onboardEmoji: { fontSize: 28 },
  onboardText: { flex: 1 },
  onboardTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
  onboardSub: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 2 },
  onboardArrow: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy },

  moodSummaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md, ...Shadow.sm },
  moodSummaryRow: { flex: 1, gap: 2 },
  moodSummaryText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text },
  moodSummaryArrow: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.muted },

  sparkBtn: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  sparkBtnSent: { backgroundColor: '#E8F5E9', borderColor: Colors.success },
  sparkBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },

  sparkOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sparkSheet: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm },
  sparkSheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: Radius.full, alignSelf: 'center', marginBottom: Spacing.sm },
  sparkSheetTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy, marginBottom: Spacing.sm },
  sparkOptionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sparkOptionEmoji: { fontSize: 28 },
  sparkOptionText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  sparkCancelBtn: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
  sparkCancelText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },

  flashBtn: { backgroundColor: '#FFF0F3', borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F4A7B9', ...Shadow.sm, marginTop: Spacing.sm },
  flashBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
});
