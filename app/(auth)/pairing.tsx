import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { createCouple, joinCouple } from '../../services/coupleService';
import { createUserProfile } from '../../services/authService';
import { getOnboardingState } from '../../services/onboardingService';
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
  // Confirmation gate for QR-scanned codes. Scans used to fire joinWithCode
  // immediately — a malicious QR sticker or DM'd screenshot would silently
  // pair the victim to an attacker's couple. Now we hold the code in state
  // and require a tap-to-confirm before joining (L2 in Aug 2026 security
  // review). Manual code entry via TextInput still commits on the Join
  // button — no gate needed there since the user typed the code themselves.
  const [pendingScannedCode, setPendingScannedCode] = useState<string | null>(null);
  // The in-flight createCouple promise (or verify-existing promise). Skip
  // button awaits this so slow networks don't route the user off the pairing
  // screen while the couple doc is still being written. Previously we slept
  // 2.5s which either wasted time or wasn't enough on bad networks.
  const createPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!user || authLoading) return;
    // Verify the couple doc still exists — profile.inviteCode can be stale
    // if the couple was deleted (manual Firestore edit, admin cleanup, etc.)
    // Trust the couple doc as source of truth, not profile.inviteCode.
    const run = async () => {
      setLoadingCreate(true);
      try {
        if (profile?.coupleId) {
          const coupleSnap = await getDoc(doc(db, 'couples', profile.coupleId));
          if (coupleSnap.exists()) {
            const data = coupleSnap.data() as { inviteCode?: string };
            setInviteCode(data.inviteCode ?? '');
            return;
          }
          // profile.coupleId points to a deleted doc — fall through to generate fresh
        }
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
    createPromiseRef.current = run();
  }, [user, authLoading, profile?.coupleId]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // First-time users get routed to the onboarding tour once pairing succeeds.
  // Returning users (tour already completed) skip straight to the tabs. Also
  // used by the Skip button so users who bail out still see the tour if it's
  // their first time.
  const routeAfterPair = async () => {
    if (!user) { router.replace('/(tabs)'); return; }
    try {
      const ob = await getOnboardingState(user.uid);
      router.replace(ob?.completed ? '/(tabs)' : ('/onboarding-tour' as any));
    } catch {
      router.replace('/(tabs)');
    }
  };

  const joinWithCode = async (code: string) => {
    if (!user) return;
    setJoinError('');
    setLoadingJoin(true);
    try {
      const result = await joinCouple(code.trim().toUpperCase(), user.uid);
      if (!result.couple) {
        const msg =
          result.reason === 'own' ? "That's your own code. Share it with your partner instead." :
          result.reason === 'taken' ? 'This couple is already full.' :
          result.reason === 'expired' ? 'This invite code has expired.' :
          result.reason === 'not_found' ? 'Code not found. Double-check the 8 characters.' :
          result.reason === 'no_connection' ? 'No internet connection. Check your connection and try again.' :
          `Could not join (reason: ${result.reason ?? 'unknown'})`;
        setJoinError(msg);
        return;
      }
      await createUserProfile(user.uid, {
        name: profile?.name ?? '',
        photoURL: profile?.photoURL,
        coupleId: result.couple.id,
        inviteCode: result.couple.inviteCode,
      });
      await routeAfterPair();
    } catch (e: any) {
      setJoinError(e?.message ?? 'Something went wrong. Please try again.');
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

  const handleScannedCode = (code: string) => {
    // Just close scanner + stage the code. Actual join happens after user
    // confirms in the modal below. See pendingScannedCode comment above.
    setScannerOpen(false);
    setPendingScannedCode(code);
  };

  const confirmScannedCode = async () => {
    if (!pendingScannedCode) return;
    const code = pendingScannedCode;
    setPendingScannedCode(null);
    setPartnerCode(code);
    await joinWithCode(code);
  };

  const handleSkip = async () => {
    // Await the actual createCouple promise instead of a fixed setTimeout —
    // slow networks used to skip past the write and leave the user tabbed
    // in without a couple doc committed yet.
    try {
      if (createPromiseRef.current) await createPromiseRef.current;
    } catch {
      // If the create failed we still route — the user hit Skip deliberately
      // and blocking them would strand them here.
    }
    await routeAfterPair();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.cream }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
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

      {/* Confirmation gate for QR-scanned codes. Prevents a hostile QR sticker
          or DM'd screenshot from silently pairing the victim to an attacker's
          couple. */}
      <Modal visible={!!pendingScannedCode} transparent animationType="fade" onRequestClose={() => setPendingScannedCode(null)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Join couple with this code?</Text>
            <Text style={styles.confirmCode}>{pendingScannedCode}</Text>
            <Text style={styles.confirmHint}>
              Only accept if this code came from someone you trust. Joining shares your name, photo, and mood with them.
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setPendingScannedCode(null)}
                accessibilityRole="button"
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmJoinBtn}
                onPress={confirmScannedCode}
                accessibilityRole="button"
              >
                <Text style={styles.confirmJoinText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
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
  // QR confirmation modal — matches the visual language of other confirms
  // in the app (rgba burgundy overlay, cream card, burgundy primary + muted
  // ghost secondary).
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61,26,36,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  confirmCard: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 380,
    gap: Spacing.md,
    ...Shadow.md,
  },
  confirmTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.burgundy,
    textAlign: 'center',
  },
  confirmCode: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    color: Colors.burgundy,
    letterSpacing: 8,
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  confirmHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmCancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  confirmJoinBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.burgundy,
  },
  confirmJoinText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
