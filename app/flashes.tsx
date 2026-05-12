import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
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
import { Spacing, Radius, Shadow } from '../constants/spacing';

export default function FlashesScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple(user?.uid ?? '', profile?.coupleId ?? '');
  const uid = user?.uid ?? '';
  const coupleId = profile?.coupleId ?? '';
  const [flashes, setFlashes] = useState<FlashEntry[]>([]);
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'photo' | 'video'>('photo');
  const [caption, setCaption] = useState('');
  const [viewingFlash, setViewingFlash] = useState<FlashEntry | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeFlashes(coupleId, setFlashes);
  }, [coupleId]);


  // Refresh countdowns every minute
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const incoming = flashes.filter(f => f.fromUid !== uid);
  const unviewed = incoming.filter(f => !f.viewed);
  const viewed = incoming.filter(f => f.viewed);
  const sent = flashes.filter(f => f.fromUid === uid);

  // Open camera directly — Snapchat style
  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Camera access needed', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      videoMaxDuration: 30,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedUri(asset.uri);
      setSelectedType(asset.type === 'video' ? 'video' : 'photo');
      setShowCompose(true);
    }
  };

  const openLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      videoMaxDuration: 30,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedUri(asset.uri);
      setSelectedType(asset.type === 'video' ? 'video' : 'photo');
      setShowCompose(true);
    }
  };

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
    } catch {
      Alert.alert('Upload failed', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const openFlash = async (flash: FlashEntry) => {
    setViewingFlash(flash);
    if (!flash.viewed) {
      await markFlashViewed(coupleId, flash.id).catch(() => {});
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
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={openLibrary} style={styles.libraryBtn}>
            <Text style={styles.libraryBtnText}>Library</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Unviewed incoming — prominent "tap to view" cards */}
        {unviewed.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              From {partner?.name ?? 'Partner'} · {unviewed.length} new
            </Text>
            {unviewed.map(flash => (
              <TouchableOpacity
                key={flash.id}
                style={styles.tapToViewCard}
                onPress={() => openFlash(flash)}
                activeOpacity={0.85}
              >
                <Text style={styles.tapToViewEmoji}>📸</Text>
                <View style={styles.tapToViewText}>
                  <Text style={styles.tapToViewTitle}>Tap to view</Text>
                  <Text style={styles.tapToViewSub}>Disappears after opening · {formatCountdown(flash.expiresAt)} left</Text>
                </View>
                <Text style={styles.tapToViewArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* No incoming */}
        {incoming.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyText}>No flashes from {partner?.name ?? 'your partner'} yet</Text>
            <Text style={styles.emptySubtext}>Send one first — it disappears after 24 hours</Text>
          </View>
        )}

        {/* Viewed incoming — dimmed */}
        {viewed.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>Already opened</Text>
            {viewed.map(flash => (
              <TouchableOpacity
                key={flash.id}
                style={styles.viewedCard}
                onPress={() => openFlash(flash)}
                activeOpacity={0.85}
              >
                <Text style={styles.viewedEmoji}>📷</Text>
                <Text style={styles.viewedText}>Opened · {formatCountdown(flash.expiresAt)} left</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Sent */}
        {sent.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>Sent by you</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {sent.map(flash => (
                <TouchableOpacity key={flash.id} style={styles.sentThumb} onPress={() => setViewingFlash(flash)}>
                  {flash.mediaType === 'photo'
                    ? <Image source={{ uri: flash.mediaURL }} style={styles.sentMedia} contentFit="cover" />
                    : <View style={[styles.sentMedia, styles.sentVideoThumb]}><Text style={styles.sentVideoIcon}>▶</Text></View>
                  }
                  <Text style={styles.sentCountdown}>{formatCountdown(flash.expiresAt)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

      </ScrollView>

      {/* Camera FAB */}
      <TouchableOpacity style={styles.cameraFab} onPress={openCamera} activeOpacity={0.85}>
        <Text style={styles.cameraFabIcon}>📷</Text>
        <Text style={styles.cameraFabText}>Camera</Text>
      </TouchableOpacity>

      {/* Compose modal */}
      <Modal visible={showCompose} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.composeContainer}>
          <View style={styles.composeHeader}>
            <TouchableOpacity onPress={() => { setShowCompose(false); setSelectedUri(null); setCaption(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.composeTitle}>Send Flash</Text>
            <TouchableOpacity onPress={handleSend} disabled={sending}>
              {sending
                ? <ActivityIndicator color={Colors.burgundy} />
                : <Text style={styles.sendText}>Send</Text>}
            </TouchableOpacity>
          </View>

          {selectedUri && (
            selectedType === 'photo'
              ? <Image source={{ uri: selectedUri }} style={styles.previewMedia} contentFit="cover" />
              : <Video source={{ uri: selectedUri }} style={styles.previewMedia} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted />
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
          <Text style={styles.disappearsNote}>Disappears after 24 hours</Text>
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
  headerRight: { minWidth: 60, alignItems: 'flex-end' },
  libraryBtn: { padding: 4 },
  libraryBtnText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },

  content: { padding: Spacing.md, paddingBottom: 120 },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Unviewed — prominent tap to view
  tapToViewCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.burgundy, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
    ...Shadow.md,
  },
  tapToViewEmoji: { fontSize: 32 },
  tapToViewText: { flex: 1 },
  tapToViewTitle: { fontFamily: Fonts.bodyBold, fontSize: 16, color: '#fff' },
  tapToViewSub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  tapToViewArrow: { fontSize: 22, color: '#fff' },

  // Empty
  emptyCard: {
    alignItems: 'center', paddingVertical: Spacing.xl,
    backgroundColor: '#fff', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy, marginBottom: 4, textAlign: 'center', paddingHorizontal: Spacing.md },
  emptySubtext: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.lg },

  // Viewed — dimmed
  viewedCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#fff', borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.xs, opacity: 0.5,
    borderWidth: 1, borderColor: Colors.border,
  },
  viewedEmoji: { fontSize: 20 },
  viewedText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  // Sent thumbnails
  sentThumb: { marginRight: Spacing.sm, alignItems: 'center' },
  sentMedia: { width: 80, height: 80, borderRadius: Radius.sm, backgroundColor: '#ddd' },
  sentVideoThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' },
  sentVideoIcon: { fontSize: 24, color: '#fff' },
  sentCountdown: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, marginTop: 2 },

  // Camera FAB
  cameraFab: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.burgundy, borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    ...Shadow.md,
  },
  cameraFabIcon: { fontSize: 20 },
  cameraFabText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: '#fff' },

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
  previewMedia: { width: '100%', height: 380, backgroundColor: '#000' },
  captionRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8,
  },
  captionInput: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: '#333' },
  charCount: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginLeft: 8 },
  disappearsNote: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },

  // Viewer
  viewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8 },
  viewerCloseText: { fontSize: 22, color: '#fff' },
  viewerMedia: { width: '100%', height: '70%' },
  viewerFooter: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center', padding: Spacing.md },
  viewerCaption: { fontFamily: Fonts.body, fontSize: 16, color: '#fff', marginBottom: 8, textAlign: 'center' },
  viewerCountdown: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
});
