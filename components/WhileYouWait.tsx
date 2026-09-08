import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

// Rendered under every in-screen "waiting for {partner}" state. Partner-lag
// is the biggest churn driver we can't fix with content: one partner does
// their half, sees a dead "waiting" card, and leaves. This turns that dead
// end into 1-3 things the user can do solo right now. No modal, no
// animation, no pressure copy. Self-subscribes to today's Moments doc so
// the Moment chip disappears once the user has captured.
//
// `exclude` lets a screen hide the chip that points back at itself.

type Chip = 'moment' | 'note' | 'presence';

interface Props {
  exclude?: Chip[];
}

export function WhileYouWait({ exclude = [] }: Props) {
  const { user, profile } = useAuth();
  const { isSubscribed } = useSubscription();
  const coupleId = profile?.coupleId;
  const uid = user?.uid;
  // null = unknown (don't flash the chip), boolean once resolved.
  const [capturedToday, setCapturedToday] = useState<boolean | null>(null);

  useEffect(() => {
    if (!coupleId || !uid) return;
    // Same UTC day key as momentService.
    const today = new Date().toISOString().slice(0, 10);
    return onSnapshot(
      doc(db, 'couples', coupleId, 'moments', today),
      (snap) => setCapturedToday(!!snap.data()?.photos?.[uid]),
      () => setCapturedToday(false),
    );
  }, [coupleId, uid]);

  const chips: { emoji: string; label: string; route: string }[] = [];
  if (!exclude.includes('moment') && capturedToday === false) {
    chips.push({ emoji: '📸', label: "Take today's Moment", route: '/moments' });
  }
  if (!exclude.includes('note')) {
    chips.push({ emoji: '💌', label: 'Leave a Love Note', route: '/notes' });
  }
  if (!exclude.includes('presence') && isSubscribed) {
    chips.push({ emoji: '🫁', label: '5-min Presence mini', route: '/sensate?mini=1' });
  }
  if (chips.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>While you wait</Text>
      <View style={styles.row}>
        {chips.map((c) => (
          <TouchableOpacity
            key={c.route}
            style={styles.chip}
            onPress={() => router.push(c.route as any)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={c.label}
          >
            <Text style={styles.chipEmoji}>{c.emoji}</Text>
            <Text style={styles.chipLabel}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.muted,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.blush,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.rose,
  },
  chipEmoji: { fontSize: 14 },
  chipLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.burgundy,
  },
});
