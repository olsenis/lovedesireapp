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
import { useAuth } from '../../hooks/useAuth';
import { createCouple, joinCouple } from '../../services/coupleService';
import { createUserProfile } from '../../services/authService';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';
import { Button } from '../../components/Button';

export default function PairingScreen() {
  const { user, profile } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate invite code on mount if user doesn't have one yet
  useEffect(() => {
    if (!user) return;
    const generate = async () => {
      setLoadingCreate(true);
      try {
        const couple = await createCouple(user.uid);
        setInviteCode(couple.inviteCode);
        // Save coupleId to user profile
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
  }, [user]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    if (partnerCode.trim().length !== 6) {
      setJoinError('Please enter a 6-character code.');
      return;
    }
    if (!user) return;
    setJoinError('');
    setLoadingJoin(true);
    try {
      const couple = await joinCouple(partnerCode.trim().toUpperCase(), user.uid);
      if (!couple) {
        setJoinError('Code not found. Check with your partner.');
        return;
      }
      // Save coupleId to this user's profile
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

  const handleSkip = () => {
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
          <TouchableOpacity onPress={handleCopy} style={styles.codeRow}>
            <Text style={styles.code}>{inviteCode || '------'}</Text>
            <Text style={styles.copyHint}>{copied ? '✓ Copied!' : 'Tap to copy'}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.cardNote}>Share this code with your partner</Text>
      </View>

      <Text style={styles.or}>— or —</Text>

      {/* Enter partner's code */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Enter partner's code</Text>
        <TextInput
          style={styles.codeInput}
          placeholder="ABC123"
          placeholderTextColor={Colors.muted}
          value={partnerCode}
          onChangeText={(t) => setPartnerCode(t.toUpperCase())}
          maxLength={6}
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
      </View>

      <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
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
});
