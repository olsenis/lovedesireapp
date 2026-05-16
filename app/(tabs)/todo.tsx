import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { Todo, TodoCategory, subscribeTodos, addTodo, toggleTodo, deleteTodo } from '../../services/todoService';
import { useCouple } from '../../hooks/useCouple';
import { useHelp } from '../../hooks/useHelp';
import { HelpModal } from '../../components/HelpModal';
import { DATE_IDEAS } from '../../constants/content';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius, Shadow } from '../../constants/spacing';

const CATEGORIES: { key: TodoCategory; label: string; emoji: string; color: string }[] = [
  { key: 'daily',    label: 'Daily Life',  emoji: '🏠', color: '#FFF3E0' },
  { key: 'dates',    label: 'Date Ideas',  emoji: '💑', color: '#FCE4EC' },
  { key: 'intimacy', label: 'Intimacy',    emoji: '🔥', color: '#FFEBEE' },
  { key: 'fantasy',  label: 'Fantasy',     emoji: '💋', color: '#F3E5F5' },
  { key: 'goals',    label: 'Goals',       emoji: '🌟', color: '#FFF9C4' },
];

export default function TogetherScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple(user?.uid, profile?.coupleId);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<TodoCategory | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const help = useHelp('together-list');
  const [newText, setNewText] = useState('');
  const [newCat, setNewCat] = useState<TodoCategory>('daily');
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';

  useEffect(() => {
    if (!coupleId) return;
    return subscribeTodos(coupleId, setTodos);
  }, [coupleId]);

  const handleAdd = async () => {
    if (!newText.trim() || !coupleId || !user) return;
    await addTodo(coupleId, newText.trim(), newCat, user.uid);
    setNewText('');
    setShowAdd(false);
  };

  const handleToggle = async (todo: Todo) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleTodo(coupleId, todo.id, !todo.completed);
  };

  const handleDelete = async (id: string) => {
    if (!coupleId) return;
    const doDelete = async () => { await deleteTodo(coupleId, id); setSelectedTodo(null); };
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this item?')) doDelete();
    } else {
      Alert.alert('Remove item', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const filtered = filter === 'all' ? todos : todos.filter((t) => t.category === filter);
  const incomplete = filtered.filter((t) => !t.completed);
  const complete = filtered.filter((t) => t.completed);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Together List</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} accessibilityRole="button">
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category filters */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}
         accessibilityRole="button">
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.filterBtn, filter === cat.key && styles.filterActive]}
            onPress={() => setFilter(cat.key)}
           accessibilityRole="button">
            <Text style={styles.filterEmoji}>{cat.emoji}</Text>
            <Text style={[styles.filterText, filter === cat.key && styles.filterTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {incomplete.map((todo) => {
          const cat = CATEGORIES.find((c) => c.key === todo.category) ?? CATEGORIES[0];
          return (
            <TodoRow key={todo.id} todo={todo} cat={cat} uid={uid} partnerName={partner?.name ?? 'Partner'} onToggle={handleToggle} onDelete={handleDelete} onSelect={setSelectedTodo} />
          );
        })}

        {complete.length > 0 && (
          <>
            <Text style={styles.doneLabel}>Done ✓</Text>
            {complete.map((todo) => {
              const cat = CATEGORIES.find((c) => c.key === todo.category) ?? CATEGORIES[0];
              return (
                <TodoRow key={todo.id} todo={todo} cat={cat} uid={uid} partnerName={partner?.name ?? 'Partner'} onToggle={handleToggle} onDelete={handleDelete} onSelect={setSelectedTodo} />
              );
            })}
          </>
        )}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyText}>Add something you want to do together</Text>
          </View>
        )}
      </ScrollView>

      {/* Add modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Item</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you want to do together?"
              placeholderTextColor={Colors.muted}
              value={newText}
              onChangeText={setNewText}
              autoFocus
            />
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.catBtn, newCat === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => setNewCat(cat.key)}
                 accessibilityRole="button">
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} accessibilityRole="button">
                <Text style={styles.saveBtnText}>Add →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Item detail modal */}
      <Modal visible={!!selectedTodo} transparent animationType="slide" onRequestClose={() => setSelectedTodo(null)}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailModal}>
            <View style={styles.detailHandle} />
            {selectedTodo && (() => {
              const cat = CATEGORIES.find(c => c.key === selectedTodo.category) ?? CATEGORIES[0];
              const dateIdea = selectedTodo.source === 'roulette' ? DATE_IDEAS.find(d => d.title === selectedTodo.text) : null;
              const addedByMe = selectedTodo.createdBy === uid;
              return (
                <>
                  <View style={styles.detailHeader}>
                    <View style={[styles.detailCatDot, { backgroundColor: cat.color }]}>
                      <Text style={styles.detailCatEmoji}>{cat.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailTitle}>{selectedTodo.text}</Text>
                      <Text style={styles.detailMeta}>{addedByMe ? 'Added by you' : `Added by ${partner?.name ?? 'Partner'}`}{selectedTodo.source && selectedTodo.source !== 'manual' ? ` · from ${SOURCE_LABELS[selectedTodo.source]}` : ''}</Text>
                    </View>
                  </View>
                  {dateIdea && (
                    <View style={styles.detailDesc}>
                      <Text style={styles.detailDescText}>{dateIdea.description}</Text>
                    </View>
                  )}
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={[styles.detailBtn, selectedTodo.completed && styles.detailBtnDone]}
                      onPress={() => { handleToggle(selectedTodo); setSelectedTodo({ ...selectedTodo, completed: !selectedTodo.completed }); }}
                      activeOpacity={0.85}
                     accessibilityRole="button">
                      <Text style={[styles.detailBtnText, selectedTodo.completed && styles.detailBtnTextDone]}>
                        {selectedTodo.completed ? '↩ Mark as undone' : '✓ Mark as done'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.detailDeleteBtn} onPress={() => handleDelete(selectedTodo.id)} activeOpacity={0.85} accessibilityRole="button">
                      <Text style={styles.detailDeleteText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Together List"
        description="A shared to-do list that both of you can add to and check off in real time."
        tips={[
          'Tap + Add to add a new item',
          'Choose a category, Daily Life, Date Ideas, Intimacy, or Goals',
          'Tap the circle to mark something done',
          'Both partners see all changes instantly',
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  'daily-picks': 'Daily Picks',
  'fantasy-wishes': 'Fantasy Wishes',
  'roulette': 'Date Night',
};

function TodoRow({ todo, cat, uid, partnerName, onToggle, onDelete, onSelect }: {
  todo: Todo;
  cat: { emoji: string; color: string };
  uid: string;
  partnerName: string;
  onToggle: (t: Todo) => void;
  onDelete: (id: string) => void;
  onSelect: (t: Todo) => void;
}) {
  const addedByMe = todo.createdBy === uid;
  const sourceLabel = todo.source && todo.source !== 'manual' ? SOURCE_LABELS[todo.source] : null;

  return (
    <TouchableOpacity style={[styles.todoRow, todo.completed && styles.todoRowDone]} onPress={() => onSelect(todo)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${todo.text}, ${todo.completed ? 'completed' : 'not completed'}`}>
      <TouchableOpacity style={[styles.check, todo.completed && styles.checkDone]} onPress={() => onToggle(todo)} accessibilityRole="button" accessibilityLabel={todo.completed ? 'Mark as not done' : 'Mark as done'}>
        {todo.completed && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
      <View style={[styles.catDot, { backgroundColor: cat.color }]}>
        <Text style={styles.catDotEmoji}>{cat.emoji}</Text>
      </View>
      <View style={styles.todoContent}>
        <Text style={[styles.todoText, todo.completed && styles.todoTextDone]} numberOfLines={2}>{todo.text}</Text>
        <View style={styles.todoMeta}>
          <Text style={styles.todoAdded}>{addedByMe ? 'You' : partnerName}</Text>
          {sourceLabel && <Text style={styles.todoSource}>· from {sourceLabel}</Text>}
        </View>
      </View>
      <Text style={styles.todoChevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontFamily: Fonts.heading, fontSize: 36, color: Colors.burgundy },
  addBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.full },
  addBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingVertical: Spacing.sm },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterActive: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  filterEmoji: { fontSize: 14 },
  filterText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  filterTextActive: { color: Colors.cream, fontFamily: Fonts.bodyBold },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.sm, gap: Spacing.sm },
  doneLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.md },

  todoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  todoRowDone: { opacity: 0.55 },
  todoContent: { flex: 1, gap: 2 },
  todoMeta: { flexDirection: 'row', gap: 4 },
  todoAdded: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted },
  todoSource: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted },
  todoChevron: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.muted },

  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  detailModal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  detailHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: Radius.full, alignSelf: 'center', marginBottom: Spacing.sm },
  detailHeader: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  detailCatDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  detailCatEmoji: { fontSize: 22 },
  detailTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, lineHeight: 28 },
  detailMeta: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 4 },
  detailDesc: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  detailDescText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 22 },
  detailActions: { gap: Spacing.sm },
  detailBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  detailBtnDone: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  detailBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
  detailBtnTextDone: { color: Colors.muted },
  detailDeleteBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
  detailDeleteText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.error },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Colors.rose, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  checkMark: { color: Colors.cream, fontSize: 14, fontFamily: Fonts.bodyBold },
  catDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  catDotEmoji: { fontSize: 14 },
  todoText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text },
  todoTextDone: { textDecorationLine: 'line-through', color: Colors.muted },
  delBtn: { padding: Spacing.xs },
  delText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.muted, textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  input: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', gap: 4, alignItems: 'center' },
  catEmoji: { fontSize: 14 },
  catLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
