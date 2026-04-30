import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { DARES, DareLevel, DARE_LEVEL_CONFIG } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

type Phase = 'setup' | 'writing' | 'guessing' | 'result';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function TwoTruthsScreen() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [writer, setWriter] = useState<'A' | 'B'>('A');
  const [statements, setStatements] = useState(['', '', '']);
  const [lie, setLie] = useState<number | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const [dare, setDare] = useState<string | null>(null);
  const [dareLevel] = useState<DareLevel>('flirty');
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({ A: 0, B: 0 });
  const help = useHelp('two-truths');

  const guessing = writer === 'A' ? 'B' : 'A';
  const correct = guess === lie;
  const darerName = correct ? `Player ${writer}` : `Player ${guessing}`;

  const handleWrite = () => {
    if (statements.some(s => !s.trim()) || lie === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('guessing');
  };

  const handleGuess = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGuess(index);
    const dares = DARES.filter(d => d.level === dareLevel);
    setDare(pickRandom(dares).text);
    setPhase('result');
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Update scores
    if (!correct) {
      setScores(prev => ({ ...prev, [guessing]: prev[guessing as 'A'|'B'] + 1 }));
    } else {
      setScores(prev => ({ ...prev, [writer]: prev[writer as 'A'|'B'] + 1 }));
    }
    // Switch writer
    setWriter(w => w === 'A' ? 'B' : 'A');
    setStatements(['', '', '']);
    setLie(null);
    setGuess(null);
    setDare(null);
    setRound(r => r + 1);
    setPhase('writing');
  };

  const handleReset = () => {
    setPhase('setup');
    setWriter('A');
    setStatements(['', '', '']);
    setLie(null);
    setGuess(null);
    setDare(null);
    setRound(1);
    setScores({ A: 0, B: 0 });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={phase === 'setup' ? () => router.back() : handleReset} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Two Truths One Lie</Text>
        <Text style={styles.roundText}>{phase !== 'setup' ? `Round ${round}` : ''}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Setup */}
        {phase === 'setup' && (
          <>
            <Text style={styles.intro}>
              Player A writes 2 truths and 1 lie about themselves.{'\n'}
              Player B guesses which is the lie.{'\n'}
              Wrong guess = dare. Right guess = writer does the dare.
            </Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreCard}>
                <Text style={styles.scoreNum}>{scores.A}</Text>
                <Text style={styles.scoreLabel}>Player A</Text>
              </View>
              <View style={styles.scoreCard}>
                <Text style={styles.scoreNum}>{scores.B}</Text>
                <Text style={styles.scoreLabel}>Player B</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={() => setPhase('writing')} activeOpacity={0.85}>
              <Text style={styles.startBtnText}>Start game →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Writing phase */}
        {phase === 'writing' && (
          <>
            <View style={styles.turnBadge}>
              <Text style={styles.turnText}>Player {writer} — write your statements</Text>
            </View>
            <Text style={styles.hint}>Write 2 things that are TRUE and 1 that is FALSE. Then tap the lie.</Text>

            {[0, 1, 2].map(i => (
              <View key={i} style={styles.statementRow}>
                <TextInput
                  style={[styles.input, lie === i && styles.inputLie]}
                  placeholder={`Statement ${i + 1}`}
                  placeholderTextColor={Colors.muted}
                  value={statements[i]}
                  onChangeText={t => { const s = [...statements]; s[i] = t; setStatements(s); }}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.lieBtn, lie === i && styles.lieBtnActive]}
                  onPress={() => setLie(lie === i ? null : i)}
                >
                  <Text style={[styles.lieBtnText, lie === i && styles.lieBtnTextActive]}>
                    {lie === i ? '🤥 LIE' : 'Lie?'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.startBtn, (statements.some(s => !s.trim()) || lie === null) && { opacity: 0.4 }]}
              onPress={handleWrite}
              disabled={statements.some(s => !s.trim()) || lie === null}
              activeOpacity={0.85}
            >
              <Text style={styles.startBtnText}>Player {guessing} — guess the lie →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Guessing phase */}
        {phase === 'guessing' && (
          <>
            <View style={styles.turnBadge}>
              <Text style={styles.turnText}>Player {guessing} — which is the lie?</Text>
            </View>
            <Text style={styles.hint}>Tap the statement you think is false.</Text>

            {statements.map((s, i) => (
              <TouchableOpacity key={i} style={styles.guessCard} onPress={() => handleGuess(i)} activeOpacity={0.85}>
                <Text style={styles.guessNum}>{i + 1}</Text>
                <Text style={styles.guessText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Result phase */}
        {phase === 'result' && (
          <>
            <View style={[styles.resultCard, { backgroundColor: correct ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={styles.resultEmoji}>{correct ? '🎯' : '😅'}</Text>
              <Text style={styles.resultTitle}>
                {correct ? 'Correct! Player B guessed it.' : 'Wrong! The lie was statement ' + ((lie ?? 0) + 1)}
              </Text>
              <Text style={styles.resultSub}>
                {darerName} does the dare:
              </Text>
            </View>

            <View style={styles.dareCard}>
              <Text style={styles.dareBadge}>{DARE_LEVEL_CONFIG[dareLevel].emoji} Dare</Text>
              <Text style={styles.dareText}>{dare}</Text>
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.startBtnText}>Switch — Player {guessing} goes next →</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <HelpModal
        visible={help.visible}
        title="Two Truths One Lie"
        description="Player A writes 3 statements — 2 true, 1 false. Player B guesses the lie. Wrong guess means a dare!"
        tips={["Write your statements privately — don't let your partner see","Tap 'Lie?' to mark which of your 3 statements is the lie","Player B guesses — wrong guess = dare for the guesser","Right guess = the writer has to do the dare"]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  roundText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted, width: 60, textAlign: 'right' },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.lg },

  intro: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 26, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', gap: Spacing.lg, justifyContent: 'center' },
  scoreCard: { alignItems: 'center', gap: 4 },
  scoreNum: { fontFamily: Fonts.heading, fontSize: 40, color: Colors.burgundy },
  scoreLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  startBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  startBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  turnBadge: { backgroundColor: Colors.blush, borderRadius: Radius.full, paddingVertical: 10, paddingHorizontal: Spacing.lg, alignItems: 'center' },
  turnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
  hint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  statementRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  input: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border, minHeight: 56 },
  inputLie: { borderColor: Colors.error, backgroundColor: '#FFF3F3' },
  lieBtn: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: 'center', minWidth: 64, marginTop: 2 },
  lieBtnActive: { backgroundColor: Colors.error, borderColor: Colors.error },
  lieBtnText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted },
  lieBtnTextActive: { color: Colors.white },

  guessCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  guessNum: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy, minWidth: 28 },
  guessText: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },

  resultCard: { borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  resultEmoji: { fontSize: 40 },
  resultTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, textAlign: 'center' },
  resultSub: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },

  dareCard: { backgroundColor: '#FFCCBC', borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm, ...Shadow.sm },
  dareBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, color: '#BF360C', textTransform: 'uppercase', letterSpacing: 0.8 },
  dareText: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, lineHeight: 28 },
});
