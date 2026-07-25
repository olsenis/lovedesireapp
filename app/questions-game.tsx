import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';

// Redirect stub — Questions Game merged into the unified Daily screen in
// July 2026. Q category names (playful/deep/spicy) already match the new
// merged category surface exactly, so we can pass ?category= through
// unchanged if it's a known value.
const ALLOWED = new Set(['playful', 'deep', 'spicy']);

export default function QuestionsGameRedirect() {
  const params = useLocalSearchParams<{ category?: string }>();
  useEffect(() => {
    const cat = params.category ?? '';
    router.replace((ALLOWED.has(cat) ? `/daily?category=${cat}` : '/daily') as any);
  }, [params.category]);
  return <View style={{ flex: 1, backgroundColor: Colors.cream }} />;
}
