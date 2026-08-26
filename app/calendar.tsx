import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { ImportantDate, subscribeDates, addImportantDate, deleteImportantDate } from '../services/importantDateService';
import { BrandDatePicker } from '../components/BrandDatePicker';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// A ledger entry — either a user-added ImportantDate or an auto-derived date
// (Valentine's, partner birthday, couple anniversary). All flow through the
// same sort so the resulting list is one honest chronological view.
type LedgerEntry = {
  key: string;
  label: string;
  emoji: string;
  nextOccurrence: Date;
  daysUntil: number;
  // Optional bits — user entries carry these, auto entries don't
  userDate?: ImportantDate;
  isSecret?: boolean;
};

function nextOccurrenceOf(mm: number, dd: number, from: Date = new Date()): Date {
  const y = from.getFullYear();
  const candidate = new Date(y, mm, dd);
  if (candidate.getTime() < from.setHours(0, 0, 0, 0)) {
    candidate.setFullYear(y + 1);
  }
  return candidate;
}

function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.ceil(ms / 86400000);
}

// Group ledger entries into readable time buckets. Keeps the list scannable
// so a long ledger doesn't just become a wall of dates.
function bucketOf(daysUntil: number): 'thisMonth' | 'nextThree' | 'later' {
  if (daysUntil <= 30) return 'thisMonth';
  if (daysUntil <= 90) return 'nextThree';
  return 'later';
}

const BUCKET_LABELS: Record<'thisMonth' | 'nextThree' | 'later', string> = {
  thisMonth: 'Coming up',
  nextThree: 'Next 3 months',
  later: 'Later this year',
};

