import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { PulseResult, subscribePulseHistory, savePulseResult, getPulseTrend } from '../services/pulseService';

const QUESTIONS = [
  { key: 'communication', label: 'Communication',       emoji: '💬' },
  { key: 'time',          label: 'Quality Time',        emoji: '⏱️' },
  { key: 'affection',     label: 'Physical Affection',  emoji: '🤗' },
  { key: 'fun',           label: 'Fun & Laughter',      emoji: '😄' },
  { key: 'support',       label: 'Feeling Supported',   emoji: '🙌' },
  { key: 'trust',         label: 'Trust & Honesty',     emoji: '🔒' },
  { key: 'intimacy',      label: 'Intimacy',            emoji: '🕯️' },
  { key: 'appreciation',  label: 'Feeling Appreciated', emoji: '⭐' },
  { key: 'growth',        label: 'Growing Together',    emoji: '🌱' },
  { key: 'overall',       label: 'Overall Happiness',   emoji: '❤️' },
];

const SCORE_LABELS = ['', 'Needs work', 'Could be better', 'It\'s okay', 'Pretty good', 'Amazing'];
const SCORE_COLORS = ['', Colors.error, '#F9A825', Colors.muted, Colors.success, Colors.burgundy];

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Mini trend chart: vertical bars left-to-right, oldest to newest, height = avg/5 * fill area.
function TrendChart({ results }: { results: PulseResult[] }) {
  const chrono = [...results].reverse().slice(-8); // oldest to newest, max 8 points
  if (chrono.length < 2) return null;
  return (
    <View style={chartStyles.wrap}>
      <Text style={chartStyles.title}>Pulse over time</Text>
      <LinearGradient colors={[Colors.blush, Colors.cream]} style={chartStyles.chartBg}>
        <View style={chartStyles.bars}>
          {chrono.map((r) => {
            const heightPct = Math.max(((r.avg - 1) / 4) * 100, 6); // min 6% so even 1.0 renders a sliver
            const color = r.avg >= 4 ? Colors.burgundy : r.avg >= 3 ? Colors.rose : Colors.muted;
            return (
              <View key={r.id} style={chartStyles.barCol}>
                <View style={[chartStyles.bar, { height: `${heightPct}%`, backgroundColor: color }]} />
              </View>
            );
          })}
        </View>
      </LinearGradient>
      <View style={chartStyles.axis}>
        <Text style={chartStyles.axisText}>{fmtShortDate(chrono[0].createdAt)}</Text>
        <Text style={chartStyles.axisText}>{fmtShortDate(chrono[chrono.length - 1].createdAt)}</Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { width: '100%', gap: 6 },
  title: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  chartBg: { height: 120, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  axisText: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted },
});

