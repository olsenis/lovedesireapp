import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { useCouple } from '../hooks/useCouple';
import * as Haptics from 'expo-haptics';
import { useSubscription } from '../hooks/useSubscription';
import { notifyPartner } from '../services/notificationService';
import { MoodEntry, MoodEmoji, MOOD_LABELS, ALL_MOODS, subscribeMoodHistory, setMood, getTodaysMood, subscribeToMoods, CUSTOM_MOOD, moodLabel, moodCaption } from '../services/moodService';
import { OwnWordsSheet } from '../components/OwnWordsSheet';
import { unlockMoodNotes } from '../services/noteService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';

const MOOD_COLORS: Partial<Record<MoodEmoji, string>> = {
  '😍': '#FCE4EC', '🥰': '#FCE4EC', '😊': '#E8F5E9', '😌': '#E3F2FD',
  '😴': '#FFF9C4', '💪': '#E8F5E9', '😤': '#FFEBEE', '😢': '#E3F2FD',
  '😈': '#F3E5F5', '🥵': '#FFF3E0',
};

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function mostFrequent(entries: MoodEntry[]): MoodEmoji | null {
  if (entries.length === 0) return null;
  const counts: Partial<Record<MoodEmoji, number>> = {};
  for (const e of entries) counts[e.emoji] = (counts[e.emoji] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as MoodEmoji;
}

export default function MoodHistoryScreen() {
  const { user, profile } = useAuth();
  const help = useHelp('mood-history');
  const { partner } = useCouple(user?.uid, profile?.coupleId);
  const { isSubscribed } = useSubscription();
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  // ?tab=together: the partner's mood pill on Home opens this screen there.
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'mine' | 'together'>(params.tab === 'together' ? 'together' : 'mine');
  const [myMood, setMyMood] = useState<MoodEntry | null>(null);
  const [showOwnWords, setShowOwnWords] = useState(false);
  const [ownWords, setOwnWords] = useState('');
  useTrackScreen('mood_history');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const ADULT_MOODS: MoodEmoji[] = ['😈', '🥵'];
  const visibleMoods = ALL_MOODS.filter(m => isSubscribed || !ADULT_MOODS.includes(m));

  useEffect(() => {
    if (!coupleId) return;
    return subscribeMoodHistory(coupleId, setMoods);
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId || !user) return;
    getTodaysMood(coupleId, user.uid).then(setMyMood);
    return subscribeToMoods(coupleId, (allMoods) => {
      setMyMood(allMoods.find(m => m.uid === user.uid) ?? null);
    });
  }, [coupleId, user?.uid]);

  const handleMoodPick = async (emoji: MoodEmoji, label?: string) => {
    if (!user || !coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await setMood(coupleId, user.uid, emoji, undefined, label);
      setMyMood({ id: 'optimistic', uid: user.uid, emoji, label, createdAt: Date.now() });
      notifyPartner(
        coupleId, user.uid,
        'New mood 💫', `${profile?.name ?? 'Your partner'} is feeling ${emoji} ${moodLabel(emoji, label)}`,
        { title: 'New mood 💫', body: `${profile?.name ?? 'Your partner'} updated a mood` },
      ).catch(() => {});
      unlockMoodNotes(coupleId, user.uid, emoji).catch(() => {});
    } catch (e) {
      console.error('setMood failed:', e);
    }
  };

  const myMoods = moods.filter(m => m.uid === uid);
  const partnerMoods = moods.filter(m => m.uid !== uid);
  const partnerName = partner?.name ?? 'Partner';

  // Build 30-day calendar
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    const entry = myMoods.find(m => dayKey(m.createdAt) === key);
    return { key, day: d.getDate(), entry };
  });

  const myTop = mostFrequent(myMoods);
  // A plain count, never a streak: no streaks and no pressure words is a
  // product rule (VOICE.md), and the paywall says "No streaks" out loud.
  const daysLogged = days.filter((d) => !!d.entry).length;

  // Together stats (last 14 days)
  const last14Keys = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
  const bothDays = last14Keys.filter(k =>
    myMoods.some(m => dayKey(m.createdAt) === k) &&
    partnerMoods.some(m => dayKey(m.createdAt) === k)
  );
  const sameMoodDays = bothDays.filter(k => {
    const myEmoji = myMoods.find(m => dayKey(m.createdAt) === k)?.emoji;
    const partnerEmoji = partnerMoods.find(m => dayKey(m.createdAt) === k)?.emoji;
    return myEmoji && partnerEmoji && myEmoji === partnerEmoji;
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mood History</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'mine' && styles.tabBtnActive]} onPress={() => setTab('mine')} accessibilityRole="button">
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>Mine</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'together' && styles.tabBtnActive]} onPress={() => setTab('together')} accessibilityRole="button">
          <Text style={[styles.tabText, tab === 'together' && styles.tabTextActive]}>Together</Text>
        </TouchableOpacity>
      </View>

      {tab === 'mine' ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* How are you feeling — today */}
          <View style={styles.todayCard}>
            <Text style={styles.todayLabel}>
              {myMood ? "Change today's mood" : "How are you feeling today?"}
            </Text>
            <View style={styles.moodGrid}>
              {visibleMoods.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.moodBtn, myMood?.emoji === emoji && styles.moodBtnActive]}
                  onPress={() => handleMoodPick(emoji)}
                  activeOpacity={0.7}
                 accessibilityRole="button">
                  <Text style={styles.moodEmoji}>{emoji}</Text>
                  <Text style={styles.moodLabel}>{MOOD_LABELS[emoji]}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                key="own"
                style={[styles.moodBtn, myMood?.emoji === CUSTOM_MOOD && styles.moodBtnActive]}
                onPress={() => { setOwnWords(myMood?.emoji === CUSTOM_MOOD ? (myMood.label ?? '') : ''); setShowOwnWords(true); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Describe your mood in your own words">
                <Text style={styles.moodEmoji}>{CUSTOM_MOOD}</Text>
                {/* A picker button, not a display: the words are read on Home and in Together. */}
                <Text style={styles.moodLabel}>Own words</Text>
              </TouchableOpacity>
            </View>
          </View>

          <OwnWordsSheet
            visible={showOwnWords}
            initial={ownWords}
            onCancel={() => setShowOwnWords(false)}
            onSave={(words) => { setShowOwnWords(false); handleMoodPick(CUSTOM_MOOD, words); }}
          />

          {/* Stats row */}
          <View style={styles.statsRow}>
            {myTop && (
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>{myTop}</Text>
                <Text style={styles.statLabel}>Most common</Text>
                <Text style={styles.statSub}>{moodLabel(myTop)}</Text>
              </View>
            )}
            <View style={[styles.statCard, !myTop && { width: '100%' }]}>
              <Text style={styles.statNum}>{daysLogged}</Text>
              <Text style={styles.statLabel}>Days logged</Text>
              <Text style={styles.statSub}>{daysLogged > 0 ? 'in the last 30 days' : 'Your moods will show here'}</Text>
            </View>
          </View>

          {/* 30-day calendar */}
          <Text style={styles.sectionLabel}>Last 30 days</Text>
          <View style={styles.calendar}>
            {days.map(({ key, day, entry }) => (
              <View
                key={key}
                style={[
                  styles.calDay,
                  entry ? { backgroundColor: MOOD_COLORS[entry.emoji] ?? Colors.blush } : styles.calDayEmpty,
                ]}
              >
                {entry ? (
                  <Text style={styles.calEmoji}>{entry.emoji}</Text>
                ) : (
                  <Text style={styles.calDayNum}>{day}</Text>
                )}
              </View>
            ))}
          </View>
          {myMoods.length === 0 && (
            <Text style={styles.emptyText}>Log your mood daily to build your history</Text>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{sameMoodDays.length}</Text>
              <Text style={styles.statLabel}>Same mood</Text>
              <Text style={styles.statSub}>days this fortnight</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{bothDays.length - sameMoodDays.length}</Text>
              <Text style={styles.statLabel}>Different moods</Text>
              <Text style={styles.statSub}>days this fortnight</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Last 14 days</Text>
          <View style={styles.togetherHead}>
            <View style={{ flex: 1 }} />
            <Text style={styles.togetherHeadName} numberOfLines={1}>You</Text>
            <Text style={styles.togetherHeadName} numberOfLines={1}>{partnerName}</Text>
          </View>
          {last14Keys.map(k => {
            const myEntry = myMoods.find(m => dayKey(m.createdAt) === k);
            const partnerEntry = partnerMoods.find(m => dayKey(m.createdAt) === k);
            if (!myEntry && !partnerEntry) return null;
            const d = new Date(k);
            const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            return (
              <View key={k} style={styles.togetherRow}>
                <Text style={styles.togetherDate}>{label}</Text>
                <View style={styles.togetherEmojis}>
                  <Text style={styles.togetherEmoji}>{myEntry?.emoji ?? '·'}</Text>
                  {myEntry && <Text style={styles.togetherName} numberOfLines={2}>{moodCaption(myEntry.emoji, myEntry.label)}</Text>}
                </View>
                <View style={styles.togetherEmojis}>
                  <Text style={styles.togetherEmoji}>{partnerEntry?.emoji ?? '·'}</Text>
                  {partnerEntry && <Text style={styles.togetherName} numberOfLines={2}>{moodCaption(partnerEntry.emoji, partnerEntry.label)}</Text>}
                </View>
              </View>
            );
          })}
          {bothDays.length === 0 && (
            <Text style={styles.emptyText}>Both of you need to log moods to see this</Text>
          )}
        </ScrollView>
      )}
      <HelpModal
        visible={help.visible}
        title="Mood History"
        description={`Both of your moods over the last weeks, side by side.`}
        tips={[
          `Set today's mood here or on Home`,
          `💬 Own words lets you say it your way, and ${partnerName} sees exactly that`,
          `The calendar shows your month, the chart shows the days you both logged`,
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },

  tabBar: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginVertical: Spacing.sm, backgroundColor: Colors.white, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.burgundy },
  tabText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  tabTextActive: { color: Colors.white },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.lg },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },

  todayCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  todayLabel: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.burgundy },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'space-between' },
  moodBtn: { width: '23%', backgroundColor: '#FFF8F0', borderRadius: Radius.lg, paddingVertical: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  moodBtnActive: { backgroundColor: Colors.blush, borderColor: Colors.rose },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, marginTop: 2, textAlign: 'center' },

  // Fixed share, not flex: 1. Flex sizing here has broken twice (Aug 2026 one
  // character per line, Sep 2026 on RN 0.86 one card collapsed and the other ran
  // off the screen), both times because the row's width was resolved from the
  // labels. A percentage is resolved from the screen and cannot be pushed.
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: Colors.white, borderRadius: Radius.xl, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  statEmoji: { fontSize: 32 },
  statNum: { fontFamily: Fonts.heading, fontSize: 36, color: Colors.burgundy },
  statLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' },
  statSub: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted, textAlign: 'center' },

  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  calDay: { width: '13%', aspectRatio: 1, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  calDayEmpty: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  calEmoji: { fontSize: 18 },
  calDayNum: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center' },

  togetherRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  togetherDate: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, flex: 1 },
  // Fixed width so the two columns line up under the header and a long caption wraps instead of widening the row.
  togetherEmojis: { alignItems: 'center', gap: 2, width: 84 },
  togetherHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, gap: Spacing.md, marginBottom: -Spacing.sm },
  togetherHeadName: { width: 84, textAlign: 'center', fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  togetherEmoji: { fontSize: 24 },
  togetherName: { fontFamily: Fonts.body, fontSize: 10, lineHeight: 13, color: Colors.muted, textAlign: 'center' },
});
