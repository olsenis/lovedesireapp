import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { Todo, TodoCategory, subscribeTodos, addTodo, toggleTodo, deleteTodo } from '../../services/todoService';
import { useHelp } from '../../hooks/useHelp';
import { HelpModal } from '../../components/HelpModal';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Spacing, Radius } from '../../constants/spacing';

const CATEGORIES: { key: TodoCategory; label: string; emoji: string; color: string }[] = [
  { key: 'daily',    label: 'Daily Life',  emoji: '🏠', color: '#FFF3E0' },
  { key: 'dates',    label: 'Date Ideas',  emoji: '💑', color: '#FCE4EC' },
  { key: 'intimacy', label: 'Intimacy',    emoji: '🔥', color: '#FFEBEE' },
  { key: 'fantasy',  label: 'Fantasy',     emoji: '💋', color: '#F3E5F5' },
  { key: 'goals',    label: 'Goals',       emoji: '🌟', color: '#FFF9C4' },
];

export default function TogetherScreen() {
  const { user, profile } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<TodoCategory | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const help = useHelp('together-list');
  const [newText, setNewText] = useState('');
  const [newCat, setNewCat] = useState<TodoCategory>('daily');

  const coupleId = profile?.coupleId;

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
    await deleteTodo(coupleId, id);
  };

  const filtered = filter === 'all' ? todos : todos.filter((t) => t.category === filter);
  const incomplete = filtered.filter((t) => !t.completed);
  const complete = filtered.filter((t) => t.completed);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Together List</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.filterBtn, filter === cat.key && styles.filterActive]}
            onPress={() => setFilter(cat.key)}
          >
            <Text style={styles.filterEmoji}>{cat.emoji}</Text>
            <Text style={[styles.filterText, filter === cat.key && styles.filterTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {incomplete.map((todo) => {
          const cat = CATEGORIES.find((c) => c.key === todo.category) ?? CATEGORIES[0];
          return (
            <TodoRow key={todo.id} todo={todo} cat={cat} onToggle={handleToggle} onDelete={handleDelete} />
          );
        })}

        {complete.length > 0 && (
          <>
            <Text style={styles.doneLabel}>Done ✓</Text>
            {complete.map((todo) => {
              const cat = CATEGORIES.find((c) => c.key === todo.category) ?? CATEGORIES[0];
              return (
                <TodoRow key={todo.id} todo={todo} cat={cat} onToggle={handleToggle} onDelete={handleDelete} />
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
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>Add →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Together List"
        description="A shared to-do list that both of you can add to and check off in real time."
        tips={[
          'Tap + Add to add a new item',
          'Choose a category — Daily Life, Date Ideas, Intimacy, or Goals',
          'Tap the circle to mark something done',
          'Both partners see all changes instantly',
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

function TodoRow({ todo, cat, onToggle, onDelete }: {
  todo: Todo;
  cat: { emoji: string; color: string };
  onToggle: (t: Todo) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={[styles.todoRow, todo.completed && styles.todoRowDone]}>
      <TouchableOpacity style={[styles.check, todo.completed && styles.checkDone]} onPress={() => onToggle(todo)}>
        {todo.completed && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
      <View style={[styles.catDot, { backgroundColor: cat.color }]}>
        <Text style={styles.catDotEmoji}>{cat.emoji}</Text>
      </View>
      <Text style={[styles.todoText, todo.completed && styles.todoTextDone]} numberOfLines={2}>{todo.text}</Text>
      <TouchableOpacity onPress={() => onDelete(todo.id)} style={styles.delBtn}>
        <Text style={styles.delText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontFamily: Fonts.heading, fontSize: 36, color: Colors.burgundy },
  addBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.full },
  addBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },

  filterScroll: { maxHeight: 52 },
  filterRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterActive: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  filterEmoji: { fontSize: 14 },
  filterText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  filterTextActive: { color: Colors.cream, fontFamily: Fonts.bodyBold },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.sm, gap: Spacing.sm },
  doneLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.md },

  todoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  todoRowDone: { opacity: 0.55 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Colors.rose, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  checkMark: { color: Colors.cream, fontSize: 14, fontFamily: Fonts.bodyBold },
  catDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  catDotEmoji: { fontSize: 14 },
  todoText: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text },
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
