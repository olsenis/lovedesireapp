import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useCouple } from '../../hooks/useCouple';
import { useSubscription } from '../../hooks/useSubscription';
import { useToast } from '../../components/Toast';
import { personalise } from '../../services/personalise';
import {
  getFeatureUnlockState,
  markMemoryLaneUnlocked,
  isUnlockRecent,
  memoryLaneEligible,
  memoryLaneDaysLeft,
} from '../../services/featureUnlockService';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';
import { useTrackScreen } from '../../hooks/useTrackScreen';

type GameCard = {
  emoji: string; title: string; subtitle: string; route: string; bg: string; paid: boolean; inPerson?: boolean;
};

// Versus was cut Aug 2026 — its guess-partner-answer mechanic merged
// into Daily's binary-question reveal flow, where it fits naturally
// with real partner data + mutual reveal. Standalone screen deleted.
const GAMES: GameCard[] = [
  { emoji: '💫', title: 'Daily',                subtitle: 'Picks to vote on and questions to answer, fresh every day', route: '/daily',          bg: '#E3F2FD', paid: false },
  { emoji: '🎯', title: 'Truth or Dare',        subtitle: 'Solo spin or 2-phone multiplayer round',        route: '/truth-dare',     bg: '#F3E5F5', paid: false },
  { emoji: '🤔', title: 'Would You Rather',     subtitle: 'Both answer at the same time, then reveal',   route: '/would-you-rather', bg: '#FFF9C4', paid: false },
  // Activity Cards' cards ask you to do things in the same room together.
  // LDR pairs get an "IN-PERSON" pill so they know before opening.
  { emoji: '🃏', title: 'Activity Cards',        subtitle: 'Take turns picking a mystery card together',  route: '/bingo',          bg: '#FCE4EC', paid: true, inPerson: true },
  // Standalone Dares card removed Aug 2026 — async dares now surface as
  // the "Send a Dare" mode inside Truth or Dare so Discover has one dare
  // brand, not two. Home nudges still deep-link to /dares directly.
  { emoji: '✨', title: 'Fantasy Wishes',       subtitle: 'Vote privately, only mutual Yes is ever revealed', route: '/fantasy-wishes', bg: '#F3E5F5', paid: true },
];

const CHALLENGES = [
  { emoji: '🗓️', title: '30-Day Challenge', subtitle: 'Reconnect, Spark, or Fire, a daily practice', route: '/challenge', bg: '#FFF9C4', paid: false },
  { emoji: '💘', title: "Tonight's Date",       subtitle: 'Let fate pick your perfect date idea',      route: '/roulette',  bg: '#E8F5E9', paid: false },
];

// Memory Lane (Sep 2026) is the only data-gated card: free, but hidden
// behind 30 days of history because it quizzes the couple on their own
// past. Not paywalled, so it must not show the 🔒 or route to /upgrade.
const MEMORY_LANE: GameCard = {
  emoji: '🧠', title: 'Memory Lane', subtitle: 'A weekly quiz on your own story', route: '/memory-lane', bg: '#E8F5E9', paid: false,
};

