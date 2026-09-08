import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { subscribeToMoods } from '../services/moodService';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

// Rendered under every in-screen "waiting for {partner}" state. Partner-lag
// is the biggest churn driver we can't fix with content: one partner does
// their half, sees a dead "waiting" card, and leaves. This turns that dead
// end into 2-4 things the user can do solo right now. No modal, no
// animation, no pressure copy.
//
// Only genuinely solo, free, low-friction actions belong here. The Presence
// mini was considered and dropped: it is a two-person touch exercise, so it
// cannot be the answer to "your partner is not here right now".
//
// Chips are contextual and live: each one self-subscribes to the one doc it
// needs and disappears the moment the action is done, so the card never
// nags about something already finished today.
//
// `exclude` lets a screen hide the chip that points back at itself.

type Chip = 'moment' | 'note' | 'mood' | 'daily';

interface Props {
  exclude?: Chip[];
}

// Same UTC day key as momentService / dailyQuestionsService.
const todayKey = () => new Date().toISOString().slice(0, 10);

export function WhileYouWait({ exclude = [] }: Props) {
  const { user, profile } = useAuth();
  const coupleId = profile?.coupleId;
  const uid = user?.uid;
  // null = unknown (don't flash a chip), boolean once resolved.
  const [capturedToday, setCapturedToday] = useState<boolean | null>(null);
  const [moodToday, setMoodToday] = useState<boolean | null>(null);
  const [dailyDone, setDailyDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!coupleId || !uid) return;
    const today = todayKey();
    const u1 = onSnapshot(
      doc(db, 'couples', coupleId, 'moments', today),
      (snap) => setCapturedToday(!!snap.data()?.photos?.[uid]),
      () => setCapturedToday(false),
    );
    const u2 = subscribeToMoods(coupleId, (moods) => setMoodToday(moods.some((m) => m.uid === uid)));
    const u3 = onSnapshot(
      doc(db, 'couples', coupleId, 'dailyQuestions', today),
      (snap) => {
        const d = snap.data() as { items?: unknown[]; answers?: Record<string, Record<string, string>> } | undefined;
        const total = d?.items?.length ?? 0;
        const mine = Object.keys(d?.answers?.[uid] ?? {}).length;
        // No doc yet = questions not generated = nothing answered.
        setDailyDone(total > 0 && mine >= total);
      },
      () => setDailyDone(false),
    );
    return () => { u1(); u2(); u3(); };
  }, [coupleId, uid]);

  const chips: { key: Chip; emoji: string; label: string; route: string }[] = [];
  if (!exclude.includes('moment') && capturedToday === false) {
    chips.push({ key: 'moment', emoji: '📸', label: "Take today's Moment", route: '/moments' });
  }
  if (!exclude.includes('daily') && dailyDone === false) {
    chips.push({ key: 'daily', emoji: '💫', label: "Answer today's Daily", route: '/daily' });
  }
  if (!exclude.includes('mood') && moodToday === false) {
    chips.push({ key: 'mood', emoji: '😊', label: 'Log your mood', route: '/(tabs)' });
  }
  if (!exclude.includes('note')) {
    chips.push({ key: 'note', emoji: '💌', label: 'Leave a Love Note', route: '/notes' });
  }
  if (chips.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>While you wait</Text>
      <View style={styles.row}>
        {chips.map((c) => (
          <TouchableOpacity
            key={c.key}
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
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.muted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: Colors.blush,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.rose,
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.burgundy,
  },
});
