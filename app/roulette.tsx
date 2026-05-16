import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { DATE_IDEAS, DateIdea } from '../constants/content';
import { useAuth } from '../hooks/useAuth';
import { addTodo } from '../services/todoService';
import { DateRatings, subscribeDateRatings, rateDate, getKey } from '../services/dateRatingService';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

const TYPE_COLORS = { home: '#FFF9C4', out: '#E8F5E9', adventure: '#E3F2FD' };
const TYPE_LABELS = { home: 'At Home 🏠', out: 'Going Out ✨', adventure: 'Adventure 🌟' };

function Stars({ rating, onRate }: { rating: number; onRate?: (r: number) => void }) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onRate?.(s)} disabled={!onRate} activeOpacity={0.7} accessibilityRole="button">
          <Text style={[starStyles.star, s <= rating && starStyles.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 22, color: Colors.border },
  starFilled: { color: '#F9A825' },
});

export default function RouletteScreen() {
  const { user, profile } = useAuth();
  const [result, setResult] = useState<DateIdea | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ratings, setRatings] = useState<DateRatings>({});
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [filter, setFilter] = useState<'all' | 'home' | 'out' | 'adventure'>('all');
  const help = useHelp('date-night');

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeDateRatings(profile.coupleId, setRatings);
  }, [profile?.coupleId]);

  const handleRate = async (title: string, r: number) => {
    if (!profile?.coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await rateDate(profile.coupleId, title, r);
  };

  const handleSave = async () => {
    if (!result || !profile?.coupleId || !user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addTodo(profile.coupleId, result.title, 'dates', user.uid, 'roulette');
    setSaved(true);
  };

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setSaved(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 2000,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start(() => {
      const pool = filter === 'all' ? DATE_IDEAS : DATE_IDEAS.filter((d) => d.type === filter);
      if (pool.length === 0) { setSpinning(false); return; }
      const picked = pool[Math.floor(Math.random() * pool.length)];
      setResult(picked);
      setSpinning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1800deg'],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Date Night</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sub}>Let fate decide your next date</Text>

        {/* Filter */}
        <View style={styles.filterRow}>
          {(['all', 'home', 'out', 'adventure'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.filterBtn, filter === t && styles.filterActive]}
              onPress={() => { setFilter(t); setResult(null); }}
              activeOpacity={0.8}
             accessibilityRole="button">
              <Text style={[styles.filterText, filter === t && styles.filterTextActive]}>
                {t === 'all' ? 'All ✨' : TYPE_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Spinner */}
        <View style={styles.spinnerOuter}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spinRotate }] }]}>
            <Text style={styles.spinnerEmoji}>🎰</Text>
          </Animated.View>
        </View>

        <TouchableOpacity style={styles.spinBtn} onPress={spin} disabled={spinning} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.spinBtnText}>{spinning ? 'Choosing…' : 'Spin for a Date!'}</Text>
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <View style={[styles.resultCard, { backgroundColor: TYPE_COLORS[result.type] }]}>
            <Text style={styles.resultEmoji}>{result.emoji}</Text>
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.resultDesc}>{result.description}</Text>
            <View style={styles.resultFooter}>
              <Text style={styles.resultType}>{TYPE_LABELS[result.type]}</Text>
              <TouchableOpacity onPress={spin} accessibilityRole="button">
                <Text style={styles.reroll}>Try again ↻</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>
                {ratings[getKey(result.title)] ? 'Your rating' : 'Rate this date'}
              </Text>
              <Stars rating={ratings[getKey(result.title)] ?? 0} onRate={(r) => handleRate(result.title, r)} />
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, saved && styles.saveBtnDone]}
              onPress={handleSave}
              disabled={saved}
              activeOpacity={0.85}
             accessibilityRole="button">
              <Text style={styles.saveBtnText}>{saved ? '✓ Saved to Together List' : '💾 Save for later'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* All options list */}
        <Text style={styles.listTitle}>All date ideas</Text>
        {(filter === 'all' ? DATE_IDEAS : DATE_IDEAS.filter((d) => d.type === filter)).map((idea) => {
          const r = ratings[getKey(idea.title)] ?? 0;
          return (
            <View key={idea.title} style={[styles.ideaRow, r > 0 && styles.ideaRowRated]}>
              <View style={[styles.ideaIconWrap, { backgroundColor: TYPE_COLORS[idea.type] }]}>
                <Text style={styles.ideaEmoji}>{idea.emoji}</Text>
              </View>
              <View style={styles.ideaText}>
                <Text style={styles.ideaTitle}>{idea.title}</Text>
                <Text style={styles.ideaDesc}>{idea.description}</Text>
                <Stars rating={r} onRate={(s) => handleRate(idea.title, s)} />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <HelpModal
        visible={help.visible}
        title="Date Night Roulette"
        description="Let fate decide your next date. Spin for a random date idea from 48 options across three types."
        tips={[
          'Filter by At Home, Going Out, or Adventure',
          'Spin and get a random date idea',
          'Tap Try again to get a different one',
          'Browse all 48 ideas in the list below',
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center', paddingTop: Spacing.lg },
  sub: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, marginBottom: Spacing.lg },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl, justifyContent: 'center' },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterActive: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  filterText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  filterTextActive: { color: Colors.cream, fontFamily: Fonts.bodyBold },

  spinnerOuter: { marginBottom: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  spinner: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: Colors.blush,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  spinnerEmoji: { fontSize: 68 },

  spinBtn: {
    backgroundColor: Colors.burgundy,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.full,
    marginBottom: Spacing.xl,
  },
  spinBtnText: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Colors.cream },

  resultCard: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultEmoji: { fontSize: 52 },
  resultTitle: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.text, textAlign: 'center' },
  resultDesc: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 22 },
  resultFooter: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: Spacing.sm },
  resultType: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted },
  reroll: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, width: '100%', marginTop: Spacing.xs },
  rateLabel: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },
  saveBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radius.full, width: '100%', alignItems: 'center', marginTop: Spacing.sm },
  saveBtnDone: { backgroundColor: Colors.success },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.white },

  listTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, alignSelf: 'flex-start', marginBottom: Spacing.md },
  ideaRowRated: { borderColor: '#F9A825' },
  ideaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ideaIconWrap: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ideaEmoji: { fontSize: 26 },
  ideaText: { flex: 1, paddingTop: 2 },
  ideaTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  ideaDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 18, marginTop: 2 },
});
