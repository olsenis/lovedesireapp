import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

// Full-screen celebration modal for mutual matches across Fantasy Wishes,
// WYR, Daily. Replaces the old toast + card-highlight pattern that was too
// subtle — a shared moment should feel like a moment, not a status update.
//
// Design:
//  - Dark overlay so the world falls away
//  - Centered card with title + content quote + partner names
//  - 12 emoji particles float upward from the bottom, staggered starts,
//    each with random horizontal drift + rotation
//  - Auto-dismiss after 6s; user can tap "Nice!" to dismiss earlier
//  - Success haptic on show
//
// One shared component so all three features feel consistent — differences
// are just the emoji/title props.

type Props = {
  visible: boolean;
  title?: string;
  content: string;
  partnerName: string;
  emoji?: string;
  onDismiss: () => void;
  // Optional "Add to Together List" button. When provided, the modal
  // shows a two-button row (Later | Add to our list). Add fires the
  // callback and dismisses. When absent, a single Nice ✨ button
  // dismisses (used for pure celebration with no follow-up action).
  onAddToList?: () => void | Promise<void>;
  addButtonLabel?: string;
  // Optional: signal that the pair has already added this to Together
  // List (e.g. from a previous session). Hides the Add button so the
  // modal doesn't tempt a re-add — shows a confirmation pill instead.
  alreadyAdded?: boolean;
};

const CONFETTI_EMOJIS = ['✨', '💖', '🎉', '💫', '🌟', '💕'];
const PARTICLE_COUNT = 14;
const AUTO_DISMISS_MS = 6000;

export function MatchCelebration({
  visible,
  title = "It's a Match!",
  content,
  partnerName,
  emoji = '✨',
  onDismiss,
  onAddToList,
  addButtonLabel = 'Add to our list',
  alreadyAdded = false,
}: Props) {
  const [adding, setAdding] = useState(false);
  const handleAdd = async () => {
    if (!onAddToList || adding) return;
    setAdding(true);
    try {
      await onAddToList();
      onDismiss();
    } finally {
      setAdding(false);
    }
  };
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
    })),
  ).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      cardScale.setValue(0.8);
      cardOpacity.setValue(0);
      particles.forEach((p) => {
        p.y.setValue(0);
        p.x.setValue(0);
        p.rotate.setValue(0);
        p.opacity.setValue(0);
      });
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    particles.forEach((p, i) => {
      const delay = i * 40;
      const drift = (Math.random() - 0.5) * 200; // -100 to 100 px horizontal drift
      const rise = 400 + Math.random() * 250;     // 400-650 px upward
      const rotation = (Math.random() - 0.5) * 4; // -2 to 2 full rotations
      const duration = 2200 + Math.random() * 800;
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: -rise, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.x, { toValue: drift, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(p.rotate, { toValue: rotation, duration, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(duration - 500),
            Animated.timing(p.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });

    // Auto-dismiss only when there's no primary action to take. If the
    // modal has an Add button the user should have time to decide, not be
    // whisked away mid-thought.
    if (!onAddToList) {
      dismissTimer.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
    // Fires once per visibility transition; particle refs are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        {/* Confetti layer — sits behind the card so it looks like it's rising up around it. */}
        <View style={styles.confettiLayer} pointerEvents="none">
          {particles.map((p, i) => {
            const startX = (i / PARTICLE_COUNT) * SCREEN_WIDTH;
            return (
              <Animated.Text
                key={i}
                style={[
                  styles.particle,
                  {
                    left: startX,
                    opacity: p.opacity,
                    transform: [
                      { translateY: p.y },
                      { translateX: p.x },
                      { rotate: p.rotate.interpolate({ inputRange: [-2, 2], outputRange: ['-720deg', '720deg'] }) },
                    ],
                  },
                ]}
              >
                {CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length]}
              </Animated.Text>
            );
          })}
        </View>

        <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.contentBox}>
            <Text style={styles.content}>{content}</Text>
          </View>
          <Text style={styles.partners}>You & {partnerName} both said Yes</Text>
          {alreadyAdded && (
            <View style={styles.alreadyPill}>
              <Text style={styles.alreadyPillText}>✓ Already on your Together List</Text>
            </View>
          )}
          {onAddToList && !alreadyAdded ? (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.laterBtn}
                onPress={onDismiss}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Later"
                disabled={adding}
              >
                <Text style={styles.laterText}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, adding && styles.addBtnBusy]}
                onPress={handleAdd}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={addButtonLabel}
                disabled={adding}
              >
                <Text style={styles.addText}>{adding ? 'Adding…' : `+ ${addButtonLabel}`}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onDismiss}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Dismiss celebration"
            >
              <Text style={styles.dismissText}>Nice ✨</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(29, 6, 16, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  confettiLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    bottom: -40,
    fontSize: 28,
  },
  card: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    maxWidth: 380,
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.burgundy,
    ...Shadow.md,
  },
  emoji: { fontSize: 64, lineHeight: 72 },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    color: Colors.burgundy,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  contentBox: {
    backgroundColor: '#FCE4EC',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    width: '100%',
  },
  content: {
    fontFamily: Fonts.headingItalic,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  partners: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  dismissBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: Colors.burgundy,
    minWidth: 180,
    alignItems: 'center',
  },
  dismissText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.cream,
    letterSpacing: 0.5,
  },
  btnRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  laterBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 90,
  },
  laterText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.muted,
    letterSpacing: 0.3,
  },
  addBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.burgundy,
    alignItems: 'center',
  },
  addBtnBusy: { opacity: 0.6 },
  addText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.cream,
    letterSpacing: 0.3,
  },
  alreadyPill: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  alreadyPillText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.cream,
    letterSpacing: 0.4,
  },
});
