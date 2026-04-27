import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { ChallengeState, subscribeChallenge, startChallenge, markDayComplete, resetChallenge } from '../services/challengeService';
import { CHALLENGE_PROGRAMS, CHALLENGE_PROGRAM_CONFIG, ChallengeProgram } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const PROGRAMS: ChallengeProgram[] = ['reconnect', 'spark', 'fire'];

export default function ChallengeScreen() {
  const { user, profile } = useAuth();
  const [state, setState] = useState<ChallengeState | null>(null);
  const [loading, setLoading] = useState(true);

  const coupleId = profile?.coupleId;

  useEffect(() => {
    if (!coupleId) return;
    const unsub = subscribeChallenge(coupleId, (s) => {
      setState(s);
      setLoading(false);
    });
    return unsub;
  }, [coupleId]);

  const handleStart = async (program: ChallengeProgram) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startChallenge(coupleId, program);
  };

  const handleMark = async () => {
    if (!coupleId || !user || !state) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markDayComplete(coupleId, user.uid, state.currentDay, state);
  };

  const handleReset = async () => {
    if (!coupleId) return;
    await resetChallenge(coupleId);
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>30-Day Challenge</Text>
          <View style={{ width: 60 }} />
        </View>
      </View>
    );
  }

  // No active challenge — show program picker
  if (!state || !state.program) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>30-Day Challenge</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.pickerContent}>
          <Text style={styles.pickerIntro}>
            A daily practice for 30 days. Each task builds on the last — choose your intensity.
          </Text>
          {PROGRAMS.map((p) => {
            const cfg = CHALLENGE_PROGRAM_CONFIG[p];
            return (
              <TouchableOpacity
                key={p}
                style={[styles.programCard, { backgroundColor: cfg.color, borderColor: cfg.color }]}
                onPress={() => handleStart(p)}
                activeOpacity={0.85}
              >
                <View style={styles.programTop}>
                  <Text style={styles.programEmoji}>{cfg.emoji}</Text>
                  <View style={styles.programInfo}>
                    <Text style={[styles.programLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
                    <Text style={styles.programDesc}>{cfg.description}</Text>
                  </View>
                </View>
                <Text style={[styles.programStart, { color: cfg.textColor }]}>Start this program →</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // Active challenge
  const cfg = CHALLENGE_PROGRAM_CONFIG[state.program];
  const tasks = CHALLENGE_PROGRAMS[state.program];
  const todayTask = tasks.find((t) => t.day === state.currentDay);
  const myMarked = user ? (state.completedBy[state.currentDay] ?? []).includes(user.uid) : false;
  const bothMarked = (state.completedBy[state.currentDay] ?? []).length >= 2;
  const progress = Math.round((state.completedDays.length / 30) * 100);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>30-Day Challenge</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetBtn}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Program badge */}
        <View style={[styles.programBadge, { backgroundColor: cfg.color }]}>
          <Text style={styles.programBadgeEmoji}>{cfg.emoji}</Text>
          <Text style={[styles.programBadgeLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Day {state.currentDay} of 30</Text>
            <Text style={styles.progressPct}>{progress}% complete</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: cfg.textColor }]} />
          </View>
        </View>

        {/* Today's task card */}
        {todayTask && (
          <View style={[styles.taskCard, { borderLeftColor: cfg.textColor }]}>
            <View style={styles.taskDayBadge}>
              <Text style={[styles.taskDayNum, { color: cfg.textColor }]}>{state.currentDay}</Text>
              <Text style={styles.taskDayLabel}>today</Text>
            </View>
            <Text style={styles.taskText}>{todayTask.text}</Text>

            {bothMarked ? (
              <View style={styles.completedRow}>
                <Text style={styles.completedEmoji}>✓</Text>
                <Text style={styles.completedText}>Both done — great work today</Text>
              </View>
            ) : myMarked ? (
              <View style={styles.waitingRow}>
                <Text style={styles.waitingText}>You've marked this done — waiting for your partner ✓</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.markBtn, { backgroundColor: cfg.textColor }]}
                onPress={handleMark}
                activeOpacity={0.85}
              >
                <Text style={styles.markBtnText}>Mark as done ✓</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Previous days */}
        {state.completedDays.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Completed</Text>
            <View style={styles.daysGrid}>
              {state.completedDays.map((d) => {
                const t = tasks.find((x) => x.day === d);
                return (
                  <View key={d} style={[styles.completedDay, { backgroundColor: cfg.color }]}>
                    <Text style={[styles.completedDayNum, { color: cfg.textColor }]}>{d}</Text>
                    <Text style={styles.completedDayText} numberOfLines={2}>{t?.text}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
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
  resetBtn: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  pickerContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg, paddingTop: Spacing.lg },
  pickerIntro: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 22 },

  programCard: {
    borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md,
    borderWidth: 1, ...Shadow.sm,
  },
  programTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  programEmoji: { fontSize: 36 },
  programInfo: { flex: 1, gap: 4 },
  programLabel: { fontFamily: Fonts.heading, fontSize: 22 },
  programDesc: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, lineHeight: 20 },
  programStart: { fontFamily: Fonts.bodyBold, fontSize: 14, alignSelf: 'flex-end' },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg, paddingTop: Spacing.md },

  programBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.full },
  programBadgeEmoji: { fontSize: 18 },
  programBadgeLabel: { fontFamily: Fonts.bodyBold, fontSize: 14 },

  progressSection: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  progressPct: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  taskCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, ...Shadow.sm,
  },
  taskDayBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  taskDayNum: { fontFamily: Fonts.heading, fontSize: 42, lineHeight: 46 },
  taskDayLabel: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  taskText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.text, lineHeight: 26 },

  markBtn: { paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.xs },
  markBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xs },
  completedEmoji: { fontSize: 20, color: Colors.success },
  completedText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.success },
  waitingRow: { paddingTop: Spacing.xs },
  waitingText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  daysGrid: { gap: Spacing.sm },
  completedDay: { borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  completedDayNum: { fontFamily: Fonts.heading, fontSize: 22, lineHeight: 26, minWidth: 28 },
  completedDayText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, flex: 1, lineHeight: 18 },
});
