import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { register } from '../../services/authService';
import { confirmConsent } from '../../services/consentService';
import { auth } from '../../services/firebase';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius } from '../../constants/spacing';
import { Button } from '../../components/Button';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (!ageConfirmed) {
      setError('You must confirm you are 18 or older to continue.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(email.trim(), password);
      // Record consent immediately after the auth account is created.
      // This satisfies GDPR + Apple Guideline 1.1.4 (consent before any data collection).
      if (auth.currentUser) {
        await confirmConsent(auth.currentUser.uid);
      }
      router.replace('/(auth)/onboarding');
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your journey together</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={Colors.muted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.ageRow}
            onPress={() => setAgeConfirmed(a => !a)}
            activeOpacity={0.85}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ageConfirmed }}
            accessibilityLabel="I am 18 or older"
          >
            <View style={[styles.checkbox, ageConfirmed && styles.checkboxChecked]}>
              {ageConfirmed && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.ageText}>
              I confirm I am 18 or older and accept the{' '}
              <Text style={styles.linkInline} onPress={() => router.push('/terms-of-service' as any)}>Terms</Text>
              {' '}and{' '}
              <Text style={styles.linkInline} onPress={() => router.push('/privacy-policy' as any)}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Create Account"
            onPress={handleRegister}
            loading={loading}
            disabled={!ageConfirmed}
            style={styles.button}
          />
        </View>

        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 48,
    color: Colors.burgundy,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: Fonts.bodyItalic,
    fontSize: 16,
    color: Colors.muted,
    marginBottom: Spacing.xxl,
  },
  form: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  link: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
  },
  linkBold: {
    fontFamily: Fonts.bodyBold,
    color: Colors.burgundy,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.burgundy,
    borderColor: Colors.burgundy,
  },
  checkboxMark: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.cream,
    lineHeight: 14,
  },
  ageText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 19,
  },
  linkInline: {
    fontFamily: Fonts.bodyBold,
    color: Colors.burgundy,
    textDecorationLine: 'underline',
  },
});
