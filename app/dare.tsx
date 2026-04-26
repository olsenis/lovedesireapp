import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { DARES, DARE_LEVEL_CONFIG, DareLevel } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

const LEVELS: DareLevel[] = ['sweet', 'flirty', 'spicy'];

export default function DareScreen() {
  const [selectedLevel, setSelectedLevel] = useState<DareLevel>('sweet');
  const [currentDare, setCurrentDare] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setCurrentDare(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      const filtered = DARES.filter((d) => d.level === selectedLevel);
      const picked = filtered[Math.floor(Math.random() * filtered.length)];
      setCurrentDare(picked.text);
      setSpinning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1440deg'],
  });

  const cfg = DARE_LEVEL_CONFIG[selectedLevel];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dare Wheel</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Level selector */}
        <View style={styles.levelRow}>
          {LEVELS.map((level) => {
            const c = DARE_LEVEL_CONFIG[level];
            const active = selectedLevel === level;
            return (
              <TouchableOpacity
                key={level}
                style={[styles.levelBtn, active && { backgroundColor: c.color, borderColor: c.textColor }]}
                onPress={() => { setSelectedLevel(level); setCurrentDare(null); }}
              >
                <Text style={styles.levelEmoji}>{c.emoji}</Text>
                <Text style={[styles.levelLabel, active && { color: c.textColor }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Spin wheel visual */}
        <View style={styles.wheelContainer}>
          <Animated.View style={[styles.wheel, { backgroundColor: cfg.color, transform: [{ rotate: spinRotate }] }]}>
            <Text style={styles.wheelEmoji}>{cfg.emoji}</Text>
          </Animated.View>
        </View>

        {/* Spin button */}
        <TouchableOpacity
          style={[styles.spinBtn, { backgroundColor: Colors.burgundy }]}
          onPress={spin}
          disabled={spinning}
          activeOpacity={0.85}
        >
          <Text style={styles.spinBtnText}>{spinning ? 'Spinning...' : 'Spin!'}</Text>
        </TouchableOpacity>

        {/* Result */}
        {currentDare && (
          <View style={[styles.resultCard, { backgroundColor: cfg.color }]}>
            <Text style={styles.resultEmoji}>{cfg.emoji}</Text>
            <Text style={[styles.resultLabel, { color: cfg.textColor }]}>{cfg.label} dare</Text>
            <Text style={styles.resultText}>{currentDare}</Text>
            <TouchableOpacity onPress={spin} style={styles.rerollBtn}>
              <Text style={[styles.rerollText, { color: cfg.textColor }]}>Spin again ↻</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center' },

  levelRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl, marginTop: Spacing.sm },
  levelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: 4,
  },
  levelEmoji: { fontSize: 20 },
  levelLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted },

  wheelContainer: { marginBottom: Spacing.xl },
  wheel: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  wheelEmoji: { fontSize: 64 },

  spinBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.full,
    marginBottom: Spacing.xl,
  },
  spinBtnText: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.cream, letterSpacing: 1 },

  resultCard: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultEmoji: { fontSize: 40 },
  resultLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  resultText: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, textAlign: 'center', lineHeight: 30 },
  rerollBtn: { marginTop: Spacing.sm },
  rerollText: { fontFamily: Fonts.bodyBold, fontSize: 14 },
});
