import { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Lato_400Regular,
  Lato_400Regular_Italic,
  Lato_700Bold,
} from '@expo-google-fonts/lato';
import { useAuth } from '../hooks/useAuth';
import { createUserProfile } from '../services/authService';
import { getConsent, confirmConsent } from '../services/consentService';
import { getOnboardingState } from '../services/onboardingService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

// Show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
    Lato_400Regular,
    Lato_400Regular_Italic,
    Lato_700Bold,
  });

  const { user, profile, loading } = useAuth();
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const routeAfterConsent = async (uid: string, coupleId?: string, name?: string) => {
    // Legacy users could have an empty name from before validation existed.
    // Force them through the (auth)/onboarding screen which requires it.
    if (!name || name.trim() === '') {
      router.replace('/(auth)/onboarding');
      return;
    }
    // No couple yet → route to pairing screen which auto-creates the couple
    // doc + invite code. Routing here to /(tabs) instead used to skip the
    // create flow entirely, leaving users with no invite code to share.
    if (!coupleId) { router.replace('/(auth)/pairing'); return; }
    const ob = await getOnboardingState(uid);
    if (!ob?.completed) { router.replace('/onboarding-tour' as any); return; }
    router.replace('/(tabs)');
  };

  useEffect(() => {
    if (loading) return;
    if (user) {
      getConsent(user.uid).then((consent) => {
        if (!consent?.confirmed) {
          setShowConsent(true);
        } else {
          routeAfterConsent(user.uid, profile?.coupleId, profile?.name);
        }
      });
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, loading, profile?.coupleId, profile?.name]);

  const handleConfirmConsent = async () => {
    if (!user) return;
    await confirmConsent(user.uid);
    setShowConsent(false);
    routeAfterConsent(user.uid, profile?.coupleId, profile?.name);
  };

  const handleDeclineConsent = async () => {
    // Delete the auth user so they cannot bypass consent by signing back in.
    // Re-registration requires fresh deliberate consent each time.
    try {
      const { deleteUser, signOut } = await import('firebase/auth');
      const { auth } = await import('../services/firebase');
      if (auth.currentUser) {
        try { await deleteUser(auth.currentUser); } catch { await signOut(auth); }
      }
    } catch {
      // Fall through to redirect even if delete fails
    }
    router.replace('/(auth)/login');
  };


  // Request notification permissions and register push token
  // Silently skipped in Expo Go (SDK 53+) and web — only works in production/dev builds
  useEffect(() => {
    if (loading || !user) return;
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        const { status } = existing === 'granted'
          ? { status: existing }
          : await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        if (token && token !== profile?.pushToken) {
          // First-time registration also flips the in-app toggle ON by default.
          // Once set, the user controls it from Profile and we never overwrite.
          const init: { pushToken: string; notificationsEnabled?: boolean } = { pushToken: token };
          if (profile?.notificationsEnabled === undefined) init.notificationsEnabled = true;
          createUserProfile(user.uid, init as any);
        }
      } catch {
        // Push notifications unavailable (Expo Go, simulator, or missing projectId)
      }
    })();
  }, [loading, user]);

  // Auto-detect timezone and store on user profile (used for LDR partner clock)
  useEffect(() => {
    if (loading || !user) return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && tz !== profile?.timezone) {
        createUserProfile(user.uid, { timezone: tz } as any);
      }
    } catch {
      // Intl may be unavailable in rare environments — silent fail
    }
  }, [loading, user, profile?.timezone]);

  if (!fontsLoaded && !fontError) return null;

  if (showConsent) {
    return (
      <View style={consentStyles.screen}>
        <View style={consentStyles.card}>
          <Text style={consentStyles.emoji}>💝</Text>
          <Text style={consentStyles.title}>Welcome to Desire</Text>
          <Text style={consentStyles.body}>
            Desire is a couples intimacy app for adults. It contains content of a sexual and intimate nature, including explicit material in the premium tier.
          </Text>
          <Text style={consentStyles.body}>
            By continuing, you confirm that you are at least 18 years old and agree to our Terms of Service and Privacy Policy.
          </Text>
          <Text style={consentStyles.body}>
            You can turn off explicit content at any time in Settings.
          </Text>
          <TouchableOpacity style={consentStyles.confirmBtn} onPress={handleConfirmConsent} activeOpacity={0.85} accessibilityRole="button">
            <Text style={consentStyles.confirmBtnText}>I confirm I am 18+ — Continue →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={consentStyles.declineBtn} onPress={handleDeclineConsent} activeOpacity={0.8} accessibilityRole="button">
            <Text style={consentStyles.declineBtnText}>I am under 18 — Exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.cream} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

const consentStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.lg, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: Colors.border },
  emoji: { fontSize: 48, textAlign: 'center' },
  title: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.burgundy, textAlign: 'center' },
  body: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 22, textAlign: 'center' },
  confirmBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  confirmBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
  declineBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  declineBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
});
