import { useEffect } from 'react';
import { Platform } from 'react-native';
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
import { createCouple } from '../services/coupleService';
import { createUserProfile } from '../services/authService';
import { Colors } from '../constants/colors';

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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  // Ensure every authenticated user has a couple doc + coupleId in their profile
  useEffect(() => {
    if (loading || !user) return;
    if (profile?.coupleId) return;
    createCouple(user.uid).then((couple) => {
      createUserProfile(user.uid, {
        name: profile?.name ?? '',
        photoURL: profile?.photoURL,
        coupleId: couple.id,
        inviteCode: couple.inviteCode,
      });
    }).catch((e) => console.error('createCouple failed:', e));
  }, [loading, user, profile?.coupleId]);

  // Request notification permissions and register push token
  useEffect(() => {
    if (loading || !user) return;
    if (Platform.OS === 'web') return; // push not supported on web
    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      const { status } = existing === 'granted'
        ? { status: existing }
        : await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      if (token && token !== profile?.pushToken) {
        createUserProfile(user.uid, { pushToken: token } as any);
      }
    })();
  }, [loading, user]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.cream} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
