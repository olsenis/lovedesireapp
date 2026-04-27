import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { login } from '../../services/authService';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius } from '../../constants/spacing';
import { Button } from '../../components/Button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'auth/network-request-failed') {
        setError('No internet connection. Please try again.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Incorrect email or password. Please try again.');
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
        <Text style={styles.title}>Love Desire</Text>
        <Text style={styles.subtitle}>Your couple's space</Text>

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
            autoComplete="password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          />
        </View>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text style={styles.link}>
              Don't have an account? <Text style={styles.linkBold}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </Link>
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
    fontSize: 64,
    color: Colors.burgundy,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: Fonts.bodyItalic,
    fontSize: 18,
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
});
