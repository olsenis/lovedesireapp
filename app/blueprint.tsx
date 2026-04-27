import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { saveBlueprintResult, subscribeCoupleBlueprints, CoupleBlueprints } from '../services/blueprintService';
import {
  BLUEPRINT_QUESTIONS, BLUEPRINT_TYPE_CONFIG, BLUEPRINT_COMPATIBILITY,
  BlueprintType,
} from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

const OPTION_BG = ['#FFF0F3', '#FFF8F0'];

export default function BlueprintScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<BlueprintType, number>>({ sensual: 0, sexual: 0, energetic: 0, kinky: 0, shapeshifter: 0 });
  const [done, setDone] = useState(false);
  const [coupleResults, setCoupleResults] = useState<CoupleBlueprints>({});

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeCoupleBlueprints(coupleId, (results) => {
      setCoupleResults(results);
      if (results[uid]) setDone(true);
    });
  }, [coupleId, uid]);

  const q = BLUEPRINT_QUESTIONS[step];

  const pick = async (type: BlueprintType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = { ...scores, [type]: scores[type] + 1 };
    setScores(next);
    if (step + 1 >= BLUEPRINT_QUESTIONS.length) {
      if (user) await saveBlueprintResult(user.uid, coupleId, next);
      setDone(true);
    } else {
      setStep((s) => s + 1);
    }
  };

  const retake = async () => {
    setStep(0);
    setScores({ sensual: 0, sexual: 0, energetic: 0, kinky: 0, shapeshifter: 0 });
    setDone(false);
  };

  // Results data
  const myResult = coupleResults[uid];
  const partnerResult = partnerId ? coupleResults[partnerId] : null;
  const activeScores = myResult?.scores ?? scores;
  const sorted = (Object.entries(activeScores) as [BlueprintType, number][]).sort((a, b) => b[1] - a[1]);
  const myType = myResult?.type ?? sorted[0][0];
  const myPrimary = BLUEPRINT_TYPE_CONFIG[myType];
  const partnerCfg = partnerResult ? BLUEPRINT_TYPE_CONFIG[partnerResult.type] : null;
  const compatibility = partnerResult ? BLUEPRINT_COMPATIBILITY[myType]?.[partnerResult.type] : null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Erotic Blueprint</Text>
        <View style={{ width: 60 }} />
      </View>

      {!done ? (
        <View style={styles.quizContent}>
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(step / BLUEPRINT_QUESTIONS.length) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{step + 1} of {BLUEPRINT_QUESTIONS.length}</Text>
          </View>

          <Text style={styles.question}>Which resonates more deeply with you?</Text>

          <TouchableOpacity style={[styles.optionCard, { backgroundColor: OPTION_BG[0] }]} onPress={() => pick(q.a.type)} activeOpacity={0.8}>
            <Text style={styles.optionText}>{q.a.text}</Text>
          </TouchableOpacity>

          <View style={styles.orWrap}>
            <View style={styles.orLine} />
            <Text style={styles.or}>or</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity style={[styles.optionCard, { backgroundColor: OPTION_BG[1] }]} onPress={() => pick(q.b.type)} activeOpacity={0.8}>
            <Text style={styles.optionText}>{q.b.text}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.results}>

          {/* Your type hero */}
          <View style={[styles.heroCard, { backgroundColor: myPrimary.color }]}>
            <Text style={styles.heroEmoji}>{myPrimary.emoji}</Text>
            <Text style={styles.heroLabel}>{myPrimary.label}</Text>
            <Text style={styles.heroDesc}>{myPrimary.description}</Text>
          </View>

          {/* Turn ons / offs */}
          <View style={styles.traitRow}>
            <View style={[styles.traitCard, styles.traitOn]}>
              <Text style={styles.traitTitle}>Turns you on</Text>
              <Text style={styles.traitText}>{myPrimary.turnOns}</Text>
            </View>
            <View style={[styles.traitCard, styles.traitOff]}>
              <Text style={styles.traitTitle}>Turns you off</Text>
              <Text style={styles.traitText}>{myPrimary.turnOffs}</Text>
            </View>
          </View>

          {/* Partner result */}
          {partnerResult && partnerCfg ? (
            <>
              <Text style={styles.sectionLabel}>{partner?.name ?? 'Your partner'}'s type</Text>
              <View style={[styles.partnerCard, { backgroundColor: partnerCfg.color }]}>
                <Text style={styles.partnerEmoji}>{partnerCfg.emoji}</Text>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerLabel}>{partnerCfg.label}</Text>
                  <Text style={styles.partnerDesc}>{partnerCfg.description}</Text>
                </View>
              </View>

              {/* Compatibility bridge */}
              {compatibility ? (
                <View style={styles.compatCard}>
                  <Text style={styles.compatTitle}>
                    {myPrimary.label} + {partnerCfg.label}
                  </Text>
                  <Text style={styles.compatText}>{compatibility}</Text>
                </View>
              ) : myType === partnerResult.type ? (
                <View style={styles.compatCard}>
                  <Text style={styles.compatTitle}>You're both {myPrimary.label}</Text>
                  <Text style={styles.compatText}>You speak the same erotic language — lean into it and explore the depth of what you share.</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.partnerPending}>
              <Text style={styles.partnerPendingEmoji}>⏳</Text>
              <Text style={styles.partnerPendingText}>
                Waiting for {partner?.name ?? 'your partner'} to complete the quiz
              </Text>
              <Text style={styles.partnerPendingHint}>When they finish, your compatibility will appear here.</Text>
            </View>
          )}

          {/* Your score breakdown */}
          <Text style={styles.sectionLabel}>Your full profile</Text>
          <View style={styles.scoreList}>
            {sorted.map(([type, score]) => {
              const cfg = BLUEPRINT_TYPE_CONFIG[type as BlueprintType];
              const pct = sorted[0][1] > 0 ? (score / sorted[0][1]) * 100 : 0;
              return (
                <View key={type} style={styles.scoreRow}>
                  <Text style={styles.scoreEmoji}>{cfg.emoji}</Text>
                  <View style={styles.scoreBarWrap}>
                    <Text style={styles.scoreLang}>{cfg.label}</Text>
                    <View style={styles.scoreBarBg}>
                      <View style={[styles.scoreBarFill, { width: `${pct}%`, backgroundColor: cfg.color.replace('E', '9') }]} />
                    </View>
                  </View>
                  <Text style={styles.scoreNum}>{score}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.retakeBtn} onPress={retake}>
            <Text style={styles.retakeText}>Retake quiz ↻</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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

  quizContent: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: 'center', gap: Spacing.lg },
  progressWrap: { gap: 6 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.burgundy, borderRadius: 3 },
  progressText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, textAlign: 'center' },
  question: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, textAlign: 'center', lineHeight: 30 },
  optionCard: {
    borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.burgundy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  optionText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.text, textAlign: 'center', lineHeight: 24 },
  orWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  or: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted },

  results: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg, paddingTop: Spacing.lg },
  heroCard: { borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, ...Shadow.sm },
  heroEmoji: { fontSize: 64 },
  heroLabel: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.text },
  heroDesc: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 24 },
  traitRow: { flexDirection: 'row', gap: Spacing.md },
  traitCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 6, borderWidth: 1, borderColor: Colors.border },
  traitOn: { backgroundColor: '#F1F8E9' },
  traitOff: { backgroundColor: '#FFF3E0' },
  traitTitle: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  traitText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 18 },

  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Partner card
  partnerCard: { borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...Shadow.sm },
  partnerEmoji: { fontSize: 44 },
  partnerInfo: { flex: 1, gap: 4 },
  partnerLabel: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text },
  partnerDesc: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.text, lineHeight: 20 },

  // Compatibility
  compatCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, borderLeftColor: Colors.rose,
  },
  compatTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.burgundy },
  compatText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },

  // Partner pending
  partnerPending: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  partnerPendingEmoji: { fontSize: 36 },
  partnerPendingText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text, textAlign: 'center' },
  partnerPendingHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  // Score breakdown
  scoreList: { gap: Spacing.md },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  scoreEmoji: { fontSize: 20, width: 28 },
  scoreBarWrap: { flex: 1, gap: 4 },
  scoreLang: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  scoreBarBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  scoreNum: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text, width: 20, textAlign: 'right' },

  retakeBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, alignSelf: 'center' },
  retakeText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
});
