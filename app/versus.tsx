import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { loadVersusPool, VersusItem } from '../services/versusService';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

type Status = 'loading' | 'empty' | 'playing' | 'done';

export default function VersusScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const help = useHelp('versus');
  const [status, setStatus] = useState<Status>('loading');
  const [pool, setPool] = useState<VersusItem[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerUid = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'your partner';

  useEffect(() => {
    if (!coupleId || !partnerUid) return;
    loadVersusPool(coupleId, uid, partnerUid, 10)
      .then((items) => {
        setPool(items);
        setStatus(items.length === 0 ? 'empty' : 'playing');
      })
      .catch(() => setStatus('empty'));
  }, [coupleId, uid, partnerUid]);

  const current = pool[index];

  const pick = (option: string) => {
    if (revealed || !current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPicked(option);
    setRevealed(true);
    if (option === current.partnerAnswer) setScore(s => s + 1);
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (index + 1 >= pool.length) {
      setStatus('done');
    } else {
      setIndex(i => i + 1);
      setPicked(null);
      setRevealed(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setScore(0);
    setPicked(null);
    setRevealed(false);
    setStatus('loading');
    if (coupleId && partnerUid) {
      loadVersusPool(coupleId, uid, partnerUid, 10).then((items) => {
        setPool(items);
        setStatus(items.length === 0 ? 'empty' : 'playing');
      });
    }
  };

  const pct = pool.length > 0 ? Math.round((score / pool.length) * 100) : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Versus</Text>
        {status === 'playing' && (
          <Text style={styles.counter}>{index + 1}/{pool.length}</Text>
        )}
        {status !== 'playing' && <View style={{ width: 60 }} />}
      </View>

      {status === 'loading' && (
        <View style={styles.center}>
          <Text style={styles.loading}>Building your match...</Text>
        </View>
      )}

      {status === 'empty' && (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🤔</Text>
          <Text style={styles.emptyTitle}>Not enough answers yet</Text>
          <Text style={styles.emptyBody}>
            Versus uses {partnerName}'s past quick-fire answers. Play a few days of binary questions in Questions Game first, then come back to test how well you know them.
          </Text>
          <TouchableOpacity style={styles.cta} onPress={() => router.replace('/questions-game')} accessibilityRole="button">
            <Text style={styles.ctaText}>Go to Questions →</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'playing' && current && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>What did {partnerName} pick?</Text>
          <Text style={styles.question}>{current.question.text}</Text>

          <View style={styles.optionsWrap}>
            {current.options.map((opt) => {
              const isPicked = picked === opt;
              const isRight = revealed && opt === current.partnerAnswer;
              const isWrong = revealed && isPicked && opt !== current.partnerAnswer;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionBtn,
                    isRight && styles.optionRight,
                    isWrong && styles.optionWrong,
                    revealed && !isPicked && !isRight && { opacity: 0.5 },
                  ]}
                  onPress={() => pick(opt)}
                  disabled={revealed}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {isRight && <Text style={styles.optionBadge}>✓</Text>}
                  {isWrong && <Text style={styles.optionBadge}>✗</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {revealed && (
            <>
              <Text style={styles.reveal}>
                {picked === current.partnerAnswer
                  ? `Yes — ${partnerName} picked "${current.partnerAnswer}"`
                  : `${partnerName} actually picked "${current.partnerAnswer}"`}
              </Text>
              <TouchableOpacity style={styles.nextBtn} onPress={next} accessibilityRole="button">
                <Text style={styles.nextBtnText}>{index + 1 >= pool.length ? 'See result →' : 'Next →'}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {status === 'done' && (
        <ScrollView contentContainerStyle={styles.content}>
          <LinearGradient colors={['#FFE5EC', Colors.blush, '#F4A7B9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.resultCard}>
            <Text style={styles.resultEyebrow}>Your score</Text>
            <Text style={styles.resultNum}>{score} / {pool.length}</Text>
            <Text style={styles.resultPct}>{pct}%</Text>
            <View style={styles.resultDivider} />
            <Text style={styles.resultMsg}>
              {pct >= 80 ? `You know ${partnerName} inside and out 💖` :
               pct >= 50 ? `Pretty good, but still surprises to find 🌸` :
               `Time to dig deeper, ask ${partnerName} more questions 🌱`}
            </Text>
          </LinearGradient>
          <TouchableOpacity style={styles.cta} onPress={restart} accessibilityRole="button">
            <Text style={styles.ctaText}>Play again ↻</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <HelpModal
        visible={help.visible}
        title="Versus"
        description={`Test how well you know ${partnerName}. We pull their quick-fire answers from Questions Game and ask you to guess each one.`}
        tips={[
          "Only works with binary (A or B) questions you've both answered before",
          "Pick what you think your partner chose",
          "You see the right answer immediately, no penalty for wrong",
          "Track your knowing-them percentage over time",
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
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
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  counter: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted, width: 60, textAlign: 'right' },

  center: { flex: 1, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loading: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy, textAlign: 'center' },
  emptyBody: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },

  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  eyebrow: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' },
  question: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy, textAlign: 'center', lineHeight: 36 },

  optionsWrap: { gap: Spacing.sm, marginTop: Spacing.md },
  optionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md, borderWidth: 2, borderColor: Colors.border, gap: Spacing.sm, ...Shadow.sm },
  optionRight: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  optionWrong: { borderColor: '#E57373', backgroundColor: '#FFEBEE' },
  optionText: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Colors.text },
  optionBadge: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },

  reveal: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 22 },
  nextBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  nextBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },

  resultCard: { padding: Spacing.xl, borderRadius: Radius.xl, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.rose, ...Shadow.md },
  resultEyebrow: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.5 },
  resultNum: { fontFamily: Fonts.heading, fontSize: 48, color: Colors.burgundy },
  resultPct: { fontFamily: Fonts.headingItalic, fontSize: 28, color: Colors.burgundy },
  resultDivider: { width: 40, height: 1, backgroundColor: Colors.burgundy, opacity: 0.2, marginVertical: 6 },
  resultMsg: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 24 },

  cta: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.md },
  ctaText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
