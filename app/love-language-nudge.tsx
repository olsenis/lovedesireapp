import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { LoveLanguage, LOVE_LANGUAGE_LABELS } from '../constants/content';
import { pickWeeklyActions } from '../services/loveLanguageNudgeService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';

// Short one-liner per language explaining what it is — kept subtle so
// the actions get the visual weight, not the theory.
const LANGUAGE_HINT: Record<LoveLanguage, (name: string) => string> = {
  words: (name) => `${name} feels loved when you say it, appreciation, notice, spoken affection.`,
  acts: (name) => `${name} feels loved when you do it, small chores handled, effort taken off ${name}'s plate.`,
  gifts: (name) => `${name} feels loved when you think of ${name}, a token that says "I saw this, thought of you".`,
  time: (name) => `${name} feels loved when you show up, undivided attention, present, phone away.`,
  touch: (name) => `${name} feels loved when you reach, hugs, hand-holds, contact that is not asking for more.`,
};

const LANGUAGE_EMOJI: Record<LoveLanguage, string> = {
  words: '💬', acts: '🛠️', gifts: '🎁', time: '⏳', touch: '🤝',
};

export default function LoveLanguageNudgeScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  useTrackScreen('love_language_nudge');

  const partnerLang = partner?.loveLanguage as LoveLanguage | undefined;
  const partnerName = partner?.name ?? 'your partner';
  const coupleId = profile?.coupleId ?? '';

  const actions = useMemo(
    () => (partnerLang ? pickWeeklyActions(partnerLang, coupleId) : []),
    [partnerLang, coupleId],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Love Language</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!partner ? (
          <EmptyCard
            emoji="👤"
            title="No partner paired yet"
            body="Pair with your partner from Profile to see how they speak love."
          />
        ) : !partnerLang ? (
          <EmptyCard
            emoji="✏️"
            title={`${partnerName} hasn't done the quiz yet`}
            body={`Once ${partnerName} completes the Love Language quiz, we'll show three ways to speak their language each week here.`}
            cta="Take the quiz yourself"
            onCtaPress={() => router.push('/quiz' as any)}
          />
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroEmoji}>{LANGUAGE_EMOJI[partnerLang]}</Text>
              <Text style={styles.heroLabel}>{partnerName}'s language</Text>
              <Text style={styles.heroLang}>{LOVE_LANGUAGE_LABELS[partnerLang].label}</Text>
              <Text style={styles.heroHint}>{LANGUAGE_HINT[partnerLang](partnerName)}</Text>
            </View>

            <Text style={styles.sectionLabel}>3 ways to try this week</Text>
            <View style={styles.actionsList}>
              {actions.map((a, i) => (
                <View key={i} style={styles.actionCard}>
                  <Text style={styles.actionNum}>{i + 1}</Text>
                  <Text style={styles.actionText}>{a}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.footerHint}>
              A new set of three lands here every Monday. Both of you see the same suggestions, compare notes over the week.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function EmptyCard({ emoji, title, body, cta, onCtaPress }: {
  emoji: string; title: string; body: string; cta?: string; onCtaPress?: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {cta && onCtaPress && (
        <TouchableOpacity style={styles.emptyCta} onPress={onCtaPress} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.emptyCtaText}>{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.md },

  // ─── Hero card ────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#FFF5F8',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  heroEmoji: { fontSize: 56, marginBottom: 4 },
  heroLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  heroLang: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.burgundy, marginTop: 2 },
  heroHint: {
    fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.text,
    textAlign: 'center', lineHeight: 22, marginTop: Spacing.sm,
  },

  sectionLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.md,
  },
  actionsList: { gap: Spacing.sm },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-start',
  },
  actionNum: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.burgundy,
    lineHeight: 26,
    width: 24,
    textAlign: 'center',
  },
  actionText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  footerHint: {
    fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted,
    textAlign: 'center', lineHeight: 20, marginTop: Spacing.md, paddingHorizontal: Spacing.md,
  },

  // ─── Empty states ─────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, textAlign: 'center' },
  emptyBody: {
    fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.sm,
  },
  emptyCta: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: Colors.burgundy,
  },
  emptyCtaText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream, letterSpacing: 0.3 },
});
