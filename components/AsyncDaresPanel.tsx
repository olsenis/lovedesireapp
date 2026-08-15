import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { BrandDatePicker } from './BrandDatePicker';
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
import { trackEvent } from '../services/statsService';

// AsyncDaresPanel — inline hub for user-authored async dares (compose,
// pending inbox, sent history, complete-with-proof). Extracted Aug 2026
// from the deleted /dares standalone screen so async dares live as a
// section of the Truth or Dare picker rather than a separate route. See
// the plan file and CLAUDE.md for context.
//
// The panel owns every piece of state related to async dares (subscription,
// modals, compose draft) — the host screen only needs to pass identity
// props. No route params, no back button, no headers here; those are the
// host's responsibility.

interface Props {
  coupleId: string;
  uid: string;
  partnerId: string;
  partnerName: string;
  senderName: string;
}

function formatDeadline(ts: number | null): string {
  if (!ts) return 'No deadline';
  const d = new Date(ts);
  const now = Date.now();
  const past = ts < now;
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return past ? `Past deadline (${day})` : `Due ${day} at ${time}`;
}

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

export function AsyncDaresPanel({ coupleId, uid, partnerId, partnerName, senderName }: Props) {
  const [dares, setDares] = useState<Dare[]>([]);
  // `?compose=true` deep-link auto-opens the compose modal on mount. Left
  // wired for future Home-nudge deep-links that jump straight to compose.
  const params = useLocalSearchParams<{ compose?: string }>();

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

  useEffect(() => {
    if (params.compose === 'true') setShowCompose(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Partition dares into two sections. "For me" surfaces actionable
  // incoming (pending → accept/decline, accepted → complete). "Sent"
  // shows status updates on things I've challenged partner with. Both
  // sections are visible together — no sub-tabs, since users typically
  // want a full glance at what's in flight in both directions.
  const forMe = useMemo(() => dares.filter((d) => d.toUid === uid), [dares, uid]);
  const sent = useMemo(() => dares.filter((d) => d.fromUid === uid), [dares, uid]);
  const forMePending = forMe.filter((d) => d.status === 'pending' || d.status === 'accepted');
  const bothEmpty = dares.length === 0;

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
      notifyPartner(coupleId, uid, 'A dare from ' + senderName + ' 🎁', composePrompt.slice(0, 100)).catch(() => {});
      resetCompose();
      setShowCompose(false);
    } catch {
      Alert.alert('Could not send dare', 'Please try again.');
    } finally {
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
          console.warn('Dare proof upload failed', e);
        }
      }
      await completeDare(coupleId, completeTarget.id, proofURL, proofNote);
      trackEvent('dare_completed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notifyPartner(
        coupleId,
        uid,
        senderName + ' completed a dare 🎉',
        completeTarget.prompt.slice(0, 100),
      ).catch(() => {});
      resetComplete();
    } catch {
      Alert.alert('Could not complete', 'Please try again.');
      setCompleting(false);
    }
  };

  const renderCard = (dare: Dare, isMineToDo: boolean) => (
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

  return (
    <View style={styles.container}>
      {/* Section divider matches the Home Tonight's Picks pattern so
          the T-or-D picker reads as a two-section scroll (mode cards +
          async dares) rather than two unrelated blocks. */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>Async Dares</Text>
        <View style={styles.dividerLine} />
      </View>

      {bothEmpty && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎁</Text>
          <Text style={styles.emptyTitle}>No async dares yet</Text>
          <Text style={styles.emptyBody}>
            Send {partnerName} a challenge with an optional deadline. They upload proof when it is done.
          </Text>
        </View>
      )}

      {forMePending.length > 0 && (
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>
            📥 For you {forMePending.length > 1 ? `(${forMePending.length})` : ''}
          </Text>
          {forMePending.map((d) => renderCard(d, true))}
        </View>
      )}

      {sent.length > 0 && (
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>
            📤 Sent {sent.length > 1 ? `(${sent.length})` : ''}
          </Text>
          {sent.map((d) => renderCard(d, false))}
        </View>
      )}

      <TouchableOpacity
        style={styles.sendCta}
        onPress={() => setShowCompose(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.sendCtaText}>+ Send a new dare</Text>
      </TouchableOpacity>

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

      {/* Proof viewer */}
      {viewingProof && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setViewingProof(null)}>
          <TouchableOpacity style={styles.proofViewer} activeOpacity={1} onPress={() => setViewingProof(null)} accessibilityRole="button">
            <Image source={{ uri: viewingProof }} style={styles.proofViewerImg} contentFit="contain" />
            <Text style={styles.proofViewerHint}>Tap anywhere to close</Text>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Spacing.lg, marginBottom: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.muted, letterSpacing: 2.5, textTransform: 'uppercase' },

  sectionGroup: { gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.xs },

  empty: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.xs, paddingHorizontal: Spacing.md },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.burgundy, textAlign: 'center' },
  emptyBody: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },

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

  sendCta: {
    marginTop: Spacing.md, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  sendCtaText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

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
});
