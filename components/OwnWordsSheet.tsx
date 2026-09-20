import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { CUSTOM_MOOD_MAX } from '../services/moodService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

// The "Own words" mood sheet (USER_VOICE C4), shared by Home and Mood History.
// Two copies of it lived in the two screens until Sep 20 2026, both with the
// same faults found on a phone: `autoFocus` inside a Modal does not raise the
// Android keyboard (focus on onShow instead, like ReactionRow), nothing moved
// the sheet above the keyboard, and the placeholder ("Bone tired, buzzing,
// soft…") was idiom that a second-language reader cannot use as an example.
export function OwnWordsSheet({ visible, initial, onCancel, onSave }: {
  visible: boolean;
  initial?: string;
  onCancel: () => void;
  onSave: (words: string) => void;
}) {
  const [words, setWords] = useState(initial ?? '');
  const inputRef = useRef<TextInput>(null);
  useEffect(() => { if (visible) setWords(initial ?? ''); }, [visible, initial]);

  const clean = words.trim();
  const save = () => { if (clean) onSave(clean); };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      onShow={() => setTimeout(() => inputRef.current?.focus(), 80)}
    >
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <Text style={styles.title}>In your own words</Text>
          <Text style={styles.hint}>A few words are enough.</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={words}
            onChangeText={(t) => setWords(t.slice(0, CUSTOM_MOOD_MAX))}
            placeholder="Write how you are feeling"
            placeholderTextColor={Colors.muted}
            maxLength={CUSTOM_MOOD_MAX}
            returnKeyType="done"
            onSubmitEditing={save}
            accessibilityLabel="Your mood in your own words"
          />
          <View style={styles.btns}>
            <TouchableOpacity style={styles.cancel} onPress={onCancel} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.save, !clean && { opacity: 0.5 }]} disabled={!clean} onPress={save} accessibilityRole="button">
              <Text style={styles.saveText}>Set mood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(61,26,36,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  title: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  hint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  input: { fontFamily: Fonts.body, fontSize: 16, color: Colors.text, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md },
  btns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancel: { flex: 1, paddingVertical: 12, borderRadius: Radius.full, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  save: { flex: 1, paddingVertical: 12, borderRadius: Radius.full, alignItems: 'center', backgroundColor: Colors.burgundy },
  saveText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
