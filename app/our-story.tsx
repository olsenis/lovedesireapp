import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import {
  Milestone,
  MILESTONE_PRESETS,
  MilestoneKind,
  subscribeMilestones,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  ensureAutoMilestone,
} from '../services/milestoneService';
import { subscribeSensateProgress, SensateProgress } from '../services/sensateService';
import { subscribeMoments, MomentEntry } from '../services/momentService';
import { subscribeChallenge, ChallengeState } from '../services/challengeService';
import { subscribeFantasyWishes, FantasyWishesItem, isFWMatch } from '../services/fantasyWishesService';
import { getAllDailyMatches } from '../services/dailyWishService';
import {
  getCompletedSundayCount,
  getAllCompletedSundayWeeks,
  getStateUnionEntry,
  getWeekQuestions,
  StateUnionDoc,
  StateUnionEntry,
} from '../services/stateUnionService';
import { pickWeeklyActions, weekAnchor } from '../services/loveLanguageNudgeService';
import { LoveLanguage, LOVE_LANGUAGE_LABELS } from '../constants/content';
import { BrandDatePicker } from '../components/BrandDatePicker';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';
import { ConfirmModal } from '../components/ConfirmModal';
import { useTrackScreen } from '../hooks/useTrackScreen';

function formatYear(ts: number): string {
  return String(new Date(ts).getFullYear());
}

function formatLongDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function OurStoryScreen() {
  const { user, profile } = useAuth();
  const { partner, couple } = useCouple(user?.uid, profile?.coupleId);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  // Cross-feature data for the stats card + auto-milestone scan.
  const [sensateProgress, setSensateProgress] = useState<SensateProgress | null>(null);
  const [moments, setMoments] = useState<MomentEntry[]>([]);
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [fwItems, setFwItems] = useState<FantasyWishesItem[]>([]);
  // Lifetime match archives — one-shot fetch on mount, refetch when
  // dependencies change. Undefined during load so counts render as
  // '—' instead of '0' before data arrives.
  const [dailyMatches, setDailyMatches] = useState<Array<{ text: string; date: string; category: string }> | undefined>(undefined);
  const [sundayCount, setSundayCount] = useState<number | undefined>(undefined);
  const [sundayWeeks, setSundayWeeks] = useState<StateUnionDoc[] | undefined>(undefined);
  // Per-week entries cache — populated when the user taps a row in the
  // Sunday archive modal to expand it. Keyed by weekId so re-expanding
  // the same week hits cache instead of re-fetching.
  const [sundayEntries, setSundayEntries] = useState<Record<string, { mine: StateUnionEntry | null; theirs: StateUnionEntry | null } | undefined>>({});
  const [expandedSundayWeek, setExpandedSundayWeek] = useState<string | null>(null);
  // Which archive sub-card is expanded in the modal detail view.
  const [archiveDetail, setArchiveDetail] = useState<null | 'fantasy' | 'daily' | 'sundays' | 'loveLang'>(null);
  const [expandedLoveLangWeek, setExpandedLoveLangWeek] = useState<string | null>(null);

  // Form state
  const [kind, setKind] = useState<MilestoneKind>('met');
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('👋');
  const [date, setDate] = useState<Date | null>(null);
  const [note, setNote] = useState('');
  useTrackScreen('our_story');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeMilestones(coupleId, setMilestones);
  }, [coupleId]);

  // Cross-feature subscriptions for stats + auto-milestone scan.
  useEffect(() => {
    if (!coupleId) return;
    const u1 = subscribeSensateProgress(coupleId, setSensateProgress);
    const u2 = subscribeMoments(coupleId, setMoments);
    const u3 = subscribeChallenge(coupleId, setChallengeState);
    const u4 = subscribeFantasyWishes(coupleId, setFwItems);
    return () => { u1(); u2(); u3(); u4(); };
  }, [coupleId]);

  // Match archives — one-shot fetch on mount. These aggregate lifetime
  // data (all daily-wish matches ever, all completed Sunday Check-ins
  // ever) so the couple can look back at what they have agreed on and
  // reflected on together over the whole life of the relationship. The
  // fetch is skipped on unpaired accounts and refetched when the couple
  // pair identity changes.
  useEffect(() => {
    if (!coupleId || !couple?.partner1Uid || !couple?.partner2Uid) return;
    const p1 = couple.partner1Uid;
    const p2 = couple.partner2Uid;
    let cancelled = false;
    (async () => {
      try {
        const [matches, weeks] = await Promise.all([
          getAllDailyMatches(coupleId, p1, p2),
          getAllCompletedSundayWeeks(coupleId, p1, p2),
        ]);
        if (cancelled) return;
        setDailyMatches(matches);
        setSundayWeeks(weeks);
        setSundayCount(weeks.length);
      } catch {
        if (!cancelled) {
          setDailyMatches([]);
          setSundayWeeks([]);
          setSundayCount(0);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [coupleId, couple?.partner1Uid, couple?.partner2Uid]);

  // Lazy-load a week's entries when the row is tapped in the Sunday
  // archive modal. Cached per weekId so re-expanding is instant.
  const handleExpandSundayWeek = async (weekId: string) => {
    if (expandedSundayWeek === weekId) {
      setExpandedSundayWeek(null);
      return;
    }
    setExpandedSundayWeek(weekId);
    if (sundayEntries[weekId] || !coupleId || !couple?.partner1Uid || !couple?.partner2Uid) return;
    const partnerUid = couple.partner1Uid === uid ? couple.partner2Uid : couple.partner1Uid;
    const [mine, theirs] = await Promise.all([
      getStateUnionEntry(coupleId, weekId, uid),
      getStateUnionEntry(coupleId, weekId, partnerUid),
    ]);
    setSundayEntries((prev) => ({ ...prev, [weekId]: { mine, theirs } }));
  };

  // Nicer label for the week — "Week 35 · 2026" is technical; try to
  // resolve to the Sunday of that ISO week so the row reads like a
  // real date the couple remembers.
  const weekIdToDateLabel = (weekId: string): string => {
    const [year, week] = weekId.split('-');
    if (!year || !week) return weekId;
    // ISO 8601 week Sunday. Compute via Jan 4th which is always in
    // ISO week 1, then step forward.
    const jan4 = new Date(Date.UTC(parseInt(year, 10), 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const isoWeek1Monday = new Date(jan4);
    isoWeek1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
    const sunday = new Date(isoWeek1Monday);
    sunday.setUTCDate(isoWeek1Monday.getUTCDate() + (parseInt(week, 10) - 1) * 7 + 6);
    return sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Fantasy matches derived from the FW subscription that already runs
  // for the auto-milestone scan. Filter and keep just the matched ones.
  const fantasyMatches = useMemo(() => {
    const p1 = couple?.partner1Uid;
    const p2 = couple?.partner2Uid;
    if (!p1 || !p2) return [] as FantasyWishesItem[];
    return fwItems.filter(item => isFWMatch(item, p1, p2));
  }, [fwItems, couple?.partner1Uid, couple?.partner2Uid]);

  // Love-language archive — deterministic pickWeeklyActions per past
  // week (Monday-anchored) means we can regenerate every past week's
  // 3 actions with zero storage cost. Bounded by weeks since the
  // couple started so we don't render weeks before the relationship
  // began. Cap at 52 for practical scroll length; older weeks fall
  // off the tail. Skipped entirely when the partner has no love
  // language set yet.
  const loveLangWeeks = useMemo(() => {
    const partnerLang = (partner as any)?.loveLanguage as LoveLanguage | undefined;
    if (!partnerLang || !coupleId) return [] as Array<{ key: string; monday: Date; actions: string[] }>;
    // Use couple.createdAt (when the pair joined the app), NOT startDate
    // (relationship anniversary — can be years old). The Love Language
    // feature only fires after the couple exists in the app, so showing
    // "actions from 2 years ago" would be fake history for couples who
    // have been dating longer than they have used the app.
    const startAnchor = couple?.createdAt;
    if (!startAnchor) return [];
    const weeksSinceJoined = Math.floor((Date.now() - startAnchor) / (7 * 86400000)) + 1;
    const weekCount = Math.max(1, Math.min(52, weeksSinceJoined));
    const rows: Array<{ key: string; monday: Date; actions: string[] }> = [];
    for (let i = 0; i < weekCount; i++) {
      const when = new Date(Date.now() - i * 7 * 86400000);
      const monday = weekAnchor(when);
      const y = monday.getFullYear();
      const m = String(monday.getMonth() + 1).padStart(2, '0');
      const day = String(monday.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      rows.push({ key, monday, actions: pickWeeklyActions(partnerLang, coupleId, monday) });
    }
    return rows;
  }, [partner, coupleId, couple?.createdAt]);

  const partnerLangLabel = useMemo(() => {
    const l = (partner as any)?.loveLanguage as LoveLanguage | undefined;
    return l ? (LOVE_LANGUAGE_LABELS[l]?.label ?? 'their language') : null;
  }, [partner]);

  // Auto-milestone scan — writes system-generated milestones when the
  // couple's data indicates a threshold was hit. Each ensureAutoMilestone
  // call is idempotent (transaction reads couple.autoMilestonesCreated,
  // no-ops if the autoKey is present, appends to the tracker otherwise).
  // Delete of an auto milestone is permanent because the autoKey stays
  // in the tracker after creation.
  useEffect(() => {
    if (!coupleId || !couple) return;

    // 1. "We started dating" — from couple.startDate (Profile setup).
    if (couple.startDate) {
      ensureAutoMilestone(coupleId, 'started-dating', {
        label: 'We started dating',
        date: couple.startDate,
        emoji: '💖',
        kind: 'made-it-official',
        createdBy: 'system',
      });
    }

    // 2. First Presence cycle — sensateProgress.cyclesCompleted >= 1.
    if ((sensateProgress?.cyclesCompleted ?? 0) >= 1) {
      ensureAutoMilestone(coupleId, 'first-presence-cycle', {
        label: 'Our first Presence cycle',
        date: Date.now(),
        emoji: '🌸',
        kind: 'custom',
        createdBy: 'system',
      });
    }

    // 3. First 30-day challenge activated — challengeState.startedAt.
    if (challengeState?.phase === 'active' && challengeState.startedAt) {
      ensureAutoMilestone(coupleId, 'first-challenge-started', {
        label: 'Started our first 30-day challenge',
        date: challengeState.startedAt,
        emoji: '💪',
        kind: 'custom',
        createdBy: 'system',
      });
    }

    // 4. First Fantasy Wishes match — any FW item with mutual yes.
    const p1 = couple.partner1Uid;
    const p2 = couple.partner2Uid;
    if (p1 && p2 && fwItems.some(item => isFWMatch(item, p1, p2))) {
      ensureAutoMilestone(coupleId, 'first-fw-match', {
        label: 'Our first shared fantasy',
        date: Date.now(),
        emoji: '✨',
        kind: 'custom',
        createdBy: 'system',
      });
    }
  }, [coupleId, couple, sensateProgress?.cyclesCompleted, challengeState?.phase, challengeState?.startedAt, fwItems]);

  // Days-together stat — from couple.startDate if set, else fallback to
  // couple.createdAt with the softer "Days on Desire" label.
  const daysStat = useMemo(() => {
    const anchor = couple?.startDate ?? couple?.createdAt;
    if (!anchor) return { count: 0, label: 'Days together' };
    const days = Math.max(0, Math.floor((Date.now() - anchor) / 86400000));
    return {
      count: days,
      label: couple?.startDate ? 'Days together' : 'Days on Desire',
    };
  }, [couple?.startDate, couple?.createdAt]);

  // Shared moments — count of days where BOTH partners submitted a photo
  // (mutual-reveal is the meaningful signal, not solo captures).
  const sharedMomentsCount = useMemo(() => {
    return moments.filter(m => m.photos && Object.keys(m.photos).length >= 2).length;
  }, [moments]);

  const openAdd = () => {
    setEditing(null);
    setKind('met');
    setLabel('We met');
    setEmoji('👋');
    setDate(null);
    setNote('');
    setShowAdd(true);
  };

  const openEdit = (m: Milestone) => {
    setEditing(m);
    setKind(m.kind);
    setLabel(m.label);
    setEmoji(m.emoji);
    setDate(new Date(m.date));
    setNote(m.note ?? '');
    setShowAdd(true);
  };

  const pickPreset = (k: MilestoneKind) => {
    setKind(k);
    const preset = MILESTONE_PRESETS.find((p) => p.kind === k);
    if (preset && k !== 'custom') {
      setLabel(preset.label);
      setEmoji(preset.emoji);
    } else if (k === 'custom') {
      setLabel('');
      setEmoji('⭐');
    }
  };

  const handleSave = async () => {
    if (!label.trim() || !date || !coupleId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editing) {
      await updateMilestone(coupleId, editing.id, {
        kind, label: label.trim(), emoji, date: date.getTime(), note: note.trim() || undefined,
      });
    } else {
      await addMilestone(coupleId, {
        kind, label: label.trim(), emoji, date: date.getTime(), createdBy: uid,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    }
    setShowAdd(false);
    setEditing(null);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<Milestone | null>(null);
  const handleDelete = (m: Milestone) => setDeleteConfirm(m);
  const confirmDelete = async () => {
    if (!coupleId || !deleteConfirm) return;
    await deleteMilestone(coupleId, deleteConfirm.id);
    setDeleteConfirm(null);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Our Story</Text>
        <TouchableOpacity onPress={openAdd} accessibilityRole="button">
          <Text style={styles.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {/* Stats card — 2×2 grid of live-derived numbers from other
            features. Fills the top of the screen so Our Story never
            feels empty even before user adds milestones. */}
        <View style={styles.statsGrid}>
          <View style={styles.statTile}>
            <Text style={styles.statNum}>{daysStat.count}</Text>
            <Text style={styles.statLabel}>{daysStat.label}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statNum}>{milestones.length}</Text>
            <Text style={styles.statLabel}>Milestones</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statNum}>{sensateProgress?.cyclesCompleted ?? 0}</Text>
            <Text style={styles.statLabel}>Presence cycles</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statNum}>{sharedMomentsCount}</Text>
            <Text style={styles.statLabel}>Shared moments</Text>
          </View>
        </View>

        {/* Matches archive — lifetime aggregates of the mutual-yes
            moments that would otherwise vanish (daily wishes only
            live in one day's doc) or scatter across their own screens
            (fantasy matches, sunday check-ins, love-language weeks).
            Gives Our Story more depth without spamming the timeline
            with N events per match. 2×2 grid so all four archives get
            equal visual weight. */}
        <Text style={styles.archiveTitle}>Your archive</Text>
        <View style={styles.archiveGrid}>
          <TouchableOpacity
            style={styles.archiveCard}
            onPress={() => fantasyMatches.length > 0 && setArchiveDetail('fantasy')}
            activeOpacity={fantasyMatches.length > 0 ? 0.85 : 1}
            accessibilityRole="button"
          >
            <Text style={styles.archiveEmoji}>✨</Text>
            <Text style={styles.archiveNum}>{fantasyMatches.length}</Text>
            <Text style={styles.archiveLabel}>Fantasy matches</Text>
            {fantasyMatches.length > 0 && <Text style={styles.archiveTap}>View →</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.archiveCard}
            onPress={() => (dailyMatches?.length ?? 0) > 0 && setArchiveDetail('daily')}
            activeOpacity={(dailyMatches?.length ?? 0) > 0 ? 0.85 : 1}
            accessibilityRole="button"
          >
            <Text style={styles.archiveEmoji}>🌹</Text>
            <Text style={styles.archiveNum}>{dailyMatches?.length ?? '—'}</Text>
            <Text style={styles.archiveLabel}>Daily matches</Text>
            {(dailyMatches?.length ?? 0) > 0 && <Text style={styles.archiveTap}>View →</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.archiveCard}
            onPress={() => (sundayCount ?? 0) > 0 && setArchiveDetail('sundays')}
            activeOpacity={(sundayCount ?? 0) > 0 ? 0.85 : 1}
            accessibilityRole="button"
          >
            <Text style={styles.archiveEmoji}>🕯️</Text>
            <Text style={styles.archiveNum}>{sundayCount ?? '—'}</Text>
            <Text style={styles.archiveLabel}>Sunday check-ins</Text>
            {(sundayCount ?? 0) > 0 && <Text style={styles.archiveTap}>View →</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.archiveCard}
            onPress={() => loveLangWeeks.length > 0 && setArchiveDetail('loveLang')}
            activeOpacity={loveLangWeeks.length > 0 ? 0.85 : 1}
            accessibilityRole="button"
          >
            <Text style={styles.archiveEmoji}>💬</Text>
            <Text style={styles.archiveNum}>{loveLangWeeks.length}</Text>
            <Text style={styles.archiveLabel}>Love language weeks</Text>
            {loveLangWeeks.length > 0 && <Text style={styles.archiveTap}>View →</Text>}
          </TouchableOpacity>
        </View>

        {milestones.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyTitle}>Tell your story</Text>
            <Text style={styles.emptyText}>
              Map the moments that brought you here. When you met, the first date, the move-in, the trip you'll never forget.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAdd} accessibilityRole="button">
              <Text style={styles.emptyBtnText}>Add the first milestone</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline rendering */}
        {milestones.map((m, idx) => {
          const mine = m.createdBy === uid;
          const showYearHeader = idx === 0 || formatYear(milestones[idx - 1].date) !== formatYear(m.date);
          return (
            <View key={m.id}>
              {showYearHeader && (
                <Text style={styles.yearHeader}>{formatYear(m.date)}</Text>
              )}
              <TouchableOpacity
                style={styles.timelineItem}
                onPress={() => openEdit(m)}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <View style={styles.timelineLeft}>
                  <View style={styles.timelineDot}>
                    <Text style={styles.timelineEmoji}>{m.emoji}</Text>
                  </View>
                  {idx < milestones.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineRight}>
                  <Text style={styles.timelineLabel}>{m.label}</Text>
                  <Text style={styles.timelineDate}>{formatLongDate(m.date)}</Text>
                  {m.note && <Text style={styles.timelineNote}>{m.note}</Text>}
                  {mine && (
                    <View style={styles.timelineActions}>
                      <TouchableOpacity onPress={() => openEdit(m)} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.timelineAction}>✎ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(m)} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={[styles.timelineAction, { color: '#C62828' }]}>✕ Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Archive detail modal — renders the list for whichever
          archive sub-card was tapped. Fantasy + Daily show the item
          text with date; Sundays shows a count-hero because there
          is no per-week content to browse (answers are private). */}
      <Modal visible={archiveDetail !== null} transparent animationType="slide" onRequestClose={() => setArchiveDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.archiveHeader}>
              <Text style={styles.modalTitle}>
                {archiveDetail === 'fantasy' && '✨ Fantasy matches'}
                {archiveDetail === 'daily' && '🌹 Daily matches'}
                {archiveDetail === 'sundays' && '🕯️ Sunday check-ins'}
                {archiveDetail === 'loveLang' && '💬 Love language weeks'}
              </Text>
              <TouchableOpacity onPress={() => setArchiveDetail(null)} accessibilityRole="button" accessibilityLabel="Close">
                <Text style={styles.archiveClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: Spacing.sm, paddingBottom: Spacing.xl }}>
              {archiveDetail === 'fantasy' && fantasyMatches.map((item) => (
                <View key={item.id} style={styles.archiveRow}>
                  <Text style={styles.archiveRowText}>{item.text}</Text>
                  {item.matchedAt && (
                    <Text style={styles.archiveRowDate}>{formatLongDate(item.matchedAt)}</Text>
                  )}
                </View>
              ))}
              {archiveDetail === 'daily' && (dailyMatches ?? []).map((m, i) => (
                <View key={`${m.date}-${i}`} style={styles.archiveRow}>
                  <Text style={styles.archiveRowText}>{m.text}</Text>
                  <Text style={styles.archiveRowDate}>{m.date}</Text>
                </View>
              ))}
              {archiveDetail === 'loveLang' && (
                <>
                  {partnerLangLabel && (
                    <Text style={styles.archiveHintText}>
                      {partner?.name ?? 'Partner'}'s language: {partnerLangLabel}. Three fresh actions land every Monday, both of you see the same trio.
                    </Text>
                  )}
                  {loveLangWeeks.length === 0 && (
                    <Text style={styles.archiveEmptyText}>
                      No Love Language weeks yet. Once {partner?.name ?? 'your partner'} takes the quiz, weekly sets start landing here.
                    </Text>
                  )}
                  {loveLangWeeks.map((wk) => {
                    const isExpanded = expandedLoveLangWeek === wk.key;
                    const label = wk.monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    return (
                      <View key={wk.key} style={styles.archiveWeekBlock}>
                        <TouchableOpacity
                          style={styles.archiveWeekHeader}
                          onPress={() => setExpandedLoveLangWeek(isExpanded ? null : wk.key)}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                        >
                          <Text style={styles.archiveWeekLabel}>Week of {label}</Text>
                          <Text style={styles.archiveWeekChevron}>{isExpanded ? '▾' : '▸'}</Text>
                        </TouchableOpacity>
                        {isExpanded && wk.actions.map((a, i) => (
                          <View key={i} style={styles.archiveWeekActionRow}>
                            <Text style={styles.archiveWeekActionNum}>{i + 1}</Text>
                            <Text style={styles.archiveWeekActionText}>{a}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </>
              )}
              {archiveDetail === 'sundays' && (
                <>
                  <View style={styles.archiveSundayCountRow}>
                    <Text style={styles.archiveSundayCountNum}>{sundayCount ?? 0}</Text>
                    <Text style={styles.archiveSundayCountLabel}>weeks together</Text>
                  </View>
                  {(sundayWeeks ?? []).length === 0 && (
                    <Text style={styles.archiveEmptyText}>No completed check-ins yet.</Text>
                  )}
                  {(sundayWeeks ?? []).map((week) => {
                    const isExpanded = expandedSundayWeek === week.weekId;
                    const entries = sundayEntries[week.weekId];
                    const partnerUid = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
                    const questions = getWeekQuestions(week);
                    return (
                      <View key={week.weekId} style={styles.archiveWeekBlock}>
                        <TouchableOpacity
                          style={styles.archiveWeekHeader}
                          onPress={() => handleExpandSundayWeek(week.weekId)}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                        >
                          <Text style={styles.archiveWeekLabel}>{weekIdToDateLabel(week.weekId)}</Text>
                          <Text style={styles.archiveWeekChevron}>{isExpanded ? '▾' : '▸'}</Text>
                        </TouchableOpacity>
                        {isExpanded && !entries && (
                          <Text style={styles.archiveWeekLoading}>Loading…</Text>
                        )}
                        {isExpanded && entries && questions.map((q, i) => {
                          const mine = entries.mine?.answers?.[String(i)] ?? '—';
                          const theirs = entries.theirs?.answers?.[String(i)] ?? '—';
                          return (
                            <View key={i} style={styles.archiveWeekQBlock}>
                              <Text style={styles.archiveWeekQ}>{i + 1}. {q}</Text>
                              <View style={styles.archiveWeekAnswerRow}>
                                <View style={styles.archiveWeekAnswerCol}>
                                  <Text style={styles.archiveWeekAnswerLabel}>You</Text>
                                  <Text style={styles.archiveWeekAnswerText}>{mine}</Text>
                                </View>
                                <View style={styles.archiveWeekAnswerCol}>
                                  <Text style={styles.archiveWeekAnswerLabel}>{partner?.name ?? 'Partner'}</Text>
                                  <Text style={styles.archiveWeekAnswerText}>{theirs}</Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add / Edit modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modal}>
            <Text style={styles.modalTitle}>{editing ? 'Edit milestone' : 'Add milestone'}</Text>

            <Text style={styles.modalLabel}>What happened?</Text>
            <View style={styles.presetGrid}>
              {MILESTONE_PRESETS.map((p) => {
                const active = kind === p.kind;
                return (
                  <TouchableOpacity
                    key={p.kind}
                    style={[styles.presetBtn, active && styles.presetBtnActive]}
                    onPress={() => pickPreset(p.kind)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.presetEmoji}>{p.emoji}</Text>
                    <Text style={[styles.presetLabel, active && styles.presetLabelActive]} numberOfLines={1}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>Label</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Custom label"
              placeholderTextColor={Colors.muted}
            />

            <Text style={styles.modalLabel}>Date</Text>
            <BrandDatePicker value={date} onChange={setDate} placeholder="Pick the date" maximumDate={new Date()} />

            <Text style={styles.modalLabel}>Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="A memory or detail to remember"
              placeholderTextColor={Colors.muted}
              multiline
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!label.trim() || !date) && { opacity: 0.4 }]}
                onPress={handleSave}
                disabled={!label.trim() || !date}
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>{editing ? 'Save' : 'Add to story'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!deleteConfirm}
        title="Delete milestone"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
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
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  addBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

  list: { paddingVertical: Spacing.md, paddingBottom: Spacing.xxl, paddingHorizontal: Spacing.lg },

  yearHeader: {
    fontFamily: Fonts.headingItalic, fontSize: 28, color: Colors.burgundy,
    marginTop: Spacing.lg, marginBottom: Spacing.md, letterSpacing: 1,
  },

  timelineItem: { flexDirection: 'row', marginBottom: Spacing.md },
  timelineLeft: { width: 56, alignItems: 'center' },
  timelineDot: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.blush, borderWidth: 2, borderColor: Colors.rose,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineEmoji: { fontSize: 28 },
  timelineLine: {
    flex: 1, width: 2, backgroundColor: Colors.border, marginTop: 4, minHeight: 30,
  },
  timelineRight: { flex: 1, paddingLeft: Spacing.md, paddingTop: 4, gap: 4 },
  timelineLabel: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Colors.text },
  timelineDate: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  timelineNote: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20, marginTop: 4, fontStyle: 'italic' },
  timelineActions: { flexDirection: 'row', gap: Spacing.md, marginTop: 6 },
  timelineAction: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md, paddingHorizontal: Spacing.lg },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, marginTop: Spacing.md },
  emptyBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  // maxHeight caps the bottom-sheet at 85% of screen so long lists
  // (52-week love-language archive, matches with dozens of items)
  // don't push the header off the top of the viewport. Without this
  // the modal grew to fit its content and slid the whole card
  // (including the close ✕ and title) off screen.
  modal: { maxHeight: '85%', backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetBtn: {
    width: '31%', paddingVertical: Spacing.sm, alignItems: 'center', gap: 4,
    borderRadius: Radius.md, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  presetBtnActive: { backgroundColor: Colors.blush, borderColor: Colors.rose },
  presetEmoji: { fontSize: 22 },
  presetLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  presetLabelActive: { fontFamily: Fonts.bodyBold, color: Colors.burgundy },

  input: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },

  modalBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  // 2x2 stats grid at the top of Our Story — live-derived numbers from
  // other features (days together, milestones, presence cycles, shared
  // moments). Fills the cold-start empty space.
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  statTile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: Colors.blush,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  statNum: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  statLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2, textAlign: 'center' },

  archiveTitle: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.md, marginBottom: Spacing.sm },
  archiveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  archiveCard: { flexBasis: '48%', flexGrow: 1, minWidth: 0, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, alignItems: 'center', gap: 2 },
  archiveEmoji: { fontSize: 24, marginBottom: 2 },
  archiveNum: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  archiveLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, textAlign: 'center' },
  archiveTap: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.burgundy, marginTop: 2 },

  archiveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  archiveClose: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.muted, padding: Spacing.xs },
  archiveRow: { backgroundColor: Colors.cream, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  archiveRowText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },
  archiveRowDate: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },
  archiveSundayCountRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginBottom: Spacing.md, paddingHorizontal: Spacing.sm },
  archiveSundayCountNum: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.burgundy },
  archiveSundayCountLabel: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted },
  archiveEmptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', paddingVertical: Spacing.lg },
  archiveWeekBlock: { backgroundColor: Colors.cream, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, overflow: 'hidden' },
  archiveWeekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  archiveWeekLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
  archiveWeekChevron: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
  archiveWeekLoading: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center', paddingVertical: Spacing.md },
  archiveWeekQBlock: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.xs },
  archiveWeekQ: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  archiveWeekAnswerRow: { flexDirection: 'row', gap: Spacing.sm },
  archiveWeekAnswerCol: { flex: 1, backgroundColor: Colors.white, padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  archiveWeekAnswerLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  archiveWeekAnswerText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 18 },

  archiveHintText: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm, paddingHorizontal: Spacing.sm, lineHeight: 17 },
  archiveWeekActionRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'flex-start' },
  archiveWeekActionNum: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.burgundy, minWidth: 20 },
  archiveWeekActionText: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 18 },
});
