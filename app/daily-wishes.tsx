import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';

// Redirect stub — Daily Picks merged into the unified Daily screen in
// July 2026. Any deep-linked URL (from a stale push notification, a
// cached shortcut, an old Home tile) still resolves. Category mapping:
// sweet → playful (merged), flirty → spicy (merged, now paid), spicy →
// spicy. Anything else falls through to the daily default (Playful).
const DP_TO_MERGED: Record<string, string> = {
  sweet: 'playful',
  flirty: 'spicy',
  spicy: 'spicy',
};

export default function DailyWishesRedirect() {
  const params = useLocalSearchParams<{ category?: string }>();
  useEffect(() => {
    const mapped = DP_TO_MERGED[params.category ?? ''];
    router.replace((mapped ? `/daily?category=${mapped}` : '/daily') as any);
  }, [params.category]);
  return <View style={{ flex: 1, backgroundColor: Colors.cream }} />;
}
