import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { aggregateYearSummary, YearSummary } from '../services/yearInReviewService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type CardKind = 'cover' | 'days' | 'moods' | 'rituals' | 'sundays' | 'presence' | 'matches' | 'sparks' | 'tease' | 'intimacy' | 'outro';

// Any counter above zero means the year's review will have real content
// beyond just the days-together number (which comes from couple.startDate,
// not activity). Used to decide whether to fall back from current year to
// previous year on load.
function hasAnyActivity(s: YearSummary): boolean {
  return s.totalMoods > 0
    || s.questionsAnswered > 0
    || s.momentsCaptured > 0
    || s.notesExchanged > 0
    || s.intimacyEntries > 0
    || s.presenceCycles > 0
    || s.fantasyMatches > 0
    || s.sundayCheckins > 0
    || s.sparksSent > 0
    || s.teaseCount > 0;
}

export default function YearInReviewScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [summary, setSummary] = useState<YearSummary | null>(null);
  const [effectiveYear, setEffectiveYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  useTrackScreen('year_in_review');

  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  // Try current year first, fall back to previous year if empty. Fixes the
  // dead-end where a mid-year visit (e.g. July 2026) would show 2025 with
  // no data because the couple had not existed yet. Cost: one extra
  // Firestore roundtrip only when current year is genuinely empty, which
  // is exactly when the fallback is needed anyway.
  useEffect(() => {
    if (!profile?.coupleId) return;
    const opts = {
      intimacyLogEnabled: profile?.features?.intimacyLog,
      startDate: couple?.startDate,
    };
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    let cancelled = false;
    (async () => {
      try {
        const current = await aggregateYearSummary(profile.coupleId!, uid, partnerId, currentYear, opts);
        if (cancelled) return;
        if (hasAnyActivity(current)) {
          setSummary(current);
          setEffectiveYear(currentYear);
        } else {
          const last = await aggregateYearSummary(profile.coupleId!, uid, partnerId, lastYear, opts);
          if (cancelled) return;
          // Even if both are empty, we still land on the last-year summary so
          // the "days together" / "outro" cards have something to render;
          // moods/rituals will show 0. Alternative: dedicated empty-state
          // card, deferred to post-launch analytics on how often this hits.
          setSummary(last);
          setEffectiveYear(lastYear);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.coupleId, uid, partnerId, couple?.startDate, profile?.features?.intimacyLog]);

  // Decide which cards to show — every non-cover/outro card is
  // data-gated, so a paid tier they never used or a free-tier feature
  // they skipped doesn't render an empty slide. Order flows from time
  // → feelings → daily rituals → weekly ritual → paid depth features
  // → intimacy log → outro. Skip any card whose count is zero.
  const cards: CardKind[] = ['cover', 'days', 'moods'];
  if (summary && (summary.questionsAnswered > 0 || summary.momentsCaptured > 0 || summary.notesExchanged > 0)) cards.push('rituals');
  if ((summary?.sundayCheckins ?? 0) > 0) cards.push('sundays');
  if ((summary?.presenceCycles ?? 0) > 0) cards.push('presence');
  if ((summary?.fantasyMatches ?? 0) > 0) cards.push('matches');
  if ((summary?.sparksSent ?? 0) > 0) cards.push('sparks');
  if ((summary?.teaseCount ?? 0) > 0) cards.push('tease');
  if ((summary?.intimacyEntries ?? 0) > 0) cards.push('intimacy');
  cards.push('outro');

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const newPage = Math.round(x / screenWidth);
    if (newPage !== page) setPage(newPage);
  };

  const partnerName = partner?.name ?? 'Partner';
  const myName = profile?.name ?? 'You';

  if (loading || !summary) {
    return (
      <View style={[styles.fullscreen, styles.center]}>
        <ActivityIndicator color={Colors.cream} size="large" />
        <Text style={styles.loadingText}>Putting your year together...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullscreen}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
      >
        {cards.map((kind, i) => (
          <CardView
            key={kind}
            kind={kind}
            summary={summary}
            year={effectiveYear}
            myName={myName}
            partnerName={partnerName}
            isLast={i === cards.length - 1}
          />
        ))}
      </ScrollView>

      {/* Top header with close + page dots */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.dots}>
          {cards.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>
    </View>
  );
}

function CardView({
  kind, summary, year, myName, partnerName, isLast,
}: {
  kind: CardKind;
  summary: YearSummary;
  year: number;
  myName: string;
  partnerName: string;
  isLast: boolean;
}) {
  const wrap = { width: screenWidth, height: screenHeight };

  if (kind === 'cover') {
    return (
      <LinearGradient
        colors={['#7a0b46', '#880E4F', '#6a0a3e']}
        style={[wrap, styles.cardWrap]}
      >
        <Text style={styles.coverEyebrow}>YOUR YEAR TOGETHER</Text>
        <Text style={styles.coverYear}>{year}</Text>
        <Text style={styles.coverNames}>{myName}  &  {partnerName}</Text>
        <Text style={styles.coverHint}>Swipe to begin →</Text>
      </LinearGradient>
    );
  }

  if (kind === 'days') {
    return (
      <LinearGradient
        colors={['#F4A7B9', '#F8BBD0', '#FCE4EC']}
        style={[wrap, styles.cardWrap]}
      >
        <Text style={styles.statEyebrow}>TIME TOGETHER</Text>
        {summary.daysTogether !== null ? (
          <>
            <Text style={styles.bigNumber}>{summary.daysTogether.toLocaleString('en-US')}</Text>
            <Text style={styles.statLabel}>days since your story began</Text>
          </>
        ) : (
          <>
            <Text style={styles.bigNumber}>∞</Text>
            <Text style={styles.statLabel}>set your start date in Profile</Text>
          </>
        )}
      </LinearGradient>
    );
  }

  if (kind === 'moods') {
    return (
      <LinearGradient
        colors={['#FFF4E8', '#F8DDC5', '#F4A7B9']}
        style={[wrap, styles.cardWrap]}
      >
        <Text style={styles.statEyebrow}>HOW YOU FELT</Text>
        {summary.topMoodMine || summary.topMoodTheirs ? (
          <View style={styles.moodPair}>
            {summary.topMoodMine && (
              <View style={styles.moodSide}>
                <Text style={styles.moodName}>{myName}</Text>
                <Text style={styles.moodEmoji}>{summary.topMoodMine.emoji}</Text>
                <Text style={styles.moodLabel}>{summary.topMoodMine.label}</Text>
                <Text style={styles.moodCount}>{summary.topMoodMine.count} days</Text>
              </View>
            )}
            {summary.topMoodTheirs && (
              <View style={styles.moodSide}>
                <Text style={styles.moodName}>{partnerName}</Text>
                <Text style={styles.moodEmoji}>{summary.topMoodTheirs.emoji}</Text>
                <Text style={styles.moodLabel}>{summary.topMoodTheirs.label}</Text>
                <Text style={styles.moodCount}>{summary.topMoodTheirs.count} days</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.bigNumber}>{summary.totalMoods}</Text>
            <Text style={styles.statLabel}>moods logged this year</Text>
          </>
        )}
      </LinearGradient>
    );
  }

  if (kind === 'rituals') {
    return (
      <LinearGradient
        colors={['#A4366A', '#880E4F', '#6a0a3e']}
        style={[wrap, styles.cardWrap]}
      >
        <Text style={[styles.statEyebrow, { color: 'rgba(255,248,240,0.7)' }]}>YOUR RITUALS</Text>
        <View style={styles.ritualGrid}>
          <RitualRow emoji="💬" count={summary.questionsAnswered} label="questions answered" />
          <RitualRow emoji="📸" count={summary.momentsCaptured} label="moments captured together" />
          <RitualRow emoji="💌" count={summary.notesExchanged} label="love notes opened" />
        </View>
      </LinearGradient>
    );
  }

  if (kind === 'sundays') {
    return (
      <LinearGradient
        colors={['#FFF8F0', '#FCE4EC', '#F4A7B9']}
        style={[wrap, styles.cardWrap]}
      >
        <Text style={styles.statEyebrow}>SUNDAY CHECK-INS</Text>
        <Text style={styles.bigNumber}>{summary.sundayCheckins}</Text>
        <Text style={styles.statLabel}>weeks you paused to look at us</Text>
      </LinearGradient>
    );
  }

  if (kind === 'presence') {
    return (
      <LinearGradient
        colors={['#6a0a3e', '#880E4F', '#A4366A']}
        style={[wrap, styles.cardWrap]}
      >
        <Text style={[styles.statEyebrow, { color: 'rgba(255,248,240,0.7)' }]}>PRESENCE</Text>
        <Text style={[styles.bigNumber, { color: Colors.cream }]}>{summary.presenceCycles}</Text>
        <Text style={[styles.statLabel, { color: Colors.cream }]}>
          {summary.presenceCycles === 1 ? 'full cycle together' : 'full cycles together'}
        </Text>
      </LinearGradient>
    );
  }

  if (kind === 'matches') {
    return (
      <LinearGradient
        colors={['#F4A7B9', '#EC7A9B', '#A4366A']}
        style={[wrap, styles.cardWrap]}
      >
        <Text style={[styles.statEyebrow, { color: 'rgba(255,248,240,0.85)' }]}>FANTASY MATCHES</Text>
        <Text style={[styles.bigNumber, { color: Colors.cream }]}>{summary.fantasyMatches}</Text>
        <Text style={[styles.statLabel, { color: Colors.cream }]}>times you both said yes to the same thing</Text>
      </LinearGradient>
    );
  }

  if (kind === 'sparks') {
    return (
      <LinearGradient
        colors={['#FFF4E8', '#F8DDC5', '#F4A7B9']}
        style={[wrap, styles.cardWrap]}
      >
        <Text style={styles.statEyebrow}>SPARKS SENT</Text>
        <Text style={styles.bigNumber}>{summary.sparksSent}</Text>
        <Text style={styles.statLabel}>times you reached for {partnerName}</Text>
      </LinearGradient>
    );
  }

  if (kind === 'tease') {
    return (
      <LinearGradient
        colors={['#3D1A24', '#6a0a3e', '#880E4F']}
        style={[wrap, styles.cardWrap]}
      >
        <Text style={[styles.statEyebrow, { color: 'rgba(255,248,240,0.7)' }]}>TEASE</Text>
        <Text style={[styles.bigNumber, { color: Colors.cream }]}>{summary.teaseCount}</Text>
        <Text style={[styles.statLabel, { color: Colors.cream }]}>ephemeral moments, gone by morning</Text>
      </LinearGradient>
    );
  }

  if (kind === 'intimacy') {
    return (
      <LinearGradient
        colors={['#FCE4EC', '#F8BBD0', '#F4A7B9']}
        style={[wrap, styles.cardWrap]}
      >
        <Text style={styles.statEyebrow}>SHARED INTIMACY</Text>
        <Text style={styles.bigNumber}>{summary.intimacyEntries}</Text>
        <Text style={styles.statLabel}>logged moments together</Text>
      </LinearGradient>
    );
  }

  // outro
  return (
    <LinearGradient
      colors={['#7a0b46', '#880E4F', '#6a0a3e']}
      style={[wrap, styles.cardWrap]}
    >
      <Text style={styles.outroHeart}>♥</Text>
      <Text style={styles.outroTitle}>Here's to {year + 1}</Text>
      <Text style={styles.outroSub}>Screenshot to share. Story to be continued.</Text>
      <TouchableOpacity style={styles.outroBtn} onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.outroBtnText}>Back to home</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

function RitualRow({ emoji, count, label }: { emoji: string; count: number; label: string }) {
  return (
    <View style={styles.ritualRow}>
      <Text style={styles.ritualEmoji}>{emoji}</Text>
      <Text style={styles.ritualCount}>{count.toLocaleString('en-US')}</Text>
      <Text style={styles.ritualLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.cream, marginTop: Spacing.md },

  header: {
    position: 'absolute', top: 56, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.cream },
  dots: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,248,240,0.35)' },
  dotActive: { backgroundColor: Colors.cream, width: 20 },

  cardWrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: 120,
  },

  // Cover
  coverEyebrow: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(255,248,240,0.7)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: Spacing.md },
  coverYear: { fontFamily: Fonts.heading, fontSize: 96, color: Colors.cream, marginVertical: Spacing.sm },
  coverNames: { fontFamily: Fonts.headingItalic, fontSize: 32, color: Colors.cream, marginTop: Spacing.lg, textAlign: 'center' },
  coverHint: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: 'rgba(255,248,240,0.6)', marginTop: Spacing.xxl, position: 'absolute', bottom: 100 },

  // Stat cards
  statEyebrow: { fontFamily: Fonts.body, fontSize: 11, color: Colors.burgundy, letterSpacing: 4, textTransform: 'uppercase', marginBottom: Spacing.lg },
  bigNumber: { fontFamily: Fonts.heading, fontSize: 120, color: Colors.burgundy, lineHeight: 130 },
  statLabel: { fontFamily: Fonts.headingItalic, fontSize: 22, color: Colors.burgundy, textAlign: 'center', marginTop: Spacing.md },

  // Mood pair
  moodPair: { flexDirection: 'row', gap: Spacing.xl, alignItems: 'flex-start' },
  moodSide: { alignItems: 'center', flex: 1, gap: 8 },
  moodName: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy, textTransform: 'uppercase', letterSpacing: 1 },
  moodEmoji: { fontSize: 80 },
  moodLabel: { fontFamily: Fonts.headingItalic, fontSize: 22, color: Colors.burgundy },
  moodCount: { fontFamily: Fonts.body, fontSize: 13, color: Colors.burgundy },

  // Rituals
  ritualGrid: { gap: Spacing.xl, marginTop: Spacing.lg },
  ritualRow: { alignItems: 'center', gap: 4 },
  ritualEmoji: { fontSize: 40, marginBottom: 4 },
  ritualCount: { fontFamily: Fonts.heading, fontSize: 56, color: Colors.cream, lineHeight: 60 },
  ritualLabel: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: 'rgba(255,248,240,0.8)' },

  // Outro
  outroHeart: { fontSize: 80, color: 'rgba(255,248,240,0.4)' },
  outroTitle: { fontFamily: Fonts.headingItalic, fontSize: 40, color: Colors.cream, marginTop: Spacing.md, textAlign: 'center' },
  outroSub: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: 'rgba(255,248,240,0.7)', marginTop: Spacing.md, textAlign: 'center' },
  outroBtn: {
    marginTop: Spacing.xxl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: Radius.full, backgroundColor: 'rgba(255,248,240,0.18)',
  },
  outroBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream, letterSpacing: 1 },
});
