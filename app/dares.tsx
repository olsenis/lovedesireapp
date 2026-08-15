import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { BrandDatePicker } from '../components/BrandDatePicker';
import {
  Dare,
  subscribeDares,
  createDare,
  acceptDare,
  declineDare,
  completeDare,
  withdrawDare,
} from '../services/dareService';
import { uploadDareProof, UploadTooLargeError } from '../services/storageService';
import { notifyPartner } from '../services/notificationService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';

type Tab = 'for-me' | 'sent';

// Human-readable deadline. If null → "No deadline". If past → "Past deadline".
// Otherwise "Due Fri 15 Aug at 20:00" style. Compact but complete.
function formatDeadline(ts: number | null): string {
  if (!ts) return 'No deadline';
  const d = new Date(ts);
  const now = Date.now();
  const past = ts < now;
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return past ? `Past deadline (${day})` : `Due ${day} at ${time}`;
}

// Human status label for the pill on each dare card.
function statusLabel(status: Dare['status']): string {
  switch (status) {
    case 'pending': return 'Waiting';
    case 'accepted': return 'Accepted';
    case 'completed': return 'Completed';
    case 'declined': return 'Declined';
    default: return status;
  }
}

function statusColor(status: Dare['status']): string {
  switch (status) {
    case 'pending': return '#F9A825';
    case 'accepted': return Colors.burgundy;
    case 'completed': return '#43A047';
    case 'declined': return Colors.muted;
    default: return Colors.muted;
  }
}

