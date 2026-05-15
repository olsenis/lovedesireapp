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

const FLASH_IDEAS = [
  { emoji: '🌅', label: 'Good morning' },
  { emoji: '☕', label: 'Coffee break' },
  { emoji: '🍽️', label: 'What I\'m eating' },
  { emoji: '😎', label: 'Where I am' },
  { emoji: '💭', label: 'Thinking of you' },
  { emoji: '🌙', label: 'Goodnight' },
];

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

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const incoming = flashes.filter(f => f.fromUid !== uid);
  const unviewed = incoming.filter(f => !f.viewed);
  const viewed = incoming.filter(f => f.viewed);
  const sent = flashes.filter(f => f.fromUid === uid);
  const sentToday = sent.filter(f => Date.now() - f.createdAt < 86400000).length;

  const openCamera = async (initialCaption?: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Camera access needed', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled) {
      setSelectedUri(result.assets[0].uri);
      setSelectedType('photo');
      if (initialCaption) setCaption(initialCaption);
      setShowCompose(true);
    }
  };

  const openVideoCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Camera access needed', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: 0.85,
      videoMaxDuration: 30,
    });
    if (!result.canceled) {
      setSelectedUri(result.assets[0].uri);
      setSelectedType('video');
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
      {/* Decorative gradient backdrop */}
      <View style={styles.backdrop} pointerEvents="none">
        <View style={styles.blob1} />
        <View style={styles.blob2} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Flashes</Text>
          <Text style={styles.titleSub}>only between you two · 24h</Text>
        </View>
        <TouchableOpacity onPress={openLibrary} style={styles.headerBtn}>
          <Text style={styles.librarySymbol}>⊞</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Unviewed — "Tap to view" cards */}
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
                activeOpacity={0.9}
              >
                <View style={styles.tapToViewGlow} />
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

        {/* Hero empty state — when no incoming */}
        {incoming.length === 0 && (
          <View style={styles.heroCard}>
            <View style={styles.heroDecor}>
              <Text style={styles.heroSparkle}>✦</Text>
              <Text style={styles.heroSparkleLg}>✶</Text>
              <Text style={styles.heroSparkle}>✦</Text>
            </View>
            <Text style={styles.heroLead}>A little window into your day</Text>
            <Text style={styles.heroBody}>
              Send {partner?.name ?? 'your partner'} a moment from right now.
              {'\n'}Photos vanish in 24 hours.
            </Text>
            {sentToday > 0 && (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>You've sent {sentToday} today</Text>
              </View>
            )}
          </View>
        )}

        {/* Inspiration chips */}
        {incoming.length === 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>or try a quick one</Text>
            <View style={styles.chipGrid}>
              {FLASH_IDEAS.map(idea => (
                <TouchableOpacity
                  key={idea.label}
                  style={styles.chip}
                  onPress={() => openCamera(idea.label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipEmoji}>{idea.emoji}</Text>
                  <Text style={styles.chipLabel}>{idea.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Viewed — dimmed */}
        {viewed.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>Already opened</Text>
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

        {/* Sent — thumbnail strip */}
        {sent.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>You sent</Text>
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

      {/* Primary CTA + Video option */}
      <View style={styles.fabRow}>
        <TouchableOpacity style={styles.videoBtn} onPress={openVideoCamera} activeOpacity={0.85}>
          <Text style={styles.videoBtnIcon}>🎥</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cameraFab} onPress={() => openCamera()} activeOpacity={0.9}>
          <Text style={styles.cameraFabIcon}>📷</Text>
          <Text style={styles.cameraFabText}>Send {partner?.name ?? 'Partner'} a flash</Text>
        </TouchableOpacity>
      </View>

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

  // Decorative backdrop
  backdrop: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob1: {
    position: 'absolute', top: -80, right: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: Colors.blush, opacity: 0.4,
  },
  blob2: {
    position: 'absolute', top: 180, left: -100,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#F4A7B9', opacity: 0.18,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { fontSize: 28, color: Colors.burgundy, lineHeight: 28, marginTop: -4 },
  librarySymbol: { fontSize: 22, color: Colors.burgundy },
  titleWrap: { alignItems: 'center' },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy, letterSpacing: 0.5 },
  titleSub: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted, marginTop: 2 },

  content: { padding: Spacing.md, paddingBottom: 130 },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1.2 },

  // Unviewed — dark prominent
  tapToViewCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.burgundy, borderRadius: 20,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
    position: 'relative', overflow: 'hidden',
    ...Shadow.md,
  },
  tapToViewGlow: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.rose, opacity: 0.25,
  },
  tapToViewEmoji: { fontSize: 32 },
  tapToViewText: { flex: 1 },
  tapToViewTitle: { fontFamily: Fonts.bodyBold, fontSize: 17, color: '#fff', letterSpacing: 0.3 },
  tapToViewSub: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  tapToViewArrow: { fontSize: 24, color: '#fff' },

  // Hero empty state
  heroCard: {
    backgroundColor: '#fff', borderRadius: 24,
    paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm,
  },
  heroDecor: { flexDirection: 'row', gap: 12, alignItems: 'baseline', marginBottom: Spacing.md },
  heroSparkle: { fontSize: 14, color: Colors.rose },
  heroSparkleLg: { fontSize: 22, color: Colors.burgundy },
  heroLead: {
    fontFamily: Fonts.headingItalic, fontSize: 22, color: Colors.burgundy,
    textAlign: 'center', marginBottom: Spacing.sm, letterSpacing: 0.3,
  },
  heroBody: {
    fontFamily: Fonts.body, fontSize: 14, color: Colors.muted,
    textAlign: 'center', lineHeight: 22,
  },
  heroBadge: {
    marginTop: Spacing.md,
    backgroundColor: Colors.blush, borderRadius: 99,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  heroBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.burgundy },

  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 99,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.burgundy },

  // Viewed
  viewedCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#fff', borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.xs, opacity: 0.55,
    borderWidth: 1, borderColor: Colors.border,
  },
  viewedEmoji: { fontSize: 20 },
  viewedText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  // Sent thumbnails
  sentThumb: { marginRight: Spacing.sm, alignItems: 'center' },
  sentMedia: { width: 84, height: 84, borderRadius: 14, backgroundColor: '#eee' },
  sentVideoThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' },
  sentVideoIcon: { fontSize: 24, color: '#fff' },
  sentCountdown: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted, marginTop: 4 },

  // FAB row
  fabRow: {
    position: 'absolute', bottom: 36, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  videoBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, ...Shadow.md,
  },
  videoBtnIcon: { fontSize: 22 },
  cameraFab: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.burgundy, borderRadius: 99,
    paddingHorizontal: Spacing.xl, paddingVertical: 16,
    ...Shadow.md,
  },
  cameraFabIcon: { fontSize: 22 },
  cameraFabText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: '#fff', letterSpacing: 0.3 },

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
