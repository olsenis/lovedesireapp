import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Platform, Switch,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { createUserProfile, logout, disconnectFromCouple } from '../services/authService';
import { joinCouple, setCoupleStartDate } from '../services/coupleService';
import { uploadProfilePhoto } from '../services/storageService';
import { getHelpState, setHelpEnabled, resetHelp } from '../services/helpService';
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

  const [pairModal, setPairModal] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [pairError, setPairError] = useState('');
  const [pairLoading, setPairLoading] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [startDateModal, setStartDateModal] = useState(false);
  const [startDateStr, setStartDateStr] = useState('');
  const [startDateError, setStartDateError] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [helpOn, setHelpOn] = useState(true);

  useEffect(() => {
    if (!user) return;
    getHelpState(user.uid).then((s) => setHelpOn(s.enabled));
  }, [user]);

  const toggleHelp = async (val: boolean) => {
    setHelpOn(val);
    if (user) await setHelpEnabled(user.uid, val);
  };

  const handleResetHelp = async () => {
    if (!user) return;
    await resetHelp(user.uid);
    setHelpOn(true);
    Alert.alert('Help reset', 'All feature hints will show again.');
  };

  const isConnected = !!couple?.partner2Uid;
  const daysStr = couple
    ? `${Math.floor((Date.now() - (couple.startDate ?? couple.createdAt)) / 86400000)} days`
    : '—';

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && user) {
      setUploadingPhoto(true);
      try {
        const downloadURL = await uploadProfilePhoto(user.uid, result.assets[0].uri);
        await createUserProfile(user.uid, { photoURL: downloadURL } as any);
      } catch (e) {
        console.error('Photo upload failed:', e);
      } finally {
        setUploadingPhoto(false);
      }
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
      setPwError(code === 'auth/wrong-password' || code === 'auth/invalid-credential'
        ? 'Current password is incorrect.'
        : 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleJoinCouple = async () => {
    if (partnerCode.trim().length !== 6) { setPairError('Enter a 6-character code.'); return; }
    if (!user) return;
    setPairError('');
    setPairLoading(true);
    try {
      // Disconnect from current couple first if needed
      if (profile?.coupleId) await disconnectFromCouple(user.uid);
      const result = await joinCouple(partnerCode.trim().toUpperCase(), user.uid);
      if (!result) { setPairError('Code not found or couple is already full.'); return; }
      await createUserProfile(user.uid, {
        name: profile?.name ?? '',
        coupleId: result.id,
        inviteCode: result.inviteCode,
      } as any);
      setPairModal(false);
      setPartnerCode('');
    } catch {
      setPairError('Something went wrong. Try again.');
    } finally {
      setPairLoading(false);
    }
  };

  const handleSaveStartDate = async () => {
    if (!startDateStr || !profile?.coupleId) return;
    // Accept DD.MM.YYYY format
    const parts = startDateStr.trim().split('.');
    let ts: number;
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      ts = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`).getTime();
    } else {
      ts = new Date(startDateStr).getTime();
    }
    if (isNaN(ts)) { setStartDateError('Sláðu inn gilda dagsetningu (DD.MM.YYYY)'); return; }
    setStartDateError('');
    await setCoupleStartDate(profile.coupleId, ts);
    setStartDateModal(false);
    setStartDateStr('');
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect couple',
      'This will unlink you from your partner. Your data stays but you will need to pair again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect', style: 'destructive',
          onPress: async () => {
            if (!user) return;
            await disconnectFromCouple(user.uid);
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login'); },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!deletePw || !user?.email) { setDeleteError('Enter your password to confirm.'); return; }
    setDeleteError('');
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, deletePw);
      await reauthenticateWithCredential(user, cred);
      if (profile?.coupleId) await disconnectFromCouple(user.uid);
      await deleteUser(user);
      router.replace('/(auth)/login');
    } catch (e: any) {
      const code = e?.code ?? '';
      setDeleteError(code === 'auth/wrong-password' || code === 'auth/invalid-credential'
        ? 'Password is incorrect.'
        : 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
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
              <Text style={styles.avatarEditIcon}>{uploadingPhoto ? '⏳' : '📷'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{profile?.name ?? '...'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
        </View>

        {/* Account */}
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

        {/* Couple */}
        <Text style={styles.sectionLabel}>Your couple</Text>
        <View style={styles.card}>
          {isConnected ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Partner</Text>
                <Text style={styles.rowValue}>{partner?.name ?? '—'}</Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={() => { setStartDateStr(''); setStartDateError(''); setStartDateModal(true); }}>
                <View style={styles.rowTextStack}>
                  <Text style={styles.rowLabel}>Days together</Text>
                  <Text style={styles.rowHint}>{couple?.startDate ? 'Custom date set' : 'Tap to set your real start date'}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{daysStr}</Text>
                  <Text style={styles.rowChevron}>›</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Your invite code</Text>
                <Text style={styles.inviteCode}>{profile?.inviteCode ?? '—'}</Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={() => { setPairError(''); setPairModal(true); }}>
                <Text style={styles.rowLabel}>Enter partner's code</Text>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>
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
              <TouchableOpacity style={styles.row} onPress={() => { setPairError(''); setPairModal(true); }}>
                <Text style={[styles.rowLabel, { color: Colors.burgundy }]}>Enter partner's code</Text>
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
                Open your device Settings → Notifications → Love Desire to enable.
              </Text>
            </>
          )}
        </View>

        {/* Help */}
        <Text style={styles.sectionLabel}>Help</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowTextStack}>
              <Text style={styles.rowLabel}>Feature hints</Text>
              <Text style={styles.rowHint}>Show how-it-works popup on first visit</Text>
            </View>
            <Switch
              value={helpOn}
              onValueChange={toggleHelp}
              trackColor={{ false: Colors.border, true: Colors.rose }}
              thumbColor={helpOn ? Colors.burgundy : Colors.muted}
            />
          </View>
          {helpOn && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={handleResetHelp}>
                <Text style={styles.rowLabel}>Reset all hints</Text>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* Delete account */}
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => { setDeleteError(''); setDeletePw(''); setDeleteModal(true); }} activeOpacity={0.8}>
          <Text style={styles.deleteAccountText}>Delete account</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Edit name */}
      <Modal visible={editNameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Display name</Text>
            <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName}
              placeholder="Your name" placeholderTextColor={Colors.muted} autoFocus />
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

      {/* Change password */}
      <Modal visible={passwordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Change password</Text>
            {pwSuccess ? (
              <Text style={styles.pwSuccess}>✓ Password updated</Text>
            ) : (
              <>
                <TextInput style={styles.modalInput} placeholder="Current password"
                  placeholderTextColor={Colors.muted} value={currentPw} onChangeText={setCurrentPw} secureTextEntry />
                <TextInput style={styles.modalInput} placeholder="New password (min 6)"
                  placeholderTextColor={Colors.muted} value={newPw} onChangeText={setNewPw} secureTextEntry />
                <TextInput style={styles.modalInput} placeholder="Confirm new password"
                  placeholderTextColor={Colors.muted} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
                {pwError ? <Text style={styles.errorText}>{pwError}</Text> : null}
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

      {/* Enter partner code */}
      <Modal visible={pairModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Connect with partner</Text>
            <Text style={styles.modalHint}>Enter your partner's 6-character invite code.</Text>
            <TextInput
              style={[styles.modalInput, styles.codeInput]}
              placeholder="ABC123"
              placeholderTextColor={Colors.muted}
              value={partnerCode}
              onChangeText={(t) => setPartnerCode(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            {pairError ? <Text style={styles.errorText}>{pairError}</Text> : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPairModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleJoinCouple} disabled={pairLoading}>
                <Text style={styles.saveBtnText}>{pairLoading ? 'Connecting…' : 'Connect'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete account */}
      <Modal visible={deleteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Delete account</Text>
            <Text style={styles.modalHint}>
              This permanently deletes your account. Your couple's shared data will remain until your partner also deletes their account.
            </Text>
            <TextInput style={styles.modalInput} placeholder="Enter your password to confirm"
              placeholderTextColor={Colors.muted} value={deletePw} onChangeText={setDeletePw} secureTextEntry autoFocus />
            {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.error }]} onPress={handleDeleteAccount} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Deleting…' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Start date modal */}
      <Modal visible={startDateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>When did you get together?</Text>
            <Text style={styles.modalHint}>Set your real relationship start date to get the correct days together count.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="DD.MM.YYYY (t.d. 14.03.2018)"
              placeholderTextColor={Colors.muted}
              value={startDateStr}
              onChangeText={(t) => { setStartDateStr(t); setStartDateError(''); }}
              keyboardType="numeric"
              autoFocus
            />
            {startDateError ? <Text style={styles.errorText}>{startDateError}</Text> : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStartDateModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveStartDate}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
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
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.blush,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.rose,
  },
  avatarInitial: { fontFamily: Fonts.heading, fontSize: 40, color: Colors.burgundy },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.burgundy,
    borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.cream,
  },
  avatarEditIcon: { fontSize: 14 },
  profileName: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.text },
  profileEmail: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  sectionLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.md,
  },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  rowTextStack: { flex: 1 },
  rowLabel: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text },
  rowHint: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  rowValue: { fontFamily: Fonts.body, fontSize: 15, color: Colors.muted },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowChevron: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.muted },
  inviteCode: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.burgundy, letterSpacing: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
  notifOn: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.success },
  notifOff: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
  notifHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, paddingHorizontal: Spacing.lg, paddingBottom: 14, lineHeight: 20 },

  signOutBtn: { marginTop: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.burgundy, alignItems: 'center' },
  signOutText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  deleteAccountBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
  deleteAccountText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalHint: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, lineHeight: 20 },
  modalInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  codeInput: { fontFamily: Fonts.heading, fontSize: 24, textAlign: 'center', letterSpacing: 8, color: Colors.burgundy },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  errorText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.error },
  pwSuccess: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.success, textAlign: 'center', paddingVertical: Spacing.lg },
});
