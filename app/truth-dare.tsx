import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { DARES, TRUTHS, DARE_LEVEL_CONFIG, DareLevel } from '../constants/content';
import {
  TruthDareSession, subscribeTruthDare, startTruthDare,
  playCard, nextTurn, resetTruthDare, submitTruthAnswer,
  confirmDare, skipCard,
} from '../services/truthDareService';
import { uploadTruthDareAudio } from '../services/storageService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const LEVELS: DareLevel[] = ['sweet', 'flirty', 'spicy'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function TruthDareScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [session, setSession] = useState<TruthDareSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Local card drawn before sending
  const [drawnCard, setDrawnCard] = useState<{ type: 'truth' | 'dare'; text: string } | null>(null);

  // Truth text answer
  const [answerText, setAnswerText] = useState('');

  // Audio recording state
  const [answerMode, setAnswerMode] = useState<'write' | 'record'>('write');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const help = useHelp('truth-dare');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'Partner';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeTruthDare(coupleId, (s) => { setSession(s); setLoading(false); });
  }, [coupleId]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

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

  // Draw card locally — no Firestore write
  const handleChoose = (type: 'truth' | 'dare') => {
    if (!session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pool = type === 'truth'
      ? TRUTHS.filter(t => t.level === session.level)
      : DARES.filter(d => d.level === session.level);
    if (pool.length === 0) return;
    setDrawnCard({ type, text: pickRandom(pool).text });
  };

  // Redraw locally
  const handleRedraw = () => {
    if (!session || !drawnCard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const pool = drawnCard.type === 'truth'
      ? TRUTHS.filter(t => t.level === session.level)
      : DARES.filter(d => d.level === session.level);
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

  // Audio recording
  const handleStartRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingUri(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('Recording failed', e);
    }
  };

  const handleStopRecording = async () => {
    if (!recordingRef.current) return;
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingUri(uri ?? null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handlePlayback = async () => {
    if (!recordingUri) return;
    if (isPlaying) {
      await soundRef.current?.stopAsync();
      setIsPlaying(false);
      return;
    }
    const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
    soundRef.current = sound;
    setIsPlaying(true);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
    });
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
    await resetTruthDare(coupleId);
  };

  // ── Lobby (no active game) ────────────────────────────────────────────────────
  if (!loading && (!session || session.round === 0)) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={styles.title}>Truth or Dare</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.picker}>
          <Text style={styles.pickerIntro}>
            A real 2-phone game. You challenge your partner — they answer or do the dare on their phone.
          </Text>
          <Text style={styles.pickerSectionLabel}>New Game — choose level</Text>
          {LEVELS.map(level => {
            const c = DARE_LEVEL_CONFIG[level];
            return (
              <TouchableOpacity key={level} style={[styles.levelCard, { backgroundColor: c.color }]} onPress={() => handleStart(level)} activeOpacity={0.85}>
                <Text style={styles.levelEmoji}>{c.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelLabel, { color: c.textColor }]}>{c.label}</Text>
                  <Text style={styles.levelSub}>You go first · partner joins on their phone</Text>
                </View>
                <Text style={[styles.levelArrow, { color: c.textColor }]}>›</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <HelpModal
          visible={help.visible}
          title="Truth or Dare"
          description="Pick Truth or Dare for your partner — they see it on their phone and must respond."
          tips={[
            "Your turn = you draw a card and send it to your partner",
            "Pick Truth → partner types or records their answer",
            "Pick Dare → partner confirms they did it, then you confirm",
            "Back saves the game — return anytime",
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
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Truth or Dare</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}><Text style={styles.resetBtnText}>↺ New</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Level tab strip */}
        <View style={styles.levelSegment}>
          {LEVELS.map(level => {
            const c = DARE_LEVEL_CONFIG[level];
            const active = session.level === level;
            return (
              <TouchableOpacity
                key={level}
                style={[styles.levelTab, active && { backgroundColor: c.color }]}
                onPress={async () => { if (coupleId) { setDrawnCard(null); await startTruthDare(coupleId, uid, level); } }}
                activeOpacity={0.8}
              >
                <Text style={styles.levelTabEmoji}>{c.emoji}</Text>
                <Text style={[styles.levelTabLabel, active && { color: c.textColor }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Turn badge */}
        <View style={[styles.turnBadge, { backgroundColor: cfg.color }]}>
          <Text style={[styles.turnText, { color: cfg.textColor }]}>
            Round {session.round} · {isMyTurn ? `Your turn — challenge ${partnerName}:` : `${partnerName}'s turn`}
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════
            PHASE: PICKING
        ═══════════════════════════════════════════════════════════ */}
        {session.phase === 'picking' && isMyTurn && !drawnCard && (
          <View style={styles.choiceRow}>
            <TouchableOpacity style={[styles.choiceBtn, styles.truthBtn]} onPress={() => handleChoose('truth')} activeOpacity={0.85}>
              <Text style={styles.choiceBtnEmoji}>🤔</Text>
              <Text style={styles.choiceBtnLabel}>Truth</Text>
              <Text style={styles.choiceBtnSub}>{partnerName} answers a question</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.choiceBtn, { borderColor: cfg.textColor }]} onPress={() => handleChoose('dare')} activeOpacity={0.85}>
              <Text style={styles.choiceBtnEmoji}>{cfg.emoji}</Text>
              <Text style={[styles.choiceBtnLabel, { color: cfg.textColor }]}>Dare</Text>
              <Text style={styles.choiceBtnSub}>{partnerName} does a challenge</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Local card preview — before send */}
        {session.phase === 'picking' && isMyTurn && drawnCard && (
          <View style={[styles.cardView, { borderLeftColor: drawnCard.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
            <View style={styles.cardTypeRow}>
              <Text style={styles.cardTypeEmoji}>{drawnCard.type === 'truth' ? '🤔' : cfg.emoji}</Text>
              <Text style={[styles.cardTypeBadge, { color: drawnCard.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
                {drawnCard.type === 'truth' ? 'Truth' : `${cfg.label} Dare`}
              </Text>
            </View>
            <Text style={styles.cardText}>{drawnCard.text}</Text>
            <Text style={styles.previewHint}>
              {drawnCard.type === 'truth' ? `${partnerName} will answer this question` : `${partnerName} will do this dare`}
            </Text>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendCard} activeOpacity={0.85}>
              <Text style={styles.sendBtnText}>Send to {partnerName} →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRedraw} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip — get a different one →</Text>
            </TouchableOpacity>
          </View>
        )}

        {session.phase === 'picking' && !isMyTurn && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>🎲</Text>
            <Text style={styles.waitingText}>{partnerName} is choosing your challenge…</Text>
            <Text style={styles.waitingHint}>Get ready — Truth or Dare is coming your way</Text>
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
            <Text style={styles.cardText}>{session.card.text}</Text>

            {/* ── TRUTH: picker waits ── */}
            {session.card.type === 'truth' && isMyTurn && (
              <View style={styles.sentBanner}>
                <Text style={styles.sentText}>✅ Sent to {partnerName}! They're answering…</Text>
              </View>
            )}

            {/* ── TRUTH: partner answers ── */}
            {session.card.type === 'truth' && !isMyTurn && (
              <>
                <Text style={styles.answerPrompt}>Your truth — answer honestly:</Text>

                {/* Write / Record tabs */}
                <View style={styles.modeTabs}>
                  <TouchableOpacity
                    style={[styles.modeTab, answerMode === 'write' && styles.modeTabActive]}
                    onPress={() => setAnswerMode('write')}
                  >
                    <Text style={[styles.modeTabText, answerMode === 'write' && styles.modeTabTextActive]}>✏️ Write</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeTab, answerMode === 'record' && styles.modeTabActive]}
                    onPress={() => setAnswerMode('record')}
                  >
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
                    >
                      <Text style={styles.actionBtnText}>Send my answer →</Text>
                    </TouchableOpacity>
                  </>
                )}

                {answerMode === 'record' && (
                  <View style={styles.recordArea}>
                    {!isRecording && !recordingUri && (
                      <TouchableOpacity style={styles.micBtn} onPress={handleStartRecording} activeOpacity={0.85}>
                        <Text style={styles.micEmoji}>🎙️</Text>
                        <Text style={styles.micLabel}>Tap to record</Text>
                      </TouchableOpacity>
                    )}
                    {isRecording && (
                      <TouchableOpacity style={[styles.micBtn, styles.micBtnRecording]} onPress={handleStopRecording} activeOpacity={0.85}>
                        <Text style={styles.micEmoji}>⏹️</Text>
                        <Text style={styles.micLabel}>Recording… tap to stop</Text>
                      </TouchableOpacity>
                    )}
                    {recordingUri && !isRecording && (
                      <>
                        <TouchableOpacity style={styles.playbackBtn} onPress={handlePlayback} activeOpacity={0.85}>
                          <Text style={styles.playbackBtnText}>{isPlaying ? '⏸ Playing…' : '▶ Play recording'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.truthActionBtn, isUploading && { opacity: 0.6 }]}
                          onPress={handleSubmitAudioAnswer}
                          disabled={isUploading}
                          activeOpacity={0.85}
                        >
                          {isUploading
                            ? <ActivityIndicator color={Colors.white} />
                            : <Text style={styles.actionBtnText}>Send my answer →</Text>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setRecordingUri(null)} style={styles.skipBtn}>
                          <Text style={styles.skipText}>Re-record →</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}

                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                  <Text style={styles.skipText}>Skip this one →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── DARE: picker watches ── */}
            {session.card.type === 'dare' && isMyTurn && !partnerConfirmedDare && (
              <View style={styles.greyBanner}>
                <Text style={styles.greyBannerText}>✅ Dare sent to {partnerName}!</Text>
                <Text style={styles.greyBannerHint}>Waiting for them to do it and confirm…</Text>
              </View>
            )}

            {/* ── DARE: picker confirms after partner does ── */}
            {session.card.type === 'dare' && isMyTurn && partnerConfirmedDare && !iConfirmedDare && (
              <TouchableOpacity style={[styles.actionBtn, styles.dareActionBtn]} onPress={handleConfirmDare} activeOpacity={0.85}>
                <Text style={styles.actionBtnText}>✓ {partnerName} completed it — confirm!</Text>
              </TouchableOpacity>
            )}

            {/* ── DARE: partner does it ── */}
            {session.card.type === 'dare' && !isMyTurn && !iConfirmedDare && (
              <>
                <TouchableOpacity style={[styles.actionBtn, styles.dareActionBtn]} onPress={handleConfirmDare} activeOpacity={0.85}>
                  <Text style={styles.actionBtnText}>✓ Dare completed</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
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
            <Text style={styles.scoreText}>You {myScore} — {partnerName} {partnerScore}</Text>
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
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const handlePlay = async () => {
    if (!card.audioURL) return;
    if (isPlaying) {
      await soundRef.current?.stopAsync();
      setIsPlaying(false);
      return;
    }
    const { sound } = await Audio.Sound.createAsync({ uri: card.audioURL });
    soundRef.current = sound;
    setIsPlaying(true);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
    });
  };

  return (
    <View style={[styles.cardView, { borderLeftColor: card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
      <View style={styles.cardTypeRow}>
        <Text style={styles.cardTypeEmoji}>{card.type === 'truth' ? '🤔' : cfg.emoji}</Text>
        <Text style={[styles.cardTypeBadge, { color: card.type === 'dare' ? cfg.textColor : '#1565C0' }]}>
          {card.type === 'truth' ? 'Truth' : `${cfg.label} Dare`}
        </Text>
      </View>
      <Text style={styles.cardText}>{card.text}</Text>

      {card.type === 'truth' && card.audioURL && (
        <View style={styles.answerReveal}>
          <Text style={styles.answerRevealLabel}>
            {card.answeredBy === uid ? 'Your answer:' : `${partnerName}'s answer:`}
          </Text>
          <TouchableOpacity style={styles.playbackBtn} onPress={handlePlay} activeOpacity={0.85}>
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

      <TouchableOpacity style={[styles.actionBtn, styles.dareActionBtn]} onPress={onDone} activeOpacity={0.85}>
        <Text style={styles.actionBtnText}>Done — {isMyTurn ? partnerName + "'s" : 'your'} turn →</Text>
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
});
