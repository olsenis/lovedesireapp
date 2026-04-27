import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { DARES, TRUTHS, DARE_LEVEL_CONFIG, DareLevel } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const LEVELS: DareLevel[] = ['sweet', 'flirty', 'spicy'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function TruthDareScreen() {
  const [level, setLevel] = useState<DareLevel>('flirty');
  const [turn, setTurn] = useState<'A' | 'B'>('A');
  const [card, setCard] = useState<{ type: 'truth' | 'dare'; text: string } | null>(null);
  const [choosing, setChoosing] = useState(true);

  const cfg = DARE_LEVEL_CONFIG[level];

  const choose = (type: 'truth' | 'dare') => {
    const pool = type === 'truth'
      ? TRUTHS.filter((t) => t.level === level)
      : DARES.filter((d) => d.level === level);
    if (pool.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const picked = pickRandom(pool);
    setCard({ type, text: picked.text });
    setChoosing(false);
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCard(null);
    setChoosing(true);
    setTurn((t) => (t === 'A' ? 'B' : 'A'));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Truth or Dare</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Level selector */}
        <View style={styles.levelSegment}>
          {LEVELS.map((l) => {
            const c = DARE_LEVEL_CONFIG[l];
            const active = level === l;
            return (
              <TouchableOpacity
                key={l}
                style={[styles.levelTab, active && { backgroundColor: c.color }]}
                onPress={() => { setLevel(l); setCard(null); setChoosing(true); }}
                activeOpacity={0.8}
              >
                <Text style={styles.levelEmoji}>{c.emoji}</Text>
                <Text style={[styles.levelLabel, active && { color: c.textColor }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Turn indicator */}
        <View style={[styles.turnBadge, { backgroundColor: cfg.color }]}>
          <Text style={[styles.turnText, { color: cfg.textColor }]}>
            {choosing ? `Player ${turn}'s turn — choose:` : `Player ${turn}'s card`}
          </Text>
        </View>

        {/* Choice buttons or card */}
        {choosing ? (
          <View style={styles.choiceRow}>
            <TouchableOpacity
              style={[styles.choiceBtn, styles.truthBtn]}
              onPress={() => choose('truth')}
              activeOpacity={0.85}
            >
              <Text style={styles.choiceBtnEmoji}>🤔</Text>
              <Text style={styles.choiceBtnLabel}>Truth</Text>
              <Text style={styles.choiceBtnSub}>Answer honestly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.choiceBtn, styles.dareBtn, { borderColor: cfg.textColor }]}
              onPress={() => choose('dare')}
              activeOpacity={0.85}
            >
              <Text style={styles.choiceBtnEmoji}>{cfg.emoji}</Text>
              <Text style={[styles.choiceBtnLabel, { color: cfg.textColor }]}>Dare</Text>
              <Text style={styles.choiceBtnSub}>Do the challenge</Text>
            </TouchableOpacity>
          </View>
        ) : card && (
          <View style={[styles.cardView, card.type === 'dare' ? { borderLeftColor: cfg.textColor } : styles.cardTruth]}>
            <View style={styles.cardTypeRow}>
              <Text style={styles.cardTypeEmoji}>{card.type === 'truth' ? '🤔' : cfg.emoji}</Text>
              <Text style={[styles.cardTypeBadge, card.type === 'dare' && { color: cfg.textColor }]}>
                {card.type === 'truth' ? 'Truth' : `${cfg.label} Dare`}
              </Text>
            </View>
            <Text style={styles.cardText}>{card.text}</Text>
            <TouchableOpacity style={styles.nextBtn} onPress={next}>
              <Text style={styles.nextBtnText}>Done — next player →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        {choosing && (
          <View style={styles.howTo}>
            <Text style={styles.howToTitle}>How to play</Text>
            <Text style={styles.howToText}>
              Take turns choosing Truth or Dare. Truth = answer the question honestly. Dare = complete the challenge. Switch after each turn.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center', paddingTop: Spacing.lg, gap: Spacing.lg },

  levelSegment: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', width: '100%',
  },
  levelTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6,
  },
  levelEmoji: { fontSize: 18 },
  levelLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  turnBadge: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: Radius.full },
  turnText: { fontFamily: Fonts.bodyBold, fontSize: 14 },

  choiceRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  choiceBtn: {
    flex: 1, borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center',
    gap: Spacing.sm, borderWidth: 2, ...Shadow.sm,
  },
  truthBtn: { backgroundColor: Colors.white, borderColor: Colors.border },
  dareBtn: { backgroundColor: Colors.white },
  choiceBtnEmoji: { fontSize: 36 },
  choiceBtnLabel: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  choiceBtnSub: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },

  cardView: {
    width: '100%', backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4, ...Shadow.sm,
  },
  cardTruth: { borderLeftColor: '#1565C0' },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTypeEmoji: { fontSize: 22 },
  cardTypeBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#1565C0', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardText: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, lineHeight: 30 },
  nextBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.sm },
  nextBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  howTo: { width: '100%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: 6, borderWidth: 1, borderColor: Colors.border },
  howToTitle: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  howToText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 20 },
});
