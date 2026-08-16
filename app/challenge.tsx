import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useSubscription } from '../hooks/useSubscription';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { notifyPartner } from '../services/notificationService';
import {
  ChallengeState, subscribeChallenge, startChallenge, activateChallenge,
  editTask, markDayComplete, vetoDay, resetChallenge, reorderChallenge, MAX_EDITS, MAX_VETOES,
} from '../services/challengeService';
import { ChallengeTask } from '../constants/content';
import { CHALLENGE_PROGRAMS, CHALLENGE_ALTERNATES, CHALLENGE_PROGRAM_CONFIG, ChallengeProgram } from '../constants/content';
import { personalise } from '../services/personalise';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';

const BASE_PROGRAMS: ChallengeProgram[] = ['reconnect', 'spark', 'fire', 'desire'];
// Programs that require a paid subscription. Free users see them with 🔒
// and get routed to /upgrade when they try to start one, per the free/paid
// split documented in CLAUDE.md.
const PAID_PROGRAMS: Set<ChallengeProgram> = new Set(['fire', 'desire']);

export default function ChallengeScreen() {
  const { user, profile, loading: authLoading } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const partnerName = partner?.name ?? 'your partner';
  const { isSubscribed } = useSubscription();
  const isLDR = !!couple?.isLongDistance;
  const PROGRAMS: ChallengeProgram[] = isLDR ? [...BASE_PROGRAMS, 'distance'] : BASE_PROGRAMS;
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
  useTrackScreen('challenge');

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
    // Paywall: Fire + Desire are premium-only per CLAUDE.md free/paid split.
    // Free users see the card with 🔒 and get sent to /upgrade if they tap it.
    if (PAID_PROGRAMS.has(program) && !isSubscribed) {
      trackEvent('upgrade_cta_tapped');
      router.push('/upgrade' as any);
      return;
    }
    // Show desire modal before coupleId check so warning always appears
    if (program === 'desire') { setPendingProgram(program); setDesireModal(true); return; }
    if (!coupleId) { setStartError('Account not ready yet, try again shortly.'); return; }
    setStartError('');
    doStart(program);
  };

  const doStart = async (program: ChallengeProgram) => {
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startChallenge(coupleId!, program);
    } catch (e: any) {
      setStartError(e?.code === 'permission-denied' ? 'Could not start the challenge, please try again.' : 'Could not start the challenge, please try again.');
    } finally {
      // Always clear the starting flag — previously only reset on error, so a
      // successful start left `starting=true` forever. When the user then hit
      // Back from setup phase (which calls handleReset → clears the Firestore
      // doc), the picker re-rendered with every card stuck showing 'Starting…'
      // and disabled. Only an app kill fixed it. Now the flag always clears
      // whether the Firestore write succeeded or failed.
      setStarting(false);
    }
  };

  const confirmDesire = () => {
    setDesireModal(false);
    if (!coupleId) { setStartError('Account not ready yet, try again shortly.'); setPendingProgram(null); return; }
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
    // Substitute {partner} for the actual partner name at edit time so the
    // user sees a readable prompt, not a raw template token. Whatever the
    // user then saves is stored substituted (Ola instead of {partner}). If
    // partner ever renames after a custom save, that day's task keeps the
    // old name, acceptable since MAX_EDITS caps at 2 per uid / 4 per couple.
    setEditText(personalise(current, partnerName));
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!coupleId || editDay === null || !editText.trim() || !state) return;
    await editTask(coupleId, editDay, uid, editText.trim(), state);
    setEditModal(false);
    setEditDay(null);
  };

  // Refresh button in Edit Day modal: pull next unused task text from the
  // program's pool (alternates + defaults). "Unused" means not already
  // assigned to another day in the current challenge, and not the text
  // currently in the field (so tapping always changes something).
  // Client-only, doesn't touch Firestore, doesn't count as an edit.
  const handleRefresh = () => {
    if (!state?.program || editDay === null) return;
    const defaults = CHALLENGE_PROGRAMS[state.program];
    const alternates = CHALLENGE_ALTERNATES[state.program] ?? [];
    // Normalise everything to personalised form for comparison so a raw
    // {partner}-tokenised default doesn't accidentally match against a
    // customTask that already had the substitution baked in.
    const claimed = new Set<string>();
    for (let d = 1; d <= 30; d++) {
      if (d === editDay) continue;
      const t = state.customTasks?.[d] ?? defaults.find(x => x.day === d)?.text;
      if (t) claimed.add(personalise(t, partnerName));
    }
    claimed.add(editText);
    const rawPool = [...alternates, ...defaults.map(t => t.text)];
    const candidates = rawPool.filter(raw => !claimed.has(personalise(raw, partnerName)));
    if (candidates.length === 0) return;
    const pickRaw = candidates[Math.floor(Math.random() * candidates.length)];
    setEditText(personalise(pickRaw, partnerName));
    Haptics.selectionAsync();
  };

  const handleMark = async () => {
    if (!coupleId || !user || !state) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markDayComplete(coupleId, user.uid, state.currentDay, state);
    notifyPartner(coupleId, user.uid, 'Challenge update ✓', `${profile?.name ?? 'Your partner'} marked day ${state.currentDay} done, your turn`).catch(() => {});
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
          <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>30-Day Challenge</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.pickerContent}>
          {!coupleId && <Text style={styles.debugText}>⏳ Setting up account… wait a moment then try again.</Text>}
          {startError ? <View style={styles.errorBox}><Text style={styles.errorText}>{startError}</Text></View> : null}
          <Text style={styles.pickerIntro}>A daily practice for 30 days. Each task builds on the last, choose your intensity.</Text>
          {PROGRAMS.map((p) => {
            const cfg = CHALLENGE_PROGRAM_CONFIG[p];
            const locked = PAID_PROGRAMS.has(p) && !isSubscribed;
            return (
              <TouchableOpacity key={p} style={[styles.programCard, { backgroundColor: cfg.color, borderColor: cfg.color }, starting && { opacity: 0.6 }]}
                onPress={() => handleStart(p)} activeOpacity={0.85} disabled={starting} accessibilityRole="button">
                <View style={styles.programTop}>
                  <Text style={styles.programEmoji}>{cfg.emoji}</Text>
                  <View style={styles.programInfo}>
                    <Text style={[styles.programLabel, { color: cfg.textColor }]}>
                      {cfg.label}{locked ? '  🔒' : ''}
                    </Text>
                    <Text style={styles.programDesc}>{cfg.description}</Text>
                  </View>
                </View>
                <Text style={[styles.programStart, { color: cfg.textColor }]}>
                  {starting ? 'Starting…' : locked ? 'Premium, tap to unlock →' : 'Start this program →'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Desire content warning modal */}
        <Modal visible={desireModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalEmoji}>💋</Text>
              <Text style={styles.modalTitle}>Desire, 18+ only</Text>
              <Text style={styles.modalSubtitle}>This program contains explicit sexual content. Make sure you're both comfortable before starting.</Text>
              <Text style={styles.rulesTitle}>Rules</Text>
              {(isSubscribed ? [
                'Rewrite, refresh, or reorder any of the 30 days before starting. No edits after.',
                'Each partner gets 2 VETO days, use them to skip a day and just have regular sex.',
                'If a day is missed, the challenge extends by one day (max 40 days total).',
                'Periods, illness, or travel can be treated as a pause.',
              ] : [
                'Each partner can modify or replace 2 days before the challenge starts. No edits after.',
                'Each partner gets 2 VETO days, use them to skip a day and just have regular sex.',
                'If a day is missed, the challenge extends by one day (max 40 days total).',
                "If a partner has no edits or vetoes left, they can borrow their partner's veto. That partner picks the replacement.",
                'Periods, illness, or travel can be treated as a pause.',
              ]).map((rule, i) => (
                <View key={i} style={styles.ruleRow}>
                  <Text style={styles.ruleDot}>·</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmDesire} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.confirmBtnText}>I'm in, let's go 💋</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDesireModal(false)} style={styles.cancelLink} accessibilityRole="button">
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
  // Paid tier unlocks unlimited edits so a couple can build their own
  // list (rewrite every Desire day to fit their taste, for example).
  // Server-side check in editTask is the authoritative gate — this flag
  // only controls whether the UI shows the cap counter or the "Unlimited"
  // label + always-visible edit pencil.
  const canEditFreely = isSubscribed;

  // ─── Setup phase, review & edit days ───────────────────────────────────────
  if (state.phase === 'setup') {
    // Resolve display order. dayOrder is a permutation of 1..30 written by
    // paid-tier reorderChallenge. Undefined = default sequential order.
    // customTasks stays keyed by slot ID (task.day), so edits follow the
    // slot across reorders.
    const defaultOrder = Array.from({ length: 30 }, (_, i) => i + 1);
    const orderedSlots = state.dayOrder && state.dayOrder.length === 30 ? state.dayOrder : defaultOrder;
    const orderedTasks: ChallengeTask[] = orderedSlots
      .map(slot => tasks.find(t => t.day === slot))
      .filter((t): t is ChallengeTask => !!t);

    // Tap ↑/↓ arrows on any day card to permute dayOrder. Server-side
    // reorderChallenge validates permutation shape + paid + setup phase.
    // Wraps around are not allowed — arrows disable at the edges.
    const handleMove = (fromIdx: number, dir: 'up' | 'down') => {
      if (!coupleId || !canEditFreely) return;
      const toIdx = dir === 'up' ? fromIdx - 1 : fromIdx + 1;
      if (toIdx < 0 || toIdx > 29) return;
      const next = [...orderedSlots];
      [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
      Haptics.selectionAsync();
      reorderChallenge(coupleId, next).catch(() => { /* subscription re-hydrates */ });
    };

    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleReset} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Review Days</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.setupContent}>
          <View style={[styles.setupBadge, { backgroundColor: cfg.color }]}>
            <Text style={styles.setupBadgeEmoji}>{cfg.emoji}</Text>
            <Text style={[styles.setupBadgeLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.setupIntro}>
            {canEditFreely
              ? 'Review all 30 days. Rewrite as many as you like to build your own list.'
              : `Review all 30 days. You can swap up to ${MAX_EDITS} of them before starting.`}
          </Text>
          <View style={[styles.editCounter, !canEditFreely && myEditsLeft === 0 && styles.editCounterDone]}>
            <Text style={styles.editCounterText}>
              {canEditFreely
                ? '✏️ Unlimited edits, premium'
                : myEditsLeft > 0
                  ? `✏️ You have ${myEditsLeft} edit${myEditsLeft > 1 ? 's' : ''} remaining`
                  : '✓ No edits remaining'}
            </Text>
          </View>
          {canEditFreely && (
            <View style={styles.reorderHint}>
              <Text style={styles.reorderHintText}>↑↓ Tap arrows to reorder days</Text>
            </View>
          )}

          {orderedTasks.map((task, idx) => {
            const custom = state.customTasks?.[task.day];
            const displayText = custom ?? task.text;
            const isCustom = !!custom;
            // Number by display position so the arc always reads Day 1..30
            // in sequence. slot ID (task.day) stays the identity used for
            // customTasks lookup + edit writes.
            const displayDay = idx + 1;
            return (
              <View key={`slot-${task.day}`} style={[styles.dayCard, isCustom && styles.dayCardEdited]}>
                <View style={styles.dayCardLeft}>
                  <Text style={[styles.dayNum, { color: cfg.textColor }]}>{displayDay}</Text>
                </View>
                <Text style={styles.dayText}>{personalise(displayText, partner?.name)}</Text>
                {(canEditFreely || myEditsLeft > 0) && (
                  <TouchableOpacity onPress={() => openEditModal(task.day)} style={styles.editBtn} accessibilityRole="button" accessibilityLabel="Edit day">
                    <Text style={styles.editBtnText}>✏️</Text>
                  </TouchableOpacity>
                )}
                {isCustom && !canEditFreely && myEditsLeft === 0 && <Text style={styles.editedBadge}>edited</Text>}
                {canEditFreely && (
                  <View style={styles.arrowStack}>
                    <TouchableOpacity
                      onPress={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      style={[styles.arrowBtn, idx === 0 && styles.arrowBtnDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel="Move day up">
                      <Text style={styles.arrowBtnText}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleMove(idx, 'down')}
                      disabled={idx === orderedTasks.length - 1}
                      style={[styles.arrowBtn, idx === orderedTasks.length - 1 && styles.arrowBtnDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel="Move day down">
                      <Text style={styles.arrowBtnText}>▼</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={[styles.activateBtn, { backgroundColor: cfg.textColor }]} onPress={handleActivate} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.activateBtnText}>Start Challenge →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} style={styles.cancelLink} accessibilityRole="button">
            <Text style={styles.cancelLinkText}>Choose a different program</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Edit day modal */}
        <Modal visible={editModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Edit Day {editDay !== null ? orderedSlots.indexOf(editDay) + 1 : ''}</Text>
              <Text style={styles.modalSubtitle}>Replace this day's task with your own, or tap Suggest another for a different one.</Text>
              <View style={styles.refreshBtnRow}>
                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={handleRefresh}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Suggest a different task">
                  <Text style={styles.refreshBtnText}>🔄 Suggest another</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
                placeholderTextColor={Colors.muted}
              />
              <View style={styles.editModalBtns}>
                <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditModal(false)} accessibilityRole="button">
                  <Text style={styles.cancelLinkText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveEdit} activeOpacity={0.85} accessibilityRole="button">
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
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>30-Day Challenge</Text>
        <TouchableOpacity onPress={handleReset} accessibilityRole="button" accessibilityHint="Cannot be undone"><Text style={styles.resetBtn}>Reset</Text></TouchableOpacity>
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
            <Text style={styles.taskText}>{personalise(todayText, partner?.name)}</Text>

            {bothMarked ? (
              <View style={styles.completedRow}>
                <Text style={styles.completedText}>✓ Both done, great work today</Text>
              </View>
            ) : myMarked ? (
              <Text style={styles.waitingText}>You've marked this done, waiting for {partnerName} ✓</Text>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.markBtn, { backgroundColor: cfg.textColor, flex: 1 }]} onPress={handleMark} activeOpacity={0.85} accessibilityRole="button">
                  <Text style={styles.markBtnText}>Mark as done ✓</Text>
                </TouchableOpacity>
                {myVetoesLeft > 0 && !isVetoDay && (
                  <TouchableOpacity style={styles.vetoBtn} onPress={handleVeto} activeOpacity={0.85} accessibilityRole="button">
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
                    <Text style={styles.completedDayText} numberOfLines={2}>{t ? personalise(t, partner?.name) : ''}</Text>
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
        description="A daily practice for 30 days. Choose your intensity, Reconnect, Spark, Fire, or Desire."
        tips={[
          'Setup phase: each partner can swap 2 days before starting',
          'Both must mark a day done for it to count',
          'Use a Veto (2 each) to skip a day and just have sex instead',
          'Desire program is 18+, a content warning appears before starting',
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
  // Edit modal Save button, scoped so it doesn't share confirmBtn's stray
  // marginTop and no-flex behaviour that made Save shrink next to Cancel.
  editSaveBtn: { flex: 1, backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  refreshBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -Spacing.xs },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(136,14,79,0.04)' },
  refreshBtnText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.burgundy, letterSpacing: 0.4 },
  // Paid-tier drag hint. Same pill treatment as editCounter so the two
  // premium affordances read as siblings (both burgundy-on-blush).
  reorderHint: { backgroundColor: Colors.blush, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', marginTop: Spacing.xs },
  reorderHintText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  // Paid-tier ↑/↓ reorder arrows stacked on the right side of each card.
  // Replaced drag-to-reorder after react-native-draggable-flatlist proved
  // incompatible with Reanimated 4 (peer-dep drift). Arrows work identical
  // on web + Expo Go + EAS build, no gesture library brittleness.
  arrowStack: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 },
  arrowBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  arrowBtnDisabled: { opacity: 0.25 },
  arrowBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
});
