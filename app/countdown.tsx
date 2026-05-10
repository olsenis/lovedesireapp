import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { ImportantDate, subscribeDates, addImportantDate, deleteImportantDate, getDaysUntil } from '../services/importantDateService';

function getNextOccurrence(month: number, day: number): number {
  const now = new Date();
  let d = new Date(now.getFullYear(), month - 1, day);
  if (d <= now) d = new Date(now.getFullYear() + 1, month - 1, day);
  return d.getTime();
}

function getNthWeekday(year: number, month: number, weekday: number, nth: number): number {
  const d = new Date(year, month - 1, 1);
  let count = 0;
  while (d.getMonth() === month - 1) {
    if (d.getDay() === weekday) { count++; if (count === nth) break; }
    d.setDate(d.getDate() + 1);
  }
  const now = new Date();
  if (d <= now) {
    const next = new Date(year + 1, month - 1, 1);
    while (next.getMonth() === month - 1) {
      if (next.getDay() === weekday) { count++; if (count === nth) break; }
      next.setDate(next.getDate() + 1);
    }
    return next.getTime();
  }
  return d.getTime();
}

interface AutoDate { label: string; emoji: string; date: number; }

function getAutoDates(partnerName: string, partnerBirthday?: string): AutoDate[] {
  const now = new Date();
  const year = now.getFullYear();
  const dates: AutoDate[] = [
    { label: 'Valentínusardagur', emoji: '💝', date: getNextOccurrence(2, 14) },
    { label: 'Konudagurinn', emoji: '👩', date: getNthWeekday(year, 2, 0, 3) },
    { label: 'Bóndadagurinn', emoji: '👨', date: getNthWeekday(year, 1, 1, 3) },
    { label: 'Mæðradagurinn', emoji: '👩‍👧', date: getNthWeekday(year, 5, 0, 2) },
  ];
  if (partnerBirthday) {
    const parts = partnerBirthday.split('.');
    if (parts.length === 2) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      if (!isNaN(day) && !isNaN(month)) {
        dates.push({ label: `${partnerName}'s birthday`, emoji: '🎂', date: getNextOccurrence(month, day) });
      }
    }
  }
  return dates;
}
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';

const EMOJIS = ['❤️', '💍', '🎂', '✈️', '🎉', '🌹', '⭐', '🏠', '🐾', '🌟'];

export default function CountdownScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple(user?.uid, profile?.coupleId);
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const autoDates = getAutoDates(partner?.name ?? 'Partner', partner?.birthday);
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [emoji, setEmoji] = useState('❤️');
  const [dateError, setDateError] = useState('');
  const help = useHelp('countdowns');

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeDates(profile.coupleId, setDates);
  }, [profile?.coupleId]);

  const handleAdd = async () => {
    if (!label.trim() || !dateStr || !profile?.coupleId || !user) return;
    const ts = new Date(dateStr).getTime();
    if (isNaN(ts)) { setDateError('Enter a valid date (YYYY-MM-DD)'); return; }
    setDateError('');
    await addImportantDate(profile.coupleId, label.trim(), ts, emoji, user.uid);
    setLabel(''); setDateStr(''); setShowAdd(false);
  };

  const allDates = [
    ...autoDates.map(d => ({ id: `auto-${d.label}`, label: d.label, emoji: d.emoji, date: d.date, createdBy: '', createdAt: 0, auto: true })),
    ...dates.map(d => ({ ...d, auto: false })),
  ].sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Countdowns</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {allDates.map((d) => {
          const daysLeft = getDaysUntil(d.date);
          const isToday = daysLeft === 0;
          return (
            <View key={d.id} style={[styles.card, isToday && styles.cardToday, d.auto && styles.cardAuto]}>
              <View style={[styles.cardEmojiWrap, isToday && styles.cardEmojiWrapToday]}>
                <Text style={styles.cardEmoji}>{d.emoji}</Text>
              </View>
              <View style={styles.cardMiddle}>
                <Text style={[styles.cardLabel, isToday && styles.cardLabelToday]}>{d.label}</Text>
                <Text style={styles.cardDate}>
                  {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                </Text>
              </View>
              <View style={styles.cardRight}>
                {isToday ? (
                  <Text style={styles.todayBadge}>🎉 Today!</Text>
                ) : (
                  <>
                    <Text style={styles.daysNum}>{daysLeft}</Text>
                    <Text style={styles.daysLabel}>days</Text>
                  </>
                )}
              </View>
              {!d.auto && <TouchableOpacity
                onPress={() => profile?.coupleId && deleteImportantDate(profile.coupleId, d.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteTxt}>✕</Text>
              </TouchableOpacity>}
            </View>
          );
        })}

        {dates.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>⏳</Text>
            <Text style={styles.emptyTitle}>No dates yet</Text>
            <Text style={styles.emptyText}>Add your anniversary, first date, trips and more</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAdd(true)}>
              <Text style={styles.emptyBtnText}>Add a date</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add a Date</Text>

            <View style={styles.emojiRow}>
              {EMOJIS.map((e) => (
                <TouchableOpacity key={e} style={[styles.emojiBtn, emoji === e && styles.emojiActive]} onPress={() => setEmoji(e)}>
                  <Text style={styles.emojiOpt}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={styles.input} placeholder="Label (e.g. Our Anniversary)" placeholderTextColor={Colors.muted} value={label} onChangeText={setLabel} />
            <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={Colors.muted} value={dateStr} onChangeText={(t) => { setDateStr(t); setDateError(''); }} />
            {dateError ? <Text style={styles.inputError}>{dateError}</Text> : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Countdowns"
        description="Track important dates and see how many days until they arrive."
        tips={[
          "Tap + Add to add a date",
          "Choose an emoji and enter the label and date (YYYY-MM-DD)",
          "Dates are sorted by how soon they arrive",
          "On the day itself it shows 🎉 Today!",
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
  addBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md, paddingTop: Spacing.md },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardToday: { backgroundColor: Colors.blush, borderColor: Colors.rose },
  cardAuto: { borderStyle: 'dashed' },
  cardEmojiWrap: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardEmojiWrapToday: { backgroundColor: 'rgba(244,167,185,0.3)' },
  cardEmoji: { fontSize: 28 },
  cardMiddle: { flex: 1 },
  cardLabel: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  cardLabelToday: { color: Colors.burgundy },
  cardDate: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  cardRight: { alignItems: 'center', minWidth: 48 },
  daysNum: { fontFamily: Fonts.heading, fontSize: 40, color: Colors.burgundy, lineHeight: 44 },
  daysLabel: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted },
  todayBadge: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, textAlign: 'center' },
  deleteBtn: { padding: Spacing.xs },
  deleteTxt: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full },
  emptyBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  emojiActive: { borderColor: Colors.burgundy, backgroundColor: Colors.blush },
  emojiOpt: { fontSize: 22 },
  input: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  inputError: { fontFamily: Fonts.body, fontSize: 12, color: Colors.error },
});
