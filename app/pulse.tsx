import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';

// Redirect stub — Relationship Pulse was merged into Sunday Check-in in
// Aug 2026. The 5-dimension pulse step now runs BEFORE the existing text
// wizard, and the reveal card shows a per-dimension you-vs-partner
// comparison alongside the text answers. See state-union.tsx.
//
// This stub preserves any deep links or Home nudges from an earlier build
// that still point to /pulse — they land on Sunday Check-in instead.
export default function PulseRedirect() {
  useEffect(() => {
    router.replace('/state-union' as any);
  }, []);
  return <View style={{ flex: 1, backgroundColor: Colors.cream }} />;
}
