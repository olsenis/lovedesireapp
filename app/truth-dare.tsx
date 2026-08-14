import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Animated, Easing, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useAudioRecorder,
  useAudioPlayer,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { DARES, TRUTHS, DARE_LEVEL_CONFIG, DareLevel } from '../constants/content';
import { personalise } from '../services/personalise';
import {
  TruthDareSession, subscribeTruthDare, startTruthDare,
  playCard, nextTurn, resetTruthDare, submitTruthAnswer,
  confirmDare, skipCard,
} from '../services/truthDareService';
import { uploadTruthDareAudio, UploadTooLargeError } from '../services/storageService';
import { useSubscription } from '../hooks/useSubscription';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';

const LEVELS: DareLevel[] = ['sweet', 'flirty', 'spicy'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function TruthDareScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [session, setSession] = useState<TruthDareSession | null>(null);
  const [loading, setLoading] = useState(true);
  useTrackScreen('truth_dare');

  // Mode picker — 'picker' (default) | 'solo' (single-phone wheel) | 'multi' (level select for multiplayer)
  const [mode, setMode] = useState<'picker' | 'solo' | 'multi'>('picker');

  // "Together Right Here" single-phone state. Design 2 (July 2026):
  //   - Wheel is visually split into Truth (left half) and Dare (right half)
  //   - Center anchor shows current intensity (Sweet / Flirty / Spicy)
  //   - Direct tap on a half = instant result (brief scale pulse), no rotation
  //   - Surprise link below wheel = actual spin (outcome genuinely random)
  // Behavior D was the deciding insight: theatrical spin on a predetermined
  // choice is fake theater. Only Surprise spins because only Surprise has
  // an outcome the user doesn't already know.
  const [soloLevel, setSoloLevel] = useState<DareLevel>('flirty');
  const [soloResult, setSoloResult] = useState<{ kind: 'truth' | 'dare'; text: string } | null>(null);
  const [soloSpinning, setSoloSpinning] = useState(false);
  const soloSpinAnim = useRef(new Animated.Value(0)).current;
  const truthPulse = useRef(new Animated.Value(1)).current;
  const darePulse = useRef(new Animated.Value(1)).current;

  // Local card drawn before sending
  const [drawnCard, setDrawnCard] = useState<{ type: 'truth' | 'dare'; text: string } | null>(null);

  // Truth text answer
  const [answerText, setAnswerText] = useState('');

  // Audio recording state (expo-audio hook-based API)
  const [answerMode, setAnswerMode] = useState<'write' | 'record'>('write');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const player = useAudioPlayer(recordingUri ?? undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const help = useHelp('truth-dare');
  const { isSubscribed } = useSubscription();

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'Partner';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeTruthDare(coupleId, (s) => { setSession(s); setLoading(false); });
  }, [coupleId]);

  // Track playback finished — expo-audio player exposes playbackStatus events
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) setIsPlaying(false);
    });
    return () => sub.remove();
  }, [player]);

  const isMyTurn = session?.turnUid === uid;
  const cfg = DARE_LEVEL_CONFIG[session?.level ?? 'flirty'];
  const myScore = session?.scores[uid] ?? 0;
  const partnerScore = session?.scores[partnerId ?? ''] ?? 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleStart = async (level: DareLevel) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDrawnCard(null);
    await startTruthDare(coupleId, uid, level);
  };

  // Draw card locally, no Firestore write
  const handleChoose = (type: 'truth' | 'dare') => {
    if (!session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pool = type === 'truth'
      ? TRUTHS.filter(t => t.level === session.level)
      : DARES.filter(d => d.level === session.level);
    if (pool.length === 0) return;
    setDrawnCard({ type, text: pickRandom(pool).text });
  };

  // Redraw locally, exclude current card so you never get the same one twice
  const handleRedraw = () => {
    if (!session || !drawnCard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const pool = (drawnCard.type === 'truth'
      ? TRUTHS.filter(t => t.level === session.level)
      : DARES.filter(d => d.level === session.level)
    ).filter(item => item.text !== drawnCard.text);
    if (pool.length === 0) return;
    setDrawnCard({ type: drawnCard.type, text: pickRandom(pool).text });
  };

  // Commit drawn card to Firestore
  const handleSendCard = async () => {
    if (!coupleId || !drawnCard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await playCard(coupleId, { type: drawnCard.type, text: drawnCard.text });
    setDrawnCard(null);
  };

  // Text answer
  const handleSubmitTextAnswer = async () => {
    if (!coupleId || !answerText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await submitTruthAnswer(coupleId, uid, answerText.trim());
    setAnswerText('');
  };

  // Audio recording — expo-audio hooks (replaces deprecated expo-av)
  const handleStartRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordingUri(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('Recording failed', e);
    }
  };

  const handleStopRecording = async () => {
    try {
      await recorder.stop();
      setIsRecording(false);
      setRecordingUri(recorder.uri ?? null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('Stop recording failed', e);
      setIsRecording(false);
    }
  };

  const handlePlayback = async () => {
    if (!recordingUri) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
      return;
    }
    player.seekTo(0);
    player.play();
    setIsPlaying(true);
  };

  const handleSubmitAudioAnswer = async () => {
    if (!coupleId || !session || !recordingUri) return;
    setIsUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const audioURL = await uploadTruthDareAudio(coupleId, uid, session.round, recordingUri);
      await submitTruthAnswer(coupleId, uid, '', audioURL);
      setRecordingUri(null);
      setAnswerMode('write');
    } catch (err) {
      const msg = err instanceof UploadTooLargeError
        ? `Recording is too long (${Math.round(err.actualBytes / 1024 / 1024)} MB, max ${Math.round(err.maxBytes / 1024 / 1024)} MB). Try a shorter answer.`
        : 'Could not upload your answer. Try again.';
      Alert.alert('Upload failed', msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDare = async () => {
    if (!coupleId || !session) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await confirmDare(coupleId, uid, session);
  };

  const handleDone = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAnswerText('');
    setRecordingUri(null);
    setAnswerMode('write');
    await nextTurn(coupleId, session, uid, partnerId);
  };

  const handleSkip = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnswerText('');
    setRecordingUri(null);
    await skipCard(coupleId, session, uid, partnerId);
  };

  const handleReset = async () => {
    if (!coupleId) return;
    setDrawnCard(null);
    setAnswerText('');
    setRecordingUri(null);
    setMode('picker'); // bring user back to mode picker after reset
    await resetTruthDare(coupleId);
  };

  // Direct tap on Truth or Dare half. Spins the wheel for anticipation and
  // hides the previous result during the spin, then reveals the drawn card.
  // The outcome KIND is what the user picked (not random), but the specific
  // Truth/Dare text underneath is still a fresh pick — so the wheel spin is
  // still doing meaningful work as a "pick + reveal" moment, not fake theater.
  const handleSoloTap = (kind: 'truth' | 'dare') => {
    if (soloSpinning) return;
    if (soloLevel === 'spicy' && !isSubscribed) { trackEvent('upgrade_cta_tapped'); router.push('/upgrade' as any); return; }
    const pool = kind === 'truth'
      ? TRUTHS.filter(t => t.level === soloLevel)
      : DARES.filter(d => d.level === soloLevel);
    if (pool.length === 0) return;
    const picked = pickRandom(pool);

    // Micro-pulse on the tapped half for tactile "you pressed it" feedback,
    // then start the spin. Pulse runs in parallel with the spin start.
    const pulseVal = kind === 'truth' ? truthPulse : darePulse;
    Animated.sequence([
      Animated.timing(pulseVal, { toValue: 0.93, duration: 90, useNativeDriver: true }),
      Animated.timing(pulseVal, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();

    setSoloSpinning(true);
    setSoloResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    soloSpinAnim.setValue(0);
    Animated.timing(soloSpinAnim, {
      toValue: 1440, // 4 full turns — ends at 0° so labels rest upright
      duration: 1200, // Slightly quicker than Surprise (1600ms) since the
                     // outcome kind is already known — pure reveal drama.
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSoloResult({ kind, text: picked.text });
      setSoloSpinning(false);
    });
  };

  // Surprise = actual spin. Outcome is genuinely random from the mixed pool,
  // wheel rotates exactly 4 full turns and lands back at 0° so labels stay
  // upright. Earlier version landed at 90°/270° to indicate the winner via
  // wheel position, but that left Truth/Dare labels rotated sideways at rest,
  // which looked silly. Result card is what announces the winner; the spin
  // is purely anticipation/drama.
  const handleSurprise = () => {
    if (soloSpinning) return;
    if (soloLevel === 'spicy' && !isSubscribed) { trackEvent('upgrade_cta_tapped'); router.push('/upgrade' as any); return; }
    const truthPool = TRUTHS.filter(t => t.level === soloLevel);
    const darePool = DARES.filter(d => d.level === soloLevel);
    const mixed = [
      ...truthPool.map(t => ({ kind: 'truth' as const, text: t.text })),
      ...darePool.map(d => ({ kind: 'dare' as const, text: d.text })),
    ];
    if (mixed.length === 0) return;
    const picked = pickRandom(mixed);

    setSoloSpinning(true);
    setSoloResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    soloSpinAnim.setValue(0);
    Animated.timing(soloSpinAnim, {
      toValue: 1440, // 4 full turns — ends at 0° so labels rest upright
      duration: 1600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSoloResult({ kind: picked.kind, text: picked.text });
      setSoloSpinning(false);
    });
  };

  // soloSpinAnim carries the target rotation in degrees directly (not 0..1).
  // Interpolation range 0..3600 maps 1:1 to '0deg'..'3600deg' so any spin
  // amount within that range animates correctly.
  const soloSpinRotate = soloSpinAnim.interpolate({ inputRange: [0, 3600], outputRange: ['0deg', '3600deg'] });

  // ── Lobby (no active game) ────────────────────────────────────────────────────
  if (!loading && (!session || session.round === 0)) {
    // MODE PICKER — initial screen
    if (mode === 'picker') {
      return (
        <View style={styles.screen}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
            <Text style={styles.title}>Truth or Dare</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modePickerWrap}>
            <Text style={styles.modeEyebrow}>Tonight</Text>
            <Text style={styles.modeQuestion}>How do you{'\n'}want to play?</Text>

            <TouchableOpacity style={styles.modeCard} onPress={() => setMode('solo')} activeOpacity={0.85} accessibilityRole="button">
              <View style={styles.modeIconRow}>
                <Text style={styles.modeIcon}>🎲</Text>
                <Text style={styles.modeBadge}>One phone</Text>
              </View>
              <Text style={styles.modeTitle}>Together Right Here</Text>
              <Text style={styles.modeDesc}>Sitting together? Spin a dare on this phone. Quick, no rules, just do it.</Text>
              <Text style={styles.modeCta}>Spin →</Text>
            </TouchableOpacity>

            <Text style={styles.modeOr}>or</Text>

            <TouchableOpacity style={[styles.modeCard, styles.modeCardFeatured]} onPress={() => setMode('multi')} activeOpacity={0.9} accessibilityRole="button">
              <View style={styles.modeIconRow}>
                <Text style={styles.modeIcon}>💞</Text>
                <Text style={[styles.modeBadge, styles.modeBadgeOnDark]}>Two phones</Text>
              </View>
              <Text style={[styles.modeTitle, styles.modeTitleOnDark]}>Wherever You Are</Text>
              <Text style={[styles.modeDesc, styles.modeDescOnDark]}>Each of you on your own phone, same room or worlds apart. Take turns picking truth or dare for each other.</Text>
              <Text style={[styles.modeCta, styles.modeCtaOnDark]}>Begin →</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    // SOLO DARE — single-phone wheel
    if (mode === 'solo') {
      return (
        <View style={styles.screen}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setMode('picker')} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
            <Text style={styles.title}>Together Right Here</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={styles.soloWrap}>
            {/* Two pill rows without section labels — the emoji + burgundy-when-
                active design is self-explanatory. Cutting the "CHOOSE INTENSITY"
                and "WHAT ARE YOU SPINNING FOR?" labels saves ~60px vertical so
                the wheel + result card fit on one screen without scrolling. */}
            <View style={styles.soloLevels}>
              {LEVELS.map(level => {
                const c = DARE_LEVEL_CONFIG[level];
                const locked = level === 'spicy' && !isSubscribed;
                const active = soloLevel === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[styles.soloLevelPill, active && styles.soloLevelPillActive, locked && styles.soloLevelPillLocked]}
                    onPress={() => locked ? (trackEvent('upgrade_cta_tapped'), router.push('/upgrade' as any)) : setSoloLevel(level)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Intensity: ${c.label}${locked ? ', premium' : ''}`}>
                    <Text style={[styles.soloLevelText, active && styles.soloLevelTextActive]}>{locked ? '🔒 ' : ''}{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Wheel — Design 2. Two tappable halves (Truth left, Dare right)
                clipped inside a circular container. Center anchor floats above
                the rotating layer showing the current intensity so level
                context is visible during play, not just in the picker above.
                Rotation only happens on Surprise; direct taps pulse the half. */}
            <View style={styles.wheelWrap}>
              <View style={styles.wheelHalo} pointerEvents="none" />
              <Animated.View style={[styles.wheelSplit, { transform: [{ rotate: soloSpinRotate }] }]}>
                <Animated.View style={{ flex: 1, transform: [{ scale: truthPulse }] }}>
                  <TouchableOpacity
                    style={styles.wheelHalfTruth}
                    onPress={() => handleSoloTap('truth')}
                    disabled={soloSpinning}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Pick Truth"
                  >
                    <Text style={styles.wheelHalfEmoji}>💭</Text>
                    <Text style={styles.wheelHalfLabel}>Truth</Text>
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View style={{ flex: 1, transform: [{ scale: darePulse }] }}>
                  <TouchableOpacity
                    style={styles.wheelHalfDare}
                    onPress={() => handleSoloTap('dare')}
                    disabled={soloSpinning}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Pick Dare"
                  >
                    <Text style={styles.wheelHalfEmoji}>🎯</Text>
                    <Text style={styles.wheelHalfLabel}>Dare</Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
              {/* Center anchor — sits outside the rotating layer so it doesn't
                  spin. Shows current intensity. Non-interactive; users switch
                  level via the pills above. */}
              <View style={styles.wheelCenterAnchor} pointerEvents="none">
                <Text style={styles.wheelCenterAnchorLabel}>Level</Text>
                <Text style={styles.wheelCenterAnchorValue}>{DARE_LEVEL_CONFIG[soloLevel].label}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.surpriseLink}
              onPress={handleSurprise}
              disabled={soloSpinning}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Surprise me, spin the wheel for a random Truth or Dare"
            >
              <Text style={styles.surpriseLinkText}>or Surprise me 🎲</Text>
            </TouchableOpacity>

            {soloResult && !soloSpinning && (
              <View style={styles.soloResult}>
                <Text style={styles.soloResultEyebrow}>{soloResult.kind === 'truth' ? 'Your truth' : 'Your dare'}</Text>
                <Text style={styles.soloResultText}>{personalise(soloResult.text, partnerName)}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    // MULTI — level select for multiplayer round
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('picker')} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Wherever You Are</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.picker}>
          <Text style={styles.pickerIntro}>
            One phone each. Pick truth or dare for your partner, they'll answer on their screen.
          </Text>
          <Text style={styles.pickerSectionLabel}>Choose level</Text>
          {LEVELS.map(level => {
            const c = DARE_LEVEL_CONFIG[level];
            return (
              <TouchableOpacity key={level} style={[styles.levelCard, { backgroundColor: c.color }]} onPress={() => { if (level === 'spicy' && !isSubscribed) { trackEvent('upgrade_cta_tapped'); router.push('/upgrade' as any); return; } handleStart(level); }} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.levelEmoji}>{c.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelLabel, { color: c.textColor }]}>{c.label}</Text>
                  <Text style={styles.levelSub}>{level === 'spicy' && !isSubscribed ? '🔒 Premium' : 'You pick first · partner joins from their phone'}</Text>
                </View>
                <Text style={[styles.levelArrow, { color: c.textColor }]}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <HelpModal
          visible={help.visible}
          title="Truth or Dare"
          description="Pick Truth or Dare for your partner, they see it on their phone and must respond."
          tips={[
            "Your turn = you draw a card and send it to your partner",
            "Pick Truth → partner types or records their answer",
            "Pick Dare → partner confirms they did it, then you confirm",
            "Back saves the game, return anytime",
          ]}
          onDismiss={help.dismiss}
          onDismissAll={help.dismissAll}
        />
      </View>
    );
  }

  if (!session) return null;

  const dareConfirmed = session.card?.dareConfirmed ?? [];
  const partnerConfirmedDare = !!partnerId && dareConfirmed.includes(partnerId);
  const iConfirmedDare = dareConfirmed.includes(uid);

  // ── Active game ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Truth or Dare</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn} accessibilityRole="button" accessibilityLabel="Reset game"><Text style={styles.resetBtnText}>↺ New</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Level tab strip. Paywall gate mid-session: the lobby's level card
            picker gates Spicy on entry, but this tab strip lives INSIDE an
            active round so users who started on Sweet or Flirty and later
            tapped Spicy could switch pool without ever hitting /upgrade.
            Now Spicy tab routes to /upgrade for non-premium users, matching
            every other Spicy surface in the app. */}
        <View style={styles.levelSegment}>
          {LEVELS.map(level => {
            const c = DARE_LEVEL_CONFIG[level];
            const active = session.level === level;
            const locked = level === 'spicy' && !isSubscribed;
            return (
              <TouchableOpacity
                key={level}
                style={[styles.levelTab, active && { backgroundColor: c.color }, locked && { opacity: 0.55 }]}
                onPress={async () => {
                  if (locked) { trackEvent('upgrade_cta_tapped'); router.push('/upgrade' as any); return; }
                  if (coupleId) { setDrawnCard(null); await startTruthDare(coupleId, uid, level); }
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${c.label}${locked ? ', premium' : ''}`}>
                <Text style={styles.levelTabEmoji}>{c.emoji}</Text>
                <Text style={[styles.levelTabLabel, active && { color: c.textColor }]}>{locked ? '🔒 ' : ''}{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Turn badge */}
        <View style={[styles.turnBadge, { backgroundColor: cfg.color }]}>
          <Text style={[styles.turnText, { color: cfg.textColor }]}>
            Round {session.round} · {isMyTurn ? `Your turn, challenge ${partnerName}:` : `${partnerName}'s turn`}
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════
            PHASE: PICKING
        ═══════════════════════════════════════════════════════════ */}
        {session.phase === 'picking' && isMyTurn && !drawnCard && (
          <View style={styles.choiceRow}>
            <TouchableOpacity style={[styles.choiceBtn, styles.truthBtn]} onPress={() => handleChoose('truth')} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.choiceBtnEmoji}>🤔</Text>
              <Text style={styles.choiceBtnLabel}>Truth</Text>
              <Text style={styles.choiceBtnSub}>{partnerName} answers a question</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.choiceBtn, { borderColor: cfg.textColor }]} onPress={() => handleChoose('dare')} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.choiceBtnEmoji}>{cfg.emoji}</Text>
              <Text style={[styles.choiceBtnLabel, { color: cfg.textColor }]}>Dare</Text>
              <Text style={styles.choiceBtnSub}>{partnerName} does a challenge</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Local card preview, before send */}
        {session.phase === 'picking' && isMyTurn && drawnCard && (
          <View style={[styles.cardView, { borderLeftColor: drawnCard.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
            <View style={styles.cardTypeRow}>
              <Text style={styles.cardTypeEmoji}>{drawnCard.type === 'truth' ? '🤔' : cfg.emoji}</Text>
              <Text style={[styles.cardTypeBadge, { color: drawnCard.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
                {drawnCard.type === 'truth' ? 'Truth' : `${cfg.label} Dare`}
              </Text>
            </View>
            <Text style={styles.cardText}>{personalise(drawnCard.text, partnerName)}</Text>
            <Text style={styles.previewHint}>
              {drawnCard.type === 'truth' ? `${partnerName} will answer this question` : `${partnerName} will do this dare`}
            </Text>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendCard} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.sendBtnText}>Send to {partnerName} →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRedraw} style={styles.skipBtn} accessibilityRole="button">
              <Text style={styles.skipText}>Skip, get a different one →</Text>
            </TouchableOpacity>
          </View>
        )}

        {session.phase === 'picking' && !isMyTurn && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>🎲</Text>
            <Text style={styles.waitingText}>{partnerName} is choosing your challenge…</Text>
            <Text style={styles.waitingHint}>Get ready, Truth or Dare is coming your way</Text>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PHASE: ANSWERING
        ═══════════════════════════════════════════════════════════ */}
        {session.phase === 'answering' && session.card && (
          <View style={[styles.cardView, { borderLeftColor: session.card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
            <View style={styles.cardTypeRow}>
              <Text style={styles.cardTypeEmoji}>{session.card.type === 'truth' ? '🤔' : cfg.emoji}</Text>
              <Text style={[styles.cardTypeBadge, { color: session.card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
                {session.card.type === 'truth' ? 'Truth' : `${cfg.label} Dare`}
              </Text>
            </View>
            <Text style={styles.cardText}>{personalise(session.card.text, partnerName)}</Text>

            {/* ── TRUTH: picker waits ── */}
            {session.card.type === 'truth' && isMyTurn && (
              <View style={styles.sentBanner}>
                <Text style={styles.sentText}>✅ Sent to {partnerName}! They're answering…</Text>
              </View>
            )}

            {/* ── TRUTH: partner answers ── */}
            {session.card.type === 'truth' && !isMyTurn && (
              <>
                <Text style={styles.answerPrompt}>Your truth, answer honestly:</Text>

                {/* Write / Record tabs */}
                <View style={styles.modeTabs}>
                  <TouchableOpacity
                    style={[styles.modeTab, answerMode === 'write' && styles.modeTabActive]}
                    onPress={() => setAnswerMode('write')}
                   accessibilityRole="button">
                    <Text style={[styles.modeTabText, answerMode === 'write' && styles.modeTabTextActive]}>✏️ Write</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeTab, answerMode === 'record' && styles.modeTabActive]}
                    onPress={() => setAnswerMode('record')}
                   accessibilityRole="button">
                    <Text style={[styles.modeTabText, answerMode === 'record' && styles.modeTabTextActive]}>🎤 Record</Text>
                  </TouchableOpacity>
                </View>

                {answerMode === 'write' && (
                  <>
                    <TextInput
                      style={styles.answerInput}
                      placeholder="Type your answer here..."
                      placeholderTextColor={Colors.muted}
                      value={answerText}
                      onChangeText={setAnswerText}
                      multiline
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.truthActionBtn, !answerText.trim() && { opacity: 0.4 }]}
                      onPress={handleSubmitTextAnswer}
                      disabled={!answerText.trim()}
                      activeOpacity={0.85}
                     accessibilityRole="button">
                      <Text style={styles.actionBtnText}>Send my answer →</Text>
                    </TouchableOpacity>
                  </>
                )}

                {answerMode === 'record' && (
                  <View style={styles.recordArea}>
                    {!isRecording && !recordingUri && (
                      <TouchableOpacity style={styles.micBtn} onPress={handleStartRecording} activeOpacity={0.85} accessibilityRole="button">
                        <Text style={styles.micEmoji}>🎙️</Text>
                        <Text style={styles.micLabel}>Tap to record</Text>
                      </TouchableOpacity>
                    )}
                    {isRecording && (
                      <TouchableOpacity style={[styles.micBtn, styles.micBtnRecording]} onPress={handleStopRecording} activeOpacity={0.85} accessibilityRole="button">
                        <Text style={styles.micEmoji}>⏹️</Text>
                        <Text style={styles.micLabel}>Recording… tap to stop</Text>
                      </TouchableOpacity>
                    )}
                    {recordingUri && !isRecording && (
                      <>
                        <TouchableOpacity style={styles.playbackBtn} onPress={handlePlayback} activeOpacity={0.85} accessibilityRole="button">
                          <Text style={styles.playbackBtnText}>{isPlaying ? '⏸ Playing…' : '▶ Play recording'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.truthActionBtn, isUploading && { opacity: 0.6 }]}
                          onPress={handleSubmitAudioAnswer}
                          disabled={isUploading}
                          activeOpacity={0.85}
                         accessibilityRole="button">
                          {isUploading
                            ? <ActivityIndicator color={Colors.white} />
                            : <Text style={styles.actionBtnText}>Send my answer →</Text>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setRecordingUri(null)} style={styles.skipBtn} accessibilityRole="button">
                          <Text style={styles.skipText}>Re-record →</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}

                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} accessibilityRole="button">
                  <Text style={styles.skipText}>Skip this one →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── DARE: picker watches ── */}
            {session.card.type === 'dare' && isMyTurn && !partnerConfirmedDare && (
              <View style={styles.greyBanner}>
                <Text style={styles.greyBannerText}>✅ Dare sent to {partnerName}!</Text>
                <Text style={styles.greyBannerHint}>Waiting for {partnerName} to do it and confirm…</Text>
              </View>
            )}

            {/* ── DARE: picker confirms after partner does ── */}
            {session.card.type === 'dare' && isMyTurn && partnerConfirmedDare && !iConfirmedDare && (
              <TouchableOpacity style={[styles.actionBtn, styles.dareActionBtn]} onPress={handleConfirmDare} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.actionBtnText}>✓ {partnerName} completed it, confirm!</Text>
              </TouchableOpacity>
            )}

            {/* ── DARE: partner does it ── */}
            {session.card.type === 'dare' && !isMyTurn && !iConfirmedDare && (
              <>
                <TouchableOpacity style={[styles.actionBtn, styles.dareActionBtn]} onPress={handleConfirmDare} activeOpacity={0.85} accessibilityRole="button">
                  <Text style={styles.actionBtnText}>✓ Dare completed</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} accessibilityRole="button">
                  <Text style={styles.skipText}>Skip this one →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── DARE: partner confirmed, waiting ── */}
            {session.card.type === 'dare' && !isMyTurn && iConfirmedDare && (
              <View style={styles.sentBanner}>
                <Text style={styles.sentText}>✓ Done! Waiting for {partnerName} to confirm…</Text>
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════
            PHASE: DONE
        ═══════════════════════════════════════════════════════════ */}
        {session.phase === 'done' && session.card && (
          <DoneCard
            session={session}
            uid={uid}
            partnerName={partnerName}
            cfg={cfg}
            onDone={handleDone}
            isMyTurn={isMyTurn}
          />
        )}

        {/* Score */}
        {(myScore > 0 || partnerScore > 0) && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>You {myScore}, {partnerName} {partnerScore}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Done card extracted to keep audio lifecycle isolated ──────────────────────
function DoneCard({
  session, uid, partnerName, cfg, onDone, isMyTurn,
}: {
  session: TruthDareSession;
  uid: string;
  partnerName: string;
  cfg: ReturnType<typeof Object.values>[0] & { emoji: string; label: string; color: string; textColor: string };
  onDone: () => void;
  isMyTurn: boolean;
}) {
  const card = session.card!;
  const playbackPlayer = useAudioPlayer(card.audioURL ?? undefined);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const sub = playbackPlayer.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) setIsPlaying(false);
    });
    return () => sub.remove();
  }, [playbackPlayer]);

  const handlePlay = () => {
    if (!card.audioURL) return;
    if (isPlaying) {
      playbackPlayer.pause();
      setIsPlaying(false);
      return;
    }
    playbackPlayer.seekTo(0);
    playbackPlayer.play();
    setIsPlaying(true);
  };

  return (
    <View style={[styles.cardView, { borderLeftColor: card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
      <View style={styles.cardTypeRow}>
        <Text style={styles.cardTypeEmoji}>{card.type === 'truth' ? '🤔' : cfg.emoji}</Text>
        <Text style={[styles.cardTypeBadge, { color: card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
          {card.type === 'truth' ? 'Truth' : `${cfg.label} Dare`}
        </Text>
      </View>
      <Text style={styles.cardText}>{personalise(card.text, partnerName)}</Text>

      {card.type === 'truth' && card.audioURL && (
        <View style={styles.answerReveal}>
          <Text style={styles.answerRevealLabel}>
            {card.answeredBy === uid ? 'Your answer:' : `${partnerName}'s answer:`}
          </Text>
          <TouchableOpacity style={styles.playbackBtn} onPress={handlePlay} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.playbackBtnText}>{isPlaying ? '⏸ Playing…' : '▶ Play voice answer'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {card.type === 'truth' && card.answer && !card.audioURL && (
        <View style={styles.answerReveal}>
          <Text style={styles.answerRevealLabel}>
            {card.answeredBy === uid ? 'Your answer:' : `${partnerName}'s answer:`}
          </Text>
          <Text style={styles.answerRevealText}>{card.answer}</Text>
        </View>
      )}

      {card.type === 'dare' && (
        <View style={styles.dareConfirmedBanner}>
          <Text style={styles.dareConfirmedText}>✓ Both confirmed!</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.actionBtn, styles.dareActionBtn]} onPress={onDone} activeOpacity={0.85} accessibilityRole="button">
        <Text style={styles.actionBtnText}>Done, {isMyTurn ? partnerName + "'s" : 'your'} turn →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  resetBtn: { width: 60, alignItems: 'flex-end' },
  resetBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  picker: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.md },
  pickerIntro: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  pickerSectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.sm },
  levelCard: { borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...Shadow.sm },
  levelEmoji: { fontSize: 36 },
  levelInfo: { flex: 1 },
  levelLabel: { fontFamily: Fonts.heading, fontSize: 22 },
  levelSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  levelArrow: { fontFamily: Fonts.heading, fontSize: 28 },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.lg },

  levelSegment: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  levelTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  levelTabEmoji: { fontSize: 18 },
  levelTabLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  turnBadge: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.full, alignItems: 'center' },
  turnText: { fontFamily: Fonts.bodyBold, fontSize: 14 },

  choiceRow: { flexDirection: 'row', gap: Spacing.md },
  choiceBtn: { flex: 1, borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderWidth: 2, backgroundColor: Colors.white, ...Shadow.sm },
  truthBtn: { borderColor: Colors.border },
  choiceBtnEmoji: { fontSize: 36 },
  choiceBtnLabel: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  choiceBtnSub: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },

  waitingCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  waitingEmoji: { fontSize: 40 },
  waitingText: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, textAlign: 'center' },
  waitingHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  cardView: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, ...Shadow.sm },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTypeEmoji: { fontSize: 22 },
  cardTypeBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  cardText: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, lineHeight: 30 },
  previewHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  sentBanner: { backgroundColor: '#E8F5E9', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 4 },
  sentText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: '#2E7D32' },

  greyBanner: { backgroundColor: Colors.cream, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  greyBannerText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  greyBannerHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  answerPrompt: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  modeTabs: { flexDirection: 'row', backgroundColor: Colors.cream, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  modeTabActive: { backgroundColor: '#1565C0' },
  modeTabText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  modeTabTextActive: { color: Colors.white },

  answerInput: { backgroundColor: Colors.cream, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.border },

  recordArea: { gap: Spacing.md, alignItems: 'center' },
  micBtn: { backgroundColor: Colors.blush, borderRadius: Radius.full, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  micBtnRecording: { backgroundColor: '#FFEBEE' },
  micEmoji: { fontSize: 40 },
  micLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
  playbackBtn: { backgroundColor: Colors.cream, borderRadius: Radius.full, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  playbackBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },

  actionBtn: { paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  truthActionBtn: { backgroundColor: '#1565C0' },
  dareActionBtn: { backgroundColor: Colors.burgundy },
  actionBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },

  sendBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  sendBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  skipBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
  skipText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  answerReveal: { backgroundColor: '#E3F2FD', borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
  answerRevealLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.8 },
  answerRevealText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },

  dareConfirmedBanner: { backgroundColor: '#E8F5E9', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
  dareConfirmedText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: '#2E7D32' },

  scoreRow: { alignItems: 'center', paddingVertical: Spacing.sm },
  scoreText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },

  // ── Mode picker ─────────────────────────────────────────────────────────────
  modePickerWrap: { padding: Spacing.lg, gap: Spacing.sm },
  modeEyebrow: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  modeQuestion: { fontFamily: Fonts.headingItalic, fontSize: 30, color: Colors.burgundy, textAlign: 'center', lineHeight: 34, marginBottom: Spacing.xl },
  modeCard: { backgroundColor: '#fff', borderRadius: 22, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, ...Shadow.sm },
  modeCardFeatured: { backgroundColor: Colors.burgundy, borderColor: 'transparent', ...Shadow.md },
  modeIconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  modeIcon: { fontSize: 32 },
  modeBadge: { fontFamily: Fonts.bodyBold, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: Colors.muted, backgroundColor: '#FFF0F3', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
  modeBadgeOnDark: { color: Colors.rose, backgroundColor: 'rgba(244,167,185,0.15)' },
  modeTitle: { fontFamily: Fonts.headingItalic, fontSize: 24, color: Colors.burgundy, marginBottom: 6, lineHeight: 28 },
  modeTitleOnDark: { color: '#fff' },
  modeDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 20 },
  modeDescOnDark: { color: 'rgba(255,248,240,0.75)' },
  modeCta: { fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: Colors.burgundy, marginTop: Spacing.md },
  modeCtaOnDark: { color: Colors.rose },
  modeOr: { fontFamily: Fonts.headingItalic, fontSize: 16, color: Colors.muted, textAlign: 'center', marginVertical: 4 },

  // ── Solo dare ────────────────────────────────────────────────────────────────
  soloWrap: { padding: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  soloLevels: { flexDirection: 'row', gap: 8, width: '100%' },
  soloLevelPill: { flex: 1, backgroundColor: '#fff', borderRadius: 99, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  soloLevelPillActive: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  soloLevelPillLocked: { opacity: 0.4 },
  soloLevelText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.burgundy, letterSpacing: 0.5 },
  soloLevelTextActive: { color: '#fff' },
  // ── Design 2 wheel: split halves + floating center anchor ──────────────────
  wheelWrap: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', position: 'relative', marginVertical: Spacing.lg },
  wheelHalo: { position: 'absolute', width: 276, height: 276, borderRadius: 138, backgroundColor: Colors.rose, opacity: 0.18 },
  // The rotating layer: two tappable halves clipped inside a circular container.
  wheelSplit: {
    width: 240, height: 240, borderRadius: 120,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 3, borderColor: 'rgba(255,248,240,0.7)',
    ...Shadow.md,
  },
  wheelHalfTruth: {
    flex: 1,
    backgroundColor: '#F3E5F5', // soft lavender
    alignItems: 'center', justifyContent: 'center',
    padding: 20,
    borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.06)',
  },
  wheelHalfDare: {
    flex: 1,
    backgroundColor: '#FFCCBC', // warm coral
    alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  wheelHalfEmoji: { fontSize: 36, marginBottom: 4 },
  wheelHalfLabel: { fontFamily: Fonts.headingItalic, fontSize: 22, color: Colors.burgundy, fontWeight: '600' },
  // Center anchor floats above the rotating layer (position: absolute, higher
  // zIndex). Stays static during spin so level context is always readable.
  wheelCenterAnchor: {
    position: 'absolute',
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.cream,
    borderWidth: 3, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8,
    elevation: 4,
  },
  wheelCenterAnchorLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 8, letterSpacing: 2,
    color: Colors.muted, textTransform: 'uppercase',
  },
  wheelCenterAnchorValue: {
    fontFamily: Fonts.headingItalic, fontSize: 18,
    color: Colors.burgundy, marginTop: 2,
  },
  surpriseLink: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.sm,
  },
  surpriseLinkText: {
    fontFamily: Fonts.body, fontSize: 14, color: Colors.muted,
    textDecorationLine: 'underline', textDecorationStyle: 'dotted',
  },

  soloResult: { backgroundColor: '#fff', borderRadius: 22, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', width: '100%', ...Shadow.sm, marginTop: Spacing.md },
  soloResultEyebrow: { fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: Colors.burgundy, marginBottom: Spacing.sm },
  soloResultText: { fontFamily: Fonts.headingItalic, fontSize: 20, color: Colors.burgundy, textAlign: 'center', lineHeight: 26 },
});