export default function HitaScreen() {
  const { user, profile } = useAuth();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [resultsTab, setResultsTab] = useState<'results' | 'history'>('results');
  const [history, setHistory] = useState<PulseResult[]>([]);
  const help = useHelp('relationship-pulse');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';

  useEffect(() => {
    if (!coupleId) return;
    return subscribePulseHistory(coupleId, uid, setHistory);
  }, [coupleId, uid]);

  const allAnswered = QUESTIONS.every((q) => scores[q.key] !== undefined);
  const avg = allAnswered ? Object.values(scores).reduce((a, b) => a + b, 0) / QUESTIONS.length : 0;
  const trend = getPulseTrend(history);

  const lastCheckIn = history.length > 0 ? history[0].createdAt : null;
  const daysSinceLast = lastCheckIn ? Math.floor((Date.now() - lastCheckIn) / 86400000) : null;

  const submit = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (coupleId) await savePulseResult(coupleId, uid, scores, avg);
    setDone(true);
    setResultsTab('results');
  };

  const getSuggestion = (): string => {
    const lowest = QUESTIONS.reduce((min, q) => (scores[q.key] ?? 5) < (scores[min.key] ?? 5) ? q : min, QUESTIONS[0]);
    const suggestions: Record<string, string> = {
      communication: "Try a 15-minute phone-free conversation tonight.",
      time: "Plan one activity together this week with no distractions.",
      affection: "Give a long hug every morning and evening for a week.",
      fun: "Do something silly together, a game, a new activity, anything.",
      support: "Ask your partner: 'What do you need from me right now?'",
      trust: "Share something vulnerable you haven't mentioned recently.",
      intimacy: "Check your Wishlist together and pick something mutual.",
      appreciation: "Tell your partner 3 specific things you noticed this week.",
      growth: "Set a small shared goal, something to work on together.",
      overall: "Spend an evening just talking, no phones, no TV.",
    };
    return suggestions[lowest.key] ?? "Take time this week for each other.";
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Relationship Pulse</Text>
        <View style={{ width: 60 }} />
      </View>

      {!done ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.intro}>
            Rate how things are going, privately. Use this to understand yourself, not to judge your partner.
          </Text>
          {daysSinceLast !== null && daysSinceLast > 0 && (
            <Text style={styles.lastCheckIn}>Last check-in: {daysSinceLast} days ago</Text>
          )}

          {QUESTIONS.map((q) => (
            <View key={q.key} style={styles.qCard}>
              <View style={styles.qTop}>
                <Text style={styles.qEmoji}>{q.emoji}</Text>
                <Text style={styles.qLabel}>{q.label}</Text>
                {scores[q.key] && (
                  <Text style={[styles.qScore, { color: SCORE_COLORS[scores[q.key]] }]}>
                    {SCORE_LABELS[scores[q.key]]}
                  </Text>
                )}
              </View>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = scores[q.key] === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.ratingBtn, active && { backgroundColor: SCORE_COLORS[n], borderColor: SCORE_COLORS[n] }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setScores((s) => ({ ...s, [q.key]: n })); }}
                      activeOpacity={0.8}
                     accessibilityRole="button">
                      <Text style={[styles.ratingNum, active && { color: Colors.white }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitBtn, !allAnswered && styles.submitDisabled]}
            onPress={submit}
            disabled={!allAnswered}
           accessibilityRole="button">
            <Text style={styles.submitText}>See my pulse →</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          {/* Results/History tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity style={[styles.tabBtn, resultsTab === 'results' && styles.tabBtnActive]} onPress={() => setResultsTab('results')} accessibilityRole="button">
              <Text style={[styles.tabText, resultsTab === 'results' && styles.tabTextActive]}>Results</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, resultsTab === 'history' && styles.tabBtnActive]} onPress={() => setResultsTab('history')} accessibilityRole="button">
              <Text style={[styles.tabText, resultsTab === 'history' && styles.tabTextActive]}>History</Text>
            </TouchableOpacity>
          </View>

          {resultsTab === 'results' ? (
            <ScrollView contentContainerStyle={styles.results}>
              <Text style={styles.resultTitle}>Your Pulse</Text>
              <LinearGradient
                colors={['#FFF0F3', Colors.blush, '#F4A7B9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gauge}
              >
                <Text style={styles.gaugeOrnament}>✦</Text>
                <Text style={styles.gaugeNum}>{avg.toFixed(1)}</Text>
                <Text style={styles.gaugeLabel}>out of 5</Text>
              </LinearGradient>

              <Text style={styles.resultMsg}>
                {avg >= 4.5 ? "Things are flourishing 🌸 Keep nurturing what you have." :
                 avg >= 3.5 ? "You're in a good place 💕 Small gestures go a long way." :
                 avg >= 2.5 ? "There's room to grow 🌱 Every relationship has seasons." :
                              "It's worth some attention 💬 Small steps make a real difference."}
              </Text>

              <View style={styles.suggestionBox}>
                <Text style={styles.suggestionTitle}>A gentle suggestion</Text>
                <Text style={styles.suggestionText}>{getSuggestion()}</Text>
              </View>

              <View style={styles.barList}>
                {QUESTIONS.map((q) => (
                  <View key={q.key} style={styles.barRow}>
                    <Text style={styles.barEmoji}>{q.emoji}</Text>
                    <View style={styles.barWrap}>
                      <Text style={styles.barLabel}>{q.label}</Text>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { width: `${(scores[q.key] / 5) * 100}%`, backgroundColor: SCORE_COLORS[scores[q.key]] }]} />
                      </View>
                    </View>
                    <Text style={styles.barNum}>{scores[q.key]}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.retakeBtn} onPress={() => { setScores({}); setDone(false); }} accessibilityRole="button">
                <Text style={styles.retakeText}>Retake ↻</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.historyContent}>
              <TrendChart results={history} />
              {trend && (
                <View style={styles.trendCard}>
                  <Text style={styles.trendText}>
                    {trend === 'improving' ? '📈 Your score has been improving recently' :
                     trend === 'declining' ? '📉 Your score has declined a little recently' :
                     '➡️ Your score has been stable recently'}
                  </Text>
                </View>
              )}
              {history.length < 3 && (
                <Text style={styles.historyHint}>Take the quiz regularly to see your trend</Text>
              )}
              {history.map((r) => (
                <View key={r.id} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>{fmtDate(r.createdAt)}</Text>
                    <View style={styles.historyBarBg}>
                      <View style={[styles.historyBarFill, { width: `${(r.avg / 5) * 100}%`, backgroundColor: SCORE_COLORS[Math.round(r.avg)] }]} />
                    </View>
                  </View>
                  <Text style={[styles.historyAvg, { color: SCORE_COLORS[Math.round(r.avg)] }]}>{r.avg.toFixed(1)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      <HelpModal
        visible={help.visible}
        title="Relationship Pulse"
        description="A private check-in on how you're feeling about your relationship. Your partner never sees your individual scores."
        tips={[
          "Rate 10 areas from 1 (needs work) to 5 (amazing)",
          "Completely private, your partner cannot see your answers",
          "After submitting, you see your score, a suggestion, and your history",
          "Come back monthly to track how things change over time",
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },

  tabBar: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginVertical: Spacing.sm, backgroundColor: Colors.white, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.burgundy },
  tabText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  tabTextActive: { color: Colors.white },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md, paddingTop: Spacing.md },
  intro: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  lastCheckIn: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },

  qCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  qTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qEmoji: { fontSize: 22 },
  qLabel: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text, flex: 1 },
  qScore: { fontFamily: Fonts.bodyItalic, fontSize: 12 },
  ratingRow: { flexDirection: 'row', gap: Spacing.sm },
  ratingBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cream },
  ratingNum: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.muted },

  submitBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.md },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },

  results: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg, alignItems: 'center', paddingTop: Spacing.xl },
  resultTitle: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  gauge: { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: Colors.white, shadowColor: Colors.burgundy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  gaugeOrnament: { position: 'absolute', top: 18, fontSize: 14, color: Colors.burgundy, opacity: 0.6 },
  gaugeNum: { fontFamily: Fonts.heading, fontSize: 64, color: Colors.burgundy, lineHeight: 70 },
  gaugeLabel: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.burgundy, opacity: 0.7 },
  resultMsg: { fontFamily: Fonts.bodyItalic, fontSize: 16, color: Colors.text, textAlign: 'center', lineHeight: 26 },
  suggestionBox: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, width: '100%', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, borderLeftColor: Colors.rose },
  suggestionTitle: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  suggestionText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  barList: { width: '100%', gap: Spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barEmoji: { fontSize: 20, width: 28 },
  barWrap: { flex: 1, gap: 2 },
  barLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  barBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barNum: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text, width: 16 },
  retakeBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  retakeText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },

  historyContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.md },
  trendCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  trendText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.text, textAlign: 'center' },
  historyHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  historyLeft: { flex: 1, gap: 4 },
  historyDate: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  historyBarBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  historyBarFill: { height: '100%', borderRadius: 3 },
  historyAvg: { fontFamily: Fonts.heading, fontSize: 22, width: 40, textAlign: 'right' },
});
