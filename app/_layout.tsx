import { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
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
import { Modal, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { createUserProfile } from '../services/authService';
import { acceptPairing, declinePairing } from '../services/coupleService';
import { getConsent, confirmConsent } from '../services/consentService';
import { getOnboardingState } from '../services/onboardingService';
import { markCoupleActive } from '../services/statsService';
import { scheduleLoveLanguageNudge, cancelLoveLanguageNudge } from '../services/loveLanguageNudgeService';
import { LoveLanguage } from '../constants/content';
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
  const pathname = usePathname();
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Expo Router strips group directories like "(auth)" from usePathname output,
  // so /(auth)/pairing appears as /pairing at runtime. Use suffix matching to
  // cover both dev and prod outputs safely.
  const isOnPath = (currentPath: string | undefined, screen: string) =>
    !!currentPath && (currentPath === `/${screen}` || currentPath.endsWith(`/${screen}`));

  const routeAfterConsent = async (uid: string, coupleId?: string, name?: string, currentPath?: string) => {
    // Screens the user is allowed to visit even without a complete setup —
    // Profile is critical because it holds Sign out and Delete account. Never
    // yank them off it, or they get stuck with no way to log out.
    const isEscapeHatch = isOnPath(currentPath, 'profile');

    // Legacy users could have an empty name from before validation existed.
    // Force them through the (auth)/onboarding screen which requires it.
    if (!name || name.trim() === '') {
      if (!isOnPath(currentPath, 'onboarding') && !isEscapeHatch) {
        router.replace('/(auth)/onboarding');
      }
      return;
    }
    // No couple yet → route to pairing screen which auto-creates the couple
    // doc + invite code.
    if (!coupleId) {
      if (!isOnPath(currentPath, 'pairing') && !isEscapeHatch) {
        router.replace('/(auth)/pairing');
      }
      return;
    }
    // User is signed in and setup is complete. Only force navigation if
    // they're stuck on an auth screen (login/register — they shouldn't be
    // there while authenticated). Any other path means they navigated to
    // it deliberately (Discover, Love, a game, a modal screen) — never
    // yank them off it, that's what caused the "Discover bounces to Home"
    // bug where every tab switch re-fired router.replace('/(tabs)').
    const stuckOnAuth = ['login', 'register'].some((s) => isOnPath(currentPath, s));
    if (stuckOnAuth) {
      const ob = await getOnboardingState(uid);
      if (!ob?.completed) { router.replace('/onboarding-tour' as any); return; }
      router.replace('/(tabs)');
    }
    // Otherwise: user is on a legitimate authenticated screen. Do nothing.
  };

  useEffect(() => {
    if (loading) return;
    if (user) {
      getConsent(user.uid).then((consent) => {
        if (!consent?.confirmed) {
          setShowConsent(true);
        } else {
          routeAfterConsent(user.uid, profile?.coupleId, profile?.name, pathname);
        }
      });
    } else {
      // Only bounce to /login if the user is somewhere they shouldn't be while
      // unsigned. Register + terms + privacy have to stay reachable, otherwise
      // every keystroke re-fires this effect and yanks the user off the form.
      const publicAuthPaths = ['login', 'register', 'terms-of-service', 'privacy-policy'];
      const onPublicPath = publicAuthPaths.some((s) => isOnPath(pathname, s));
      if (!onPublicPath) router.replace('/(auth)/login');
    }
  }, [user, loading, profile?.coupleId, profile?.name, pathname]);

  const handleConfirmConsent = async () => {
    if (!user) return;
    await confirmConsent(user.uid);
    setShowConsent(false);
    routeAfterConsent(user.uid, profile?.coupleId, profile?.name, pathname);
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

  // Mark this couple as active in the current month. Fire-and-forget,
  // idempotent (same doc written every session, merges silently). Powers
  // the admin MAU counter without leaking per-couple usage patterns.
  useEffect(() => {
    if (loading || !user || !profile?.coupleId) return;
    markCoupleActive(profile.coupleId);
  }, [loading, user, profile?.coupleId]);

  // Weekly love-language nudge (Sunday 09:00 local). Reschedules on every
  // relevant change so a rename or a re-quiz refreshes the notification
  // body. Cancels when partner or their language disappears (unpaired,
  // partner deleted quiz result).
  //
  // Same subscription doubles as the source for the H22 pairing accept
  // modal below — one useCouple listener, two consumers.
  const { partner: nudgePartner, couple: rootCouple } = useCouple(user?.uid, profile?.coupleId);
  useEffect(() => {
    if (loading || !user) return;
    if (nudgePartner?.name && nudgePartner?.loveLanguage) {
      scheduleLoveLanguageNudge(nudgePartner.name, nudgePartner.loveLanguage as LoveLanguage);
    } else {
      cancelLoveLanguageNudge();
    }
  }, [loading, user, nudgePartner?.name, nudgePartner?.loveLanguage]);

  // Generic notification-tap router. Any notification whose data payload
  // includes a `route: '/some-path'` string will deep-link there when
  // tapped. Used today by the love-language weekly nudge — future
  // scheduled notifications should follow the same convention.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && route.startsWith('/')) {
        router.push(route as any);
      }
    });
    return () => sub.remove();
  }, []);

  // H22 pairing accept modal state — separate from render so tapping
  // Accept or Decline can show an in-flight indicator on the button
  // and prevent double-taps.
  const [acceptingPair, setAcceptingPair] = useState(false);
  const [decliningPair, setDecliningPair] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  const showPairingModal = !!(
    rootCouple?.pendingPartner2Uid &&
    user &&
    (rootCouple.partner1Uid === user.uid || rootCouple.partner2Uid === user.uid)
  );
  const pendingName = rootCouple?.pendingPartner2Name?.trim() || 'someone';

  const handlePairAccept = async () => {
    if (!rootCouple || !user || acceptingPair) return;
    setAcceptingPair(true);
    setPairError(null);
    try {
      const result = await acceptPairing(rootCouple.id, user.uid);
      if (!result.ok) {
        setPairError(
          result.reason === 'cancelled' ? `${pendingName} cancelled the request.` :
          result.reason === 'already_paired' ? 'This couple is already paired.' :
          'Could not accept, please try again.',
        );
        return;
      }
      // Mirror the joiner-side routing behaviour so both partners land
      // on the same post-pairing screen. If the accepter hasn't finished
      // the onboarding tour yet (usually true for a fresh signup that
      // just paired), route them to /onboarding-tour so they see the
      // tour alongside the newly-paired state. If already completed,
      // stay wherever they were (they might have been on Home mid-life
      // for a re-pair after disconnect — don't yank them).
      try {
        const ob = await getOnboardingState(user.uid);
        if (!ob?.completed) router.replace('/onboarding-tour' as any);
      } catch { /* non-fatal */ }
    } catch (e: any) {
      setPairError('Could not accept, please try again.');
    } finally {
      setAcceptingPair(false);
    }
  };

  const handlePairDecline = async () => {
    if (!rootCouple || !user || decliningPair) return;
    setDecliningPair(true);
    try {
      await declinePairing(rootCouple.id, user.uid);
    } catch (e: any) {
      setPairError('Could not decline, please try again.');
    } finally {
      setDecliningPair(false);
    }
  };

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
            By continuing, you confirm that you are at least 18 years old and agree to our{' '}
            <Text style={consentStyles.link} onPress={() => router.push('/terms-of-service' as any)}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={consentStyles.link} onPress={() => router.push('/privacy-policy' as any)}>
              Privacy Policy
            </Text>
            .
          </Text>
          <Text style={consentStyles.body}>
            You can turn off explicit content at any time in Settings.
          </Text>
          <TouchableOpacity style={consentStyles.confirmBtn} onPress={handleConfirmConsent} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="I confirm I am 18 years or older and want to continue">
            <Text style={consentStyles.confirmBtnText}>I confirm I am 18+, Continue →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={consentStyles.declineBtn} onPress={handleDeclineConsent} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="I am under 18. Exit the app and delete this account.">
            <Text style={consentStyles.declineBtnText}>I am under 18, Exit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.cream} />
      <Stack screenOptions={{ headerShown: false }} />
      {/* H22 pairing accept modal — root-level so it appears on any
          screen the moment `couple.pendingPartner2Uid` fires via the
          useCouple snapshot listener. Non-dismissable except via
          Accept or Decline. Auto-hides when the couple snapshot
          resolves the pending state (accept: partner2Uid set; decline:
          pending fields cleared; cancel by the joiner: pending fields
          cleared). */}
      <Modal visible={showPairingModal} transparent animationType="fade">
        <View style={pairModalStyles.overlay}>
          <View style={pairModalStyles.card}>
            <Text style={pairModalStyles.emoji}>🤝</Text>
            <Text style={pairModalStyles.title}>Pair request</Text>
            <Text style={pairModalStyles.body}>
              <Text style={pairModalStyles.name}>{pendingName}</Text> wants to pair with you.
            </Text>
            <Text style={pairModalStyles.hint}>This will link your accounts as a couple.</Text>
            {pairError && (
              <Text style={pairModalStyles.error}>{pairError}</Text>
            )}
            <TouchableOpacity
              style={[pairModalStyles.acceptBtn, (acceptingPair || decliningPair) && { opacity: 0.6 }]}
              onPress={handlePairAccept}
              disabled={acceptingPair || decliningPair}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Accept pair request from ${pendingName}`}
            >
              {acceptingPair
                ? <ActivityIndicator color={Colors.cream} size="small" />
                : <Text style={pairModalStyles.acceptBtnText}>Accept</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[pairModalStyles.declineBtn, (acceptingPair || decliningPair) && { opacity: 0.6 }]}
              onPress={handlePairDecline}
              disabled={acceptingPair || decliningPair}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Decline pair request from ${pendingName}`}
            >
              {decliningPair
                ? <ActivityIndicator color={Colors.burgundy} size="small" />
                : <Text style={pairModalStyles.declineBtnText}>Decline</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const pairModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(61,26,36,0.6)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: { backgroundColor: Colors.cream, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, width: '100%', maxWidth: 400, alignItems: 'center' },
  emoji: { fontSize: 48 },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  body: { fontFamily: Fonts.body, fontSize: 16, color: Colors.text, textAlign: 'center', lineHeight: 24 },
  name: { fontFamily: Fonts.bodyBold, color: Colors.burgundy },
  hint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },
  error: { fontFamily: Fonts.body, fontSize: 13, color: '#B00020', textAlign: 'center', marginTop: 4 },
  acceptBtn: { marginTop: Spacing.md, backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: Radius.full, alignSelf: 'stretch', alignItems: 'center' },
  acceptBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  declineBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, alignSelf: 'stretch', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  declineBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
});

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
  // Underlined, burgundy, inline within the paragraph. Apple's App Store review
  // guidelines expect ToS + Privacy Policy to be TAPPABLE within the consent
  // screen, not just referenced by name — otherwise the attestation is treated
  // as insufficient. Rendering as a nested <Text> inside the body <Text> is
  // React Native's supported pattern for inline-clickable text.
  link: { fontFamily: Fonts.bodyBold, color: Colors.burgundy, textDecorationLine: 'underline' },
});
