import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useCouple } from '../../hooks/useCouple';
import { logout, createUserProfile } from '../../services/authService';
import { createCouple } from '../../services/coupleService';
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

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [myMood, setMyMood] = useState<MoodEntry | null>(null);
  const [partnerMood, setPartnerMood] = useState<MoodEntry | null>(null);
  const [picking, setPicking] = useState(false);

  // Auto-create couple if user skipped pairing
  useEffect(() => {
    if (!user || !profile || profile.coupleId) return;
    createCouple(user.uid).then((couple) => {
      createUserProfile(user.uid, {
        name: profile.name ?? '',
        photoURL: profile.photoURL,
        coupleId: couple.id,
        inviteCode: couple.inviteCode,
      });
    });
  }, [user, profile]);

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
    await setMood(profile.coupleId, user.uid, emoji);
    setPicking(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const isConnected = !!couple?.partner2Uid;
  const days = couple ? getDaysTogether(couple.createdAt) : 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{profile?.name ?? '...'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Partner card */}
      {isConnected ? (
        <View style={styles.coupleCard}>
          <View style={styles.coupleRow}>
            <View style={styles.avatarCol}>
              <PartnerAvatar name={profile?.name ?? '?'} photoURL={profile?.photoURL} size={72} />
              <Text style={styles.avatarName}>{profile?.name}</Text>
              <Text style={styles.moodBubble}>{myMood?.emoji ?? '·'}</Text>
            </View>
            <View style={styles.middleCol}>
              <Text style={styles.heart}>♥</Text>
              <Text style={styles.daysNum}>{days}</Text>
              <Text style={styles.daysLabel}>days</Text>
            </View>
            <View style={styles.avatarCol}>
              <PartnerAvatar name={partner?.name ?? '?'} photoURL={partner?.photoURL} size={72} />
              <Text style={styles.avatarName}>{partner?.name ?? '...'}</Text>
              <Text style={styles.moodBubble}>{partnerMood?.emoji ?? '·'}</Text>
            </View>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.connectBanner} onPress={() => router.push('/(auth)/pairing')}>
          <Text style={styles.connectText}>💌 Invite your partner to connect</Text>
          {couple?.inviteCode && <Text style={styles.connectCode}>{couple.inviteCode}</Text>}
        </TouchableOpacity>
      )}

      {/* Mood check-in */}
      <View style={styles.section}>
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
              <Text style={styles.partnerMoodText}>
                {partner?.name} feels {partnerMood.emoji} {MOOD_LABELS[partnerMood.emoji as MoodEmoji]}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Jump in</Text>
      <View style={styles.quickGrid}>
        {[
          { emoji: '🎲', label: 'Dare Wheel',   route: '/dare' },
          { emoji: '🌹', label: 'Wishlist',     route: '/wishlist' },
          { emoji: '💬', label: 'Questions',    route: '/questions-game' },
          { emoji: '🎰', label: 'Date Night',   route: '/roulette' },
          { emoji: '💌', label: 'Love Notes',   route: '/notes' },
          { emoji: '📸', label: 'Memories',     route: '/memories' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.quickCard}
            onPress={() => router.push(item.route as any)}
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
  greeting: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted },
  name: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.burgundy },
  signOut: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, paddingTop: 4 },

  coupleCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  coupleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarCol: { alignItems: 'center', gap: 6 },
  avatarName: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  moodBubble: { fontSize: 22 },
  middleCol: { alignItems: 'center' },
  heart: { fontSize: 24, color: Colors.rose },
  daysNum: { fontFamily: Fonts.heading, fontSize: 40, color: Colors.burgundy, lineHeight: 44 },
  daysLabel: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },

  connectBanner: {
    backgroundColor: Colors.blush,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.rose,
  },
  connectText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  connectCode: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy, letterSpacing: 6, marginTop: 4 },

  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, marginBottom: Spacing.md },
  changeText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  moodBtn: { alignItems: 'center', width: '22%', paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.cream },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, textAlign: 'center', marginTop: 2 },

  moodSelected: { alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.sm },
  moodSelectedEmoji: { fontSize: 52 },
  moodSelectedLabel: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.text },
  partnerMoodText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  quickCard: {
    width: '30%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  quickEmoji: { fontSize: 28 },
  quickLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.text, textAlign: 'center' },
});
