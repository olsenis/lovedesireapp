import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../hooks/useAuth';
import { createCouple, joinCouple } from '../../services/coupleService';
import { createUserProfile } from '../../services/authService';
import { QRScannerModal, buildQRPayload } from '../../components/QRScannerModal';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';
import { Button } from '../../components/Button';

export default function PairingScreen() {
  const { user, profile, loading: authLoading } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [copied, setCopied] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!user || authLoading) return;
    // If user already has a couple, just show the existing code
    if (profile?.inviteCode) {
      setInviteCode(profile.inviteCode);
      return;
    }
    if (profile?.coupleId) return; // paired but code not in profile, skip
    const generate = async () => {
      setLoadingCreate(true);
      try {
        const couple = await createCouple(user.uid);
        setInviteCode(couple.inviteCode);
        await createUserProfile(user.uid, {
          name: profile?.name ?? '',
          photoURL: profile?.photoURL,
          coupleId: couple.id,
          inviteCode: couple.inviteCode,
        });
      } finally {
        setLoadingCreate(false);
      }
    };
    generate();
  }, [user, authLoading, profile?.coupleId]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const joinWithCode = async (code: string) => {
    if (!user) return;
    setJoinError('');
    setLoadingJoin(true);
    try {
      const couple = await joinCouple(code.trim().toUpperCase(), user.uid);
      if (!couple) {
        setJoinError('Code not found or couple is already full.');
        return;
      }
      await createUserProfile(user.uid, {
        name: profile?.name ?? '',
        photoURL: profile?.photoURL,
        coupleId: couple.id,
        inviteCode: couple.inviteCode,
      });
      router.replace('/(tabs)');
    } catch {
      setJoinError('Something went wrong. Please try again.');
    } finally {
      setLoadingJoin(false);
    }
  };

  const handleJoin = async () => {
    if (partnerCode.trim().length !== 8) {
      setJoinError('Please enter an 8-character code.');
      return;
    }
    await joinWithCode(partnerCode);
  };

  const handleScannedCode = async (code: string) => {
    setScannerOpen(false);
    setPartnerCode(code);
    await joinWithCode(code);
  };

  const handleSkip = async () => {
    // Wait for couple creation to finish before navigating
    if (loadingCreate) {
      await new Promise((r) => setTimeout(r, 2500));
    }
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect with your Partner</Text>
      <Text style={styles.subtitle}>Share your code or enter theirs</Text>

      {/* Your invite code */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your invite code</Text>
        {loadingCreate ? (
          <ActivityIndicator color={Colors.burgundy} style={{ marginVertical: 16 }} />
        ) : (
          <>
            <TouchableOpacity onPress={handleCopy} style={styles.codeRow} accessibilityRole="button">
              <Text style={styles.code}>{inviteCode || '--------'}</Text>
              <Text style={styles.copyHint}>{copied ? '✓ Copied!' : 'Tap to copy'}</Text>
            </TouchableOpacity>
            {!!inviteCode && (
              <View style={styles.qrWrap}>
                <QRCode
                  value={buildQRPayload(inviteCode)}
                  size={150}
                  color={Colors.burgundy}
                  backgroundColor={Colors.white}
                />
              </View>
            )}
          </>
        )}
        <Text style={styles.cardNote}>Show the code or QR to your partner</Text>
      </View>

      <Text style={styles.or}>— or —</Text>

      {/* Enter partner's code */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Enter partner's code</Text>
        <TextInput
          style={styles.codeInput}
          placeholder="ABCD2345"
          placeholderTextColor={Colors.muted}
          value={partnerCode}
          onChangeText={(t) => setPartnerCode(t.toUpperCase())}
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {joinError ? <Text style={styles.error}>{joinError}</Text> : null}
        <Button
          label="Join Partner"
          onPress={handleJoin}
          loading={loadingJoin}
          variant="secondary"
          style={{ marginTop: Spacing.md }}
        />
        <TouchableOpacity onPress={() => setScannerOpen(true)} style={styles.scanBtn} accessibilityRole="button" accessibilityLabel="Scan partner's QR code">
          <Text style={styles.scanBtnText}>📷 Scan partner's QR instead</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleSkip} style={styles.skipButton} accessibilityRole="button">
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>

      <QRScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCode={handleScannedCode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 36,
    color: Colors.burgundy,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.bodyItalic,
    fontSize: 15,
    color: Colors.muted,
    marginBottom: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  codeRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  code: {
    fontFamily: Fonts.heading,
    fontSize: 44,
    color: Colors.burgundy,
    letterSpacing: 10,
  },
  copyHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
  },
  cardNote: {
    fontFamily: Fonts.bodyItalic,
    fontSize: 12,
    color: Colors.muted,
    marginTop: Spacing.sm,
  },
  or: {
    fontFamily: Fonts.bodyItalic,
    fontSize: 14,
    color: Colors.muted,
    marginVertical: Spacing.sm,
  },
  codeInput: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.cream,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.burgundy,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
    letterSpacing: 6,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  skipButton: {
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
  skipText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
  },
  qrWrap: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scanBtn: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    alignSelf: 'center',
  },
  scanBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.burgundy,
  },
});