function FeatureCard({
  emoji, title, subtitle, route, bg, paid, isSubscribed, isNew, inPerson, isLDR, gateLabel, onGatedPress,
}: {
  emoji: string; title: string; subtitle: string; route: string; bg: string; paid: boolean; isSubscribed: boolean; isNew?: boolean; inPerson?: boolean; isLDR?: boolean;
  // Data-gate (not paywall): when set, the card is dimmed, the arrow is
  // replaced by this label, and taps call onGatedPress instead of routing.
  gateLabel?: string; onGatedPress?: () => void;
}) {
  const locked = paid && !isSubscribed;
  const gated = !!gateLabel;
  const showInPersonPill = !!inPerson && !!isLDR;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg }, gated && { opacity: 0.65 }]}
      onPress={() => {
        if (gated) { onGatedPress?.(); return; }
        router.push(locked ? '/upgrade' : route as any);
      }}
      activeOpacity={0.8}
     accessibilityRole="button">
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={styles.cardText}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          {showInPersonPill && (
            <View style={styles.inPersonPill}>
              <Text style={styles.inPersonPillText}>IN-PERSON</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      {gated ? (
        <View style={styles.gatePill}><Text style={styles.gatePillText}>{gateLabel}</Text></View>
      ) : (
        <Text style={styles.arrow}>{locked ? '🔒' : '›'}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const { isSubscribed } = useSubscription();
  const { toast, showToast } = useToast();

  useTrackScreen('discover');

  const isLDR = !!couple?.isLongDistance;

  // Memory Lane unlock. Eligibility from couple.createdAt; the unlock
  // timestamp is persisted per-user so the NEW badge window is stable.
  // undefined while loading so the card doesn't flash between states.
  const [memoryLaneUnlockedAt, setMemoryLaneUnlockedAt] = useState<number | null | undefined>(undefined);
  const memoryLaneDays = memoryLaneDaysLeft(couple);
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !couple) return;
    let cancelled = false;
    (async () => {
      const state = await getFeatureUnlockState(uid);
      if (cancelled) return;
      if (state.memoryLaneUnlockedAt) { setMemoryLaneUnlockedAt(state.memoryLaneUnlockedAt); return; }
      if (memoryLaneEligible(couple)) {
        const ts = await markMemoryLaneUnlocked(uid);
        if (!cancelled) setMemoryLaneUnlockedAt(ts);
      } else {
        setMemoryLaneUnlockedAt(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, couple?.createdAt, couple?.firstRitualCompletedAt]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.subtitle}>Games & challenges for the two of you</Text>

      <Text style={styles.sectionLabel}>Games</Text>
      {GAMES.map((f) => (
        <FeatureCard
          key={f.route}
          {...f}
          subtitle={personalise(f.subtitle, partner?.name)}
          isSubscribed={isSubscribed}
          isLDR={isLDR}
        />
      ))}
      {memoryLaneUnlockedAt !== undefined && (
        <FeatureCard
          {...MEMORY_LANE}
          subtitle={memoryLaneUnlockedAt ? MEMORY_LANE.subtitle : `Unlocks after ${memoryLaneDays === 1 ? '1 more day' : `${memoryLaneDays} more days`} together`}
          isSubscribed={isSubscribed}
          isLDR={isLDR}
          isNew={isUnlockRecent(memoryLaneUnlockedAt ?? undefined)}
          gateLabel={memoryLaneUnlockedAt ? undefined : `${memoryLaneDays}d`}
          onGatedPress={() => showToast(`Memory Lane quizzes you on your own story, so it needs ${memoryLaneDays === 1 ? 'one more day' : `${memoryLaneDays} more days`} of it first.`)}
        />
      )}

      <Text style={styles.sectionLabel}>Challenges</Text>
      {CHALLENGES.map((f) => <FeatureCard key={f.route} {...f} subtitle={personalise(f.subtitle, partner?.name)} isSubscribed={isSubscribed} isLDR={isLDR} />)}
      {toast}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.cream },
  container: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { fontFamily: Fonts.heading, fontSize: 40, color: Colors.burgundy },
  subtitle: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, marginBottom: Spacing.lg },
  sectionLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.sm, gap: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(136,14,79,0.08)',
    ...Shadow.sm,
  },
  cardEmoji: { fontSize: 38 },
  cardText: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  cardSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  arrow: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.muted },
  newBadge: {
    backgroundColor: Colors.burgundy, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  newBadgeText: {
    fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.cream, letterSpacing: 0.8,
  },
  inPersonPill: {
    backgroundColor: 'rgba(136,14,79,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  inPersonPillText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.burgundy,
    letterSpacing: 0.8,
  },
  gatePill: {
    backgroundColor: 'rgba(136,14,79,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  gatePillText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.burgundy,
  },
});
