import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform } from 'react-native';
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
} from '../services/milestoneService';
import { BrandDatePicker } from '../components/BrandDatePicker';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

function formatYear(ts: number): string {
  return String(new Date(ts).getFullYear());
}

function formatLongDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function OurStoryScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple(user?.uid, profile?.coupleId);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);

  // Form state
  const [kind, setKind] = useState<MilestoneKind>('met');
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('👋');
  const [date, setDate] = useState<Date | null>(null);
  const [note, setNote] = useState('');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeMilestones(coupleId, setMilestones);
  }, [coupleId]);

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

  const handleDelete = (m: Milestone) => {
    if (!coupleId) return;
    const doDelete = async () => { await deleteMilestone(coupleId, m.id); };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this milestone?')) doDelete();
    } else {
      Alert.alert('Delete milestone', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
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
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
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
});
