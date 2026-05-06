import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useCouple } from '../../hooks/useCouple';
import { logout } from '../../services/authService';
import { notifyPartner } from '../../services/notificationService';
import { ALL_MOODS, MOOD_LABELS, MoodEmoji, setMood, getTodaysMood, subscribeToMoods, MoodEntry } from '../../services/moodService';
import { subscribeChallenge, ChallengeState } from '../../services/challengeService';
import { subscribeNotes, LoveNote } from '../../services/noteService';
import { subscribeFantasyWishes, FantasyWishesItem, isFWMatch } from '../../services/fantasyWishesService';
import { subscribeDailyQuestions, DailyQuestionDoc } from '../../services/dailyQuestionsService';
import { subscribeDailyWishes, DailyWishDoc } from '../../services/dailyWishService';
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

function getDaysTogether(couple: { createdAt: number; startDate?: number }): number {
  const from = couple.startDate ?? couple.createdAt;
  return Math.floor((Date.now() - from) / (1000 * 60 * 60 * 24));
}

interface NudgeItem {
  emoji: string;
  title: string;
  subtitle: string;
  route: string;
  bg: string;
}

const QUICK_ACTIONS = [
  { emoji: '🎲', label: 'Dare Wheel',       route: '/dare',      bg: '#FFF0F3' },
  { emoji: '🗓️', label: '30-Day Challenge', route: '/challenge', bg: '#FFF9C4' },
];

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);

  const [myMood, setMyMood] = useState<MoodEntry | null>(null);
  const [partnerMood, setPartnerMood] = useState<MoodEntry | null>(null);
  const [picking, setPicking] = useState(false);

  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [fwItems, setFwItems] = useState<FantasyWishesItem[]>([]);
  const [dailyQDoc, setDailyQDoc] = useState<DailyQuestionDoc | null>(null);
  const [dailyWishDoc, setDailyWishDoc] = useState<DailyWishDoc | null>(null);

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
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [coupleId]);

  const handleMoodPick = async (emoji: MoodEmoji) => {
    if (!user || !coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await setMood(coupleId, user.uid, emoji);
      setMyMood({ id: 'optimistic', uid: user.uid, emoji, createdAt: Date.now() });
      setPicking(false);
      notifyPartner(coupleId, user.uid, 'New mood 💫', `${profile?.name ?? 'Your partner'} is feeling ${emoji} ${MOOD_LABELS[emoji]}`).catch(() => {});
    } catch (e) {
      console.error('setMood failed:', e);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const isConnected = !!couple?.partner2Uid;
  const days = couple ? getDaysTogether(couple) : 0;

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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{profile?.name ?? '...'}</Text>
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
              <View style={styles.moodPill}>
                <Text style={styles.moodPillEmoji}>{myMood?.emoji ?? '·'}</Text>
              </View>
            </View>
            <View style={styles.middleCol}>
              <Text style={styles.daysNum}>{days}</Text>
              <Text style={styles.daysLabel}>{'days\ntogether'}</Text>
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

      {/* Mood section */}
      <View style={styles.moodSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>How are you feeling?</Text>
          {myMood && !picking && (
            <TouchableOpacity onPress={() => setPicking(true)}>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          )}
        </View>
        {!myMood || picking ? (
          <View style={styles.moodGrid}>
            {ALL_MOODS.map((emoji) => (
              <TouchableOpacity key={emoji} style={styles.moodBtn} onPress={() => handleMoodPick(emoji)} activeOpacity={0.7}>
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodLabel}>{MOOD_LABELS[emoji]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.moodSelected}>
            <Text style={styles.moodSelectedEmoji}>{myMood.emoji}</Text>
            <Text style={styles.moodSelectedLabel}>{MOOD_LABELS[myMood.emoji as MoodEmoji]}</Text>
            {partnerMood && (
              <View style={styles.partnerMoodRow}>
                <Text style={styles.partnerMoodEmoji}>{partnerMood.emoji}</Text>
                <Text style={styles.partnerMoodText}>
                  {partner?.name} feels {MOOD_LABELS[partnerMood.emoji as MoodEmoji].toLowerCase()}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

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

      {/* Quick access */}
      <Text style={[styles.nudgeLabel, { marginTop: nudges.length > 0 ? Spacing.md : 0 }]}>Jump in</Text>
      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.quickCard, { backgroundColor: item.bg }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.route as any); }}
            activeOpacity={0.75}
          >
            <Text style={styles.quickEmoji}>{item.emoji}</Text>
            <Text style={styles.quickLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  container: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },

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
  middleCol: { alignItems: 'center', gap: 2 },
  daysNum: { fontFamily: Fonts.heading, fontSize: 54, color: '#FFFFFF', lineHeight: 58 },
  daysLabel: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 18 },

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
  moodSelected: { alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.sm },
  moodSelectedEmoji: { fontSize: 56 },
  moodSelectedLabel: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text },
  partnerMoodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  partnerMoodEmoji: { fontSize: 16 },
  partnerMoodText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  dailyWishCard: { backgroundColor: Colors.blush, borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.rose, ...Shadow.sm, marginBottom: Spacing.md },
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
});
