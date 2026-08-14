import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { WYRSession, WYRAnswer, subscribeWYR, startWYR, answerWYR, nextWYRQuestion, resetWYR, saveMatchToList, getWYRRecords, updateWYRRecordIfBest, subscribeCustomWYRQuestions, addCustomWYRQuestion, updateCustomWYRQuestion, deleteCustomWYRQuestion, WYRRecords, WYRCustomQuestion } from '../services/wyrService';
import { TodoCategory } from '../services/todoService';
import { WYR_QUESTIONS, WYR_LEVEL_CONFIG, WYR_PACKS, WYRLevel, WYRPack } from '../constants/content';
import { personalise } from '../services/personalise';
import { notifyPartner } from '../services/notificationService';
import { useSubscription } from '../hooks/useSubscription';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';

const LEVELS: WYRLevel[] = ['playful', 'romantic', 'spicy'];

// Compatibility bands turn the raw match/total ratio into a warm, playful
// label so the number stops being two digits in a corner and starts being
// a signal about the couple. Emojis kept mild — this is intimacy-app tone,
// not gamer stat popup. Thresholds chosen so a couple who differs on one
// question early still lands in "In tune", not demoted to "Learning each
// other" for the whole session.
const COMPATIBILITY_BANDS: { min: number; label: string; emoji: string }[] = [
  { min: 100, label: 'Twin flames',       emoji: '🔥' },
  { min: 90,  label: 'Perfectly synced',  emoji: '💫' },
  { min: 75,  label: 'In tune',           emoji: '✨' },
  { min: 50,  label: 'Learning each other', emoji: '🌱' },
  { min: 25,  label: 'Opposites attract', emoji: '⚡' },
  { min: 0,   label: 'Wildly different',  emoji: '🌪️' },
];

function compatibilityBand(match: number, total: number): { label: string; emoji: string; pct: number } | null {
  // No band until couple has answered at least 3 questions — a single
  // match doesn't tell you if you're "Twin flames" or just lucky once.
  if (total < 3) return null;
  const pct = Math.round((match / total) * 100);
  const band = COMPATIBILITY_BANDS.find((b) => pct >= b.min) ?? COMPATIBILITY_BANDS[COMPATIBILITY_BANDS.length - 1];
  return { label: band.label, emoji: band.emoji, pct };
}

// Match count thresholds worth celebrating. Chosen to feel earned but
// not rare: first celebration lands within 5 matches (early on), then
// gradually spaces out so a couple who plays for months still gets
// occasional moments rather than the milestone system going silent.
const MILESTONES = [5, 10, 25, 50, 100, 200] as const;
const MILESTONE_MESSAGES: Record<number, string> = {
  5: "5 matches, you're getting each other!",
  10: "10 matches! You're in sync ✨",
  25: '25 matches! Serious compatibility 💫',
  50: '50 matches! You know each other well 💛',
  100: '100 matches! Twin flames 🔥',
  200: '200 matches! Off the charts 🌟',
};

// Which milestones also auto-open the full session summary card on top of
// the toast. Small early milestones (5) get the toast only — a modal at
// question 5 would feel intrusive. Big milestones deserve the deeper
// "chapter done" moment. 200 skipped because at that point the couple
// has seen the summary many times already.
const SUMMARY_MILESTONES = new Set<number>([10, 25, 50, 100]);

// Suggests a fresh level to try after a summary card, based on the
// current level. Playful → Deep (build depth), Deep → Spicy (escalate),
// Spicy → Playful (reset with something light). CTA copy stays warm.
const NEXT_LEVEL_SUGGESTION: Record<WYRLevel, { level: WYRLevel; label: string }> = {
  playful:  { level: 'romantic', label: 'Try Romantic next?' },
  romantic: { level: 'spicy',    label: 'Ready for Spicy?' },
  spicy:    { level: 'playful',  label: 'Reset with something Playful?' },
};

