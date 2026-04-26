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
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/useAuth';
import { createUserProfile } from '../../services/authService';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius } from '../../constants/spacing';
import { Button } from '../../components/Button';

export default function OnboardingScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [photoURI, setPhotoURI] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoURI(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      await createUserProfile(user.uid, {
        name: name.trim(),
        photoURL: photoURI ?? undefined,
      });
      router.replace('/(auth)/pairing');
    } catch {
      setError('Something went wrong. Please try again.');
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
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>Tell us a little about yourself</Text>

        {/* Photo picker */}
        <TouchableOpacity style={styles.avatarButton} onPress={pickPhoto}>
          {photoURI ? (
            <Image source={{ uri: photoURI }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>📷</Text>
              <Text style={styles.avatarHint}>Add photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Your first name"
            placeholderTextColor={Colors.muted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoFocus
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Continue"
            onPress={handleContinue}
            loading={loading}
            style={styles.button}
          />
        </View>
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
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 52,
    color: Colors.burgundy,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: Fonts.bodyItalic,
    fontSize: 16,
    color: Colors.muted,
    marginBottom: Spacing.xl,
  },
  avatarButton: {
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: Colors.rose,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.blush,
    borderWidth: 2,
    borderColor: Colors.rose,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  avatarIcon: {
    fontSize: 28,
  },
  avatarHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
  },
  form: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.md,
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
});
