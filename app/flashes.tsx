import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform, ActivityIndicator, ActionSheetIOS } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { FlashEntry, subscribeFlashes, sendFlash, markFlashViewed, formatCountdown } from '../services/flashService';
import { uploadFlashMedia } from '../services/storageService';
import { notifyPartner } from '../services/notificationService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

export default function FlashesScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple(user?.uid ?? '', profile?.coupleId ?? '');
  const uid = user?.uid ?? '';
  const coupleId = profile?.coupleId ?? '';
  const { send } = useLocalSearchParams<{ send?: string }>();

  const [flashes, setFlashes] = useState<FlashEntry[]>([]);
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'photo' | 'video'>('photo');
  const [caption, setCaption] = useState('');
  const [viewingFlash, setViewingFlash] = useState<FlashEntry | null>(null);
  const [tick, setTick] = useState(0);
  const [showPickerSheet, setShowPickerSheet] = useState(false);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeFlashes(coupleId, setFlashes);
  }, [coupleId]);

  // Auto-open picker when navigated with ?send=1
  useEffect(() => {
    if (send === '1') showMediaPicker();
  }, [send]);

  // Update countdowns every minute
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const incoming = flashes.filter(f => f.fromUid !== uid);
  const sent = flashes.filter(f => f.fromUid === uid);
  const unviewedCount = incoming.filter(f => !f.viewed).length;

  const openFlash = async (flash: FlashEntry) => {
    setViewingFlash(flash);
    if (!flash.viewed && flash.fromUid !== uid) {
      await markFlashViewed(coupleId, flash.id).catch(() => {});
    }
  };

  const pickMedia = async (source: 'camera' | 'library', type: 'photo' | 'video') => {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Camera access needed', 'Please allow camera access in Settings.');
        return;
      }
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: type === 'video' ? ['videos'] : ['images'],
      allowsEditing: type === 'photo',
      quality: 0.85,
      videoMaxDuration: 30,
    };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (!result.canceled) {
      setSelectedUri(result.assets[0].uri);
      setSelectedType(type);
      setShowCompose(true);
    }
  };

  const showMediaPicker = () => setShowPickerSheet(true);

  const handleSend = async () => {
    if (!selectedUri || !coupleId || !uid) return;
    setSending(true);
    try {
      const url = await uploadFlashMedia(coupleId, uid, selectedUri, selectedType);
      await sendFlash(coupleId, uid, url, selectedType, caption.trim() || undefined);
      notifyPartner(
        coupleId, uid,
        `${profile?.name ?? 'Partner'} sent you a flash 📸`,
        caption.trim() || 'Tap to view before it disappears'
      ).catch(() => {});
      setShowCompose(false);
      setSelectedUri(null);
      setCaption('');
    } catch (e) {
      Alert.alert('Upload failed', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Flashes</Text>
        <TouchableOpacity onPress={showMediaPicker} style={styles.sendBtn}>
          <Text style={styles.sendBtnText}>+ Send</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Incoming */}
        <Text style={styles.sectionLabel}>
          {partner?.name ? `From ${partner.name}` : 'Incoming'}
          {unviewedCount > 0 && <Text style={styles.badge}> · {unviewedCount} new</Text>}
        </Text>

        {incoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyText}>No flashes yet</Text>
            <Text style={styles.emptySubtext}>Send one and it'll disappear in 24 hours</Text>
          </View>
        ) : (
          incoming.map(flash => (
            <TouchableOpacity
              key={flash.id}
              style={[styles.flashCard, flash.viewed && styles.flashCardViewed]}
              onPress={() => openFlash(flash)}
            >
              <View style={styles.flashThumb}>
                {flash.mediaType === 'photo' ? (
                  <Image source={{ uri: flash.mediaURL }} style={styles.thumbMedia} contentFit="cover" />
                ) : (
                  <View style={styles.videoThumb}>
                    <Text style={styles.videoIcon}>▶</Text>
                  </View>
                )}
                {!flash.viewed && <View style={styles.newDot} />}
              </View>
              <View style={styles.flashInfo}>
                {flash.caption ? <Text style={styles.flashCaption} numberOfLines={2}>{flash.caption}</Text> : null}
                <Text style={styles.countdown}>⏱ {formatCountdown(flash.expiresAt)}</Text>
                {flash.viewed && <Text style={styles.seenLabel}>Seen</Text>}
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Sent */}
        {sent.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>Sent by you</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sentRow}>
              {sent.map(flash => (
                <TouchableOpacity key={flash.id} style={styles.sentThumb} onPress={() => setViewingFlash(flash)}>
                  {flash.mediaType === 'photo' ? (
                    <Image source={{ uri: flash.mediaURL }} style={styles.sentMedia} contentFit="cover" />
                  ) : (
                    <View style={[styles.sentMedia, styles.videoThumbSmall]}>
                      <Text style={styles.videoIconSmall}>▶</Text>
                    </View>
                  )}
                  <Text style={styles.sentCountdown}>{formatCountdown(flash.expiresAt)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      {/* Compose modal */}
      <Modal visible={showCompose} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.composeContainer}>
          <View style={styles.composeHeader}>
            <TouchableOpacity onPress={() => { setShowCompose(false); setSelectedUri(null); setCaption(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.composeTitle}>New Flash</Text>
            <TouchableOpacity onPress={handleSend} disabled={sending || !selectedUri}>
              {sending
                ? <ActivityIndicator color={Colors.burgundy} />
                : <Text style={[styles.sendText, (!selectedUri) && styles.sendTextDisabled]}>Send</Text>}
            </TouchableOpacity>
          </View>

          {selectedUri && (
            selectedType === 'photo' ? (
              <Image source={{ uri: selectedUri }} style={styles.previewMedia} contentFit="cover" />
            ) : (
              <Video
                source={{ uri: selectedUri }}
                style={styles.previewMedia}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
              />
            )
          )}

          <View style={styles.captionRow}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption... (optional)"
              placeholderTextColor={Colors.muted}
              value={caption}
              onChangeText={t => setCaption(t.slice(0, 60))}
              maxLength={60}
            />
            <Text style={styles.charCount}>{caption.length}/60</Text>
          </View>
          <Text style={styles.disappearsNote}>Disappears after 24 hours · Screenshots are not detectable</Text>
        </View>
      </Modal>

      {/* Picker sheet */}
      <Modal visible={showPickerSheet} transparent animationType="slide" onRequestClose={() => setShowPickerSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Send a Flash</Text>
            {([
              { label: '📷  Take a photo', source: 'camera' as const, type: 'photo' as const },
              { label: '🎥  Record a video', source: 'camera' as const, type: 'video' as const },
              { label: '🖼️  Photo from library', source: 'library' as const, type: 'photo' as const },
              { label: '📁  Video from library', source: 'library' as const, type: 'video' as const },
            ]).map(opt => (
              <TouchableOpacity
                key={opt.label}
                style={styles.sheetOption}
                onPress={() => { setShowPickerSheet(false); pickMedia(opt.source, opt.type); }}
                activeOpacity={0.8}
              >
                <Text style={styles.sheetOptionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowPickerSheet(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-screen viewer */}
      <Modal visible={!!viewingFlash} animationType="fade" presentationStyle="fullScreen">
        <View style={styles.viewerContainer}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewingFlash(null)}>
            <Text style={styles.viewerCloseText}>✕</Text>
          </TouchableOpacity>

          {viewingFlash?.mediaType === 'photo' ? (
            <Image source={{ uri: viewingFlash.mediaURL }} style={styles.viewerMedia} contentFit="contain" />
          ) : viewingFlash ? (
            <Video
              source={{ uri: viewingFlash.mediaURL }}
              style={styles.viewerMedia}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              useNativeControls
            />
          ) : null}

          <View style={styles.viewerFooter}>
            {viewingFlash?.caption ? (
              <Text style={styles.viewerCaption}>{viewingFlash.caption}</Text>
            ) : null}
            <Text style={styles.viewerCountdown}>
              ⏱ {viewingFlash ? formatCountdown(viewingFlash.expiresAt) : ''}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, minWidth: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy },
  sendBtn: {
    backgroundColor: Colors.burgundy, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6, minWidth: 60, alignItems: 'center',
  },
  sendBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: '#fff' },

  content: { padding: Spacing.md, paddingBottom: 40 },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  badge: { color: Colors.burgundy },

  emptyCard: {
    alignItems: 'center', paddingVertical: Spacing.xl,
    backgroundColor: '#fff', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.burgundy, marginBottom: 4 },
  emptySubtext: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.lg },

  flashCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: Radius.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  flashCardViewed: { opacity: 0.6 },
  flashThumb: { width: 80, height: 80, position: 'relative' },
  thumbMedia: { width: 80, height: 80 },
  videoThumb: { width: 80, height: 80, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  videoIcon: { fontSize: 28, color: '#fff' },
  newDot: {
    position: 'absolute', top: 6, right: 6,
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.burgundy,
  },
  flashInfo: { flex: 1, padding: Spacing.sm },
  flashCaption: { fontFamily: Fonts.body, fontSize: 14, color: '#333', marginBottom: 4 },
  countdown: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  seenLabel: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted, marginTop: 2 },
  arrow: { fontSize: 20, color: Colors.muted, paddingRight: Spacing.sm },

  sentRow: { marginTop: 4 },
  sentThumb: { marginRight: Spacing.sm, alignItems: 'center' },
  sentMedia: { width: 72, height: 72, borderRadius: Radius.sm, backgroundColor: '#ddd' },
  videoThumbSmall: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' },
  videoIconSmall: { fontSize: 20, color: '#fff' },
  sentCountdown: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, marginTop: 2, textAlign: 'center' },

  // Compose
  composeContainer: { flex: 1, backgroundColor: Colors.cream },
  composeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cancelText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.muted },
  composeTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.burgundy },
  sendText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.burgundy },
  sendTextDisabled: { opacity: 0.3 },
  previewMedia: { width: '100%', height: 340, backgroundColor: '#000' },
  captionRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8,
  },
  captionInput: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: '#333' },
  charCount: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginLeft: 8 },
  disappearsNote: {
    fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted,
    textAlign: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.sm,
  },

  // Viewer
  viewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8 },
  viewerCloseText: { fontSize: 22, color: '#fff' },
  viewerMedia: { width: '100%', height: '70%' },
  viewerFooter: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center', padding: Spacing.md },
  viewerCaption: { fontFamily: Fonts.body, fontSize: 16, color: '#fff', marginBottom: 8, textAlign: 'center' },
  viewerCountdown: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: Radius.full, alignSelf: 'center', marginBottom: Spacing.sm },
  sheetTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy, marginBottom: Spacing.sm },
  sheetOption: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sheetOptionText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  sheetCancel: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
  sheetCancelText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
});
