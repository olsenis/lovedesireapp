import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { MomentEntry, MomentStreak, subscribeMoments, submitMomentPhoto, subscribeMomentStreak } from '../services/momentService';
import { uploadMomentPhoto } from '../services/storageService';
import { notifyPartner } from '../services/notificationService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

export default function MomentsScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple(user?.uid ?? '', profile?.coupleId ?? '');
  const uid = user?.uid ?? '';
  const coupleId = profile?.coupleId ?? '';
  const partnerUid = partner?.uid ?? '';

  const [moments, setMoments] = useState<MomentEntry[]>([]);
  const [streak, setStreak] = useState<MomentStreak>({ count: 0, lastDate: '' });
  const [uploading, setUploading] = useState(false);
  const [viewingMoment, setViewingMoment] = useState<MomentEntry | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!coupleId) return;
    const u1 = subscribeMoments(coupleId, setMoments);
    const u2 = subscribeMomentStreak(coupleId, setStreak);
    return () => { u1(); u2(); };
  }, [coupleId]);

  const todayMoment = moments.find(m => m.date === today);
  const iHavePhoto = !!todayMoment?.photos?.[uid];
  const partnerHasPhoto = !!todayMoment?.photos?.[partnerUid];
  const bothHavePhoto = iHavePhoto && partnerHasPhoto;
  const pastMoments = moments.filter(m => m.date !== today);

  const openCamera = async () => {
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
      setUploading(true);
      try {
        const url = await uploadMomentPhoto(coupleId, uid, result.assets[0].uri);
        await submitMomentPhoto(coupleId, uid, url, partnerUid);
        notifyPartner(
          coupleId, uid,
          `${profile?.name ?? 'Partner'} captured today's moment 📸`,
          'Take yours to reveal both photos'
        ).catch(() => {});
      } catch {
        Alert.alert('Upload failed', 'Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Moments</Text>
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>🔥 {streak.count}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Today's moment */}
        <Text style={styles.sectionLabel}>Today</Text>

        {!iHavePhoto ? (
          // Neither or only partner has submitted
          <View style={styles.promptCard}>
            <Text style={styles.promptEmoji}>📸</Text>
            <Text style={styles.promptTitle}>Capture today's moment</Text>
            <Text style={styles.promptSub}>
              {partnerHasPhoto
                ? `${partner?.name ?? 'Partner'} already captured theirs — take yours to reveal both`
                : 'Both of you take a photo — reveal together'}
            </Text>
            <TouchableOpacity style={styles.cameraBtn} onPress={openCamera} disabled={uploading} activeOpacity={0.85} accessibilityRole="button">
              {uploading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.cameraBtnText}>📷  Take photo</Text>}
            </TouchableOpacity>
          </View>
        ) : !bothHavePhoto ? (
          // I submitted, waiting for partner
          <View style={styles.waitingCard}>
            <View style={styles.waitingPhotoWrap}>
              <Image source={{ uri: todayMoment?.photos?.[uid]?.photoURL }} style={styles.myPhotoSmall} contentFit="cover" />
            </View>
            <View style={styles.waitingRight}>
              <Text style={styles.waitingTitle}>Waiting for {partner?.name ?? 'your partner'}...</Text>
              <Text style={styles.waitingSub}>Your photo is ready. Both photos reveal when they take theirs.</Text>
            </View>
          </View>
        ) : (
          // Both submitted — reveal side by side
          <TouchableOpacity style={styles.revealCard} onPress={() => setViewingMoment(todayMoment!)} activeOpacity={0.9} accessibilityRole="button">
            <Image
              source={{ uri: todayMoment?.photos?.[uid]?.photoURL }}
              style={styles.revealPhoto}
              contentFit="cover"
            />
            <View style={styles.revealDivider} />
            <Image
              source={{ uri: todayMoment?.photos?.[partnerUid]?.photoURL }}
              style={styles.revealPhoto}
              contentFit="cover"
            />
            <View style={styles.revealOverlay}>
              <Text style={styles.revealLabel}>{profile?.name ?? 'You'}</Text>
              <Text style={styles.revealLabel}>{partner?.name ?? 'Partner'}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Past moments */}
        {pastMoments.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>Past moments</Text>
            <View style={styles.grid}>
              {pastMoments.map(moment => (
                <TouchableOpacity
                  key={moment.date}
                  style={styles.gridCell}
                  onPress={() => setViewingMoment(moment)}
                  activeOpacity={0.85}
                 accessibilityRole="button">
                  <View style={styles.gridPair}>
                    {moment.photos?.[uid]
                      ? <Image source={{ uri: moment.photos[uid].photoURL }} style={styles.gridPhoto} contentFit="cover" />
                      : <View style={[styles.gridPhoto, styles.gridPhotoMissing]} />}
                    {moment.photos?.[partnerUid]
                      ? <Image source={{ uri: moment.photos[partnerUid].photoURL }} style={styles.gridPhoto} contentFit="cover" />
                      : <View style={[styles.gridPhoto, styles.gridPhotoMissing]} />}
                  </View>
                  <Text style={styles.gridDate}>{formatDate(moment.date)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {pastMoments.length === 0 && bothHavePhoto && (
          <Text style={styles.emptyPast}>Your past moments will appear here</Text>
        )}
      </ScrollView>

      {/* Full-screen viewer */}
      <Modal visible={!!viewingMoment} animationType="fade" presentationStyle="fullScreen">
        <View style={styles.viewer}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewingMoment(null)} accessibilityRole="button">
            <Text style={styles.viewerCloseText}>✕</Text>
          </TouchableOpacity>
          {viewingMoment && (
            <>
              <View style={styles.viewerPair}>
                {viewingMoment.photos?.[uid]
                  ? <Image source={{ uri: viewingMoment.photos[uid].photoURL }} style={styles.viewerPhoto} contentFit="cover" />
                  : <View style={[styles.viewerPhoto, styles.viewerPhotoMissing]}><Text style={styles.viewerMissingText}>No photo</Text></View>}
                {viewingMoment.photos?.[partnerUid]
                  ? <Image source={{ uri: viewingMoment.photos[partnerUid].photoURL }} style={styles.viewerPhoto} contentFit="cover" />
                  : <View style={[styles.viewerPhoto, styles.viewerPhotoMissing]}><Text style={styles.viewerMissingText}>No photo</Text></View>}
              </View>
              <View style={styles.viewerLabels}>
                <Text style={styles.viewerLabel}>{profile?.name ?? 'You'}</Text>
                <Text style={styles.viewerLabel}>{partner?.name ?? 'Partner'}</Text>
              </View>
              <Text style={styles.viewerDate}>{formatDate(viewingMoment.date)}</Text>
            </>
          )}
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
  streakPill: { backgroundColor: Colors.blush, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, minWidth: 60, alignItems: 'center' },
  streakText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },

  content: { padding: Spacing.md, paddingBottom: 40 },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Prompt card — no photos yet
  promptCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.xl,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  promptEmoji: { fontSize: 48 },
  promptTitle: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.burgundy },
  promptSub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.md },
  cameraBtn: {
    backgroundColor: Colors.burgundy, borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginTop: Spacing.sm,
  },
  cameraBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: '#fff' },

  // Waiting card
  waitingCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#fff', borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  waitingPhotoWrap: { width: 100, height: 100 },
  myPhotoSmall: { width: 100, height: 100 },
  waitingRight: { flex: 1, padding: Spacing.sm },
  waitingTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy, marginBottom: 4 },
  waitingSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  // Reveal card — both submitted
  revealCard: {
    flexDirection: 'row', borderRadius: Radius.lg, overflow: 'hidden',
    height: 220, position: 'relative', ...Shadow.md,
  },
  revealPhoto: { flex: 1, height: 220 },
  revealDivider: { width: 2, backgroundColor: Colors.cream },
  revealOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.35)', paddingVertical: 8,
  },
  revealLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: '#fff' },

  // Past grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCell: { width: '47%' },
  gridPair: { flexDirection: 'row', borderRadius: Radius.sm, overflow: 'hidden', height: 90 },
  gridPhoto: { flex: 1, height: 90 },
  gridPhotoMissing: { backgroundColor: '#e8e0e4' },
  gridDate: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 3, textAlign: 'center' },
  emptyPast: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: Spacing.lg },

  // Viewer
  viewer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8 },
  viewerCloseText: { fontSize: 22, color: '#fff' },
  viewerPair: { flexDirection: 'row', width: '100%', height: 360 },
  viewerPhoto: { flex: 1, height: 360 },
  viewerPhotoMissing: { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  viewerMissingText: { color: '#666', fontFamily: Fonts.body, fontSize: 13 },
  viewerLabels: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingVertical: Spacing.sm },
  viewerLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: '#fff' },
  viewerDate: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
});
