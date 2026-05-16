import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useCouple } from '../../hooks/useCouple';
import { logout } from '../../services/authService';
import { notifyPartner } from '../../services/notificationService';
import { ALL_MOODS, MOOD_LABELS, MoodEmoji, setMood, getTodaysMood, subscribeToMoods, MoodEntry } from '../../services/moodService';
import { subscribeChallenge, ChallengeState } from '../../services/challengeService';
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
import { Todo, subscribeTodos } from '../../services/todoService';
import { Memory, subscribeMemories } from '../../services/memoryService';
import {
  StateUnionDoc,
  subscribeStateUnion,
  getCurrentWeekId,
  answeredCount as suAnsweredCount,
  hasUserCompleted as suHasUserCompleted,
} from '../../services/stateUnionService';
import { CHALLENGE_PROGRAM_CONFIG } from '../../constants/content';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';
import { PartnerAvatar } from '../../components/PartnerAvatar';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
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

// Format time in a given IANA timezone, returns "HH:MM" or null if invalid
function timeInZone(tz?: string): string | null {
  if (!tz) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  } catch {
    return null;
  }
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
  const [memories, setMemories] = useState<Memory[]>([]);
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);
  const [moments, setMoments] = useState<MomentEntry[]>([]);
  const [suDoc, setSuDoc] = useState<StateUnionDoc | null>(null);
  const [bingoSession, setBingoSession] = useState<ActivityCardsSession | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);

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
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); u10(); u11(); u12(); u13(); u14(); u15(); };
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
  const showBothEvents = !!(anniversary && nextVisit && anniversary.daysUntil <= 60 && nextVisit.daysUntil <= 60);
  const showNextVisitOnly = !!nextVisit && (!anniversary || (!showBothEvents && nextVisit.daysUntil <= anniversary.daysUntil));
  const showAnniversaryOnly = !!anniversary && (!nextVisit || (!showBothEvents && anniversary.daysUntil < nextVisit.daysUntil));
  const myTimezone = isLDR ? timeInZone(profile?.timezone) : null;
  const partnerTimezone = isLDR ? timeInZone(partner?.timezone) : null;

  // Build nudge items (memoized — only rebuilds when one of the sources actually changes)
  const nudges = useMemo<NudgeItem[]>(() => {
    const list: NudgeItem[] = [];

    // Challenge: partner marked today but user hasn't
    if (challengeState?.phase === 'active' && partnerId) {
    const day = challengeState.currentDay;
    const iMarked = (challengeState.completedBy[day] ?? []).some(id => id === uid);
    const partnerMarked = (challengeState.completedBy[day] ?? []).some(id => id === partnerId || id.startsWith('veto:'));
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

  // Love Notes: unread notes ready to open
  const readyNotes = notes.filter(n => n.fromUid !== uid && Date.now() >= n.openAt && !n.opened);
  if (readyNotes.length > 0) {
    list.push({
      emoji: '💌',
      title: `Love note${readyNotes.length > 1 ? 's' : ''} waiting`,
      subtitle: `${readyNotes.length > 1 ? `${readyNotes.length} messages` : 'A message'} from ${partner?.name ?? 'your partner'} is ready`,
      route: '/notes',
      bg: Colors.blush,
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

  // Daily Questions: partner discussed but user hasn't in at least one
  if (dailyQDoc && partnerId) {
    const partnerD = dailyQDoc.discussed[partnerId] ?? [];
    const myD = dailyQDoc.discussed[uid] ?? [];
    const waiting = partnerD.filter(i => !myD.includes(i));
    if (waiting.length > 0) {
      list.push({
        emoji: '💬',
        title: 'Questions waiting',
        subtitle: `${partner?.name ?? 'Partner'} discussed ${waiting.length} question${waiting.length > 1 ? 's' : ''} today`,
        route: '/questions-game',
        bg: '#E3F2FD',
      });
    }
  }

  // Daily Picks: partner voted but you haven't voted as much
  if (dailyWishDoc && partnerId) {
    const partnerVoteCount = Object.keys(dailyWishDoc.votes[partnerId] ?? {}).length;
    const myVoteCount = Object.keys(dailyWishDoc.votes[uid] ?? {}).length;
    if (partnerVoteCount > 0 && myVoteCount < 20) {
      list.push({
        emoji: '🌹',
        title: "Daily Picks",
        subtitle: `${partner?.name ?? 'Partner'} has voted on today's picks, your turn`,
        route: '/daily-wishes',
        bg: Colors.blush,
      });
    }
  }

  // Fantasy Wishes: partner has voted on items you haven't seen yet
  if (partnerId && fwItems.length > 0) {
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

  // Activity Cards (Bingo) — partner picked a card and I'm the receiver
  if (bingoSession && partnerId && bingoSession.pendingCard !== null && bingoSession.turnUid === uid) {
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

  // Post-visit recovery (LDR, 1-3 days after the last set visit date) — rotating daily prompt.
  // We use the raw nextVisitDate in the past, since getNextVisit() returns null once it's passed.
  if (isLDR && couple?.nextVisitDate && couple.nextVisitDate < Date.now()) {
    const daysSince = Math.floor((Date.now() - couple.nextVisitDate) / 86400000);
    if (daysSince >= 1 && daysSince <= 3) {
      const them = partner?.name ?? 'them';
      const postvisit = [
        { emoji: '✨', title: 'Visit memory drop',          sub: `Share your favorite photos from seeing ${them}`, route: '/moments' },
        { emoji: '📅', title: 'Day 2 apart',               sub: 'Plan one thing to look forward to together this week', route: '/countdown' },
        { emoji: '✈️', title: 'Day 3 apart',               sub: 'Start mapping the dates for your next visit', route: '/countdown' },
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
      { emoji: '🌹', title: '3 days',     sub: "Pick a Daily Pick you'd both love to try together", route: '/daily-wishes' },
      { emoji: '📸', title: '4 days',     sub: "Send a teaser of what's coming", route: '/flashes' },
      { emoji: '💌', title: '5 days',     sub: 'Write a note for when they arrive', route: '/notes' },
      { emoji: '🎁', title: '6 days',     sub: 'Plan a small surprise for them', route: '/notes' },
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

    return list;
  }, [challengeState, partnerId, partner?.name, uid, notes, fwItems, dailyQDoc, dailyWishDoc, wyrSession, intimacyEntries, profile?.features?.intimacyLog, moments, flashes, isLDR, nextVisit, couple?.nextVisitDate, suDoc, bingoSession, todos]);

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
          <Text style={styles.greeting}>{getGreeting()}</Text>
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
              <TouchableOpacity style={styles.moodPill} onPress={() => router.push('/mood-history' as any)} activeOpacity={0.7} accessibilityRole="button">
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
              {(showBothEvents || showNextVisitOnly) && nextVisit && (
                <View style={[styles.anniversaryPill, { marginTop: showBothEvents ? 4 : 0 }]}>
                  <Text style={styles.anniversaryText}>
                    {nextVisit.daysUntil === 0 ? '✈️ Today!' : `✈️ ${nextVisit.dateLabel}`}
                  </Text>
                  <Text style={styles.anniversaryDays}>
                    {nextVisit.daysUntil === 0 ? 'next visit' : `in ${nextVisit.daysUntil} days · next visit`}
                  </Text>
                </View>
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
              <TouchableOpacity key={emoji} style={[styles.moodBtn, { opacity: 0.4 }]} onPress={() => router.push('/upgrade' as any)} activeOpacity={0.7} accessibilityRole="button">
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodLabel}>🔒</Text>
              </TouchableOpacity>
            ))}
          </View>
      </View>
      )}

      {/* ─── TONIGHT'S RITUAL ─── */}
      <View style={styles.sectionDivider}>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionLabel}>Tonight's Ritual</Text>
        <View style={styles.sectionLine} />
      </View>

      <TouchableOpacity style={styles.ritualRow} onPress={() => router.push('/questions-game' as any)} activeOpacity={0.85} accessibilityRole="button">
        <Text style={styles.ritualOrnament}>♥</Text>
        <View style={styles.ritualText}>
          <Text style={styles.ritualTitle}>Three questions tonight</Text>
          <Text style={styles.ritualSub}>Answer privately, then reveal</Text>
        </View>
        <Text style={styles.ritualArrow}>›</Text>
      </TouchableOpacity>

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

      {/* ─── GAMES & RITUALS ─── */}
      <View style={styles.sectionDivider}>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionLabel}>Games & Rituals</Text>
        <View style={styles.sectionLine} />
      </View>

      <TouchableOpacity style={styles.gameRow} onPress={() => router.push('/daily-wishes' as any)} activeOpacity={0.85} accessibilityRole="button">
        <Text style={styles.gameEmoji}>🌹</Text>
        <View style={styles.gameText}>
          <Text style={styles.gameTitle}>Daily Picks</Text>
          <Text style={styles.gameSub}>5 new picks today · vote privately</Text>
        </View>
        <Text style={styles.gameArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.gameRow} onPress={() => router.push('/roulette' as any)} activeOpacity={0.85} accessibilityRole="button">
        <Text style={styles.gameEmoji}>🎲</Text>
        <View style={styles.gameText}>
          <Text style={styles.gameTitle}>Date Roulette</Text>
          <Text style={styles.gameSub}>Spin for tonight's date</Text>
        </View>
        <Text style={styles.gameArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.gameRow} onPress={() => router.push('/would-you-rather' as any)} activeOpacity={0.85} accessibilityRole="button">
        <Text style={styles.gameEmoji}>🤔</Text>
        <View style={styles.gameText}>
          <Text style={styles.gameTitle}>Would You Rather</Text>
          <Text style={styles.gameSub}>3 levels · take turns</Text>
        </View>
        <Text style={styles.gameArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.gameRow} onPress={() => router.push('/truth-dare' as any)} activeOpacity={0.85} accessibilityRole="button">
        <Text style={styles.gameEmoji}>🎯</Text>
        <View style={styles.gameText}>
          <Text style={styles.gameTitle}>Truth or Dare</Text>
          <Text style={styles.gameSub}>2-phone multiplayer</Text>
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
