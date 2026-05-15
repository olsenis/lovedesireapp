import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useCouple } from '../../hooks/useCouple';
import { logout } from '../../services/authService';
import { notifyPartner } from '../../services/notificationService';
import { ALL_MOODS, MOOD_LABELS, MoodEmoji, setMood, getTodaysMood, subscribeToMoods, subscribeMoodHistory, MoodEntry } from '../../services/moodService';
import { subscribeChallenge, ChallengeState } from '../../services/challengeService';
import { subscribeNotes, LoveNote, unlockSadNotes } from '../../services/noteService';
import { subscribeFantasyWishes, FantasyWishesItem, isFWMatch } from '../../services/fantasyWishesService';
import { subscribeDailyQuestions, DailyQuestionDoc } from '../../services/dailyQuestionsService';
import { subscribeDailyWishes, DailyWishDoc } from '../../services/dailyWishService';
import { subscribeWYR, WYRSession } from '../../services/wyrService';
import { subscribeIntimacyLog, IntimacyEntry } from '../../services/intimacyService';
import { SparkEntry, SPARK_OPTIONS, subscribeRecentSparks, sendSpark, markSparkSeen } from '../../services/sparkService';
import { FlashEntry, subscribeFlashes, formatCountdown } from '../../services/flashService';
import { MomentEntry, subscribeMoments } from '../../services/momentService';
import { Memory, subscribeMemories } from '../../services/memoryService';
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
  const [picking, setPicking] = useState(false);

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
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);
  const [moments, setMoments] = useState<MomentEntry[]>([]);

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
    const u4 = subscribeDailyQuestions(coupleId, setDailyQDoc);
    const u5 = subscribeDailyWishes(coupleId, setDailyWishDoc);
    const u6 = subscribeWYR(coupleId, setWyrSession);
    const u7 = subscribeIntimacyLog(coupleId, setIntimacyEntries);
    const u8 = subscribeRecentSparks(coupleId, setRecentSparks);
    const u9 = subscribeMoodHistory(coupleId, setMoodHistory);
    const u10 = subscribeMemories(coupleId, setMemories);
    const u11 = subscribeFlashes(coupleId, setFlashes);
    const u12 = subscribeMoments(coupleId, setMoments);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); u9(); u10(); u11(); u12(); };
  }, [coupleId]);

  const handleSendSpark = async (emoji: string, message: string) => {
    if (!coupleId || !partnerId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSparkSent(true);
    await sendSpark(coupleId, uid, emoji, message);
    notifyPartner(coupleId, uid, `${profile?.name ?? 'Your partner'} sent you love ❤️`, `${emoji} ${message}`).catch(() => {});
    setTimeout(() => setSparkSent(false), 3000);
  };

  // Incoming spark from partner (unseen, last 24h)
  const incomingSpark = recentSparks.find(s =>
    s.fromUid !== uid && !s.seen && (Date.now() - s.createdAt) < 86400000
  ) ?? null;

  // Weekly mood summary
  const weekAgo = Date.now() - 7 * 86400000;
  const myWeekMoods = moodHistory.filter(m => m.uid === uid && m.createdAt >= weekAgo);
  const partnerWeekMoods = moodHistory.filter(m => m.uid !== uid && m.createdAt >= weekAgo);
  function topMood(entries: MoodEntry[]): MoodEmoji | null {
    if (!entries.length) return null;
    const c: Partial<Record<string, number>> = {};
    for (const e of entries) c[e.emoji] = (c[e.emoji] ?? 0) + 1;
    const sorted = Object.entries(c).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    return (sorted[0]?.[0] ?? null) as MoodEmoji | null;
  }
  const myTopMood = topMood(myWeekMoods);
  const partnerTopMood = topMood(partnerWeekMoods);

  const handleMoodPick = async (emoji: MoodEmoji) => {
    if (!user || !coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await setMood(coupleId, user.uid, emoji);
      setMyMood({ id: 'optimistic', uid: user.uid, emoji, createdAt: Date.now() });
      setPicking(false);
      notifyPartner(coupleId, user.uid, 'New mood 💫', `${profile?.name ?? 'Your partner'} is feeling ${emoji} ${MOOD_LABELS[emoji]}`).catch(() => {});
      if (emoji === '😢') unlockSadNotes(coupleId, user.uid).catch(() => {});
    } catch (e) {
      console.error('setMood failed:', e);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const isConnected = !!couple?.partner2Uid;
  const togetherSince = couple ? getTogetherSince(couple) : '';
  const anniversary = couple ? getAnniversary(couple) : null;

  // Build nudge items
  const nudges: NudgeItem[] = [];

  // Challenge: partner marked today but user hasn't
  if (challengeState?.phase === 'active' && partnerId) {
    const day = challengeState.currentDay;
    const iMarked = (challengeState.completedBy[day] ?? []).some(id => id === uid);
    const partnerMarked = (challengeState.completedBy[day] ?? []).some(id => id === partnerId || id.startsWith('veto:'));
    if (partnerMarked && !iMarked) {
      const cfg = challengeState.program ? CHALLENGE_PROGRAM_CONFIG[challengeState.program] : null;
      nudges.push({
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
    nudges.push({
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
    nudges.push({
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
      nudges.push({
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
      nudges.push({
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
      nudges.push({
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
      nudges.push({
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

      nudges.push({
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
    nudges.push({
      emoji: '📸',
      title: partnerCapturedToday
        ? `${partner?.name ?? 'Partner'} captured today's moment`
        : "Capture today's moment",
      subtitle: partnerCapturedToday
        ? 'Take yours to reveal both photos'
        : 'Both of you take a photo — reveal together',
      route: '/memories',
      bg: Colors.blush,
    });
  }

  // Flashes: unviewed incoming flash from partner
  const incomingFlash = flashes.find(f => f.fromUid !== uid && !f.viewed) ?? null;
  if (incomingFlash) {
    nudges.unshift({
      emoji: '📸',
      title: `${partner?.name ?? 'Partner'} sent you a flash`,
      subtitle: `Disappears in ${formatCountdown(incomingFlash.expiresAt)} · tap to view`,
      route: '/flashes',
      bg: Colors.blush,
    });
  }

  // ── On this day ───────────────────────────────────────────────────────────────
  const todayMD = `${new Date().getMonth()}-${new Date().getDate()}`;
  const onThisDay = memories.find(m => {
    const d = new Date(m.createdAt);
    const isToday = `${d.getMonth()}-${d.getDate()}` === todayMD;
    const isPast = d.getFullYear() < new Date().getFullYear();
    return isToday && isPast;
  }) ?? null;
  const onThisDayYears = onThisDay ? new Date().getFullYear() - new Date(onThisDay.createdAt).getFullYear() : 0;

  // ── Onboarding nudges ────────────────────────────────────────────────────────

  // 1. Name missing
  const nameMissing = isConnected && (!profile?.name || profile.name.trim() === '');

  // 2. Start date not set (couple exists but no startDate)
  const startDateMissing = isConnected && couple && !couple.startDate;

  // 3. New couple < 7 days — suggest first feature
  const coupleAgeDays = couple ? Math.floor((Date.now() - couple.createdAt) / 86400000) : 99;
  const isNewCouple = isConnected && coupleAgeDays < 7;

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
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={() => router.push('/profile' as any)}>
          <Text style={styles.signOut}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Partner hero card */}
      {isConnected ? (
        <View style={styles.coupleCard}>
          <Text style={styles.heartWatermark}>♥</Text>
          <View style={styles.coupleRow}>
            <View style={styles.avatarCol}>
              <View style={styles.avatarRing}>
                <PartnerAvatar name={profile?.name ?? '?'} photoURL={profile?.photoURL} size={64} />
              </View>
              <Text style={styles.avatarNameLight}>{profile?.name}</Text>
              <TouchableOpacity style={styles.moodPill} onPress={() => setPicking(true)} activeOpacity={0.7}>
                <Text style={styles.moodPillEmoji}>{myMood?.emoji ?? '+'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.middleCol}>
              <Text style={styles.sinceLabel}>together since</Text>
              <Text style={styles.sinceDate}>{togetherSince}</Text>
              {anniversary && (
                <View style={styles.anniversaryPill}>
                  <Text style={styles.anniversaryText}>
                    {anniversary.daysUntil <= 1 ? '🎉 Today!' : `🎉 ${anniversary.dateLabel}`}
                  </Text>
                  <Text style={styles.anniversaryDays}>
                    {anniversary.daysUntil <= 1 ? `${anniversary.years} years` : `in ${anniversary.daysUntil} days · ${anniversary.years} yrs`}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.avatarCol}>
              <View style={styles.avatarRing}>
                <PartnerAvatar name={partner?.name ?? '?'} photoURL={partner?.photoURL} size={64} />
              </View>
              <Text style={styles.avatarNameLight}>{partner?.name ?? '...'}</Text>
              <View style={styles.moodPill}>
                <Text style={styles.moodPillEmoji}>{partnerMood?.emoji ?? '·'}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.connectBanner} onPress={() => router.push('/(auth)/pairing')}>
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
        >
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
        <TouchableOpacity style={styles.onThisDayCard} onPress={() => router.push('/memories' as any)} activeOpacity={0.85}>
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
        <TouchableOpacity style={styles.onboardCard} onPress={() => router.push('/profile' as any)} activeOpacity={0.85}>
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
        <TouchableOpacity style={styles.onboardCard} onPress={() => router.push('/profile' as any)} activeOpacity={0.85}>
          <Text style={styles.onboardEmoji}>📅</Text>
          <View style={styles.onboardText}>
            <Text style={styles.onboardTitle}>When did you get together?</Text>
            <Text style={styles.onboardSub}>Set your start date in Profile</Text>
          </View>
          <Text style={styles.onboardArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Onboarding: new couple suggestion */}
      {isNewCouple && !nameMissing && (
        <TouchableOpacity style={[styles.onboardCard, { backgroundColor: '#E8F5E9' }]} onPress={() => router.push('/questions-game' as any)} activeOpacity={0.85}>
          <Text style={styles.onboardEmoji}>💬</Text>
          <View style={styles.onboardText}>
            <Text style={styles.onboardTitle}>Start here — Questions Game</Text>
            <Text style={styles.onboardSub}>3 questions, both answer privately, then reveal</Text>
          </View>
          <Text style={styles.onboardArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Weekly mood summary */}
      {isConnected && (myTopMood || partnerTopMood) && (
        <TouchableOpacity style={styles.moodSummaryCard} onPress={() => router.push('/mood-history' as any)} activeOpacity={0.85}>
          <View style={styles.moodSummaryRow}>
            {myTopMood && <Text style={styles.moodSummaryText}>Your week: {myTopMood} {MOOD_LABELS[myTopMood]}</Text>}
            {partnerTopMood && <Text style={styles.moodSummaryText}>{partner?.name ?? 'Partner'}'s: {partnerTopMood} {MOOD_LABELS[partnerTopMood]}</Text>}
          </View>
          <Text style={styles.moodSummaryArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Mood section — only show when no mood set or changing */}
      {(!myMood || picking) && (
      <View style={styles.moodSection}>
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <View style={styles.moodGrid}>
            {visibleMoods.map((emoji) => (
              <TouchableOpacity key={emoji} style={styles.moodBtn} onPress={() => handleMoodPick(emoji)} activeOpacity={0.7}>
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodLabel}>{MOOD_LABELS[emoji]}</Text>
              </TouchableOpacity>
            ))}
            {!isSubscribed && ADULT_MOODS.map((emoji) => (
              <TouchableOpacity key={emoji} style={[styles.moodBtn, { opacity: 0.4 }]} onPress={() => router.push('/upgrade' as any)} activeOpacity={0.7}>
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodLabel}>🔒</Text>
              </TouchableOpacity>
            ))}
          </View>
      </View>
      )}

      {/* Daily Picks card */}
      <TouchableOpacity style={styles.dailyWishCard} onPress={() => router.push('/daily-wishes' as any)} activeOpacity={0.85}>
        <View style={styles.dailyWishLeft}>
          <Text style={styles.dailyWishEmoji}>🌹</Text>
          <View>
            <Text style={styles.dailyWishTitle}>Daily Picks</Text>
            <Text style={styles.dailyWishSub}>5 new picks today · vote privately</Text>
          </View>
        </View>
        <Text style={styles.dailyWishArrow}>›</Text>
      </TouchableOpacity>

      {/* Send a Spark */}
      {isConnected && (
        <TouchableOpacity
          style={[styles.sparkBtn, sparkSent && styles.sparkBtnSent]}
          onPress={() => !sparkSent && setShowSparkPicker(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.sparkBtnText}>{sparkSent ? '✓ Love sent!' : `❤️  Send ${partner?.name ?? 'your partner'} love`}</Text>
        </TouchableOpacity>
      )}

      {/* Flash button */}
      {isConnected && (
        <TouchableOpacity
          style={styles.flashBtn}
          onPress={() => router.push('/flashes?send=1' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.flashBtnText}>📸  Send a Flash</Text>
        </TouchableOpacity>
      )}

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
            >
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
            >
              <Text style={styles.sparkOptionEmoji}>{opt.emoji}</Text>
              <Text style={styles.sparkOptionText}>{opt.message}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.sparkCancelBtn} onPress={() => setShowSparkPicker(false)}>
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
  greeting: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, letterSpacing: 0.3 },
  name: { fontFamily: Fonts.heading, fontSize: 34, color: Colors.burgundy, lineHeight: 38, marginTop: 2 },
  signOutBtn: { paddingTop: 6 },
  signOut: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  coupleCard: { backgroundColor: Colors.burgundy, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, overflow: 'hidden', ...Shadow.md },
  heartWatermark: { position: 'absolute', fontSize: 130, color: 'rgba(255,255,255,0.04)', top: -22, right: -8, lineHeight: 140 },
  coupleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarCol: { alignItems: 'center', gap: 8 },
  avatarRing: { borderRadius: Radius.full, borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)', padding: 3 },
  avatarNameLight: { fontFamily: Fonts.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
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

  quickGrid: { flexDirection: 'row', gap: Spacing.md },
  quickCard: { flex: 1, borderRadius: Radius.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  quickEmoji: { fontSize: 34 },
  quickLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text, textAlign: 'center' },

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