export default function CalendarScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  useTrackScreen('calendar');
  const [dates, setDates] = useState<ImportantDate[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState<Date | null>(null);
  const [addLabel, setAddLabel] = useState('');
  const [addEmoji, setAddEmoji] = useState('❤️');
  // Secret dates render as "A surprise from {partnerName}" on the other
  // partner's ledger until the day arrives. Ported from the old
  // Countdowns screen when we merged its unique feature over.
  const [addSecret, setAddSecret] = useState(false);

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeDates(profile.coupleId, setDates);
  }, [profile?.coupleId]);

  const partnerName = partner?.name ?? 'your partner';
  const partnerUid = couple?.partner1Uid === user?.uid ? couple?.partner2Uid : couple?.partner1Uid;
  const effectiveBirthday = partner?.birthday ?? (partnerUid ? couple?.partnerBirthdays?.[partnerUid] : undefined);

  // Ledger = user dates + auto-derived (Valentine's, partner birthday,
  // couple anniversary from startDate). One flat sorted list — no month
  // grid, no hidden data. Everything the couple cares about, chronological.
  const ledger = useMemo<LedgerEntry[]>(() => {
    const now = new Date();
    const entries: LedgerEntry[] = [];

    // Auto: Valentine's Day
    {
      const next = nextOccurrenceOf(1, 14);
      entries.push({
        key: 'auto-valentines',
        label: "Valentine's Day",
        emoji: '💝',
        nextOccurrence: next,
        daysUntil: daysBetween(next, now),
      });
    }

    // Auto: partner birthday (needs DD.MM or DD.MM.YYYY)
    if (effectiveBirthday) {
      const parts = effectiveBirthday.split('.');
      if (parts.length >= 2) {
        const dd = parseInt(parts[0], 10);
        const mm = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        if (Number.isFinite(dd) && Number.isFinite(mm)) {
          const next = nextOccurrenceOf(mm, dd);
          entries.push({
            key: 'auto-partner-birthday',
            label: `${partnerName}'s birthday`,
            emoji: '🎂',
            nextOccurrence: next,
            daysUntil: daysBetween(next, now),
          });
        }
      }
    }

    // Auto: couple anniversary from startDate
    if (couple?.startDate) {
      const start = new Date(couple.startDate);
      const next = nextOccurrenceOf(start.getMonth(), start.getDate());
      entries.push({
        key: 'auto-anniversary',
        label: 'Anniversary',
        emoji: '💍',
        nextOccurrence: next,
        daysUntil: daysBetween(next, now),
      });
    }

    // User-added dates
    for (const d of dates) {
      const dt = new Date(d.date);
      const next = nextOccurrenceOf(dt.getMonth(), dt.getDate());
      entries.push({
        key: `user-${d.id}`,
        label: d.label,
        emoji: d.emoji,
        nextOccurrence: next,
        daysUntil: daysBetween(next, now),
        userDate: d,
        isSecret: !!d.secret && d.createdBy !== user?.uid,
      });
    }

    entries.sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());
    return entries;
  }, [dates, effectiveBirthday, partnerName, couple?.startDate, user?.uid]);

  // Group by bucket, preserving sort order inside each group.
  const grouped = useMemo(() => {
    const groups: Record<'thisMonth' | 'nextThree' | 'later', LedgerEntry[]> = {
      thisMonth: [], nextThree: [], later: [],
    };
    for (const entry of ledger) {
      groups[bucketOf(entry.daysUntil)].push(entry);
    }
    return groups;
  }, [ledger]);

  const openAdd = () => {
    setAddDate(null);
    setAddLabel('');
    setAddEmoji('❤️');
    setAddSecret(false);
    setShowAdd(true);
  };

  const handleSaveDate = async () => {
    if (!addLabel.trim() || !addDate || !profile?.coupleId || !user) return;
    await addImportantDate(profile.coupleId, addLabel.trim(), addDate.getTime(), addEmoji, user.uid, addSecret);
    setShowAdd(false);
  };

  const formatWhen = (entry: LedgerEntry): string => {
    const d = entry.nextOccurrence;
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    if (entry.daysUntil === 0) return `${dateStr} · today`;
    if (entry.daysUntil === 1) return `${dateStr} · tomorrow`;
    return `${dateStr} · in ${entry.daysUntil} days`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Special Days</Text>
        <TouchableOpacity onPress={openAdd} accessibilityRole="button" accessibilityLabel="Add special day">
          <Text style={styles.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.introHint}>
          A ledger of the dates that matter to you both. Anniversaries, birthdays, first times, small rituals worth remembering.
        </Text>

        {ledger.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyTitle}>Nothing on the ledger yet</Text>
            <Text style={styles.emptyBody}>
              Tap + Add to save anniversaries, birthdays, first times, or any date worth marking together.
            </Text>
          </View>
        ) : (
          (['thisMonth', 'nextThree', 'later'] as const).map((bucket) => {
            const rows = grouped[bucket];
            if (rows.length === 0) return null;
            return (
              <View key={bucket} style={styles.section}>
                <Text style={styles.sectionLabel}>{BUCKET_LABELS[bucket]}</Text>
                <View style={styles.card}>
                  {rows.map((entry, i) => (
                    <View key={entry.key}>
                      {i > 0 && <View style={styles.divider} />}
                      <View style={styles.ledgerRow}>
                        <Text style={styles.rowEmoji}>{entry.isSecret ? '🤫' : entry.emoji}</Text>
                        <View style={styles.rowBody}>
                          <Text style={styles.rowLabel}>
                            {entry.isSecret ? `A surprise from ${partnerName}` : entry.label}
                          </Text>
                          <Text style={styles.rowWhen}>{formatWhen(entry)}</Text>
                        </View>
                        {entry.userDate && !entry.isSecret && entry.userDate.createdBy === user?.uid && (
                          <TouchableOpacity
                            onPress={() => profile?.coupleId && deleteImportantDate(profile.coupleId, entry.userDate!.id)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${entry.label}`}
                          >
                            <Text style={styles.deleteBtn}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add date modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add a special day</Text>
            <Text style={styles.modalHint}>Pick an emoji</Text>
            <View style={styles.emojiRow}>
              {['❤️', '💍', '🎂', '✈️', '🎉', '🌹', '⭐', '🏠'].map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, addEmoji === e && styles.emojiActive]}
                  onPress={() => setAddEmoji(e)}
                  accessibilityRole="button"
                >
                  <Text style={styles.emojiOpt}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalHint}>Label</Text>
            <TextInput
              style={styles.labelInput}
              placeholder="What's this day about?"
              placeholderTextColor={Colors.muted}
              value={addLabel}
              onChangeText={setAddLabel}
            />
            <Text style={styles.modalHint}>Pick a date</Text>
            <BrandDatePicker value={addDate} onChange={setAddDate} placeholder="Date" />
            <TouchableOpacity
              style={styles.secretToggle}
              onPress={() => setAddSecret((s) => !s)}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityState={{ checked: addSecret }}
              accessibilityLabel="Keep this date a surprise"
            >
              <View style={[styles.checkbox, addSecret && styles.checkboxOn]}>
                {addSecret && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.secretTitle}>Keep it a surprise 🤫</Text>
                <Text style={styles.secretHint}>
                  {partnerName} sees "A surprise from you" until the day arrives.
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!addLabel.trim() || !addDate) && { opacity: 0.4 }]}
                onPress={handleSaveDate}
                disabled={!addLabel.trim() || !addDate}
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.md },
  introHint: {
    fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted,
    lineHeight: 20, textAlign: 'center', paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm,
  },

  section: { gap: Spacing.sm },
  sectionLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
  ledgerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  rowEmoji: { fontSize: 28 },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  rowWhen: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  deleteBtn: { fontFamily: Fonts.body, fontSize: 16, color: Colors.muted, padding: 4 },

  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, textAlign: 'center' },
  emptyBody: {
    fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.sm,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalHint: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted, marginBottom: -4 },
  labelInput: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  emojiActive: { borderColor: Colors.burgundy, backgroundColor: Colors.blush },
  emojiOpt: { fontSize: 22 },
  modalBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  secretToggle: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.muted,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxOn: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  checkboxTick: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.cream },
  secretTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  secretHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 2, lineHeight: 18 },
});
