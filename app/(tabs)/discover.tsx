import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useCouple } from '../../hooks/useCouple';
import { useSubscription } from '../../hooks/useSubscription';
import { personalise } from '../../services/personalise';
import { getPartnerBinaryAnswerCount, VERSUS_UNLOCK_THRESHOLD } from '../../services/versusService';
import { getFeatureUnlockState, markVersusUnlocked, isVersusUnlockRecent } from '../../services/featureUnlockService';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';
import { useTrackScreen } from '../../hooks/useTrackScreen';

type GameCard = {
  emoji: string; title: string; subtitle: string; route: string; bg: string; paid: boolean; inPerson?: boolean;
};

// Versus is data-gated (see below), so it isn't in the static GAMES list —
// it's inserted at render time only when the partner has enough binary-
// question history to make it playable.
const GAMES: GameCard[] = [
  { emoji: '💫', title: 'Daily',                subtitle: 'Picks to vote on and questions to answer, fresh every day', route: '/daily',          bg: '#E3F2FD', paid: false },
  { emoji: '🎯', title: 'Truth or Dare',        subtitle: 'Solo spin or 2-phone multiplayer round',        route: '/truth-dare',     bg: '#F3E5F5', paid: false },
  { emoji: '🤔', title: 'Would You Rather',     subtitle: 'Both answer at the same time, then reveal',   route: '/would-you-rather', bg: '#FFF9C4', paid: false },
  // Activity Cards' cards ask you to do things in the same room together.
  // LDR pairs get an "IN-PERSON" pill so they know before opening.
  { emoji: '🃏', title: 'Activity Cards',        subtitle: 'Take turns picking a mystery card together',  route: '/bingo',          bg: '#FCE4EC', paid: true, inPerson: true },
  { emoji: '🎁', title: 'Dares',                subtitle: 'Challenge {partner}, they complete by a deadline', route: '/dares',   bg: '#FFF3E0', paid: false },
  { emoji: '✨', title: 'Fantasy Wishes',       subtitle: 'Vote privately, only mutual Yes is ever revealed', route: '/fantasy-wishes', bg: '#F3E5F5', paid: true },
];

const VERSUS_CARD: GameCard = {
  emoji: '🆚', title: 'Versus', subtitle: 'How well do you know {partner}? Guess their answers',
  route: '/versus', bg: '#FFE5EC', paid: false,
};

const CHALLENGES = [
  { emoji: '🗓️', title: '30-Day Challenge', subtitle: 'Reconnect, Spark, or Fire, a daily practice', route: '/challenge', bg: '#FFF9C4', paid: false },
  { emoji: '💘', title: "Tonight's Date",       subtitle: 'Let fate pick your perfect date idea',      route: '/roulette',  bg: '#E8F5E9', paid: false },
];

function FeatureCard({
  emoji, title, subtitle, route, bg, paid, isSubscribed, isNew, inPerson, isLDR,
}: {
  emoji: string; title: string; subtitle: string; route: string; bg: string; paid: boolean; isSubscribed: boolean; isNew?: boolean; inPerson?: boolean; isLDR?: boolean;
}) {
  const locked = paid && !isSubscribed;
  const showInPersonPill = !!inPerson && !!isLDR;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg }]}
      onPress={() => router.push(locked ? '/upgrade' : route as any)}
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
      <Text style={styles.arrow}>{locked ? '🔒' : '›'}</Text>
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const { isSubscribed } = useSubscription();

  useTrackScreen('discover');

  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const coupleId = profile?.coupleId;
  const isLDR = !!couple?.isLongDistance;

  // Versus visibility state.
  //  - null   = still checking (first mount, before Firestore reads land)
  //  - false  = locked (partner doesn't have enough binary history yet)
  //  - true   = unlocked (either previously persisted, or crossed threshold this session)
  const [versusUnlocked, setVersusUnlocked] = useState<boolean | null>(null);
  const [versusIsNew, setVersusIsNew] = useState(false);

  useEffect(() => {
    if (!uid || !partnerId || !coupleId) {
      setVersusUnlocked(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Read persisted unlock first — cheap doc read via in-memory cache.
      // Once unlocked, we never re-query the expensive partner-answer
      // count. This is the whole point of persistence: keep the 45-day
      // dailyQuestions scan gated behind still-locked-users only.
      const state = await getFeatureUnlockState(uid);
      if (cancelled) return;
      if (state.versusUnlockedAt) {
        setVersusUnlocked(true);
        setVersusIsNew(isVersusUnlockRecent(state.versusUnlockedAt));
        return;
      }
      // Still locked → check partner's binary answer count against the
      // threshold. If met, persist the unlock so future mounts skip this
      // query entirely.
      try {
        const count = await getPartnerBinaryAnswerCount(coupleId, partnerId);
        if (cancelled) return;
        if (count >= VERSUS_UNLOCK_THRESHOLD) {
          await markVersusUnlocked(uid);
          if (cancelled) return;
          setVersusUnlocked(true);
          setVersusIsNew(true); // Fresh unlock — decorate with NEW badge
        } else {
          setVersusUnlocked(false);
        }
      } catch {
        // Fail closed — hide Versus rather than show a card that could
        // dead-end. Next mount will retry.
        if (!cancelled) setVersusUnlocked(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, partnerId, coupleId]);

  // Assemble Games list. Versus slots in between Daily and Truth or Dare
  // when unlocked, matching its original position.
  const gamesToRender: GameCard[] = versusUnlocked
    ? [GAMES[0], VERSUS_CARD, ...GAMES.slice(1)]
    : GAMES;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.subtitle}>Games & challenges for the two of you</Text>

      <Text style={styles.sectionLabel}>Games</Text>
      {gamesToRender.map((f) => (
        <FeatureCard
          key={f.route}
          {...f}
          subtitle={personalise(f.subtitle, partner?.name)}
          isSubscribed={isSubscribed}
          isLDR={isLDR}
          isNew={f.route === '/versus' && versusIsNew}
        />
      ))}

      <Text style={styles.sectionLabel}>Challenges</Text>
      {CHALLENGES.map((f) => <FeatureCard key={f.route} {...f} subtitle={personalise(f.subtitle, partner?.name)} isSubscribed={isSubscribed} isLDR={isLDR} />)}
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
});
