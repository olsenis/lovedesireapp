import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Switch, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { createUserProfile, logout } from '../services/authService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);

  const [editNameModal, setEditNameModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const isConnected = !!couple?.partner2Uid;
  const daysStr = couple
    ? `${Math.floor((Date.now() - couple.createdAt) / 86400000)} days`
    : '—';

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && user) {
      await createUserProfile(user.uid, { photoURL: result.assets[0].uri } as any);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || !user) return;
    setSaving(true);
    await createUserProfile(user.uid, { name: editName.trim() } as any);
    setSaving(false);
    setEditNameModal(false);
  };

  const handleChangePassword = async () => {
    if (!newPw || !confirmPw || !currentPw) { setPwError('Fill in all fields.'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return; }
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    if (!user?.email) return;
    setPwError('');
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setPwSuccess(false); setPasswordModal(false); }, 1500);
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPwError('Current password is incorrect.');
      } else {
        setPwError('Something went wrong. Try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect couple',
      'This will unlink you from your partner. You will need to pair again. Are you sure?',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: () => {} }]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickPhoto} style={styles.avatarWrap}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{profile?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{profile?.name ?? '...'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
        </View>

        {/* Account settings */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => { setEditName(profile?.name ?? ''); setEditNameModal(true); }}>
            <Text style={styles.rowLabel}>Display name</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{profile?.name ?? '—'}</Text>
              <Text style={styles.rowChevron}>›</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => { setPwError(''); setPwSuccess(false); setPasswordModal(true); }}>
            <Text style={styles.rowLabel}>Change password</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Couple info */}
        <Text style={styles.sectionLabel}>Your couple</Text>
        <View style={styles.card}>
          {isConnected ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Partner</Text>
                <Text style={styles.rowValue}>{partner?.name ?? '—'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Days together</Text>
                <Text style={styles.rowValue}>{daysStr}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Invite code</Text>
                <Text style={styles.inviteCode}>{profile?.inviteCode ?? '—'}</Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={handleDisconnect}>
                <Text style={[styles.rowLabel, { color: Colors.error }]}>Disconnect couple</Text>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Your invite code</Text>
                <Text style={styles.inviteCode}>{profile?.inviteCode ?? '—'}</Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={() => router.push('/(auth)/pairing')}>
                <Text style={[styles.rowLabel, { color: Colors.burgundy }]}>Invite a partner</Text>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowTextStack}>
              <Text style={styles.rowLabel}>Push notifications</Text>
              <Text style={styles.rowHint}>Mood, notes, challenge, matches</Text>
            </View>
            <Text style={profile?.pushToken ? styles.notifOn : styles.notifOff}>
              {Platform.OS === 'web' ? 'Web only' : profile?.pushToken ? 'On' : 'Off'}
            </Text>
          </View>
          {!profile?.pushToken && Platform.OS !== 'web' && (
            <>
              <View style={styles.divider} />
              <Text style={styles.notifHint}>
                Notifications are off. Open your device settings to enable them for Love Desire.
              </Text>
            </>
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Edit name modal */}
      <Modal visible={editNameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Display name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={Colors.muted}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditNameModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change password modal */}
      <Modal visible={passwordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Change password</Text>
            {pwSuccess ? (
              <Text style={styles.pwSuccess}>✓ Password updated</Text>
            ) : (
              <>
                <TextInput style={styles.modalInput} placeholder="Current password" placeholderTextColor={Colors.muted}
                  value={currentPw} onChangeText={setCurrentPw} secureTextEntry />
                <TextInput style={styles.modalInput} placeholder="New password (min 6 chars)" placeholderTextColor={Colors.muted}
                  value={newPw} onChangeText={setNewPw} secureTextEntry />
                <TextInput style={styles.modalInput} placeholder="Confirm new password" placeholderTextColor={Colors.muted}
                  value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
                {pwError ? <Text style={styles.pwError}>{pwError}</Text> : null}
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setPasswordModal(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={saving}>
                    <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Update'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.sm },

  avatarSection: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  avatarWrap: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.blush, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.rose,
  },
  avatarInitial: { fontFamily: Fonts.heading, fontSize: 40, color: Colors.burgundy },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.burgundy, borderRadius: 16, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.cream,
  },
  avatarEditIcon: { fontSize: 14 },
  profileName: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.text },
  profileEmail: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  sectionLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.md,
  },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  rowTextStack: { flex: 1 },
  rowLabel: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text },
  rowHint: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  rowValue: { fontFamily: Fonts.body, fontSize: 15, color: Colors.muted },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowChevron: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.muted },
  inviteCode: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.burgundy, letterSpacing: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },

  notifOn: { color: Colors.success, fontFamily: Fonts.bodyBold },
  notifOff: { color: Colors.muted },
  notifHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, paddingHorizontal: Spacing.lg, paddingBottom: 14, lineHeight: 20 },

  signOutBtn: {
    marginTop: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.error, alignItems: 'center',
  },
  signOutText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.error },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  pwError: { fontFamily: Fonts.body, fontSize: 13, color: Colors.error },
  pwSuccess: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.success, textAlign: 'center', paddingVertical: Spacing.lg },
});
