import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useSubscription } from '../hooks/useSubscription';
import {
  IntimacyEntry, IntimacyLocation, IntimacyType, IntimacyMood,
  subscribeIntimacyLog, addIntimacyEntry, deleteIntimacyEntry, getIntimacyStats,
  LOCATION_LABELS as LOC_LABELS,
  generateMonthlyNarrative, computeMonthlyDelta, previousMonthDate,
} from '../services/intimacyService';
import { notifyPartner } from '../services/notificationService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';
import { ConfirmModal } from '../components/ConfirmModal';
import { BrandDatePicker } from '../components/BrandDatePicker';

// ── Constants ─────────────────────────────────────────────────────────────────

const LOCATIONS = (Object.entries(LOC_LABELS) as [IntimacyLocation, { emoji: string; label: string }][]).map(
  ([key, { emoji, label }]) => ({ key, emoji, label })
);

const TYPES: { key: IntimacyType; label: string }[] = [
  { key: 'intercourse',   label: 'Intercourse' },
  { key: 'oral',          label: 'Oral' },
  { key: 'hands',         label: 'Hands' },
  { key: 'toys',          label: 'Toys' },
  { key: 'foreplay_only', label: 'Foreplay only' },
  { key: 'other',         label: 'Other' },
];

const POSITIONS = ['Missionary', 'Doggy style', 'Cowgirl', 'Reverse cowgirl', 'Spooning', 'Standing', 'Other'];

const MOODS: { key: IntimacyMood; emoji: string; label: string }[] = [
  { key: 'amazing',      emoji: '💕', label: 'Connected' },
  { key: 'good',         emoji: '😊', label: 'Playful' },
  { key: 'okay',         emoji: '😌', label: 'Relaxed' },
  { key: 'disconnected', emoji: '💔', label: 'Disconnected' },
];

const STAR_LABELS: Record<number, string> = {
  1: 'Could have been better', 2: 'It was okay', 3: 'Pretty good', 4: 'Really good', 5: 'Incredible',
};
const TYPE_LABELS: Record<IntimacyType, string> = {
  intercourse: 'Intercourse', oral: 'Oral', hands: 'Hands',
  toys: 'Toys', foreplay_only: 'Foreplay', other: 'Other',
};
const MOOD_EMOJI: Record<IntimacyMood, string> = {
  amazing: '🔥', good: '😊', okay: '😌', disconnected: '💔',
};

function todayStart(): number {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
}

