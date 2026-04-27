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
      if (filtered.length === 0) { setSpinning(false); return; }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dare Wheel</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Level selector */}
        <View style={styles.levelSegment}>
          {LEVELS.map((level) => {
            const c = DARE_LEVEL_CONFIG[level];
            const active = selectedLevel === level;
            return (
              <TouchableOpacity
                key={level}
                style={[styles.levelTab, active && { backgroundColor: c.color }]}
                onPress={() => { setSelectedLevel(level); setCurrentDare(null); }}
                activeOpacity={0.8}
              >
                <Text style={styles.levelEmoji}>{c.emoji}</Text>
                <Text style={[styles.levelLabel, active && { color: c.textColor }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Wheel */}
        <View style={styles.wheelOuter}>
          <View style={[styles.wheelRing, { borderColor: cfg.color }]}>
            <Animated.View style={[styles.wheel, { backgroundColor: cfg.color, transform: [{ rotate: spinRotate }] }]}>
              <Text style={styles.wheelEmoji}>{cfg.emoji}</Text>
            </Animated.View>
          </View>
        </View>

        {/* Spin button */}
        <TouchableOpacity
          style={styles.spinBtn}
          onPress={spin}
          disabled={spinning}
          activeOpacity={0.85}
        >
          <Text style={styles.spinBtnText}>{spinning ? 'Spinning…' : 'Spin!'}</Text>
        </TouchableOpacity>

        {/* Result */}
        {currentDare && (
          <View style={[styles.resultCard, { borderLeftColor: cfg.textColor }]}>
            <View style={styles.resultTop}>
              <Text style={styles.resultEmoji}>{cfg.emoji}</Text>
              <Text style={[styles.resultLabel, { color: cfg.textColor }]}>{cfg.label} dare</Text>
            </View>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center', paddingTop: Spacing.lg },

  levelSegment: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    width: '100%',
  },
  levelTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  levelEmoji: { fontSize: 18 },
  levelLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  wheelOuter: { marginBottom: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  wheelRing: {
    width: 244,
    height: 244,
    borderRadius: 122,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  wheel: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  wheelEmoji: { fontSize: 78 },

  spinBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.full,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.burgundy,
  },
  spinBtnText: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.cream, letterSpacing: 0.5 },

  resultCard: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  resultEmoji: { fontSize: 28 },
  resultLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  resultText: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text, lineHeight: 32 },
  rerollBtn: { alignSelf: 'flex-end', marginTop: Spacing.xs },
  rerollText: { fontFamily: Fonts.bodyBold, fontSize: 14 },
});
