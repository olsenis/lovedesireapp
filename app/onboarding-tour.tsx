import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { setCoupleStartDate, setLongDistance, setNextVisitDate, setPartnerBirthday } from '../services/coupleService';
import { setMood, ALL_MOODS, MOOD_LABELS, MoodEmoji } from '../services/moodService';
import { markOnboardingComplete } from '../services/onboardingService';
import { useSubscription } from '../hooks/useSubscription';
import { BrandDatePicker } from '../components/BrandDatePicker';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

// Birthday is stored as 'DD.MM' (no year) — derive from a Date.
function dateToBirthdayString(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const TOTAL_STEPS = 6;

export default function OnboardingTourScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const { isSubscribed } = useSubscription();
  const uid = user?.uid ?? '';
  const coupleId = profile?.coupleId ?? '';
  const partnerName = partner?.name ?? 'them';

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step inputs — Date objects (timestamps stored to Firestore on save)
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [ldrAnswer, setLdrAnswer] = useState<'yes' | 'no' | null>(null);
  const [nextVisit, setNextVisit] = useState<Date | null>(null);
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [moodPicked, setMoodPicked] = useState<MoodEmoji | null>(null);

  // Mood gating mirrors home screen — adult moods are paid-only
  const ADULT_MOODS: MoodEmoji[] = ['😈', '🥵'];
  const visibleMoods = ALL_MOODS.filter((m) => isSubscribed || !ADULT_MOODS.includes(m));

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    if (step === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s - 1);
  };

  // Step 2: save anniversary
  const handleStartDateContinue = async () => {
    if (!startDate) return;
    setSaving(true);
    try {
      await setCoupleStartDate(coupleId, startDate.getTime());
      goNext();
    } finally { setSaving(false); }
  };

  // Step 3: save LDR + optional next visit
  const handleLdrContinue = async () => {
    if (ldrAnswer === null) return;
    setSaving(true);
    try {
      await setLongDistance(coupleId, ldrAnswer === 'yes');
      if (ldrAnswer === 'yes' && nextVisit) {
        await setNextVisitDate(coupleId, nextVisit.getTime());
      }
      goNext();
    } finally { setSaving(false); }
  };

  // Step 4: save partner birthday on couple doc (both partners are members, so write succeeds).
  // Partner's own UserProfile.birthday still takes precedence in Countdowns if they set it themselves.
  const handleBirthdayContinue = async () => {
    if (!birthday) { goNext(); return; }
    const partnerUid = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
    if (!partnerUid) { goNext(); return; }
    setSaving(true);
    try {
      await setPartnerBirthday(coupleId, partnerUid, dateToBirthdayString(birthday));
      goNext();
    } finally { setSaving(false); }
  };

  // Step 5: save mood pick
  const handleMoodContinue = async () => {
    if (!moodPicked) { goNext(); return; }
    setSaving(true);
    try {
      await setMood(coupleId, uid, moodPicked);
      goNext();
    } finally { setSaving(false); }
  };

  // Step 6: finish
  const handleFinish = async () => {
    setSaving(true);
    try {
      await markOnboardingComplete(uid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch {
      setSaving(false);
    }
  };

  const handleSkipAll = async () => {
    setSaving(true);
    try {
      await markOnboardingComplete(uid);
      router.replace('/(tabs)');
    } catch {
      setSaving(false);
    }
  };

  if (!couple || !user) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={Colors.burgundy} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} disabled={step === 0} style={styles.headerBtn} accessibilityRole="button">
          <Text style={[styles.headerBtnText, step === 0 && { opacity: 0.3 }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>
        <TouchableOpacity onPress={handleSkipAll} style={styles.headerBtn} accessibilityRole="button">
          <Text style={styles.skipAllText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <View style={styles.stepCard}>
            <Text style={styles.heroEmoji}>💞</Text>
            <Text style={styles.title}>You're paired with {partnerName}</Text>
            <Text style={styles.body}>
              A few quick questions to set things up. Takes a minute, then you're in.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={goNext} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>Let's go</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepCard}>
            <Text style={styles.heroEmoji}>📅</Text>
            <Text style={styles.title}>When did your story begin?</Text>
            <Text style={styles.body}>
              Sets your anniversary countdown and the days-together counter on home.
            </Text>
            <BrandDatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Pick the date"
              maximumDate={new Date()}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, (!startDate || saving) && styles.btnDisabled]}
              onPress={handleStartDateContinue}
              disabled={!startDate || saving}
              accessibilityRole="button"
            >
              {saving ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText}>Continue</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={goNext} style={styles.skipLink} accessibilityRole="button">
              <Text style={styles.skipLinkText}>Set later</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepCard}>
            <Text style={styles.heroEmoji}>✈️</Text>
            <Text style={styles.title}>Do you live in different places?</Text>
            <Text style={styles.body}>
              Long-distance mode unlocks features built for couples apart.
            </Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[styles.choiceBtn, ldrAnswer === 'yes' && styles.choiceBtnActive]}
                onPress={() => setLdrAnswer('yes')}
                accessibilityRole="button"
              >
                <Text style={[styles.choiceBtnText, ldrAnswer === 'yes' && styles.choiceBtnTextActive]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceBtn, ldrAnswer === 'no' && styles.choiceBtnActive]}
                onPress={() => setLdrAnswer('no')}
                accessibilityRole="button"
              >
                <Text style={[styles.choiceBtnText, ldrAnswer === 'no' && styles.choiceBtnTextActive]}>No</Text>
              </TouchableOpacity>
            </View>

            {ldrAnswer === 'yes' && (
              <View style={styles.ldrFollowUp}>
                <Text style={styles.bodySmall}>When's your next visit? (optional)</Text>
                <BrandDatePicker
                  value={nextVisit}
                  onChange={setNextVisit}
                  placeholder="Pick the date"
                  minimumDate={new Date()}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, (ldrAnswer === null || saving) && styles.btnDisabled]}
              onPress={handleLdrContinue}
              disabled={ldrAnswer === null || saving}
              accessibilityRole="button"
            >
              {saving ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepCard}>
            <Text style={styles.heroEmoji}>🎂</Text>
            <Text style={styles.title}>When's {partnerName}'s birthday?</Text>
            <Text style={styles.body}>
              Adds an annual countdown so you never forget. Day and month only.
            </Text>
            <BrandDatePicker
              value={birthday}
              onChange={setBirthday}
              placeholder="Pick the day and month"
              hideYear
            />
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              onPress={handleBirthdayContinue}
              disabled={saving}
              accessibilityRole="button"
            >
              {saving ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText}>{birthday ? 'Continue' : 'Skip'}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepCard}>
            <Text style={styles.heroEmoji}>💭</Text>
            <Text style={styles.title}>How are you feeling right now?</Text>
            <Text style={styles.body}>
              {partnerName} will see this on their home. You can change it any time from the home screen.
            </Text>
            <View style={styles.moodGrid}>
              {visibleMoods.map((m) => {
                const active = moodPicked === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.moodCell, active && styles.moodCellActive]}
                    onPress={() => setMoodPicked(m)}
                    accessibilityRole="button"
                    accessibilityLabel={`Feeling ${MOOD_LABELS[m]}`}
                  >
                    <Text style={styles.moodEmoji}>{m}</Text>
                    <Text style={[styles.moodLabel, active && styles.moodLabelActive]} numberOfLines={1}>
                      {MOOD_LABELS[m]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              onPress={handleMoodContinue}
              disabled={saving}
              accessibilityRole="button"
            >
              {saving ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText}>{moodPicked ? 'Continue' : 'Skip'}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {step === 5 && (
          <View style={styles.stepCard}>
            <Text style={styles.heroEmoji}>✨</Text>
            <Text style={styles.title}>4 things to try this week</Text>
            <View style={styles.tourList}>
              <View style={styles.tourItem}>
                <Text style={styles.tourIcon}>📸</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tourTitle}>Capture today's Moment</Text>
                  <Text style={styles.tourBody}>Both of you take a photo, reveal together when ready.</Text>
                </View>
              </View>
              <View style={styles.tourItem}>
                <Text style={styles.tourIcon}>🤔</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tourTitle}>Answer today's Questions</Text>
                  <Text style={styles.tourBody}>3 questions per category each day. Answer privately, reveal together.</Text>
                </View>
              </View>
              <View style={styles.tourItem}>
                <Text style={styles.tourIcon}>💌</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tourTitle}>Write a Love Note</Text>
                  <Text style={styles.tourBody}>Schedule it for tonight, or unlock when {partnerName} feels a mood.</Text>
                </View>
              </View>
              <View style={styles.tourItem}>
                <Text style={styles.tourIcon}>🌅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tourTitle}>Sunday Check-in</Text>
                  <Text style={styles.tourBody}>5 questions every Sunday to keep you close. Mutual reveal.</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              onPress={handleFinish}
              disabled={saving}
              accessibilityRole="button"
            >
              {saving ? <ActivityIndicator color={Colors.cream} /> : <Text style={styles.primaryBtnText}>Got it, take me in</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  headerBtn: { minWidth: 60 },
  headerBtnText: { fontFamily: Fonts.body, fontSize: 28, color: Colors.burgundy, lineHeight: 28 },
  skipAllText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'right' },
  progressBar: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'center' },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  progressDotActive: { backgroundColor: Colors.burgundy },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },

  stepCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing.xl, gap: Spacing.md, marginTop: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },

  heroEmoji: { fontSize: 56, textAlign: 'center' },
  title: { fontFamily: Fonts.headingItalic, fontSize: 28, color: Colors.burgundy, textAlign: 'center', lineHeight: 34 },
  body: { fontFamily: Fonts.body, fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  bodySmall: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  input: {
    backgroundColor: Colors.cream, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },
  errorText: { fontFamily: Fonts.body, fontSize: 12, color: '#C62828', textAlign: 'center' },

  primaryBtn: {
    backgroundColor: Colors.burgundy, paddingVertical: Spacing.md,
    borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.sm,
  },
  primaryBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  btnDisabled: { opacity: 0.4 },

  skipLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  skipLinkText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  choiceRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  choiceBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg,
    backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  choiceBtnActive: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  choiceBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.text },
  choiceBtnTextActive: { color: Colors.cream },

  ldrFollowUp: { gap: 8, marginTop: Spacing.sm },

  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  moodCell: {
    width: '30%', alignItems: 'center', gap: 4,
    paddingVertical: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: Colors.cream, borderWidth: 1, borderColor: Colors.border,
  },
  moodCellActive: { backgroundColor: Colors.blush, borderColor: Colors.rose },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },
  moodLabelActive: { fontFamily: Fonts.bodyBold, color: Colors.burgundy },

  tourList: { gap: Spacing.md, marginTop: Spacing.sm },
  tourItem: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  tourIcon: { fontSize: 28 },
  tourTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  tourBody: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 19, marginTop: 2 },
});
