import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { QUIZ_QUESTIONS, LOVE_LANGUAGE_LABELS, LOVE_LANGUAGE_TYPE_CONFIG, LOVE_LANGUAGE_COMPATIBILITY, LoveLanguage, LoveLanguagePairKey } from '../constants/content';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import {
  saveLoveLanguageResult,
  subscribeCoupleLoveLanguages,
  CoupleLoveLanguages,
} from '../services/loveLanguageService';
import { personalise } from '../services/personalise';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { useTrackScreen } from '../hooks/useTrackScreen';

// Both options share the same soft blush so neither draws the eye more
// than the other. Previously A was pink and B was cream, which biased
// the choice toward A on an A/B preference quiz where symmetric
// affordance is important.
const OPTION_BG = '#FFF0F3';

export default function QuizScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple(user?.uid, profile?.coupleId);
  const partnerName = partner?.name ?? 'your partner';
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<LoveLanguage, number>>({ words: 0, acts: 0, gifts: 0, time: 0, touch: 0 });
  const [done, setDone] = useState(false);
  // True when we're viewing a previously saved result (from profile) rather
  // than a fresh run through the quiz. In this mode we don't have the score
  // breakdown, so we hide the bars and show a plain result card.
  const [viewingSaved, setViewingSaved] = useState(false);
  // Both partners' full results from couples/{id}/loveLanguages subcoll.
  // Powers the partner-side reveal + compatibility card on the results view.
  const [coupleResults, setCoupleResults] = useState<CoupleLoveLanguages>({});
  const help = useHelp('love-language');
  useTrackScreen('love_language_quiz');

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeCoupleLoveLanguages(profile.coupleId, setCoupleResults);
  }, [profile?.coupleId]);

  // Auto-restore should fire ONCE when the profile arrives on mount.
  // Without this guard, pressing "Retake quiz" would immediately snap
  // back to the saved-view state because the profile still has the
  // saved loveLanguage and the effect would keep firing.
  const autoRestoredRef = useRef(false);
  useEffect(() => {
    if (autoRestoredRef.current) return;
    if (profile?.loveLanguage) {
      autoRestoredRef.current = true;
      setViewingSaved(true);
      setDone(true);
    }
  }, [profile?.loveLanguage]);

  const q = QUIZ_QUESTIONS[step];

  const pick = (lang: LoveLanguage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = { ...scores, [lang]: scores[lang] + 1 };
    setScores(next);
    if (step + 1 >= QUIZ_QUESTIONS.length) {
      setDone(true);
    } else {
      setStep((s) => s + 1);
    }
  };

  const restart = () => {
    setStep(0);
    setScores({ words: 0, acts: 0, gifts: 0, time: 0, touch: 0 });
    setDone(false);
    setViewingSaved(false);
  };

  const sorted = (Object.entries(scores) as [LoveLanguage, number][]).sort((a, b) => b[1] - a[1]);
  // When viewing a saved result we don't have the fresh scores, so read
  // primary from the persisted profile value instead of the (all-zero)
  // scores map.
  const primary: LoveLanguage = viewingSaved && profile?.loveLanguage
    ? (profile.loveLanguage as LoveLanguage)
    : sorted[0][0];
  const max = sorted[0][1];

  // Persist the full result via loveLanguageService. Dual-write: mirrors
  // primary to profile.loveLanguage (existing Sunday-nudge + Insight-card
  // reads keep working) AND saves scores + timestamp to
  // couples/{id}/loveLanguages/{uid} so partner-side reveal + compatibility
  // card work. Falls back to users/{uid}/private/loveLanguage when unpaired.
  useEffect(() => {
    if (!done || viewingSaved || !user) return;
    saveLoveLanguageResult(user.uid, profile?.coupleId, scores).catch(() => {});
  }, [done, viewingSaved, user, profile?.coupleId, scores]);

  // Partner-side reveal + compatibility lookup
  const partnerUid = partner?.uid;
  const partnerResult = partnerUid ? coupleResults[partnerUid] : undefined;
  const partnerLanguage = partnerResult?.language;
  const myTypeConfig = LOVE_LANGUAGE_TYPE_CONFIG[primary];
  const partnerTypeConfig = partnerLanguage ? LOVE_LANGUAGE_TYPE_CONFIG[partnerLanguage] : undefined;
  // Compatibility keyed `${primary}-${partnerPrimary}`. Author's canonical
  // order isn't guaranteed to match user-partner direction, so check both
  // orderings before falling back to a friendly placeholder.
  const compatibility = useMemo(() => {
    if (!partnerLanguage) return undefined;
    const forward = `${primary}-${partnerLanguage}` as LoveLanguagePairKey;
    const reverse = `${partnerLanguage}-${primary}` as LoveLanguagePairKey;
    return LOVE_LANGUAGE_COMPATIBILITY[forward] ?? LOVE_LANGUAGE_COMPATIBILITY[reverse];
  }, [primary, partnerLanguage]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Love Language</Text>
        <View style={{ width: 60 }} />
      </View>

      {!done ? (
        <View style={styles.quizContent}>
          {/* Progress */}
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(step / QUIZ_QUESTIONS.length) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{step + 1} of {QUIZ_QUESTIONS.length}</Text>
          </View>

          <Text style={styles.question}>Which feels more meaningful to you?</Text>

          <TouchableOpacity style={[styles.optionCard, { backgroundColor: OPTION_BG }]} onPress={() => pick(q.a.language)} activeOpacity={0.8} accessibilityRole="button">
            <Text style={styles.optionText}>{q.a.text}</Text>
          </TouchableOpacity>

          <View style={styles.orWrap}>
            <View style={styles.orLine} />
            <Text style={styles.or}>or</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity style={[styles.optionCard, { backgroundColor: OPTION_BG }]} onPress={() => pick(q.b.language)} activeOpacity={0.8} accessibilityRole="button">
            <Text style={styles.optionText}>{q.b.text}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.results}>
          {/* Your language hero */}
          <LinearGradient
            colors={[myTypeConfig.color, '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroOrnamentTop}>✦</Text>
            <Text style={styles.heroEyebrow}>Your love language</Text>
            <Text style={styles.heroEmoji}>{myTypeConfig.emoji}</Text>
            <Text style={styles.heroLabel}>{myTypeConfig.label}</Text>
            <View style={styles.heroDivider} />
            <Text style={styles.heroDesc}>{myTypeConfig.description}</Text>
          </LinearGradient>

          {/* Feels most loved by / less meaningful */}
          <View style={styles.traitRow}>
            <View style={[styles.traitCard, styles.traitOn]}>
              <Text style={styles.traitTitle}>Feels most loved by</Text>
              <Text style={styles.traitText}>{myTypeConfig.mostLovedBy}</Text>
            </View>
            <View style={[styles.traitCard, styles.traitOff]}>
              <Text style={styles.traitTitle}>Less meaningful</Text>
              <Text style={styles.traitText}>{myTypeConfig.lessMeaningful}</Text>
            </View>
          </View>

          {/* Partner result */}
          {partnerResult && partnerTypeConfig ? (
            <>
              <Text style={styles.sectionLabel}>{partner?.name ?? 'Your partner'}'s language</Text>
              <View style={[styles.partnerCard, { backgroundColor: partnerTypeConfig.color }]}>
                <Text style={styles.partnerEmoji}>{partnerTypeConfig.emoji}</Text>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerLabel}>{partnerTypeConfig.label}</Text>
                  <Text style={styles.partnerDesc}>{partnerTypeConfig.description}</Text>
                </View>
              </View>

              {compatibility && (
                <View style={[styles.compatCard, { borderLeftColor: partnerTypeConfig.color }]}>
                  <Text style={styles.compatTitle}>
                    {myTypeConfig.emoji} {myTypeConfig.label} + {partnerTypeConfig.emoji} {partnerTypeConfig.label}
                  </Text>
                  <Text style={styles.compatText}>{personalise(compatibility.summary, partner?.name)}</Text>

                  <View style={styles.compatSection}>
                    <Text style={styles.compatSectionLabel}>⚠ Watch out for</Text>
                    <Text style={styles.compatChallenge}>{personalise(compatibility.challenge, partner?.name)}</Text>
                  </View>

                  <View style={styles.compatSection}>
                    <Text style={styles.compatSectionLabel}>✦ Try this</Text>
                    {compatibility.tips.map((tip, i) => (
                      <View key={i} style={styles.tipRow}>
                        <Text style={styles.tipDot}>·</Text>
                        <Text style={styles.tipText}>{personalise(tip, partner?.name)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : partner ? (
            <View style={styles.partnerPending}>
              <Text style={styles.partnerPendingEmoji}>⏳</Text>
              <Text style={styles.partnerPendingText}>
                Waiting for {partner?.name ?? 'your partner'} to complete the quiz
              </Text>
              <Text style={styles.partnerPendingHint}>When {partner?.name ?? 'your partner'} finishes, your compatibility will appear here.</Text>
            </View>
          ) : null}

          {viewingSaved ? (
            <Text style={styles.savedNote}>Saved from your last quiz. Retake anytime.</Text>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Your full profile</Text>
              <View style={styles.scoreList}>
                {sorted.map(([lang, score]) => {
                  const cfg = LOVE_LANGUAGE_LABELS[lang];
                  const pct = max > 0 ? (score / max) * 100 : 0;
                  return (
                    <View key={lang} style={styles.scoreRow}>
                      <Text style={styles.scoreEmoji}>{cfg.emoji}</Text>
                      <View style={styles.scoreBarWrap}>
                        <Text style={styles.scoreLang}>{cfg.label}</Text>
                        <View style={styles.scoreBarBg}>
                          <View style={[styles.scoreBarFill, { width: `${pct}%` }]} />
                        </View>
                      </View>
                      <Text style={styles.scoreNum}>{score}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <TouchableOpacity style={styles.restartBtn} onPress={restart} accessibilityRole="button">
            <Text style={styles.restartText}>Retake quiz ↻</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <HelpModal
        visible={help.visible}
        title="Love Language Quiz"
        description="10 questions that reveal how you feel most loved, through words, acts, gifts, time, or touch."
        tips={[
          "Choose A or B for each question, go with your gut",
          "Results show your primary love language",
          `Share your result with ${partnerName} so they know how to love you best`,
          "Retake the quiz if your preferences change over time",
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

  quizContent: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: 'center', gap: Spacing.lg },

  progressWrap: { gap: 6 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.burgundy, borderRadius: 3 },
  progressText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, textAlign: 'center' },

  question: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, textAlign: 'center', lineHeight: 30 },

  optionCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  optionText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.text, textAlign: 'center', lineHeight: 24 },

  orWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  or: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted },

  results: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing.xl },
  resultTitle: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  primaryEmoji: { fontSize: 80 },
  primaryLabel: { fontFamily: Fonts.heading, fontSize: 34, color: Colors.burgundy, textAlign: 'center' },
  primaryDesc: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 24 },

  savedNote: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.lg },

  scoreList: { width: '100%', gap: Spacing.md },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  scoreEmoji: { fontSize: 22, width: 32 },
  scoreBarWrap: { flex: 1, gap: 4 },
  scoreLang: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  scoreBarBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', backgroundColor: Colors.burgundy, borderRadius: 4 },
  scoreNum: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text, width: 20, textAlign: 'right' },

  restartBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  restartText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },

  // Result-screen enrichment styles — mirror blueprint.tsx pattern so
  // Love Language reads as sibling feature not lesser cousin.
  heroCard: { width: '100%', alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg, borderRadius: Radius.xl, gap: Spacing.sm },
  heroOrnamentTop: { fontFamily: Fonts.body, fontSize: 18, color: Colors.burgundy, opacity: 0.6 },
  heroEyebrow: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted, letterSpacing: 2, textTransform: 'uppercase' },
  heroEmoji: { fontSize: 64, marginTop: Spacing.xs },
  heroLabel: { fontFamily: Fonts.headingItalic, fontSize: 32, color: Colors.burgundy, textAlign: 'center' },
  heroDivider: { width: 40, height: 1, backgroundColor: Colors.burgundy, opacity: 0.4, marginVertical: 4 },
  heroDesc: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md },

  traitRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  traitCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  traitOn: { backgroundColor: '#F1F8E9' },
  traitOff: { backgroundColor: '#FFF3E0' },
  traitTitle: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  traitText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 18 },

  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted, letterSpacing: 2, textTransform: 'uppercase', alignSelf: 'flex-start', marginTop: Spacing.md },

  partnerCard: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg },
  partnerEmoji: { fontSize: 40 },
  partnerInfo: { flex: 1, gap: 4 },
  partnerLabel: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.burgundy },
  partnerDesc: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.text, lineHeight: 18 },

  compatCard: { width: '100%', backgroundColor: '#FFFFFF', borderLeftWidth: 4, borderRadius: Radius.md, padding: Spacing.lg, gap: Spacing.md },
  compatTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  compatText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 21 },
  compatSection: { gap: 6 },
  compatSectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  compatChallenge: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.text, lineHeight: 20 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipDot: { fontFamily: Fonts.body, fontSize: 14, color: Colors.rose, lineHeight: 20 },
  tipText: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 20 },

  partnerPending: { width: '100%', alignItems: 'center', padding: Spacing.lg, backgroundColor: '#F5F5F5', borderRadius: Radius.lg, gap: 6 },
  partnerPendingEmoji: { fontSize: 28 },
  partnerPendingText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text, textAlign: 'center' },
  partnerPendingHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },
});
