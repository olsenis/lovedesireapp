import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Switch } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { FlirtReminder, DAY_LABELS, REMINDER_SUGGESTIONS, subscribeReminders, addReminder, toggleReminder, deleteReminder, scheduleReminderNotifications, cancelReminderNotifications } from '../services/reminderService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';

export default function RemindersScreen() {
  const { user, profile } = useAuth();
  const [reminders, setReminders] = useState<FlirtReminder[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState('');
  const [time, setTime] = useState('09:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timeError, setTimeError] = useState('');
  const help = useHelp('reminders');

  const coupleId = profile?.coupleId;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeReminders(coupleId, setReminders);
  }, [coupleId]);

  const handleSave = async () => {
    if (!message.trim() || !coupleId || !user) return;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setTimeError('Enter a valid time (HH:MM, e.g. 09:00)');
      return;
    }
    setTimeError('');
    const saved = await addReminder(coupleId, { message: message.trim(), time, days, active: true, createdBy: user.uid });
    scheduleReminderNotifications(saved);
    setMessage(''); setShowCreate(false);
  };

  const toggleDay = (d: number) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Flirt Reminders</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtn}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.desc}>
          Get nudged throughout the day to do something sweet or flirty for your partner 💝
        </Text>

        {reminders.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardMessage}>{r.message}</Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardTime}>{r.time}</Text>
                <Text style={styles.cardDot}>·</Text>
                <Text style={styles.cardMeta}>{r.days.map((d) => DAY_LABELS[d]).join(', ')}</Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Switch
                value={r.active}
                onValueChange={(val) => { if (coupleId) { toggleReminder(coupleId, r.id, val); if (val) scheduleReminderNotifications({ ...r, active: true }); else cancelReminderNotifications(r.id); } }}
                trackColor={{ false: Colors.border, true: Colors.rose }}
                thumbColor={r.active ? Colors.burgundy : Colors.muted}
              />
              <TouchableOpacity onPress={() => { if (coupleId) { deleteReminder(coupleId, r.id); cancelReminderNotifications(r.id); } }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {reminders.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>No reminders yet</Text>
            <Text style={styles.emptyText}>Set up daily nudges to keep the spark alive</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyBtnText}>Create first reminder</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.suggestTitle}>Suggestions</Text>
        {REMINDER_SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={styles.suggestion}
            onPress={() => { setMessage(s); setShowCreate(true); }}
            activeOpacity={0.8}
          >
            <Text style={styles.suggestionText}>{s}</Text>
            <Text style={styles.suggestionPlus}>+</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Reminder</Text>

            <TextInput
              style={styles.input}
              placeholder="What should you do for your partner?"
              placeholderTextColor={Colors.muted}
              value={message}
              onChangeText={setMessage}
              multiline
              autoFocus
            />

            <Text style={styles.modalLabel}>Time</Text>
            <TextInput
              style={[styles.input, { textAlign: 'center', fontFamily: Fonts.heading, fontSize: 24 }]}
              value={time}
              onChangeText={(t) => { setTime(t); setTimeError(''); }}
              placeholder="09:00"
              placeholderTextColor={Colors.muted}
            />
            {timeError ? <Text style={styles.inputError}>{timeError}</Text> : null}

            <Text style={styles.modalLabel}>Days</Text>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, i) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.dayBtn, days.includes(i) && styles.dayActive]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayText, days.includes(i) && styles.dayTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save 🔔</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Flirt Reminders"
        description="Schedule daily nudges that arrive as notifications, reminders to do something sweet or flirty for your partner."
        tips={[
          "Tap + New to create a reminder",
          "Set a time and which days of the week",
          "Toggle the switch to turn a reminder on or off",
          "Tap a Suggestion to pre-fill the message",
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
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  addBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md, paddingTop: Spacing.md },
  desc: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center' },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  cardLeft: { flex: 1 },
  cardMessage: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  cardTime: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.burgundy },
  cardDot: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  cardMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  deleteBtn: { fontFamily: Fonts.body, fontSize: 16, color: Colors.muted, padding: Spacing.xs },

  empty: { alignItems: 'center', paddingTop: Spacing.xl, gap: Spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full },
  emptyBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  suggestTitle: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.text, marginTop: Spacing.sm },
  suggestion: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.rose,
  },
  suggestionText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },
  suggestionPlus: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.rose, marginLeft: Spacing.sm },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  input: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  modalLabel: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  daysRow: { flexDirection: 'row', gap: Spacing.xs },
  dayBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  dayActive: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  dayText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted },
  dayTextActive: { color: Colors.cream },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  inputError: { fontFamily: Fonts.body, fontSize: 12, color: Colors.error },
});