export default function DaresScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const help = useHelp('dares');
  useTrackScreen('dares');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'your partner';

  const [dares, setDares] = useState<Dare[]>([]);
  // Initial tab honours `?tab=sent` deep-link from Home's completed-dare
  // nudge. Without it the nudge landed users on an empty "For me" tab
  // and the completed dare that fired the nudge looked invisible.
  // `?compose=true` auto-opens the compose modal — Send-a-Dare mode
  // card in truth-dare.tsx uses this so its "Compose →" CTA lands
  // users directly in the form instead of the list.
  const params = useLocalSearchParams<{ tab?: string; compose?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'sent' ? 'sent' : 'for-me');

  // Compose modal state
  const [showCompose, setShowCompose] = useState(false);
  const [composePrompt, setComposePrompt] = useState('');
  const [composeDeadline, setComposeDeadline] = useState<Date | null>(null);
  const [sending, setSending] = useState(false);

  // Complete modal state — recipient completing an accepted dare
  const [completeTarget, setCompleteTarget] = useState<Dare | null>(null);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState('');
  const [completing, setCompleting] = useState(false);

  // Proof viewer — tap on a completed dare's proof photo
  const [viewingProof, setViewingProof] = useState<string | null>(null);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeDares(coupleId, setDares);
  }, [coupleId]);

  // Auto-open compose modal when arriving via `?compose=true` from the
  // T-or-D "Send a Dare" mode card. One-shot on mount, no re-fire on
  // param change (users can close the modal without re-triggering).
  useEffect(() => {
    if (params.compose === 'true') setShowCompose(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Partition dares by tab. For-me = dares I received. Sent = dares I sent.
  // Declined dares stay in the list so the sender sees the negative response
  // but flow terminates (no further actions).
  const forMe = useMemo(() => dares.filter((d) => d.toUid === uid), [dares, uid]);
  const sent = useMemo(() => dares.filter((d) => d.fromUid === uid), [dares, uid]);
  const activeList = tab === 'for-me' ? forMe : sent;

  const resetCompose = () => {
    setComposePrompt('');
    setComposeDeadline(null);
    setSending(false);
  };

  const resetComplete = () => {
    setCompleteTarget(null);
    setProofUri(null);
    setProofNote('');
    setCompleting(false);
  };

  const handleSend = async () => {
    if (!coupleId || !partnerId || !composePrompt.trim() || sending) return;
    setSending(true);
    try {
      await createDare(coupleId, uid, partnerId, composePrompt, composeDeadline?.getTime() ?? null);
      trackEvent('dare_created');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notifyPartner(coupleId, uid, 'A dare from ' + (profile?.name ?? 'your partner') + ' 🎁', composePrompt.slice(0, 100)).catch(() => {});
      resetCompose();
      setShowCompose(false);
    } catch {
      Alert.alert('Could not send dare', 'Please try again.');
      setSending(false);
    }
  };

  const handleAccept = async (dare: Dare) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await acceptDare(coupleId, dare.id);
    trackEvent('dare_accepted');
  };

  const handleDecline = async (dare: Dare) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await declineDare(coupleId, dare.id);
  };

  const handleWithdraw = async (dare: Dare) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await withdrawDare(coupleId, dare.id);
  };

  const openComplete = (dare: Dare) => {
    setCompleteTarget(dare);
    setProofUri(null);
    setProofNote('');
  };

  const pickProofFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setProofUri(result.assets[0].uri);
  };

  const pickProofFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Camera access needed', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setProofUri(result.assets[0].uri);
  };

  const handleComplete = async () => {
    if (!coupleId || !completeTarget || completing) return;
    setCompleting(true);
    try {
      let proofURL: string | undefined;
      if (proofUri) {
        try {
          proofURL = await uploadDareProof(coupleId, completeTarget.id, uid, proofUri);
        } catch (e) {
          if (e instanceof UploadTooLargeError) {
            Alert.alert('Photo too large', 'Try a smaller photo, or complete without one.');
            setCompleting(false);
            return;
          }
          // Non-fatal — complete without proof rather than blocking the flow.
          console.warn('Dare proof upload failed', e);
        }
      }
      await completeDare(coupleId, completeTarget.id, proofURL, proofNote);
      trackEvent('dare_completed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notifyPartner(
        coupleId,
        uid,
        (profile?.name ?? 'Your partner') + ' completed a dare 🎉',
        completeTarget.prompt.slice(0, 100),
      ).catch(() => {});
      resetComplete();
    } catch {
      Alert.alert('Could not complete', 'Please try again.');
      setCompleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        {/* Top-level tabs mirror the Play/Dare Log pair in /truth-dare
            so both screens read as two views of the same Truth or Dare
            hub. router.replace so nav history stays flat. */}
        <View style={styles.topTabs}>
          <TouchableOpacity style={styles.topTab} onPress={() => router.replace('/truth-dare' as any)} accessibilityRole="button" accessibilityLabel="Play">
            <Text style={styles.topTabText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.topTab, styles.topTabActive]} accessibilityRole="button" accessibilityLabel="Dare Log, current tab">
            <Text style={[styles.topTabText, styles.topTabTextActive]}>Dare Log</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setShowCompose(true)} accessibilityRole="button">
          <Text style={styles.sendLink}>+ Send</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'for-me' && styles.tabBtnActive]}
          onPress={() => setTab('for-me')}
          accessibilityRole="button"
        >
          <Text style={[styles.tabText, tab === 'for-me' && styles.tabTextActive]}>For me</Text>
          {forMe.filter((d) => d.status === 'pending').length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{forMe.filter((d) => d.status === 'pending').length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'sent' && styles.tabBtnActive]}
          onPress={() => setTab('sent')}
          accessibilityRole="button"
        >
          <Text style={[styles.tabText, tab === 'sent' && styles.tabTextActive]}>Sent</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {activeList.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎁</Text>
            <Text style={styles.emptyTitle}>
              {tab === 'for-me' ? 'No dares yet' : 'Nothing sent yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {tab === 'for-me'
                ? `Nothing waiting for you. Send ${partnerName} a challenge with the + button above.`
                : `Tap + Send at the top to challenge ${partnerName} to something.`}
            </Text>
          </View>
        )}

        {activeList.map((dare) => {
          const isMineToDo = tab === 'for-me';
          return (
            <View key={dare.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusPill, { backgroundColor: statusColor(dare.status) }]}>
                  <Text style={styles.statusPillText}>{statusLabel(dare.status)}</Text>
                </View>
                <Text style={styles.cardDeadline}>{formatDeadline(dare.deadline)}</Text>
              </View>

              <Text style={styles.cardPrompt}>{dare.prompt}</Text>

              {dare.proofNote && (
                <Text style={styles.cardProofNote}>&ldquo;{dare.proofNote}&rdquo;</Text>
              )}

              {dare.proofURL && (
                <TouchableOpacity onPress={() => setViewingProof(dare.proofURL!)} activeOpacity={0.85} accessibilityRole="button">
                  <Image source={{ uri: dare.proofURL }} style={styles.cardProofImg} contentFit="cover" />
                </TouchableOpacity>
              )}

              {/* Actions depend on tab + status */}
              <View style={styles.actionsRow}>
                {isMineToDo && dare.status === 'pending' && (
                  <>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(dare)} accessibilityRole="button">
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(dare)} accessibilityRole="button">
                      <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                  </>
                )}
                {isMineToDo && dare.status === 'accepted' && (
                  <TouchableOpacity style={styles.completeBtn} onPress={() => openComplete(dare)} accessibilityRole="button">
                    <Text style={styles.completeText}>Mark complete →</Text>
                  </TouchableOpacity>
                )}
                {!isMineToDo && dare.status === 'pending' && (
                  <TouchableOpacity onPress={() => handleWithdraw(dare)} style={styles.withdrawLink} accessibilityRole="button">
                    <Text style={styles.withdrawText}>Withdraw</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Compose modal */}
      <Modal visible={showCompose} transparent animationType="slide" onRequestClose={() => setShowCompose(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Send a dare</Text>
            <Text style={styles.modalHint}>Give {partnerName} something to do: playful, sweet, spicy, up to you.</Text>
            <TextInput
              style={styles.promptInput}
              placeholder="Wear the red dress by Friday..."
              placeholderTextColor={Colors.muted}
              value={composePrompt}
              onChangeText={setComposePrompt}
              multiline
              maxLength={280}
              autoFocus
            />
            <Text style={styles.modalLabel}>Optional deadline</Text>
            <BrandDatePicker
              value={composeDeadline}
              onChange={setComposeDeadline}
              placeholder="Any time (no deadline)"
              mode="datetime"
              minimumDate={new Date(Date.now() + 5 * 60 * 1000)}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetCompose(); setShowCompose(false); }} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, (!composePrompt.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!composePrompt.trim() || sending}
                accessibilityRole="button"
              >
                <Text style={styles.sendBtnText}>{sending ? 'Sending...' : 'Send 🎁'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete modal */}
      {completeTarget && (
        <Modal visible transparent animationType="slide" onRequestClose={() => resetComplete()}>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Mark complete</Text>
              <Text style={styles.modalHint}>&ldquo;{completeTarget.prompt}&rdquo;</Text>

              {proofUri ? (
                <View style={styles.proofPreview}>
                  <Image source={{ uri: proofUri }} style={styles.proofPreviewImg} contentFit="cover" />
                  <TouchableOpacity onPress={() => setProofUri(null)} style={styles.proofClear} accessibilityRole="button">
                    <Text style={styles.proofClearText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.proofPickerRow}>
                  <TouchableOpacity style={styles.proofPickBtn} onPress={pickProofFromCamera} accessibilityRole="button">
                    <Text style={styles.proofPickIcon}>📸</Text>
                    <Text style={styles.proofPickLabel}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.proofPickBtn} onPress={pickProofFromLibrary} accessibilityRole="button">
                    <Text style={styles.proofPickIcon}>🖼️</Text>
                    <Text style={styles.proofPickLabel}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                style={styles.noteInput}
                placeholder="Add a note (optional)"
                placeholderTextColor={Colors.muted}
                value={proofNote}
                onChangeText={setProofNote}
                multiline
                maxLength={200}
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => resetComplete()} accessibilityRole="button">
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendBtn, completing && styles.sendBtnDisabled]}
                  onPress={handleComplete}
                  disabled={completing}
                  accessibilityRole="button"
                >
                  {completing
                    ? <ActivityIndicator color={Colors.cream} size="small" />
                    : <Text style={styles.sendBtnText}>We did it 🎉</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Proof viewer — tap on a proof photo to see full size */}
      {viewingProof && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setViewingProof(null)}>
          <TouchableOpacity style={styles.proofViewer} activeOpacity={1} onPress={() => setViewingProof(null)} accessibilityRole="button">
            <Image source={{ uri: viewingProof }} style={styles.proofViewerImg} contentFit="contain" />
            <Text style={styles.proofViewerHint}>Tap anywhere to close</Text>
          </TouchableOpacity>
        </Modal>
      )}

      <HelpModal
        visible={help.visible}
        title="Dares"
        description={`Send ${partnerName} a challenge, they complete it by a deadline. Works when you're apart, this isn't Truth or Dare's same-room mechanic.`}
        tips={[
          'Tap + Send at top-right to write a challenge',
          'Add an optional deadline so it doesn\'t sit forever',
          `${partnerName} can accept or decline (no shame either way)`,
          'Complete with an optional photo proof or just a note',
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
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  sendLink: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

  tabBar: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginVertical: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  tabBtnActive: { backgroundColor: Colors.burgundy },
  tabText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
  tabTextActive: { color: Colors.cream },
  tabBadge: { backgroundColor: '#F9A825', borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  tabBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.white },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md, paddingTop: Spacing.sm },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm, paddingHorizontal: Spacing.md },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy, textAlign: 'center' },
  emptyBody: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: Radius.full },
  statusPillText: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.white, letterSpacing: 0.8, textTransform: 'uppercase' },
  cardDeadline: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },
  cardPrompt: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, lineHeight: 28 },
  cardProofNote: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, lineHeight: 20 },
  cardProofImg: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md, marginTop: Spacing.xs },

  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  acceptBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  acceptText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },
  declineBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  declineText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
  completeBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: '#43A047' },
  completeText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.white },
  withdrawLink: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  withdrawText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textDecorationLine: 'underline' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, lineHeight: 20 },
  modalLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  promptInput: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
    minHeight: 90, borderWidth: 1, borderColor: Colors.border,
  },
  noteInput: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
    minHeight: 60, borderWidth: 1, borderColor: Colors.border,
  },

  proofPickerRow: { flexDirection: 'row', gap: Spacing.sm },
  proofPickBtn: {
    flex: 1, paddingVertical: Spacing.lg, alignItems: 'center', gap: 6,
    backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  proofPickIcon: { fontSize: 28 },
  proofPickLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  proofPreview: { position: 'relative', alignSelf: 'stretch' },
  proofPreviewImg: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.lg },
  proofClear: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.full },
  proofClearText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.white },

  modalBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  sendBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  proofViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  proofViewerImg: { width: '100%', height: '80%' },
  proofViewerHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: Spacing.md },

  // Top-level tab pair (Play / Dare Log) shown in header. Mirrors the
  // same pair in truth-dare.tsx picker header, kept intentionally
  // compact so header stays a single-row chrome.
  topTabs: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  topTab: { paddingVertical: 8, paddingHorizontal: 14 },
  topTabActive: { backgroundColor: Colors.burgundy },
  topTabText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  topTabTextActive: { color: Colors.cream },
});
