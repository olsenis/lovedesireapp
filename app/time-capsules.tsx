import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { subscribeTimeCapsules, sealTimeCapsule, markCapsuleOpened, isUnlocked, getCapsuleContent, TimeCapsule, TimeCapsuleContent } from '../services/timeCapsuleService';
import { uploadCapsulePhoto } from '../services/storageService';
import { notifyPartner } from '../services/notificationService';
import { BrandDatePicker } from '../components/BrandDatePicker';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const PRESETS = [
  { label: '1 year', years: 1, emoji: '🌱' },
  { label: '5 years', years: 5, emoji: '🌳' },
  { label: '10 years', years: 10, emoji: '✨' },
];

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeUntil(ts: number): string {
  const ms = ts - Date.now();
  if (ms <= 0) return 'Ready to open';
  const days = Math.ceil(ms / 86400000);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'}`;
  if (days < 365) return `${Math.floor(days / 30)} ${Math.floor(days / 30) === 1 ? 'month' : 'months'}`;
  const years = Math.floor(days / 365);
  const remMonths = Math.floor((days % 365) / 30);
  if (remMonths > 0) return `${years}y ${remMonths}m`;
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

export default function TimeCapsulesScreen() {
  const { user, profile } = useAuth();
  const { couple } = useCouple(user?.uid, profile?.coupleId);
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<Date | null>(null);
  const [sealing, setSealing] = useState(false);
  const [viewing, setViewing] = useState<TimeCapsule | null>(null);
  const [viewingContent, setViewingContent] = useState<TimeCapsuleContent | null>(null);
  const help = useHelp('time-capsules');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeTimeCapsules(coupleId, setCapsules);
  }, [coupleId]);

  const upcoming = capsules.filter((c) => !isUnlocked(c));
  const ready = capsules.filter((c) => isUnlocked(c) && !c.opened);
  const opened = capsules.filter((c) => isUnlocked(c) && c.opened);

  const pickPreset = (years: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    setOpenDate(d);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const handleSeal = async () => {
    if (!coupleId || !user || !message.trim() || !openDate) return;
    if (openDate.getTime() <= Date.now() + 86400000) {
      Alert.alert('Pick a date at least 1 day in the future.');
      return;
    }
    setSealing(true);
    try {
      let photoURL: string | undefined;
      if (photoUri) photoURL = await uploadCapsulePhoto(coupleId, uid, photoUri);
      await sealTimeCapsule(coupleId, uid, profile?.name ?? 'Someone', message.trim(), openDate.getTime(), photoURL);
      notifyPartner(coupleId, uid, 'Time Capsule sealed 🕰️', `${profile?.name ?? 'Your partner'} sealed something to open on ${fmtDate(openDate.getTime())}`).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreateOpen(false);
      setMessage('');
      setPhotoUri(null);
      setOpenDate(null);
    } catch (e) {
      Alert.alert('Could not seal the capsule. Try again.');
    } finally {
      setSealing(false);
    }
  };

  const handleOpenCapsule = async (c: TimeCapsule) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setViewing(c);
    setViewingContent(null);
    try {
      const content = await getCapsuleContent(coupleId, c.id);
      setViewingContent(content);
    } catch {
      // Partner trying to open before openAt → rules deny. Show metadata only.
    }
    if (!c.opened) markCapsuleOpened(coupleId, c.id).catch(() => {});
  };

  const closeViewing = () => {
    setViewing(null);
    setViewingContent(null);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Time Capsules</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {capsules.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🕰️</Text>
            <Text style={styles.emptyTitle}>Seal a memory for the future</Text>
            <Text style={styles.emptyBody}>
              Write a message or save a photo. Set a date to open it: one year, five years, even ten years from now. Once sealed, it stays locked until the day comes.
            </Text>
          </View>
        )}

        {ready.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Ready to open ✨</Text>
            {ready.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => handleOpenCapsule(c)} activeOpacity={0.9} accessibilityRole="button">
                <LinearGradient colors={['#FFE5EC', Colors.blush]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.readyCard}>
                  <Text style={styles.readyEmoji}>🎁</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.readyTitle}>From {c.sealedByName}</Text>
                    <Text style={styles.readySub}>Sealed {fmtDate(c.sealedAt)}</Text>
                  </View>
                  <Text style={styles.readyArrow}>→</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Sealed</Text>
            {upcoming.map((c) => (
              <View key={c.id} style={styles.lockedCard}>
                <Text style={styles.lockEmoji}>🔒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockTitle}>From {c.sealedByName}</Text>
                  <Text style={styles.lockDate}>Opens {fmtDate(c.openAt)}</Text>
                </View>
                <Text style={styles.lockCountdown}>{timeUntil(c.openAt)}</Text>
              </View>
            ))}
          </>
        )}

        {opened.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Opened</Text>
            {opened.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => handleOpenCapsule(c)} activeOpacity={0.9} accessibilityRole="button">
                <View style={styles.openedCard}>
                  <Text style={styles.openedEmoji}>📜</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.openedTitle}>From {c.sealedByName}</Text>
                    <Text style={styles.openedDate}>Opened, sealed {fmtDate(c.sealedAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <TouchableOpacity style={styles.sealBtn} onPress={() => setCreateOpen(true)} accessibilityRole="button">
          <Text style={styles.sealBtnText}>Seal a new capsule</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Create modal */}
      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={{ gap: Spacing.md, paddingBottom: Spacing.lg }} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Seal a time capsule</Text>
              <Text style={styles.modalHint}>
                Write what you want your future selves to read. You can add a photo too. Once sealed, neither of you can open it until the date arrives.
              </Text>

              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Your message to future-us..."
                placeholderTextColor={Colors.muted}
                multiline
                maxLength={1500}
              />

              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} accessibilityRole="button">
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoBtnText}>📷 Add a photo (optional)</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Open on</Text>
              <View style={styles.presetRow}>
                {PRESETS.map((p) => (
                  <TouchableOpacity key={p.years} style={styles.presetBtn} onPress={() => pickPreset(p.years)} accessibilityRole="button">
                    <Text style={styles.presetEmoji}>{p.emoji}</Text>
                    <Text style={styles.presetText}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <BrandDatePicker
                value={openDate}
                onChange={setOpenDate}
                placeholder="Or pick a specific date"
                minimumDate={new Date(Date.now() + 86400000)}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setCreateOpen(false); setMessage(''); setPhotoUri(null); setOpenDate(null); }}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, (!message.trim() || !openDate || sealing) && styles.confirmDisabled]}
                  onPress={handleSeal}
                  disabled={!message.trim() || !openDate || sealing}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmText}>{sealing ? 'Sealing...' : 'Seal capsule 🔒'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View capsule modal */}
      <Modal visible={!!viewing} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.viewSheet}>
            {viewing && (
              <ScrollView contentContainerStyle={{ gap: Spacing.md }}>
                <Text style={styles.viewEyebrow}>Sealed {fmtDate(viewing.sealedAt)} by {viewing.sealedByName}</Text>
                {viewingContent?.photoURL && <Image source={{ uri: viewingContent.photoURL }} style={styles.viewPhoto} />}
                <Text style={styles.viewMessage}>{viewingContent?.message ?? 'Loading...'}</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={closeViewing} accessibilityRole="button">
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Time Capsules"
        description="Seal a message or photo now, open it years from today. The longer the seal, the bigger the emotional payoff when it finally opens."
        tips={[
          "Pick 1, 5 or 10 years, or set your own date",
          "Once sealed, neither of you can open it until the date arrives",
          "Add a photo for an extra punch when it opens",
          "Great for anniversaries, big bets, or letters to your future selves",
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

  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },

  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy, textAlign: 'center' },
  emptyBody: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },

  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: Spacing.sm },

  readyCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.xl, gap: Spacing.md, ...Shadow.md, borderWidth: 1, borderColor: Colors.rose },
  readyEmoji: { fontSize: 36 },
  readyTitle: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.burgundy },
  readySub: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 2 },
  readyArrow: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },

  lockedCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.white, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  lockEmoji: { fontSize: 26 },
  lockTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  lockDate: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 2 },
  lockCountdown: { fontFamily: Fonts.headingItalic, fontSize: 14, color: Colors.burgundy },

  openedCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.white, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, opacity: 0.75 },
  openedEmoji: { fontSize: 24 },
  openedTitle: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  openedDate: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted, marginTop: 2 },

  sealBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.md },
  sealBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, maxHeight: '90%' },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  modalHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, lineHeight: 20 },

  input: { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, minHeight: 120, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, textAlignVertical: 'top' },
  photoBtn: { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: 'center', borderStyle: 'dashed' },
  photoBtnText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
  photoPreview: { width: '100%', height: 180, borderRadius: Radius.md },

  fieldLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: Spacing.sm },
  presetRow: { flexDirection: 'row', gap: Spacing.sm },
  presetBtn: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.md, alignItems: 'center', gap: 4 },
  presetEmoji: { fontSize: 22 },
  presetText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.text },

  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
  confirmBtn: { flex: 2, backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },

  viewSheet: { backgroundColor: Colors.cream, borderRadius: Radius.xl, margin: Spacing.lg, padding: Spacing.lg, maxHeight: '85%' },
  viewEyebrow: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },
  viewPhoto: { width: '100%', height: 240, borderRadius: Radius.lg },
  viewMessage: { fontFamily: Fonts.bodyItalic, fontSize: 17, color: Colors.text, lineHeight: 28 },
  closeBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  closeText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