// Prefill presets — cross-flow contexts that hand off to the log composer
// via `?prefill=<source>`. Each preset supplies the minimum required
// fields (initiatedBy, types, mood) so the composer's Save button is
// enabled on open; user is expected to review and adjust. `location` is
// deliberately NOT prefilled — that varies too much to guess.
type PrefillPreset = {
  initiatedBy: 'me' | 'partner' | 'both';
  types: IntimacyType[];
  mood: IntimacyMood;
};
const PREFILL_PRESETS: Record<string, PrefillPreset> = {
  // Sensate cycle just completed — connected mood, foreplay-only default
  // (Sensate practice explicitly excludes intercourse; user can add if the
  // session progressed beyond the guided cycle).
  'sensate':     { initiatedBy: 'both', types: ['foreplay_only'], mood: 'amazing' },
  // Daily Spicy Picks mutual-yes — playful mood, types left blank because
  // "we both want to try this" is intent, not necessarily what happened.
  // The picked action text arrives via a separate `note` query param so
  // the composer opens with the specific pick visible in the Note field.
  'daily-spicy': { initiatedBy: 'both', types: [],                mood: 'good'    },
  // 'fantasy' preset removed Aug 2026 (H26 delta 2) — the FW cross-flow
  // toast was misreading FW matches (aspirational, not immediate) and
  // was removed. +Add to Together List button on match cards is the
  // correct hand-off. No reachable route hits this preset anymore.
};

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
     accessibilityRole="button">
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function IntimacyTrackerScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const { isSubscribed, isLoading: subLoading } = useSubscription();
  useTrackScreen('intimacy_log');
  // Screen-level paywall gate — Us tab card is gated but future entry
  // points (nudges, deep links) could bypass without this guard.
  useEffect(() => {
    if (!subLoading && !isSubscribed) {
      trackEvent('upgrade_cta_tapped');
      router.replace('/upgrade' as any);
    }
  }, [subLoading, isSubscribed]);
  const [entries, setEntries] = useState<IntimacyEntry[]>([]);
  // Deep-link support:
  //   ?tab=stats           opens straight into the Stats tab (used by Home's
  //                        Monthly Narrative nudge)
  //   ?prefill=sensate|daily-spicy
  //                        auto-opens the composer with context-appropriate
  //                        defaults. Used by H7 Phase 2 cross-flow toasts.
  //                        Unknown prefill values fall through — the tab
  //                        opens normally and no composer fires.
  //   ?note=<text>         optional companion to prefill — passes an
  //                        instance-specific note (e.g. the Daily Spicy
  //                        pick text) into the composer's Note field so
  //                        the user knows which moment they're logging.
  //                        Clamped to 200 chars (Note field max). Only
  //                        applied when prefill is also present.
  const params = useLocalSearchParams<{ tab?: string; prefill?: string; note?: string }>();
  const noteParam = typeof params.note === 'string' ? params.note.slice(0, 200) : '';
  const [tab, setTab] = useState<'log' | 'stats'>(params.tab === 'stats' ? 'stats' : 'log');
  const [showSheet, setShowSheet] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<IntimacyEntry | null>(null);

  // Auto-open composer once per navigation when a valid prefill lands. Use
  // a ref keyed on the param value so re-renders (Firestore snapshots,
  // etc.) don't reopen the sheet after the user closes it.
  const prefillHandledRef = useRef<string | null>(null);
  const prefillPreset = params.prefill && PREFILL_PRESETS[params.prefill] ? PREFILL_PRESETS[params.prefill] : null;
  useEffect(() => {
    const key = params.prefill ?? null;
    if (!key || !prefillPreset) return;
    if (prefillHandledRef.current === key) return;
    prefillHandledRef.current = key;
    setShowSheet(true);
  }, [params.prefill, prefillPreset]);

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerName = partner?.name ?? 'Partner';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeIntimacyLog(coupleId, setEntries);
  }, [coupleId]);

  const today = todayStart();
  const loggedToday = entries.some(e => e.createdAt >= today);
  const recent = entries.slice(0, 5);
  const stats = getIntimacyStats(entries, uid);

  const [deleteConfirm, setDeleteConfirm] = useState<IntimacyEntry | null>(null);
  const handleDelete = (entry: IntimacyEntry) => setDeleteConfirm(entry);
  const confirmDelete = async () => {
    if (!coupleId || !deleteConfirm) return;
    await deleteIntimacyEntry(coupleId, deleteConfirm.id);
    setDeleteConfirm(null);
  };

  // Don't render the log while paywall check resolves or during redirect.
  if (subLoading || !isSubscribed) return null;

  return (
    <>
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Intimacy Log</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['log', 'stats'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
           accessibilityRole="button">
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'log' ? 'Log' : 'Stats'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'log' ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero button */}
          <View style={styles.heroWrap}>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setShowSheet(true); }}
              activeOpacity={0.85}
             accessibilityRole="button">
              <Text style={styles.heroBtnText}>We were{'\n'}intimate</Text>
              <Text style={styles.heroBtnDate}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </TouchableOpacity>
            {loggedToday && (
              <View style={styles.loggedPill}>
                <Text style={styles.loggedPillText}>✓ Logged today</Text>
              </View>
            )}
          </View>

          {/* Recent entries */}
          {recent.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Recent</Text>
              {recent.map(entry => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.entryRow}
                  onPress={() => setSelectedEntry(entry)}
                  onLongPress={() => handleDelete(entry)}
                  activeOpacity={0.85}
                 accessibilityRole="button">
                  <Text style={styles.entryDate}>{fmtDate(entry.createdAt)}</Text>
                  <View style={styles.entryTypes}>
                    {entry.types.slice(0, 3).map(t => (
                      <View key={t} style={styles.entryTypePill}>
                        <Text style={styles.entryTypePillText}>
                          {t === 'other' && entry.otherLabel ? entry.otherLabel : TYPE_LABELS[t]}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.entryMood}>{MOOD_EMOJI[entry.mood]}</Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.longPressHint}>Hold to delete an entry</Text>
            </View>
          )}

          <Text style={styles.privacy}>🔒 Private, only visible to you and {partnerName}</Text>
        </ScrollView>
      ) : (
        <StatsView stats={stats} entries={entries} partnerName={partnerName} />
      )}

      {/* Entry detail view */}
      <Modal visible={!!selectedEntry} transparent animationType="slide" onRequestClose={() => setSelectedEntry(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity style={styles.sheetClose} onPress={() => setSelectedEntry(null)} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.sheetCloseText}>✕</Text>
            </TouchableOpacity>
            {selectedEntry && (
              <ScrollView contentContainerStyle={styles.sheetContent}>
                <Text style={styles.sheetTitle}>{fmtDate(selectedEntry.createdAt)}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mood</Text>
                  <Text style={styles.detailValue}>{MOOD_EMOJI[selectedEntry.mood]} {MOODS.find(m => m.key === selectedEntry.mood)?.label}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Who started it</Text>
                  <Text style={styles.detailValue}>{selectedEntry.initiatedBy === 'me' ? 'You' : selectedEntry.initiatedBy === 'partner' ? partnerName : 'Both of you'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Where</Text>
                  <Text style={styles.detailValue}>
                    {LOC_LABELS[selectedEntry.location].emoji}{' '}
                    {selectedEntry.location === 'other' && selectedEntry.otherLocationLabel
                      ? selectedEntry.otherLocationLabel
                      : LOC_LABELS[selectedEntry.location].label}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>What</Text>
                  <View style={styles.chipRow}>
                    {selectedEntry.types.map(t => (
                      <View key={t} style={styles.chipSelected}>
                        <Text style={styles.chipTextSelected}>
                          {t === 'other' && selectedEntry.otherLabel ? selectedEntry.otherLabel : TYPE_LABELS[t]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                {selectedEntry.positions.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Positions</Text>
                    <View style={styles.chipRow}>
                      {selectedEntry.positions.map(p => (
                        <View key={p} style={styles.chipSelected}>
                          <Text style={styles.chipTextSelected}>
                            {p === 'Other' && selectedEntry.otherPositionLabel ? selectedEntry.otherPositionLabel : p}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {selectedEntry.duration !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{selectedEntry.duration} minutes</Text>
                  </View>
                )}
                {selectedEntry.note && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Note</Text>
                    <Text style={styles.detailValue}>{selectedEntry.note}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: Colors.error, marginTop: Spacing.md }]}
                  onPress={() => { setSelectedEntry(null); handleDelete(selectedEntry); }}
                  activeOpacity={0.85}
                 accessibilityRole="button" accessibilityHint="Cannot be undone">
                  <Text style={styles.saveBtnText}>Delete entry</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Detail sheet */}
      <DetailSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        partnerName={partnerName}
        prefill={prefillPreset}
        initialNote={prefillPreset ? noteParam : ''}
        onSave={async (data, when) => {
          if (!coupleId) throw new Error('No coupleId');
          // Clamp to now-or-earlier — future dates would be weird and
          // would break stats math that assumes createdAt <= now.
          const createdAt = Math.min(when, Date.now());
          await addIntimacyEntry(coupleId, uid, data, createdAt);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          notifyPartner(coupleId, uid, 'Intimacy Log 💝', `${profile?.name ?? 'Your partner'} logged an intimate moment`).catch(() => {});
          setShowSheet(false);
        }}
      />
    </KeyboardAvoidingView>

    <ConfirmModal
      visible={!!deleteConfirm}
      title="Delete entry?"
      message="This cannot be undone."
      confirmLabel="Delete"
      destructive
      onConfirm={confirmDelete}
      onCancel={() => setDeleteConfirm(null)}
    />
    </>
  );
}

// ── Stats view ────────────────────────────────────────────────────────────────
function StatsView({ stats, entries, partnerName }: { stats: ReturnType<typeof getIntimacyStats>; entries: IntimacyEntry[]; partnerName: string }) {
  if (entries.length < 3) {
    return (
      <View style={styles.emptyStats}>
        <Text style={styles.emptyEmoji}>🔥</Text>
        <Text style={styles.emptyText}>Start logging to see your stats</Text>
        <Text style={styles.privacy}>🔒 Private, only visible to you and {partnerName}</Text>
      </View>
    );
  }

  // Past-month narrative — only shows when previous month had ≥3 entries.
  // Story framing (completed arc) beats live current-month gamification.
  const prevMonth = previousMonthDate();
  const narrative = generateMonthlyNarrative(entries, prevMonth);
  const delta = narrative ? computeMonthlyDelta(entries, prevMonth) : null;

  const thisMonth = entries.filter(e => {
    const d = new Date(e.createdAt);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  const total = stats.initiatedByMe + stats.initiatedByPartner + stats.initiatedByBoth;
  const meW = total > 0 ? (stats.initiatedByMe / total) * 100 : 33;
  const bothW = total > 0 ? (stats.initiatedByBoth / total) * 100 : 34;
  const maxMonthCount = Math.max(...stats.byMonth.map(m => m.count), 1);

  return (
    <ScrollView contentContainerStyle={styles.statsContent}>
      {/* Monthly narrative (past month, ≥3 entries only) */}
      {narrative && (
        <View style={styles.narrativeCard}>
          <View style={styles.narrativeHeader}>
            <Text style={styles.narrativeEyebrow}>
              {narrative.monthLabel.toUpperCase()} · {narrative.entryCount} {narrative.entryCount === 1 ? 'MOMENT' : 'MOMENTS'}
            </Text>
            {delta && (
              <View style={styles.narrativeDeltaPill}>
                <Text style={[
                  styles.narrativeDeltaText,
                  delta.direction === 'up' && { color: Colors.success },
                  delta.direction === 'down' && { color: Colors.error },
                  delta.direction === 'flat' && { color: Colors.muted },
                ]}>
                  {delta.direction === 'up' ? '↑ ' : delta.direction === 'down' ? '↓ ' : ''}{delta.text}
                </Text>
              </View>
            )}
          </View>
          {narrative.paragraphs.map((p, i) => (
            <Text key={i} style={styles.narrativeParagraph}>{p}</Text>
          ))}
          {narrative.reflectionPrompt && (
            <Text style={styles.narrativeReflect}>{narrative.reflectionPrompt}</Text>
          )}
        </View>
      )}

      {/* This month */}
      <View style={styles.statHero}>
        <Text style={styles.statHeroNum}>{thisMonth}</Text>
        <Text style={styles.statHeroLabel}>times this month</Text>
      </View>

      {/* Last time + avg */}
      <View style={styles.statRow}>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statCardNum}>
            {stats.daysSinceLast === 0 ? 'Today!' : stats.daysSinceLast === 1 ? 'Yesterday' : `${stats.daysSinceLast ?? '?'} days`}
          </Text>
          <Text style={styles.statCardLabel}>since last time</Text>
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statCardNum}>{stats.avgPerMonth}</Text>
          <Text style={styles.statCardLabel}>avg per month</Text>
        </View>
      </View>

      {/* Who initiates */}
      <View style={styles.statCard}>
        <Text style={styles.statCardLabel}>Who initiates</Text>
        <View style={styles.initiateBar}>
          <View style={[styles.initiateSegMe, { flex: meW }]} />
          <View style={[styles.initiateSegBoth, { flex: bothW }]} />
          <View style={[styles.initiateSegPartner, { flex: Math.max(100 - meW - bothW, 0) }]} />
        </View>
        <View style={styles.initiateLegend}>
          <Text style={styles.legendText}>🙋 You {Math.round(meW)}%</Text>
          <Text style={styles.legendText}>🤝 Both {Math.round(bothW)}%</Text>
          <Text style={styles.legendText}>💑 {partnerName} {Math.round(100 - meW - bothW)}%</Text>
        </View>
      </View>

      {/* Mood breakdown */}
      <Text style={styles.sectionLabel}>Mood</Text>
      <View style={styles.moodGrid}>
        {MOODS.map(m => (
          <View key={m.key} style={styles.moodCard}>
            <Text style={styles.moodCardEmoji}>{m.emoji}</Text>
            <Text style={styles.moodCardCount}>{stats.moodBreakdown[m.key]}</Text>
            <Text style={styles.moodCardLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Bar chart — last 6 months */}
      <Text style={styles.sectionLabel}>Last 6 months</Text>
      <View style={styles.barChart}>
        {stats.byMonth.map(({ month, count }) => (
          <View key={month} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${(count / maxMonthCount) * 100}%` }]} />
            </View>
            <Text style={styles.barLabel}>{month}</Text>
            <Text style={styles.barCount}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Orgasm rates */}
      <Text style={styles.sectionLabel}>Orgasms</Text>
      <View style={styles.statRow}>
        <View style={[styles.statCard, { flex: 1, backgroundColor: Colors.blush }]}>
          <Text style={styles.statCardNum}>{stats.orgasmStats.myRate}%</Text>
          <Text style={styles.statCardLabel}>My orgasm rate</Text>
        </View>
        <View style={[styles.statCard, { flex: 1, backgroundColor: Colors.blush }]}>
          <Text style={styles.statCardNum}>{stats.orgasmStats.partnerRate}%</Text>
          <Text style={styles.statCardLabel}>Partner's rate</Text>
        </View>
      </View>

      {/* Average rating */}
      {stats.avgRating !== null && (
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>Average rating</Text>
          <View style={styles.starsRow}>
            {[1,2,3,4,5].map(s => (
              <Text key={s} style={[styles.star, { fontSize: 24 }]}>{s <= Math.round(stats.avgRating!) ? '★' : '☆'}</Text>
            ))}
          </View>
          <Text style={styles.statCardNum}>{stats.avgRating} / 5</Text>
        </View>
      )}

      {/* Common */}
      <View style={styles.statRow}>
        {stats.mostCommonLocation && (
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statCardNum}>{LOC_LABELS[stats.mostCommonLocation].emoji}</Text>
            <Text style={styles.statCardLabel}>Favorite spot</Text>
            <Text style={styles.statCardSub}>{LOC_LABELS[stats.mostCommonLocation].label}</Text>
          </View>
        )}
        {stats.mostCommonType && (
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statCardLabel}>Most common</Text>
            <Text style={styles.statCardSub}>{TYPE_LABELS[stats.mostCommonType]}</Text>
          </View>
        )}
      </View>

      <Text style={styles.privacy}>🔒 Private, only visible to you and {partnerName}</Text>
    </ScrollView>
  );
}

// ── Detail sheet ──────────────────────────────────────────────────────────────
function DetailSheet({
  visible, onClose, onSave, partnerName, prefill, initialNote,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Omit<IntimacyEntry, 'id' | 'createdAt' | 'loggedBy'>, when: number) => Promise<void>;
  partnerName: string;
  // Optional cross-flow prefill (H7 Phase 2). Populates initiatedBy /
  // types / mood on open so the composer opens ready-to-save, but user
  // can override any field before Save. `location` is still required
  // manually — too context-dependent to guess.
  prefill?: PrefillPreset | null;
  // Optional per-instance note text (H26 delta 2). Used by the Daily
  // Spicy match hand-off to surface the picked action text in the Note
  // field so user knows which moment they're logging. User can edit or
  // clear before Save.
  initialNote?: string;
}) {
  const [initiatedBy, setInitiatedBy] = useState<'me' | 'partner' | 'both' | null>(null);
  const [location, setLocation] = useState<IntimacyLocation | null>(null);
  const [types, setTypes] = useState<IntimacyType[]>([]);
  // Free-text label surfaced when 'other' is selected in the type chips.
  // Persists to IntimacyEntry.otherLabel so entry display can show a
  // specific description instead of just "Other".
  const [otherLabel, setOtherLabel] = useState('');
  // Same "describe your other" pattern for Where? (location === 'other')
  // and Positions? ('Other' included in positions array).
  const [otherLocationLabel, setOtherLocationLabel] = useState('');
  const [otherPositionLabel, setOtherPositionLabel] = useState('');
  const [duration, setDuration] = useState('');
  const [positions, setPositions] = useState<string[]>([]);
  const [mood, setMood] = useState<IntimacyMood | null>(null);
  const [note, setNote] = useState('');

  // Seed prefill fields when sheet opens (visible transitions false→true).
  // Runs on every open so /intimacy-tracker?prefill=X still applies after
  // save+navigate. User can still override any field before Save.
  const prevVisibleRef = useRef(false);
  useEffect(() => {
    if (visible && !prevVisibleRef.current && prefill) {
      setInitiatedBy(prefill.initiatedBy);
      setTypes(prefill.types);
      setMood(prefill.mood);
      if (initialNote) setNote(initialNote);
    }
    prevVisibleRef.current = visible;
  }, [visible, prefill, initialNote]);
  const [rating, setRating] = useState<number>(0);
  const [myOrgasm, setMyOrgasm] = useState<'yes' | 'no' | null>(null);
  const [myOrgasmCount, setMyOrgasmCount] = useState(1);
  const [partnerOrgasm, setPartnerOrgasm] = useState<'yes' | 'no' | null>(null);
  const [partnerOrgasmCount, setPartnerOrgasmCount] = useState(1);
  // Default to today. User can back-date via the picker at the top of the
  // sheet — common when they log this morning what happened last night.
  // Never allow future dates (maximumDate below caps at today).
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setInitiatedBy(null); setLocation(null); setTypes([]); setOtherLabel(''); setDuration('');
    setPositions([]); setOtherPositionLabel(''); setOtherLocationLabel('');
    setMood(null); setNote(''); setRating(0);
    setMyOrgasm(null); setMyOrgasmCount(1); setPartnerOrgasm(null); setPartnerOrgasmCount(1);
    setEntryDate(new Date());
    setSaving(false);
  };

  const canSave = initiatedBy !== null && location !== null && types.length > 0 && mood !== null;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      // Firestore rejects undefined values — spread optional fields conditionally
      await onSave({
        initiatedBy: initiatedBy!,
        location: location!,
        types,
        positions,
        mood: mood!,
        ...(duration ? { duration: parseInt(duration) } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(rating > 0 ? { rating: rating as 1 | 2 | 3 | 4 | 5 } : {}),
        ...(types.includes('other') && otherLabel.trim() ? { otherLabel: otherLabel.trim() } : {}),
        ...(location === 'other' && otherLocationLabel.trim() ? { otherLocationLabel: otherLocationLabel.trim() } : {}),
        ...(positions.includes('Other') && otherPositionLabel.trim() ? { otherPositionLabel: otherPositionLabel.trim() } : {}),
        ...((myOrgasm !== null || partnerOrgasm !== null) ? {
          orgasm: {
            me:      { had: myOrgasm      === 'yes', count: myOrgasm      === 'yes' ? myOrgasmCount      : 0 },
            partner: { had: partnerOrgasm === 'yes', count: partnerOrgasm === 'yes' ? partnerOrgasmCount : 0 },
          },
        } : {}),
      }, entryDate.getTime());
      reset();
    } catch (e: any) {
      console.error('Save failed:', e);
      setSaving(false);
      Alert.alert('Could not save', e?.message ?? 'Something went wrong. Are you connected to the internet?');
    }
  };

  const toggleType = (t: IntimacyType) =>
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const togglePosition = (p: string) =>
    setPositions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={styles.sheet}>
          {/* Handle + close */}
          <View style={styles.sheetHandle} />
          <TouchableOpacity style={styles.sheetClose} onPress={() => { reset(); onClose(); }} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.sheetCloseText}>✕</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetTitle}>Log an intimate moment</Text>

            {/* When — defaults to today, backdate for last-night logging */}
            <Text style={styles.sheetSection}>When?</Text>
            <BrandDatePicker
              value={entryDate}
              onChange={setEntryDate}
              maximumDate={new Date()}
              placeholder="Pick a date"
            />

            {/* Star rating */}
            <Text style={styles.sheetSection}>Overall rating <Text style={styles.optional}>optional</Text></Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(rating === s ? 0 : s)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Rate ${s} star${s === 1 ? '' : 's'}`}>
                  <Text style={styles.star}>{s <= rating ? '★' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && <Text style={styles.starLabel}>{STAR_LABELS[rating]}</Text>}

            {/* Who started it */}
            <Text style={styles.sheetSection}>Who started it?</Text>
            <View style={styles.chipRow}>
              {(['me', 'partner', 'both'] as const).map(v => (
                <Chip
                  key={v}
                  label={v === 'me' ? 'I did' : v === 'partner' ? `${partnerName} did` : 'Both of us'}
                  selected={initiatedBy === v}
                  onPress={() => setInitiatedBy(v)}
                />
              ))}
            </View>

            {/* Where */}
            <Text style={styles.sheetSection}>Where?</Text>
            <View style={styles.locationGrid}>
              {LOCATIONS.map(l => (
                <TouchableOpacity
                  key={l.key}
                  style={[styles.locationBtn, location === l.key && styles.locationBtnSelected]}
                  onPress={() => setLocation(l.key)}
                  activeOpacity={0.8}
                 accessibilityRole="button">
                  <Text style={styles.locationEmoji}>{l.emoji}</Text>
                  <Text style={[styles.locationLabel, location === l.key && styles.locationLabelSelected]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {location === 'other' && (
              <TextInput
                style={styles.otherInput}
                value={otherLocationLabel}
                onChangeText={setOtherLocationLabel}
                placeholder="Optional, describe the location..."
                placeholderTextColor={Colors.muted}
                maxLength={60}
                returnKeyType="done"
              />
            )}

            {/* What */}
            <Text style={styles.sheetSection}>What?</Text>
            <View style={styles.chipRow}>
              {TYPES.map(t => (
                <Chip key={t.key} label={t.label} selected={types.includes(t.key)} onPress={() => toggleType(t.key)} />
              ))}
            </View>

            {/* Free-text label surfaces when 'other' is selected so the
                entry captures what "other" specifically was. Empty is fine
                — the entry still saves, just displays "Other" plainly. */}
            {types.includes('other') && (
              <TextInput
                style={styles.otherInput}
                value={otherLabel}
                onChangeText={setOtherLabel}
                placeholder="Optional, describe what other was..."
                placeholderTextColor={Colors.muted}
                maxLength={60}
                returnKeyType="done"
              />
            )}

            {/* How long — optional */}
            <Text style={styles.sheetSection}>How long? <Text style={styles.optional}>optional</Text></Text>
            <View style={styles.durationRow}>
              <TextInput
                style={styles.durationInput}
                value={duration}
                onChangeText={t => setDuration(t.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor={Colors.muted}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={styles.durationUnit}>minutes</Text>
            </View>

            {/* Positions — optional */}
            <Text style={styles.sheetSection}>Positions? <Text style={styles.optional}>optional</Text></Text>
            <View style={styles.chipRow}>
              {POSITIONS.map(p => (
                <Chip key={p} label={p} selected={positions.includes(p)} onPress={() => togglePosition(p)} />
              ))}
            </View>

            {positions.includes('Other') && (
              <TextInput
                style={styles.otherInput}
                value={otherPositionLabel}
                onChangeText={setOtherPositionLabel}
                placeholder="Optional, describe the position..."
                placeholderTextColor={Colors.muted}
                maxLength={60}
                returnKeyType="done"
              />
            )}

            {/* Mood */}
            <Text style={styles.sheetSection}>Connection?</Text>
            <View style={styles.moodRow}>
              {MOODS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.moodBtn, mood === m.key && styles.moodBtnSelected]}
                  onPress={() => setMood(m.key)}
                  activeOpacity={0.8}
                 accessibilityRole="button">
                  <Text style={styles.moodBtnEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodBtnLabel, mood === m.key && styles.moodBtnLabelSelected]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Orgasm — optional */}
            <Text style={styles.sheetSection}>Orgasms <Text style={styles.optional}>optional</Text></Text>
            {[
              { label: 'Me', had: myOrgasm, setHad: setMyOrgasm, count: myOrgasmCount, setCount: setMyOrgasmCount },
              { label: partnerName, had: partnerOrgasm, setHad: setPartnerOrgasm, count: partnerOrgasmCount, setCount: setPartnerOrgasmCount },
            ].map(row => (
              <View key={row.label} style={styles.orgasmRow}>
                <Text style={styles.orgasmLabel}>{row.label}</Text>
                <View style={styles.chipRow}>
                  <Chip label="Yes" selected={row.had === 'yes'} onPress={() => row.setHad(row.had === 'yes' ? null : 'yes')} />
                  <Chip label="No" selected={row.had === 'no'} onPress={() => row.setHad(row.had === 'no' ? null : 'no')} />
                </View>
                {row.had === 'yes' && (
                  <View style={styles.countRow}>
                    <TouchableOpacity onPress={() => row.setCount(Math.max(1, row.count - 1))} style={styles.countBtn} accessibilityRole="button" accessibilityLabel="Decrease">
                      <Text style={styles.countBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.countNum}>{row.count}</Text>
                    <TouchableOpacity onPress={() => row.setCount(Math.min(9, row.count + 1))} style={styles.countBtn} accessibilityRole="button" accessibilityLabel="Increase">
                      <Text style={styles.countBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {/* One thing memorable — optional reflection field. Copy tuned
                Aug 2026 (H7 reframe) — was "Note / Add a note..." which
                read as data-entry. Reflection framing surfaces the field's
                real value (a one-liner future-you can read back). */}
            <Text style={styles.sheetSection}>One thing memorable about this? <Text style={styles.optional}>optional</Text></Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={t => setNote(t.slice(0, 200))}
              placeholder="A word or a sentence."
              placeholderTextColor={Colors.muted}
              multiline
              maxLength={200}
            />
            {note.length > 0 && <Text style={styles.charCount}>{note.length}/200</Text>}

            {/* Missing fields hint */}
            {!canSave && (
              <Text style={styles.missingHint}>
                Still needed:{' '}
                {[
                  !initiatedBy && 'who started it',
                  !location && 'where',
                  types.length === 0 && 'what',
                  !mood && 'connection',
                ].filter(Boolean).join(', ')}
              </Text>
            )}

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, (!canSave || saving) && { opacity: 0.4 }]}
              onPress={handleSave}
              disabled={!canSave || saving}
              activeOpacity={0.85}
             accessibilityRole="button">
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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

  tabBar: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginVertical: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.burgundy },
  tabText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  tabTextActive: { color: Colors.white },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.lg, alignItems: 'center' },

  heroWrap: { alignItems: 'center', gap: Spacing.md },
  heroBtn: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: Colors.burgundy, alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, ...Shadow.md,
  },
  heroBtnText: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.white, textAlign: 'center', lineHeight: 26 },
  heroBtnDate: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  loggedPill: { backgroundColor: '#E8F5E9', borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: Spacing.md },
  loggedPillText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.success },

  section: { width: '100%', gap: Spacing.sm },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },

  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  entryDate: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text, width: 56 },
  entryTypes: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  entryTypePill: { backgroundColor: Colors.blush, borderRadius: Radius.full, paddingVertical: 2, paddingHorizontal: 8 },
  entryTypePillText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.burgundy },
  entryMood: { fontSize: 20 },
  longPressHint: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted, textAlign: 'center' },

  privacy: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted, textAlign: 'center' },

  // Stats
  statsContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.md },
  emptyStats: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 16, color: Colors.muted, textAlign: 'center' },

  // Past-month narrative card (Aug 2026, #7 Phase 1). Sits at top of the
  // Stats scroll when prior month had ≥3 entries. Warm blush background,
  // rose left-border stripe reads as "reflection surface" and separates
  // from the burgundy analytics hero below.
  narrativeCard: {
    backgroundColor: '#FFF5F8',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.rose,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  narrativeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: Spacing.sm, flexWrap: 'wrap',
  },
  narrativeEyebrow: {
    fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted,
    letterSpacing: 0.8, flex: 1,
  },
  narrativeDeltaPill: {
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  narrativeDeltaText: { fontFamily: Fonts.bodyBold, fontSize: 12 },
  narrativeParagraph: {
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22,
  },
  narrativeReflect: {
    fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.burgundy,
    marginTop: Spacing.xs, lineHeight: 20,
  },

  statHero: { backgroundColor: Colors.burgundy, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: 4 },
  statHeroNum: { fontFamily: Fonts.heading, fontSize: 56, color: Colors.white, lineHeight: 60 },
  statHeroLabel: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: 'rgba(255,255,255,0.7)' },

  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, gap: 4, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  statCardNum: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  statCardLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  statCardSub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text },

  initiateBar: { flexDirection: 'row', height: 12, borderRadius: Radius.full, overflow: 'hidden', marginVertical: Spacing.sm },
  initiateSegMe: { backgroundColor: Colors.burgundy },
  initiateSegBoth: { backgroundColor: Colors.rose },
  initiateSegPartner: { backgroundColor: Colors.blush },
  initiateLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  moodGrid: { flexDirection: 'row', gap: Spacing.sm },
  moodCard: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  moodCardEmoji: { fontSize: 24 },
  moodCardCount: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  moodCardLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },

  barChart: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end', height: 100 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', backgroundColor: Colors.blush, borderRadius: Radius.sm, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { backgroundColor: Colors.burgundy, borderRadius: Radius.sm, width: '100%' },
  barLabel: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },
  barCount: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.text },

  // Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '92%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: Radius.full, alignSelf: 'center', marginTop: Spacing.sm },
  sheetClose: { position: 'absolute', top: Spacing.md, right: Spacing.lg, zIndex: 10, padding: Spacing.sm },
  sheetCloseText: { fontFamily: Fonts.body, fontSize: 18, color: Colors.muted },
  sheetContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.sm, gap: Spacing.md },
  sheetTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy, marginBottom: Spacing.sm },
  sheetSection: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  optional: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted, textTransform: 'none', letterSpacing: 0 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipSelected: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  chipText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  chipTextSelected: { color: Colors.white },

  locationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  locationBtn: { width: '30%', padding: Spacing.sm, borderRadius: Radius.lg, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 4 },
  locationBtnSelected: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  locationEmoji: { fontSize: 22 },
  locationLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  locationLabelSelected: { color: Colors.white },

  durationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  durationInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.heading, fontSize: 24, color: Colors.text, borderWidth: 1, borderColor: Colors.border, width: 80, textAlign: 'center' },
  durationUnit: { fontFamily: Fonts.body, fontSize: 15, color: Colors.muted },

  moodRow: { flexDirection: 'row', gap: Spacing.sm },
  moodBtn: { flex: 1, padding: Spacing.sm, borderRadius: Radius.lg, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 4 },
  moodBtnSelected: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  moodBtnEmoji: { fontSize: 22 },
  moodBtnLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  moodBtnLabelSelected: { color: Colors.white },

  noteInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border, minHeight: 72 },
  // Free-text field surfaced when the "Other" type chip is selected —
  // captures what "other" specifically was so entries display something
  // more specific than the generic "Other" label.
  otherInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginTop: -Spacing.xs },
  charCount: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, textAlign: 'right' },
  missingHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.error, textAlign: 'center' },

  saveBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },

  detailRow: { gap: Spacing.xs },
  detailLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  detailValue: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text },

  starsRow: { flexDirection: 'row', gap: 8, paddingVertical: Spacing.xs },
  star: { fontSize: 36, color: Colors.burgundy },
  starLabel: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  orgasmRow: { gap: Spacing.xs, paddingVertical: Spacing.xs },
  orgasmLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  countBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.blush, alignItems: 'center', justifyContent: 'center' },
  countBtnText: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy, lineHeight: 26 },
  countNum: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy, minWidth: 24, textAlign: 'center' },
});
