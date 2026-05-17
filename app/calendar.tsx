import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { ImportantDate, subscribeDates, addImportantDate, deleteImportantDate } from '../services/importantDateService';
import { BrandDatePicker } from '../components/BrandDatePicker';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Auto-dates: anniversaries, partner birthdays — derived elsewhere but we can
// inline the bare logic for display in calendar (kept simple for MVP)
function buildAutoDates(partnerName: string, partnerBirthday?: string): { label: string; emoji: string; mmdd: string }[] {
  const auto = [
    { label: 'Valentínusardagur', emoji: '💝', mmdd: '02-14' },
  ];
  if (partnerBirthday) {
    const parts = partnerBirthday.split('.');
    if (parts.length >= 2) {
      const dd = String(parseInt(parts[0], 10)).padStart(2, '0');
      const mm = String(parseInt(parts[1], 10)).padStart(2, '0');
      const turningAge = parts.length === 3 ? `${partnerName}'s birthday` : `${partnerName}'s birthday`;
      auto.push({ label: turningAge, emoji: '🎂', mmdd: `${mm}-${dd}` });
    }
  }
  return auto;
}

// Days of month grid (weeks starting Monday)
function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  // Day of week: 0=Sun, 1=Mon... shift so Monday=0
  const startCol = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [dates, setDates] = useState<ImportantDate[]>([]);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState<Date | null>(null);
  const [addLabel, setAddLabel] = useState('');
  const [addEmoji, setAddEmoji] = useState('❤️');

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeDates(profile.coupleId, setDates);
  }, [profile?.coupleId]);

  const partnerUid = couple?.partner1Uid === user?.uid ? couple?.partner2Uid : couple?.partner1Uid;
  const effectiveBirthday = partner?.birthday ?? (partnerUid ? couple?.partnerBirthdays?.[partnerUid] : undefined);
  const autoDates = useMemo(() => buildAutoDates(partner?.name ?? 'Partner', effectiveBirthday), [partner?.name, effectiveBirthday]);

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Index dates by MM-DD for fast lookup
  const datesByMmdd = useMemo(() => {
    const map = new Map<string, ImportantDate[]>();
    for (const d of dates) {
      const dt = new Date(d.date);
      const key = `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return map;
  }, [dates]);

  const autoByMmdd = useMemo(() => {
    const map = new Map<string, { label: string; emoji: string }>();
    for (const a of autoDates) map.set(a.mmdd, { label: a.label, emoji: a.emoji });
    return map;
  }, [autoDates]);

  const eventsOn = (day: number) => {
    const mmdd = `${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const userDates = datesByMmdd.get(mmdd) ?? [];
    const auto = autoByMmdd.get(mmdd);
    return { userDates, auto };
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); } else { setViewMonth(viewMonth - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); } else { setViewMonth(viewMonth + 1); }
  };

  const openAddForDay = (day: number) => {
    setSelectedDay(day);
    const d = new Date(viewYear, viewMonth, day, 12);
    setAddDate(d);
    setAddLabel('');
    setAddEmoji('❤️');
    setShowAdd(true);
  };

  const handleSaveDate = async () => {
    if (!addLabel.trim() || !addDate || !profile?.coupleId || !user) return;
    await addImportantDate(profile.coupleId, addLabel.trim(), addDate.getTime(), addEmoji, user.uid);
    setShowAdd(false);
    setSelectedDay(null);
  };

  const isToday = (day: number) =>
    viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Calendar</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={prevMonth} accessibilityRole="button" accessibilityLabel="Previous month">
          <Text style={styles.monthArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} accessibilityRole="button" accessibilityLabel="Next month">
          <Text style={styles.monthArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={styles.weekCell}>
            <Text style={styles.weekText}>{w}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.gridWrap}>
        <View style={styles.grid}>
          {grid.map((day, i) => {
            if (day === null) {
              return <View key={`empty-${i}`} style={styles.dayCell} />;
            }
            const { userDates, auto } = eventsOn(day);
            const hasEvent = userDates.length > 0 || !!auto;
            const today_ = isToday(day);
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayCell, today_ && styles.dayCellToday, hasEvent && styles.dayCellEvent]}
                onPress={() => openAddForDay(day)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${MONTH_NAMES[viewMonth]} ${day}`}
              >
                <Text style={[styles.dayNum, today_ && styles.dayNumToday]}>{day}</Text>
                {hasEvent && (
                  <View style={styles.dotsRow}>
                    {auto && <View style={[styles.dot, { backgroundColor: Colors.muted }]} />}
                    {userDates.map((d) => (
                      <View key={d.id} style={[styles.dot, { backgroundColor: Colors.burgundy }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Upcoming list (next 5 events from today) */}
        <Text style={styles.sectionLabel}>Upcoming</Text>
        {(() => {
          const now = new Date();
          const upcoming = [...dates]
            .map((d) => {
              const dt = new Date(d.date);
              // Move to this year or next year
              const next = new Date(now.getFullYear(), dt.getMonth(), dt.getDate());
              if (next < now) next.setFullYear(now.getFullYear() + 1);
              return { date: d, next };
            })
            .sort((a, b) => a.next.getTime() - b.next.getTime())
            .slice(0, 5);
          if (upcoming.length === 0) {
            return <Text style={styles.emptyText}>No upcoming dates. Tap a day to add one.</Text>;
          }
          return upcoming.map(({ date: d, next }) => {
            const daysUntil = Math.ceil((next.getTime() - now.getTime()) / 86400000);
            const isSecret = d.secret && d.createdBy !== user?.uid;
            return (
              <View key={d.id} style={styles.upcomingCard}>
                <Text style={styles.upcomingEmoji}>{isSecret ? '🤫' : d.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upcomingLabel}>{isSecret ? 'A surprise from your partner' : d.label}</Text>
                  <Text style={styles.upcomingDate}>
                    {next.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} · in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                  </Text>
                </View>
                {!isSecret && d.createdBy === user?.uid && (
                  <TouchableOpacity
                    onPress={() => profile?.coupleId && deleteImportantDate(profile.coupleId, d.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete date"
                  >
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          });
        })()}
      </ScrollView>

      {/* Add date modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add a date</Text>
            <Text style={styles.modalHint}>
              {selectedDay && `${MONTH_NAMES[viewMonth]} ${selectedDay}, ${viewYear}`}
            </Text>
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
            <View style={styles.labelInputWrap}>
              <Text style={styles.modalHint}>Label</Text>
              <TextInput
                style={styles.labelInput}
                placeholder="What is this date?"
                placeholderTextColor={Colors.muted}
                value={addLabel}
                onChangeText={setAddLabel}
              />
              <Text style={styles.modalHint}>Pick a date</Text>
              <BrandDatePicker
                value={addDate}
                onChange={setAddDate}
                placeholder="Date"
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !addLabel.trim() && { opacity: 0.4 }]}
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

  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  monthArrow: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.burgundy, paddingHorizontal: Spacing.md },
  monthLabel: { fontFamily: Fonts.headingItalic, fontSize: 24, color: Colors.burgundy },

  weekRow: { flexDirection: 'row', paddingHorizontal: Spacing.sm },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  weekText: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.muted, letterSpacing: 1 },

  gridWrap: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6,
  },
  dayCellToday: { backgroundColor: Colors.blush, borderRadius: Radius.md },
  dayCellEvent: { backgroundColor: 'rgba(244,167,185,0.18)', borderRadius: Radius.md },
  dayNum: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
  dayNumToday: { fontFamily: Fonts.bodyBold, color: Colors.burgundy },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },

  sectionLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.lg, marginBottom: Spacing.sm, paddingHorizontal: Spacing.sm,
  },
  upcomingCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, marginHorizontal: Spacing.sm,
  },
  upcomingEmoji: { fontSize: 28 },
  upcomingLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  upcomingDate: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  deleteBtn: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, padding: 4 },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalHint: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  labelInputWrap: { gap: 6 },
  labelInput: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  emojiActive: { borderColor: Colors.burgundy, backgroundColor: Colors.blush },
  emojiOpt: { fontSize: 22 },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
