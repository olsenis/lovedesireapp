import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Radius, Spacing } from '../constants/spacing';

// Shared floating toast. Extracted Aug 2026 from the ad-hoc versions in
// fantasy-wishes.tsx + bingo.tsx during the Intimacy Log cross-flow
// prompt work. Two visual variants: `default` (cream w/ burgundy border,
// info tone) and `emphasis` (burgundy fill, cream text, for match /
// celebration moments). Auto-dismisses; optional tap handler adds a
// TouchableOpacity wrapper without changing the visual footprint.
//
// Usage — imperative hook pattern so screens don't have to thread state:
//   const { toast, showToast } = useToast();
//   showToast('Saved ✓');
//   showToast("It's a match! ✨", { emphasis: true, onTap: () => router.push('/matches') });
//   ...
//   return (<>...{toast}</>);

type ShowOptions = {
  emphasis?: boolean;
  onTap?: () => void;
  duration?: number;
};

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [emphasis, setEmphasis] = useState(false);
  const [onTap, setOnTap] = useState<(() => void) | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((message: string, opts?: ShowOptions) => {
    const duration = opts?.duration ?? 3000;
    setMsg(message);
    setEmphasis(!!opts?.emphasis);
    setOnTap(() => opts?.onTap ?? null);
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(anim, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => {
      setMsg(null);
      setOnTap(null);
    });
  }, [anim]);

  const dismiss = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setMsg(null);
      setOnTap(null);
    });
  }, [anim]);

  const style: Animated.WithAnimatedObject<ViewStyle> = {
    opacity: anim,
    transform: [{
      translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }),
    }],
  };

  const toast = msg ? (
    <Animated.View style={[styles.toast, emphasis && styles.toastEmphasis, style]} pointerEvents="box-none">
      {onTap ? (
        <TouchableOpacity
          onPress={() => { onTap(); dismiss(); }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={msg}
        >
          <Text style={[styles.toastText, emphasis && styles.toastTextEmphasis]}>{msg}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.toastText, emphasis && styles.toastTextEmphasis]}>{msg}</Text>
      )}
    </Animated.View>
  ) : null;

  return { toast, showToast, dismiss };
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.cream,
    borderColor: Colors.burgundy,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    zIndex: 50,
    elevation: 8,
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  } as ViewStyle,
  toastEmphasis: {
    backgroundColor: Colors.burgundy,
    borderColor: Colors.burgundy,
  } as ViewStyle,
  toastText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.burgundy,
    letterSpacing: 0.3,
    textAlign: 'center',
  } as TextStyle,
  toastTextEmphasis: {
    color: Colors.cream,
    fontSize: 14,
    letterSpacing: 0.4,
  } as TextStyle,
});
