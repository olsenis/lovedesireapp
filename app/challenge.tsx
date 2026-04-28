import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { notifyPartner } from '../services/notificationService';
import {
  ChallengeState, subscribeChallenge, startChallenge, activateChallenge,
  editTask, markDayComplete, vetoDay, resetChallenge, MAX_EDITS, MAX_VETOES,
} from '../services/challengeService';
import { CHALLENGE_PROGRAMS, CHALLENGE_PROGRAM_CONFIG, ChallengeProgram } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const PROGRAMS: ChallengeProgram[] = ['reconnect', 'spark', 'fire', 'desire'];

export default function ChallengeScreen() {
  const { user, profile, loading: authLoading } = useAuth();
  const [state, setState] = useState<ChallengeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [desireModal, setDesireModal] = useState(false);
  const [pendingProgram, setPendingProgram] = useState<ChallengeProgram | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editDay, setEditDay] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const help = useHelp('challenge');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';

  useEffect(() => {
    if (authLoading) return;
    if (!coupleId) { setLoading(false); return; }
    const unsub = subscribeChallenge(coupleId, (s) => {
      setState(s);
      setLoading(false);
    });
    return unsub;
  }, [coupleId, authLoading]);

  const handleStart = (program: ChallengeProgram) => {
    if (starting) return;
    // Show desire modal before coupleId check so warning always appears
    if (program === 'desire') { setPendingProgram(program); setDesireModal(true); return; }
    if (!coupleId) { setStartError('Account not ready yet — try again shortly.'); return; }
    setStartError('');
    doStart(program);
  };

  const doStart = async (program: ChallengeProgram) => {
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startChallenge(coupleId!, program);
    } catch (e: any) {
      setStartError(e?.code === 'permission-denied' ? 'Permission denied — check Firebase rules.' : `Error: ${e?.message ?? String(e)}`);
      setStarting(false);
    }
  };

  const confirmDesire = () => {
    setDesireModal(false);
    if (!coupleId) { setStartError('Account not ready yet — try again shortly.'); setPendingProgram(null); return; }
    if (pendingProgram) doStart(pendingProgram);
    setPendingProgram(null);
  };

  const handleActivate = async () => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await activateChallenge(coupleId);
  };

  const openEditModal = (day: number) => {
    if (!state) return;
    const tasks = CHALLENGE_PROGRAMS[state.program!];
    const current = state.customTasks?.[day] ?? tasks.find(t => t.day === day)?.text ?? '';
    setEditDay(day);
    setEditText(current);
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!coupleId || editDay === null || !editText.trim() || !state) return;
    await editTask(coupleId, editDay, uid, editText.trim(), state);
    setEditModal(false);
    setEditDay(null);
  };

  const handleMark = async () => {
    if (!coupleId || !user || !state) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markDayComplete(coupleId, user.uid, state.currentDay, state);
    notifyPartner(coupleId, user.uid, 'Challenge update ✓', `${profile?.name ?? 'Your partner'} marked day ${state.currentDay} done — your turn`).catch(() => {});
  };

  const handleVeto = async () => {
    if (!coupleId || !user || !state) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await vetoDay(coupleId, user.uid, state);
  };

  const handleReset = async () => { if (!coupleId) return; await resetChallenge(coupleId); };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>30-Day Challenge</Text>
          <View style={{ width: 60 }} />
        </View>
      </View>
    );
  }

  // ─── Program picker ─────────────────────────────────────────────────────────
  if (!state || !state.program) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>30-Day Challenge</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.pickerContent}>
          {!coupleId && <Text style={styles.debugText}>⏳ Setting up account… wait a moment then try again.</Text>}
          {startError ? <View style={styles.errorBox}><Text style={styles.errorText}>{startError}</Text></View> : null}
          <Text style={styles.pickerIntro}>A daily practice for 30 days. Each task builds on the last — choose your intensity.</Text>
          {PROGRAMS.map((p) => {
            const cfg = CHALLENGE_PROGRAM_CONFIG[p];
            return (
              <TouchableOpacity key={p} style={[styles.programCard, { backgroundColor: cfg.color, borderColor: cfg.color }, starting && { opacity: 0.6 }]}
                onPress={() => handleStart(p)} activeOpacity={0.85} disabled={starting}>
                <View style={styles.programTop}>
                  <Text style={styles.programEmoji}>{cfg.emoji}</Text>
                  <View style={styles.programInfo}>
                    <Text style={[styles.programLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
                    <Text style={styles.programDesc}>{cfg.description}</Text>
                  </View>
                </View>
                <Text style={[styles.programStart, { color: cfg.textColor }]}>{starting ? 'Starting…' : 'Start this program →'}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Desire content warning modal */}
        <Modal visible={desireModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalEmoji}>💋</Text>
              <Text style={styles.modalTitle}>Desire — 18+ only</Text>
              <Text style={styles.modalSubtitle}>This program contains explicit sexual content. Make sure you're both comfortable before starting.</Text>
              <Text style={styles.rulesTitle}>Rules</Text>
              {[
                'Each partner can modify or replace 2 days before the challenge starts. No edits after.',
                'Each partner gets 2 VETO days — use them to skip a day and just have regular sex.',
                'If a day is missed, the challenge extends by one day (max 40 days total).',
                "If a partner has no edits or vetoes left, they can borrow their partner's veto. That partner picks the replacement.",
                'Periods, illness, or travel can be treated as a pause.',
              ].map((rule, i) => (
                <View key={i} style={styles.ruleRow}>
                  <Text style={styles.ruleDot}>·</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmDesire} activeOpacity={0.85}>
                <Text style={styles.confirmBtnText}>I'm in — let's go 💋</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDesireModal(false)} style={styles.cancelLink}>
                <Text style={styles.cancelLinkText}>Not now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const cfg = CHALLENGE_PROGRAM_CONFIG[state.program];
  const tasks = CHALLENGE_PROGRAMS[state.program];
  const myEditsUsed = state.editsUsed?.[uid] ?? 0;
  const myEditsLeft = MAX_EDITS - myEditsUsed;
  const myVetoesLeft = MAX_VETOES - (state.vetoesUsed?.[uid] ?? 0);

  // ─── Setup phase — review & edit days ───────────────────────────────────────
  if (state.phase === 'setup') {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Review Days</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.setupContent}>
          <View style={[styles.setupBadge, { backgroundColor: cfg.color }]}>
            <Text style={styles.setupBadgeEmoji}>{cfg.emoji}</Text>
            <Text style={[styles.setupBadgeLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.setupIntro}>Review all 30 days. You can swap up to {MAX_EDITS} of them before starting.</Text>
          <View style={[styles.editCounter, myEditsLeft === 0 && styles.editCounterDone]}>
            <Text style={styles.editCounterText}>
              {myEditsLeft > 0 ? `✏️ You have ${myEditsLeft} edit${myEditsLeft > 1 ? 's' : ''} remaining` : '✓ No edits remaining'}
            </Text>
          </View>

          {tasks.map((task) => {
            const custom = state.customTasks?.[task.day];
            const displayText = custom ?? task.text;
            const isCustom = !!custom;
            return (
              <View key={task.day} style={[styles.dayCard, isCustom && styles.dayCardEdited]}>
                <View style={styles.dayCardLeft}>
                  <Text style={[styles.dayNum, { color: cfg.textColor }]}>{task.day}</Text>
                </View>
                <Text style={styles.dayText}>{displayText}</Text>
                {myEditsLeft > 0 && (
                  <TouchableOpacity onPress={() => openEditModal(task.day)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>✏️</Text>
                  </TouchableOpacity>
                )}
                {isCustom && myEditsLeft === 0 && <Text style={styles.editedBadge}>edited</Text>}
              </View>
            );
          })}

          <TouchableOpacity style={[styles.activateBtn, { backgroundColor: cfg.textColor }]} onPress={handleActivate} activeOpacity={0.85}>
            <Text style={styles.activateBtnText}>Start Challenge →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} style={styles.cancelLink}>
            <Text style={styles.cancelLinkText}>Choose a different program</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Edit day modal */}
        <Modal visible={editModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Edit Day {editDay}</Text>
              <Text style={styles.modalSubtitle}>Replace this day's task with your own.</Text>
              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
                placeholderTextColor={Colors.muted}
              />
              <View style={styles.editModalBtns}>
                <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditModal(false)}>
                  <Text style={styles.cancelLinkText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveEdit} activeOpacity={0.85}>
                  <Text style={styles.confirmBtnText}>Save edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─── Active phase ────────────────────────────────────────────────────────────
  const todayTask = tasks.find((t) => t.day === state.currentDay);
  const todayText = state.customTasks?.[state.currentDay] ?? todayTask?.text ?? '';
  const myMarked = (state.completedBy[state.currentDay] ?? []).includes(uid);
  const bothMarked = (state.completedBy[state.currentDay] ?? []).length >= 2;
  const progress = Math.round((state.completedDays.length / 30) * 100);
  const isVetoDay = state.customTasks?.[state.currentDay]?.startsWith('🎲 Free day');

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>30-Day Challenge</Text>
        <TouchableOpacity onPress={handleReset}><Text style={styles.resetBtn}>Reset</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.programBadge, { backgroundColor: cfg.color }]}>
          <Text style={styles.programBadgeEmoji}>{cfg.emoji}</Text>
          <Text style={[styles.programBadgeLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Day {state.currentDay} of 30</Text>
            <Text style={styles.progressPct}>{progress}% complete</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: cfg.textColor }]} />
          </View>
        </View>

        {todayTask && (
          <View style={[styles.taskCard, { borderLeftColor: cfg.textColor }]}>
            <View style={styles.taskDayBadge}>
              <Text style={[styles.taskDayNum, { color: cfg.textColor }]}>{state.currentDay}</Text>
              <Text style={styles.taskDayLabel}>{isVetoDay ? 'veto day' : 'today'}</Text>
            </View>
            <Text style={styles.taskText}>{todayText}</Text>

            {bothMarked ? (
              <View style={styles.completedRow}>
                <Text style={styles.completedText}>✓ Both done — great work today</Text>
              </View>
            ) : myMarked ? (
              <Text style={styles.waitingText}>You've marked this done — waiting for your partner ✓</Text>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.markBtn, { backgroundColor: cfg.textColor, flex: 1 }]} onPress={handleMark} activeOpacity={0.85}>
                  <Text style={styles.markBtnText}>Mark as done ✓</Text>
                </TouchableOpacity>
                {myVetoesLeft > 0 && !isVetoDay && (
                  <TouchableOpacity style={styles.vetoBtn} onPress={handleVeto} activeOpacity={0.85}>
                    <Text style={styles.vetoBtnText}>🎲 Veto ({myVetoesLeft})</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {state.completedDays.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Completed</Text>
            <View style={styles.daysGrid}>
              {state.completedDays.map((d) => {
                const t = state.customTasks?.[d] ?? tasks.find((x) => x.day === d)?.text;
                const isVeto = t?.startsWith('🎲 Free day');
                return (
                  <View key={d} style={[styles.completedDay, { backgroundColor: cfg.color }]}>
                    <Text style={[styles.completedDayNum, { color: cfg.textColor }]}>{isVeto ? '🎲' : d}</Text>
                    <Text style={styles.completedDayText} numberOfLines={2}>{t}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <HelpModal
        visible={help.visible}
        title="30-Day Challenge"
        description="A daily practice for 30 days. Choose your intensity — Reconnect, Spark, Fire, or Desire."
        tips={[
          'Setup phase: each partner can swap 2 days before starting',
          'Both must mark a day done for it to count',
          'Use a Veto (2 each) to skip a day and just have sex instead',
          'Desire program is 18+ — a content warning appears before starting',
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
  resetBtn: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  // Picker
  pickerContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg, paddingTop: Spacing.lg },
  pickerIntro: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  programCard: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1, ...Shadow.sm },
  programTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  programEmoji: { fontSize: 36 },
  programInfo: { flex: 1, gap: 4 },
  programLabel: { fontFamily: Fonts.heading, fontSize: 22 },
  programDesc: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, lineHeight: 20 },
  programStart: { fontFamily: Fonts.bodyBold, fontSize: 14, alignSelf: 'flex-end' },
  debugText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },
  errorBox: { backgroundColor: '#FFEBEE', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.error },
  errorText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.error, textAlign: 'center', lineHeight: 20 },

  // Setup phase
  setupContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm, paddingTop: Spacing.md },
  setupBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.full },
  setupBadgeEmoji: { fontSize: 18 },
  setupBadgeLabel: { fontFamily: Fonts.bodyBold, fontSize: 14 },
  setupIntro: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, lineHeight: 22 },
  editCounter: { backgroundColor: Colors.blush, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  editCounterDone: { backgroundColor: Colors.cream },
  editCounterText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  dayCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  dayCardEdited: { borderColor: Colors.rose, backgroundColor: '#FFF0F3' },
  dayCardLeft: { minWidth: 28, alignItems: 'center' },
  dayNum: { fontFamily: Fonts.heading, fontSize: 18, lineHeight: 22 },
  dayText: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 18 },
  editBtn: { padding: 4 },
  editBtnText: { fontSize: 16 },
  editedBadge: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.burgundy, textTransform: 'uppercase', letterSpacing: 0.5 },
  activateBtn: { paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.md },
  activateBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.white },

  // Active phase
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
  actionRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  markBtn: { paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  markBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
  vetoBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  vetoBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  completedRow: { paddingTop: Spacing.xs },
  completedText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.success },
  waitingText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  daysGrid: { gap: Spacing.sm },
  completedDay: { borderRadius: Radius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  completedDayNum: { fontFamily: Fonts.heading, fontSize: 22, lineHeight: 26, minWidth: 28 },
  completedDayText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, flex: 1, lineHeight: 18 },

  // Desire modal + edit modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(61,26,36,0.55)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalEmoji: { fontSize: 40, textAlign: 'center' },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy, textAlign: 'center' },
  modalSubtitle: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  rulesTitle: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.sm },
  ruleRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  ruleDot: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.rose, lineHeight: 22 },
  ruleText: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 22 },
  confirmBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.sm },
  confirmBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },
  cancelLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  cancelLinkText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
  noCoupleWarning: { backgroundColor: '#FFF3CD', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: '#F9A825' },
  noCoupleText: { fontFamily: Fonts.body, fontSize: 14, color: '#7B5200', textAlign: 'center', lineHeight: 20 },
  editInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, minHeight: 100, borderWidth: 1, borderColor: Colors.border },
  editModalBtns: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  editCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
});
