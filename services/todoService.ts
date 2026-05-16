import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export type TodoCategory = 'daily' | 'dates' | 'intimacy' | 'goals' | 'fantasy';

export type TodoSource = 'manual' | 'daily-picks' | 'fantasy-wishes' | 'roulette';

export interface Todo {
  id: string;
  text: string;
  category: TodoCategory;
  completed: boolean;
  createdBy: string;
  createdAt: number;
  source?: TodoSource;
  // Couples-suggest pattern. 'pending' = waiting for partner to accept; 'rejected' = partner declined.
  // Absent or 'active' = normal todo, visible to both.
  status?: 'pending' | 'active' | 'rejected';
}

export function subscribeTodos(coupleId: string, onChange: (todos: Todo[]) => void): Unsubscribe {
  // Real-time listener, call the returned unsubscribe fn to stop listening
  const q = query(
    collection(db, 'couples', coupleId, 'todos'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Todo));
    onChange(todos);
  });
}

export async function addTodo(
  coupleId: string,
  text: string,
  category: TodoCategory,
  createdBy: string,
  source: TodoSource = 'manual',
  asSuggestion: boolean = false,
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'todos'), {
    text,
    category,
    completed: false,
    createdBy,
    createdAt: Date.now(),
    source,
    ...(asSuggestion ? { status: 'pending' } : {}),
  });
}

export async function acceptSuggestion(coupleId: string, todoId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'todos', todoId), { status: 'active' });
}

export async function rejectSuggestion(coupleId: string, todoId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'todos', todoId), { status: 'rejected' });
}

export async function toggleTodo(coupleId: string, todoId: string, completed: boolean): Promise<void> {
  // TODO: toggle completed state
  await updateDoc(doc(db, 'couples', coupleId, 'todos', todoId), { completed });
}

export async function deleteTodo(coupleId: string, todoId: string): Promise<void> {
  // TODO: delete todo
  await deleteDoc(doc(db, 'couples', coupleId, 'todos', todoId));
}