export default function WouldYouRatherScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [session, setSession] = useState<WYRSession | null>(null);
  const [loading, setLoading] = useState(true);
  useTrackScreen('would_you_rather');
  // Confirms a mid-session level change — hidden behind a modal because
  // resetWYR wipes the couple's score and current question index, which
  // an accidental tap on the level badge would otherwise silently
  // destroy.
  const [showChangeLevel, setShowChangeLevel] = useState(false);
  // Milestone toast state — fires once per crossing of a MILESTONES value.
  // Ref tracks the highest match count already celebrated so re-renders
  // (Firestore snapshots landing, tab switches, etc.) don't retrigger the
  // same milestone. Initialized to Infinity so nothing fires until we've
  // seen the current session score at least once.
  const [milestoneMsg, setMilestoneMsg] = useState<string | null>(null);
  const milestoneAnim = useRef(new Animated.Value(0)).current;
  const celebratedAtLeastRef = useRef<number>(Infinity);
  // Session summary modal — opens on top of the milestone toast for the
  // bigger milestones (SUMMARY_MILESTONES) so users see the deeper
  // insight (rate, best-ever comparison, level suggestion) instead of
  // just a fleeting celebration line.
  const [summary, setSummary] = useState<{
    matched: number;
    total: number;
    level: WYRLevel;
    becameBest: boolean;
    previousBest: WYRRecords | null;
  } | null>(null);
  const [records, setRecords] = useState<WYRRecords>({});
  // Pack picker visibility — expanded state on the level picker screen
  // when the user taps the "🎨 Themed session" row. Small UX: not a
  // separate route, just an accordion so users can dip into pack list
  // without leaving the picker context.
  const [packPickerOpen, setPackPickerOpen] = useState(false);
  // Couple's own authored questions, mixed into levelQuestions alongside
  // the curated WYR_QUESTIONS pool. Subscribed in real-time so both
  // partners see additions instantly.
  const [customQs, setCustomQs] = useState<WYRCustomQuestion[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addA, setAddA] = useState('');
  const [addB, setAddB] = useState('');
  const [addDiscussion, setAddDiscussion] = useState('');
  const [addLevel, setAddLevel] = useState<WYRLevel>('playful');
  const [saving, setSaving] = useState(false);
  // Manage-list accordion. Expanded shows the couple's authored library
  // with edit + delete affordances per row. Collapsed keeps the picker
  // clean when the library is empty or the user isn't managing.
  const [manageExpanded, setManageExpanded] = useState(false);
  // editingId non-null → modal is in EDIT mode, Save calls
  // updateCustomWYRQuestion; null → ADD mode, Save calls
  // addCustomWYRQuestion. Same modal serves both to keep JSX simple.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const help = useHelp('would-you-rather');
  const { isSubscribed } = useSubscription();

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    const unsub = subscribeWYR(coupleId, (s) => { setSession(s); setLoading(false); });
    return unsub;
  }, [coupleId]);

  // Fetch persisted best-ever record on mount so the summary card can
  // show "Your best: 92% on Deep" or "New personal best!" when it opens.
  useEffect(() => {
    if (!coupleId) return;
    getWYRRecords(coupleId).then(setRecords).catch(() => {});
  }, [coupleId]);

  // Couple's authored WYR questions — live subscription so a partner who
  // adds a question mid-session (unlikely but possible via the +Add
  // button on the picker) surfaces on the other side instantly.
  useEffect(() => {
    if (!coupleId) return;
    return subscribeCustomWYRQuestions(coupleId, setCustomQs);
  }, [coupleId]);

  // Milestone detection. Snapshots the current match count on first sight
  // so historical milestones don't retroactively celebrate on app open,
  // then fires exactly once each time the couple crosses the next
  // MILESTONES value in this session. Toast auto-dismisses after ~3s.
  // For SUMMARY_MILESTONES (10/25/50/100) the summary modal also opens
  // on top of the toast — deeper insight beyond the fleeting celebration.
  useEffect(() => {
    if (!session || !coupleId) return;
    const match = session.score.match;
    if (celebratedAtLeastRef.current === Infinity) {
      // First snapshot: seed baseline without celebrating anything
      // (including any milestone the couple had already crossed before
      // this app open). Any NEW crossings after this fire normally.
      celebratedAtLeastRef.current = match;
      return;
    }
    if (match <= celebratedAtLeastRef.current) return;
    const crossed = MILESTONES.find((m) => match >= m && celebratedAtLeastRef.current < m);
    celebratedAtLeastRef.current = match;
    if (crossed === undefined) return;
    const msg = MILESTONE_MESSAGES[crossed];
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMilestoneMsg(msg);
    milestoneAnim.setValue(0);
    Animated.sequence([
      Animated.timing(milestoneAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(milestoneAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setMilestoneMsg(null));

    // Big milestones also open the summary card. Snapshot the previous
    // record BEFORE updating so the modal can show "your best was X%"
    // even when this same session is about to become the new best.
    if (SUMMARY_MILESTONES.has(crossed)) {
      (async () => {
        const previousBest = records.bestPct ? { ...records } : null;
        const { becameBest } = await updateWYRRecordIfBest(coupleId, session.score.match, session.score.total, session.level);
        if (becameBest) {
          // Refresh in-memory records so next milestone shows updated value
          const fresh = await getWYRRecords(coupleId);
          setRecords(fresh);
        }
        setSummary({
          matched: session.score.match,
          total: session.score.total,
          level: session.level,
          becameBest,
          previousBest,
        });
      })().catch(() => {});
    }
  }, [session?.score.match]);

  // Question source depends on session mode:
  //   - pack mode (session.packId set): use pack's curated sequence in
  //     order, and DON'T wrap the index — packs are meant to complete
  //     with a "pack done" moment, not loop indefinitely. Custom
  //     questions do NOT mix into packs (would break the arc).
  //   - level mode: PREPEND couple's custom questions (newest first) to
  //     WYR_QUESTIONS filtered by level. Wrap the index so the couple
  //     can keep playing past the pool size.
  //
  //     Newest-custom-first means index 0 is always the most recent
  //     custom question. The addCustomWYRQuestion service resets the
  //     session's questionIndex to 0 on write, so a newly added Q
  //     surfaces as the couple's very next question — matches user
  //     expectation ("if I add a question, we should play it now, not
  //     after grinding through 70 built-in ones").
  const activePack: WYRPack | null = session?.packId
    ? WYR_PACKS.find((p) => p.id === session.packId) ?? null
    : null;
  const levelCustomSorted = session
    ? customQs
        .filter((q) => q.level === session.level)
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];
  const levelQuestions = session
    ? (activePack
        ? activePack.questions
        : [
            ...levelCustomSorted,
            ...WYR_QUESTIONS.filter(q => q.level === session.level),
          ])
    : [];
  const packComplete = !!(activePack && session && session.questionIndex >= activePack.questions.length);
  const currentQ = session && !packComplete
    ? (activePack
        ? levelQuestions[session.questionIndex]
        : levelQuestions[session.questionIndex % levelQuestions.length])
    : null;

  const myAnswer = session?.answers[uid];
  const partnerAnswer = session?.answers[partnerId ?? ''];
  const bothAnswered = session?.revealed;
  const matched = bothAnswered && myAnswer === partnerAnswer;

  const handleStart = async (level: WYRLevel, packId?: string) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startWYR(coupleId, level, packId);
  };

  const handleAnswer = async (answer: WYRAnswer) => {
    if (!coupleId || !session || myAnswer) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await answerWYR(coupleId, uid, answer, session);
    const partnerHasAnswered = partnerId && !!session.answers[partnerId];
    if (!partnerHasAnswered) {
      notifyPartner(coupleId, uid, 'Would You Rather 🤔', `${profile?.name ?? 'Your partner'} answered, your turn!`);
    }
  };

  const partnerName = partner?.name ?? 'partner';

  const handleNext = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await nextWYRQuestion(coupleId, session, [uid, partnerId]);
  };

  const handleReset = async () => {
    if (!coupleId) return;
    await resetWYR(coupleId);
  };

  // Category mapping. Playful/Romantic mostly describe date-shaped
  // scenarios (dinners, holidays, weekends), so they land under Date
  // Ideas. Spicy describes intimate scenarios, so → Intimacy. Users can
  // reclassify from the Together List if the auto-pick is off.
  const saveCategory = (level: WYRLevel): TodoCategory => (level === 'spicy' ? 'intimacy' : 'dates');
  const saveCategoryLabel = (cat: TodoCategory) => (cat === 'intimacy' ? 'Intimacy' : 'Date Ideas');

  const handleSaveMatch = async () => {
    if (!coupleId || !session || !currentQ || !matched || session.savedToList) return;
    const winningText = myAnswer === 'a' ? currentQ.a : currentQ.b;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveMatchToList(coupleId, uid, winningText, saveCategory(session.level));
  };

  if (!loading && !session) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Would You Rather</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.picker}>
          <Text style={styles.pickerIntro}>Both of you answer at the same time, then reveal. If you match, you score a point!</Text>
          {LEVELS.map(level => {
            const cfg = WYR_LEVEL_CONFIG[level];
            return (
              <TouchableOpacity key={level} style={[styles.levelCard, { backgroundColor: cfg.color }]} onPress={() => { if (level === 'spicy' && !isSubscribed) { trackEvent('upgrade_cta_tapped'); router.push('/upgrade' as any); return; } handleStart(level); }} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.levelEmoji}>{cfg.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelLabel, { color: cfg.textColor }]}>{cfg.label}</Text>
                  {/* Descriptor instead of raw count. 60-70 questions looks
                      thin next to competitors ("500+ questions") even though
                      it's plenty for typical couple use. Descriptor conveys
                      what the level is FOR, which is the actually useful
                      framing. Paid gate still surfaced explicitly. */}
                  <Text style={styles.levelCount}>
                    {level === 'spicy' && !isSubscribed
                      ? '🔒 Premium'
                      : level === 'playful'
                        ? 'Light and fun, easy to start'
                        : level === 'romantic'
                          ? 'Deeper, connection-focused'
                          : 'Intimate, X-rated'}
                  </Text>
                </View>
                <Text style={[styles.levelArrow, { color: cfg.textColor }]}>›</Text>
              </TouchableOpacity>
            );
          })}

          {/* Themed session picker. Collapsed by default so the level
              picker stays the primary choice. Tap the row to expand
              inline pack list, tap a pack to start. */}
          <TouchableOpacity
            style={[styles.levelCard, { backgroundColor: '#E1BEE7' }]}
            onPress={() => setPackPickerOpen((v) => !v)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Themed session, ${WYR_PACKS.length} packs available`}
          >
            <Text style={styles.levelEmoji}>🎨</Text>
            <View style={styles.levelInfo}>
              <Text style={[styles.levelLabel, { color: '#4A148C' }]}>Themed session</Text>
              <Text style={styles.levelCount}>Curated packs with a narrative arc</Text>
            </View>
            <Text style={[styles.levelArrow, { color: '#4A148C' }]}>{packPickerOpen ? '▾' : '›'}</Text>
          </TouchableOpacity>
          {/* Author-your-own area. Two states:
                - Library empty (N=0): single button that opens the add
                  modal directly. Fastest path to the first custom.
                - Library non-empty (N>0): tap the outer button toggles
                  a manage accordion below with edit/delete per row and
                  a fresh "+ Add new" entry at top. */}
          <TouchableOpacity
            style={styles.addOwnBtn}
            onPress={() => {
              if (customQs.length === 0) {
                setEditingId(null);
                setAddA(''); setAddB(''); setAddDiscussion(''); setAddLevel('playful');
                setShowAddModal(true);
              } else {
                setManageExpanded((v) => !v);
              }
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={customQs.length === 0 ? 'Add your own question' : `Manage your ${customQs.length} question${customQs.length === 1 ? '' : 's'}`}
          >
            <Text style={styles.addOwnBtnText}>
              {customQs.length === 0
                ? '+ Add your own'
                : `Your questions · ${customQs.length} ${manageExpanded ? '▾' : '›'}`}
            </Text>
          </TouchableOpacity>

          {/* Manage list accordion. Only rendered when there's actually
              a library and it's been expanded. Shows a fresh "+ Add new"
              at the top so users don't have to close and reopen to add
              another, then each row is: level emoji + A vs B preview
              + Edit + Delete icons. */}
          {manageExpanded && customQs.length > 0 && (
            <View style={styles.manageList}>
              <TouchableOpacity
                style={styles.manageAddNewRow}
                onPress={() => {
                  setEditingId(null);
                  setAddA(''); setAddB(''); setAddDiscussion(''); setAddLevel('playful');
                  setShowAddModal(true);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Add a new question"
              >
                <Text style={styles.manageAddNewText}>+ Add a new one</Text>
              </TouchableOpacity>
              {customQs
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((q) => {
                  const lvlCfg = WYR_LEVEL_CONFIG[q.level];
                  return (
                    <View key={q.id} style={styles.manageRow}>
                      <Text style={styles.manageRowEmoji}>{lvlCfg.emoji}</Text>
                      <View style={styles.manageRowInfo}>
                        <Text style={styles.manageRowText} numberOfLines={2}>
                          {q.a} <Text style={styles.manageRowVs}>vs</Text> {q.b}
                        </Text>
                        <Text style={styles.manageRowLevel}>{lvlCfg.label}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingId(q.id);
                          setAddA(q.a);
                          setAddB(q.b);
                          setAddDiscussion(q.discussion ?? '');
                          setAddLevel(q.level);
                          setShowAddModal(true);
                        }}
                        style={styles.manageRowBtn}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Edit question"
                      >
                        <Text style={styles.manageRowBtnText}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setDeletingId(q.id)}
                        style={styles.manageRowBtn}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Delete question"
                      >
                        <Text style={styles.manageRowBtnText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
            </View>
          )}

          {packPickerOpen && WYR_PACKS.map((pack) => {
            const locked = pack.paid && !isSubscribed;
            return (
              <TouchableOpacity
                key={pack.id}
                style={styles.packCard}
                onPress={() => {
                  if (locked) { trackEvent('upgrade_cta_tapped'); router.push('/upgrade' as any); return; }
                  const primaryLevel: WYRLevel = pack.questions[0]?.level ?? 'playful';
                  handleStart(primaryLevel, pack.id);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${pack.name}, ${pack.questions.length} questions${locked ? ', premium locked' : ''}`}
              >
                <Text style={styles.packEmoji}>{pack.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={styles.packName}>{pack.name}{locked ? ' 🔒' : ''}</Text>
                  <Text style={styles.packDesc}>{pack.description}</Text>
                </View>
                <Text style={styles.packArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <HelpModal visible={help.visible} title="Would You Rather"
          description="Both partners answer at the same time, then reveal. See if you match, and talk about why you chose differently."
          tips={["Pick a level and both answer simultaneously","Your answer is hidden until your partner also answers","If you match → +1 point","If you don't → discuss why! That's the fun part"]}
          onDismiss={help.dismiss} onDismissAll={help.dismissAll} />

        {/* Add-your-own modal. A/B text inputs + optional discussion +
            level pick. Save writes to couples/{coupleId}/wyrCustom, list
            surfaces immediately via subscription for both partners. */}
        <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
          <View style={styles.addModalOverlay}>
            <View style={styles.addModalCard}>
              <Text style={styles.addModalTitle}>{editingId ? 'Edit question' : 'Add your own question'}</Text>
              <Text style={styles.addModalHint}>Both of you will see it mixed in with the built-in questions on the level you pick.</Text>

              <Text style={styles.addModalLabel}>Option A</Text>
              <TextInput
                style={styles.addModalInput}
                value={addA}
                onChangeText={setAddA}
                placeholder="e.g. Stay in a luxury hotel"
                placeholderTextColor={Colors.muted}
                multiline
                maxLength={140}
              />

              <Text style={styles.addModalLabel}>Option B</Text>
              <TextInput
                style={styles.addModalInput}
                value={addB}
                onChangeText={setAddB}
                placeholder="e.g. Camp under the stars"
                placeholderTextColor={Colors.muted}
                multiline
                maxLength={140}
              />

              <Text style={styles.addModalLabel}>Discussion prompt (optional)</Text>
              <TextInput
                style={styles.addModalInput}
                value={addDiscussion}
                onChangeText={setAddDiscussion}
                placeholder="e.g. What does your ideal getaway look like?"
                placeholderTextColor={Colors.muted}
                multiline
                maxLength={160}
              />

              <Text style={styles.addModalLabel}>Level</Text>
              <View style={styles.addModalLevelRow}>
                {LEVELS.map((lvl) => {
                  const lvlCfg = WYR_LEVEL_CONFIG[lvl];
                  const locked = lvl === 'spicy' && !isSubscribed;
                  const active = addLevel === lvl;
                  return (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.addModalLevelChip,
                        active && { backgroundColor: lvlCfg.color, borderColor: lvlCfg.textColor },
                      ]}
                      onPress={() => { if (locked) return; setAddLevel(lvl); }}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`${lvlCfg.label} level${locked ? ' (premium locked)' : ''}`}
                    >
                      <Text style={styles.addModalLevelEmoji}>{lvlCfg.emoji}</Text>
                      <Text style={[styles.addModalLevelText, active && { color: lvlCfg.textColor, fontFamily: Fonts.bodyBold }]}>
                        {lvlCfg.label}{locked ? ' 🔒' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.addModalBtnRow}>
                <TouchableOpacity
                  style={styles.addModalCancelBtn}
                  onPress={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                    setAddA(''); setAddB(''); setAddDiscussion(''); setAddLevel('playful');
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={styles.addModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addModalSaveBtn, (!addA.trim() || !addB.trim() || saving) && { opacity: 0.4 }]}
                  onPress={async () => {
                    if (!coupleId || !addA.trim() || !addB.trim() || saving) return;
                    setSaving(true);
                    try {
                      const payload = {
                        a: addA.trim(),
                        b: addB.trim(),
                        level: addLevel,
                        ...(addDiscussion.trim() ? { discussion: addDiscussion.trim() } : {}),
                      };
                      if (editingId) {
                        await updateCustomWYRQuestion(coupleId, editingId, payload);
                      } else {
                        await addCustomWYRQuestion(coupleId, uid, payload);
                      }
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setShowAddModal(false);
                      setEditingId(null);
                      setAddA(''); setAddB(''); setAddDiscussion(''); setAddLevel('playful');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={!addA.trim() || !addB.trim() || saving}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={styles.addModalSaveText}>{saving ? 'Saving…' : (editingId ? 'Save changes' : 'Save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ConfirmModal
          visible={!!deletingId}
          title="Delete this question?"
          message="Both of you will stop seeing it. This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            if (!coupleId || !deletingId) return;
            await deleteCustomWYRQuestion(coupleId, deletingId);
            setDeletingId(null);
          }}
          onCancel={() => setDeletingId(null)}
        />
      </View>
    );
  }

  // Pack complete state — deliberate end-of-session moment for themed
  // packs (unlike level mode which loops indefinitely). Shows a summary
  // card + option to start another pack or switch back to level mode
  // via the change-level flow.
  if (packComplete && session && activePack) {
    const rate = session.score.total > 0 ? Math.round((session.score.match / session.score.total) * 100) : 0;
    return (
      <View style={[styles.screen, styles.center]}>
        <View style={styles.packDoneCard}>
          <Text style={styles.packDoneEmoji}>{activePack.emoji}</Text>
          <Text style={styles.packDoneTitle}>{activePack.name}, done!</Text>
          <Text style={styles.packDonePct}>{rate}%</Text>
          <Text style={styles.packDoneScore}>{session.score.match} matches of {session.score.total}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleReset} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.saveBtnText}>Pick another pack</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} accessibilityRole="button">
            <Text style={styles.packDoneBack}>‹ Back to Discover</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentQ || !session) return null;
  const cfg = WYR_LEVEL_CONFIG[session.level];

  return (
    // Screen background gets a very subtle wash of the level's tint colour
    // so Playful feels warm yellow, Romantic feels blush, Spicy feels
    // deeper peach. Alpha kept low (~13% via '22' hex append) so text
    // and cards remain crisp — this is a mood signal, not a takeover.
    <View style={[styles.screen, { backgroundColor: cfg.color + '55' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Would You Rather</Text>
        {/* Tap the score to open the session summary on demand — the same
            modal that auto-opens on 10/25/50/100 milestones. Gives users
            an anytime "how are we doing?" moment instead of only at
            fixed thresholds. Disabled at total < 1 to avoid a blank
            modal on question 1. */}
        <TouchableOpacity
          style={styles.scoreWrap}
          onPress={() => {
            if (session.score.total < 1) return;
            setSummary({
              matched: session.score.match,
              total: session.score.total,
              level: session.level,
              becameBest: false,
              previousBest: records.bestPct ? { ...records } : null,
            });
          }}
          activeOpacity={session.score.total > 0 ? 0.7 : 1}
          disabled={session.score.total < 1}
          accessibilityRole="button"
          accessibilityLabel={session.score.total > 0 ? 'View session summary' : 'No progress yet'}
        >
          <Text style={[styles.score, { color: cfg.textColor }]}>{session.score.match}/{session.score.total}</Text>
          {(() => {
            const band = compatibilityBand(session.score.match, session.score.total);
            return band ? (
              <Text style={styles.scoreLabel}>{band.pct}%</Text>
            ) : (
              <Text style={styles.scoreLabel}>matches</Text>
            );
          })()}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Level badge doubles as the escape hatch: tap to change level
            mid-session. Without this, once startWYR runs the couple is
            locked into that level until they finish all 90 questions.
            Modal-gated so an accidental tap doesn't nuke the score. */}
        <TouchableOpacity
          style={[styles.levelBadge, { backgroundColor: cfg.color }]}
          onPress={() => setShowChangeLevel(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Current level: ${cfg.label}. Tap to change.`}
        >
          <Text style={styles.levelBadgeEmoji}>{activePack ? activePack.emoji : cfg.emoji}</Text>
          <Text style={[styles.levelBadgeText, { color: cfg.textColor }]}>
            {activePack ? `${activePack.name} · ${session.questionIndex + 1}/${activePack.questions.length}` : cfg.label}
          </Text>
          <Text style={[styles.levelBadgeChange, { color: cfg.textColor }]}>Change ›</Text>
        </TouchableOpacity>

        {/* Compatibility band — appears once the couple has answered 3+
            questions, so a single match doesn't over-claim "Twin flames"
            on question 1. Warm playful label + emoji instead of a bare
            percentage; the pct is already in the header. */}
        {(() => {
          const band = compatibilityBand(session.score.match, session.score.total);
          if (!band) return null;
          return (
            <View style={styles.bandRow}>
              <Text style={styles.bandEmoji}>{band.emoji}</Text>
              <Text style={styles.bandLabel}>{band.label}</Text>
            </View>
          );
        })()}

        <Text style={styles.prompt}>Would you rather…</Text>

        {/* Option A */}
        <TouchableOpacity
          style={[styles.optionBtn, myAnswer === 'a' && { backgroundColor: cfg.textColor, borderColor: cfg.textColor }, bothAnswered && partnerAnswer === 'a' && styles.partnerPicked]}
          onPress={() => handleAnswer('a')}
          disabled={!!myAnswer}
          activeOpacity={0.85}
         accessibilityRole="button">
          <Text style={[styles.optionLetter, { color: cfg.textColor }, myAnswer === 'a' && { color: Colors.white }]}>A</Text>
          <Text style={[styles.optionText, myAnswer === 'a' && { color: Colors.white }]}>{personalise(currentQ.a, partner?.name)}</Text>
          {bothAnswered && partnerAnswer === 'a' && <Text style={styles.partnerTag}>{partner?.name ?? 'Partner'}</Text>}
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.or}>or</Text>
          <View style={styles.orLine} />
        </View>

        {/* Option B */}
        <TouchableOpacity
          style={[styles.optionBtn, myAnswer === 'b' && { backgroundColor: cfg.textColor, borderColor: cfg.textColor }, bothAnswered && partnerAnswer === 'b' && styles.partnerPicked]}
          onPress={() => handleAnswer('b')}
          disabled={!!myAnswer}
          activeOpacity={0.85}
         accessibilityRole="button">
          <Text style={[styles.optionLetter, { color: cfg.textColor }, myAnswer === 'b' && { color: Colors.white }]}>B</Text>
          <Text style={[styles.optionText, myAnswer === 'b' && { color: Colors.white }]}>{personalise(currentQ.b, partner?.name)}</Text>
          {bothAnswered && partnerAnswer === 'b' && <Text style={styles.partnerTag}>{partner?.name ?? 'Partner'}</Text>}
        </TouchableOpacity>

        {/* Status */}
        {!myAnswer && (
          <Text style={styles.waitingHint}>Pick your answer, it's hidden until your partner answers too</Text>
        )}
        {myAnswer && !bothAnswered && (
          <Text style={styles.waitingHint}>Waiting for {partner?.name ?? 'partner'} to answer…</Text>
        )}

        {/* Reveal */}
        {bothAnswered && (
          <View style={[styles.resultCard, { backgroundColor: matched ? '#E8F5E9' : '#FFF9C4' }]}>
            <Text style={styles.resultEmoji}>{matched ? '🎉' : '🤔'}</Text>
            <Text style={styles.resultTitle}>{matched ? 'You match!' : 'You differ!'}</Text>

            {currentQ.discussion && (
              <Text style={styles.discussionPrompt}>💬 {personalise(currentQ.discussion, partner?.name)}</Text>
            )}
            {/* Save-to-list only on match. Match already means both partners
                chose the same option, so no double-confirm handshake needed —
                one tap saves in the couple's name. Second tap on the other
                phone no-ops via transaction guard on savedToList. */}
            {matched && (
              session.savedToList ? (
                // Tappable so the user can jump straight to the list they
                // just added to instead of Back → Home → Your List → tab.
                // Same reason applied to the Daily action match pill in
                // app/daily.tsx.
                <TouchableOpacity
                  style={styles.savedChip}
                  onPress={() => router.push('/todo' as any)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Saved to ${saveCategoryLabel(saveCategory(session.level))}. Tap to view Together List.`}
                >
                  <Text style={styles.savedChipText}>
                    ✓ Saved to {saveCategoryLabel(saveCategory(session.level))} · View ›
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveMatch}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Save to ${saveCategoryLabel(saveCategory(session.level))}`}
                >
                  <Text style={styles.saveBtnText}>+ Save to our list</Text>
                </TouchableOpacity>
              )
            )}
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: cfg.textColor }]} onPress={handleNext} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.nextBtnText}>Next question →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Milestone toast — burgundy fill, cream text, celebratory. Fires
          on 5/10/25/50/100/200 match crossings via the effect above. */}
      {milestoneMsg && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.milestoneToast,
            {
              opacity: milestoneAnim,
              transform: [{ translateY: milestoneAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
            },
          ]}
        >
          <Text style={styles.milestoneText}>{milestoneMsg}</Text>
        </Animated.View>
      )}

      {/* Session summary modal — auto-opens on 10/25/50/100 match
          milestones. Shows current session's match rate + compatibility
          band + best-ever comparison + suggestion to try the next level.
          Dismiss returns to the current session unchanged. Change-level
          CTA reuses handleReset to swap to the suggested level. */}
      {summary && (() => {
        const band = compatibilityBand(summary.matched, summary.total);
        const pct = band?.pct ?? Math.round((summary.matched / summary.total) * 100);
        const suggestion = NEXT_LEVEL_SUGGESTION[summary.level];
        const summaryCfg = WYR_LEVEL_CONFIG[summary.level];
        return (
          <View style={styles.summaryOverlay}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>{summary.matched} MATCHES DONE</Text>
              <Text style={styles.summaryPct}>{pct}%</Text>
              {band && (
                <Text style={styles.summaryBand}>{band.emoji} {band.label}</Text>
              )}
              <Text style={styles.summaryCat}>
                Playing {summaryCfg.emoji} {summaryCfg.label} · {summary.matched}/{summary.total}
              </Text>

              {summary.becameBest ? (
                <View style={styles.summaryRecord}>
                  <Text style={styles.summaryRecordText}>🏆 New personal best!</Text>
                </View>
              ) : summary.previousBest?.bestPct !== undefined ? (
                <View style={styles.summaryRecord}>
                  <Text style={styles.summaryRecordText}>
                    Your best: {summary.previousBest.bestPct}%
                    {summary.previousBest.bestLevel ? ` on ${WYR_LEVEL_CONFIG[summary.previousBest.bestLevel].label}` : ''}
                  </Text>
                </View>
              ) : null}

              <View style={styles.summaryBtnRow}>
                <TouchableOpacity
                  style={styles.summaryContinueBtn}
                  onPress={() => setSummary(null)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={styles.summaryContinueText}>Keep going</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.summarySwitchBtn}
                  onPress={async () => {
                    setSummary(null);
                    await handleReset();
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={styles.summarySwitchText}>{suggestion.label}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}

      <ConfirmModal
        visible={showChangeLevel}
        title="Change level?"
        message={`Your current score (${session.score.match}/${session.score.total}) will reset. You can start a new level right after.`}
        confirmLabel="Change level"
        destructive
        onConfirm={async () => {
          setShowChangeLevel(false);
          await handleReset();
        }}
        onCancel={() => setShowChangeLevel(false)}
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
  scoreWrap: { width: 72, alignItems: 'flex-end' },
  score: { fontFamily: Fonts.bodyBold, fontSize: 15 },
  scoreLabel: { fontFamily: Fonts.bodyItalic, fontSize: 10, color: Colors.muted, marginTop: 1 },

  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  bandEmoji: { fontSize: 14 },
  bandLabel: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  // Absolute-positioned celebratory toast that hovers below the header
  // when the couple crosses a milestone. Burgundy fill + cream text so
  // it reads as a moment, not an info line — matches the pattern used
  // for the Fantasy Wishes match toast so the app has one consistent
  // celebration voice.
  milestoneToast: {
    position: 'absolute',
    top: 110,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.burgundy,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    zIndex: 50,
    elevation: 10,
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  milestoneText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream, letterSpacing: 0.3 },

  // Session summary — full-screen modal overlay with a centered card.
  // Backdrop is deep burgundy tint so it feels like the whole app pauses
  // for the moment, not a small confirm popup.
  summaryOverlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(61,26,36,0.72)',
    justifyContent: 'center', alignItems: 'center',
    padding: Spacing.lg, zIndex: 100,
  },
  summaryCard: {
    backgroundColor: Colors.cream, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
    width: '100%', maxWidth: 400, ...Shadow.md,
  },
  summaryEyebrow: {
    fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  summaryPct: {
    fontFamily: Fonts.heading, fontSize: 72, color: Colors.burgundy,
    lineHeight: 78, marginVertical: Spacing.xs,
  },
  summaryBand: {
    fontFamily: Fonts.headingItalic, fontSize: 22, color: Colors.burgundy,
  },
  summaryCat: {
    fontFamily: Fonts.body, fontSize: 13, color: Colors.muted,
    marginTop: 4,
  },
  summaryRecord: {
    marginTop: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    backgroundColor: '#FFF9C4', borderRadius: Radius.full,
  },
  summaryRecordText: {
    fontFamily: Fonts.bodyBold, fontSize: 13, color: '#5D4037',
  },
  summaryBtnRow: {
    flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg,
    width: '100%',
  },
  summaryContinueBtn: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.burgundy,
  },
  summaryContinueText: {
    fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy,
  },
  summarySwitchBtn: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: Radius.full, backgroundColor: Colors.burgundy,
  },
  summarySwitchText: {
    fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream,
  },

  picker: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.md },
  pickerIntro: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  levelCard: { borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...Shadow.sm },
  levelEmoji: { fontSize: 36 },
  levelInfo: { flex: 1 },
  levelLabel: { fontFamily: Fonts.heading, fontSize: 22 },
  levelCount: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  levelArrow: { fontFamily: Fonts.heading, fontSize: 28 },

  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.full },
  levelBadgeEmoji: { fontSize: 16 },
  levelBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 13 },
  levelBadgeChange: { fontFamily: Fonts.bodyItalic, fontSize: 11, marginLeft: 4, opacity: 0.75 },

  prompt: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, textAlign: 'center' },

  optionBtn: {
    borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, ...Shadow.sm,
  },
  partnerPicked: { borderColor: Colors.rose },
  optionLetter: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy, minWidth: 28 },
  optionText: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  partnerTag: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.rose },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  or: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted },

  waitingHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  resultCard: { borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  resultEmoji: { fontSize: 36 },
  resultTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  discussionPrompt: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },


  // Pack rows in the collapsed pack accordion on the level picker screen.
  // Smaller / less prominent than the level cards above so packs feel
  // like a secondary mode, not a competing primary.
  packCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, backgroundColor: Colors.white,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: '#E1BEE7',
    marginLeft: Spacing.md,
  },
  packEmoji: { fontSize: 28 },
  packName: { fontFamily: Fonts.heading, fontSize: 18, color: '#4A148C' },
  packDesc: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 2 },
  packArrow: { fontFamily: Fonts.heading, fontSize: 22, color: '#4A148C' },

  // Pack completion card — full-screen centered when the couple finishes
  // the last question in a themed pack. Sits at .center on styles.screen
  // so it doesn't have to compete with the running session UI.
  packDoneCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.md,
    marginHorizontal: Spacing.lg,
  },
  packDoneEmoji: { fontSize: 56 },
  packDoneTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy, textAlign: 'center' },
  packDonePct: { fontFamily: Fonts.heading, fontSize: 56, color: Colors.burgundy, lineHeight: 62 },
  packDoneScore: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, marginBottom: Spacing.md },
  packDoneBack: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, marginTop: Spacing.sm },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Add-your-own button at the bottom of the level picker. Text link
  // style so it doesn't compete with the level cards or themed row —
  // less prominent affordance for an occasional-use feature.
  addOwnBtn: {
    marginTop: Spacing.md, paddingVertical: 12, alignItems: 'center',
    borderRadius: Radius.full, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: Colors.burgundy, backgroundColor: 'transparent',
  },
  addOwnBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },

  // Add modal
  addModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  addModalCard: {
    backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.xl, gap: Spacing.sm, maxHeight: '92%',
  },
  addModalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  addModalHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, marginBottom: Spacing.sm },
  addModalLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: Spacing.sm },
  addModalInput: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
    minHeight: 48, borderWidth: 1, borderColor: Colors.border,
  },
  addModalLevelRow: { flexDirection: 'row', gap: Spacing.sm },
  addModalLevelChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4,
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  addModalLevelEmoji: { fontSize: 18 },
  addModalLevelText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  addModalBtnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  addModalCancelBtn: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  addModalCancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  addModalSaveBtn: {
    flex: 1, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: Radius.full, backgroundColor: Colors.burgundy,
  },
  addModalSaveText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  // Manage-list accordion under +Add. Nested slightly (marginLeft on
  // parent-alike rows) to signal "child of the +Add row above". Each
  // row is compact so a library of 10-15 questions doesn't dominate
  // the picker screen.
  manageList: { gap: 6, marginTop: -4, marginLeft: Spacing.md },
  manageAddNewRow: {
    paddingVertical: 10, paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg, backgroundColor: 'rgba(136,14,79,0.08)',
    alignItems: 'center',
  },
  manageAddNewText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  manageRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, backgroundColor: Colors.white,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  manageRowEmoji: { fontSize: 20 },
  manageRowInfo: { flex: 1, gap: 2 },
  manageRowText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 18 },
  manageRowVs: { fontFamily: Fonts.bodyItalic, color: Colors.muted },
  manageRowLevel: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted },
  manageRowBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(136,14,79,0.06)',
  },
  manageRowBtnText: { fontSize: 15, color: Colors.burgundy },
  nextBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: Radius.full, marginTop: Spacing.sm },
  nextBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
  // Save-to-list affordance on match. Outline burgundy so it reads as a
  // secondary action next to the primary Next question button — we want
  // Next to remain the visual default so the session flow doesn't slow.
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.burgundy,
    backgroundColor: Colors.white,
    marginTop: 6,
  },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, letterSpacing: 0.3 },
  // Post-save confirmation chip. Non-interactive, sits in the same slot
  // as the Save button so the layout doesn't jump.
  savedChip: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: '#C8E6C9',
    marginTop: 6,
  },
  savedChipText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: '#2E7D32', letterSpacing: 0.3 },
});
