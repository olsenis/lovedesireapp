import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useCouple } from '../../hooks/useCouple';
import { logout } from '../../services/authService';
import { notifyPartner } from '../../services/notificationService';
import { ALL_MOODS, MOOD_LABELS, MoodEmoji, setMood, getTodaysMood, subscribeToMoods, MoodEntry } from '../../services/moodService';
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

function getDaysTogether(createdAt: number): number {
  return Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
}

const QUICK_ACTIONS = [
  { emoji: '🎲', label: 'Dare Wheel',   route: '/dare',            bg: '#FFF0F3' },
  { emoji: '✨', label: 'Fantasy Wishes', route: '/fantasy-wishes',  bg: '#F3E5F5' },
  { emoji: '💬', label: 'Questions',    route: '/questions-game',  bg: '#FFF0F3' },
  { emoji: '🎰', label: 'Date Night',   route: '/roulette',        bg: '#FFF8F0' },
  { emoji: '💌', label: 'Love Notes',   route: '/notes',           bg: '#FFF0F3' },
  { emoji: '📸', label: 'Memories',     route: '/memories',        bg: '#FFF8F0' },
];

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [myMood, setMyMood] = useState<MoodEntry | null>(null);
  const [partnerMood, setPartnerMood] = useState<MoodEntry | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!user || !profile?.coupleId) return;
    getTodaysMood(profile.coupleId, user.uid).then(setMyMood);
    const unsub = subscribeToMoods(profile.coupleId, (moods) => {
      const mine = moods.find((m) => m.uid === user.uid) ?? null;
      const theirs = moods.find((m) => m.uid !== user.uid) ?? null;
      setMyMood(mine);
      setPartnerMood(theirs);
    });
    return unsub;
  }, [user, profile?.coupleId]);

  const handleMoodPick = async (emoji: MoodEmoji) => {
    if (!user || !profile?.coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await setMood(profile.coupleId, user.uid, emoji);
      setMyMood({ id: 'optimistic', uid: user.uid, emoji, createdAt: Date.now() });
      setPicking(false);
      notifyPartner(profile.coupleId, user.uid, 'New mood 💫', `${profile.name ?? 'Your partner'} is feeling ${emoji} ${MOOD_LABELS[emoji]}`).catch(() => {});
    } catch (e) {
      console.error('setMood failed:', e);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const isConnected = !!couple?.partner2Uid;
  const days = couple ? getDaysTogether(couple.createdAt) : 0;

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
              <TouchableOpacity
                key={emoji}
                style={styles.moodBtn}
                onPress={() => handleMoodPick(emoji)}
                activeOpacity={0.7}
              >
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

      {/* Daily Wishes */}
      <TouchableOpacity
        style={styles.dailyWishCard}
        onPress={() => router.push('/daily-wishes' as any)}
        activeOpacity={0.85}
      >
        <View style={styles.dailyWishLeft}>
          <Text style={styles.dailyWishEmoji}>🌹</Text>
          <View>
            <Text style={styles.dailyWishTitle}>Daily Picks</Text>
            <Text style={styles.dailyWishSub}>5 new picks today · vote privately</Text>
          </View>
        </View>
        <Text style={styles.dailyWishArrow}>›</Text>
      </TouchableOpacity>

      {/* Quick actions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Jump in</Text>
      </View>
      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.quickCard, { backgroundColor: item.bg }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(item.route as any);
            }}
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  greeting: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, letterSpacing: 0.3 },
  name: { fontFamily: Fonts.heading, fontSize: 34, color: Colors.burgundy, lineHeight: 38, marginTop: 2 },
  signOutBtn: { paddingTop: 6 },
  signOut: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  coupleCard: {
    backgroundColor: Colors.burgundy,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  heartWatermark: {
    position: 'absolute',
    fontSize: 130,
    color: 'rgba(255,255,255,0.04)',
    top: -22,
    right: -8,
    lineHeight: 140,
  },
  coupleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarCol: { alignItems: 'center', gap: 8 },
  avatarRing: {
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    padding: 3,
  },
  avatarNameLight: { fontFamily: Fonts.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  moodPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  moodPillEmoji: { fontSize: 18 },
  middleCol: { alignItems: 'center', gap: 2 },
  daysNum: { fontFamily: Fonts.heading, fontSize: 54, color: '#FFFFFF', lineHeight: 58 },
  daysLabel: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 18 },

  connectBanner: {
    backgroundColor: Colors.blush,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.rose,
    gap: Spacing.sm,
  },
  connectEmoji: { fontSize: 32 },
  connectText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  codeBox: {
    backgroundColor: 'rgba(136,14,79,0.08)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: 4,
  },
  connectCode: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.burgundy, letterSpacing: 8 },

  moodSection: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  changeText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  moodBtn: {
    alignItems: 'center',
    width: '22%',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontFamily: Fonts.body, fontSize: 9, color: Colors.muted, textAlign: 'center', marginTop: 2 },

  moodSelected: { alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.sm },
  moodSelectedEmoji: { fontSize: 56 },
  moodSelectedLabel: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text },
  partnerMoodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  partnerMoodEmoji: { fontSize: 16 },
  partnerMoodText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  quickCard: {
    width: '47%',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  quickEmoji: { fontSize: 34 },
  quickLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text, textAlign: 'center' },

  dailyWishCard: {
    backgroundColor: Colors.blush, borderRadius: Radius.xl, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: Colors.rose, ...Shadow.sm,
  },
  dailyWishLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dailyWishEmoji: { fontSize: 32 },
  dailyWishTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.burgundy },
  dailyWishSub: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, marginTop: 2 },
  dailyWishArrow: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.muted },
});
