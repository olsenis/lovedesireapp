import { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

// A heart and one line on something both partners have already revealed
// (Sep 2026, USER_VOICE C2). Not a chat: one reaction and one reply per
// person per item, no threads, no read state, no counters. The most
// common wish in the review mining was exactly this moment after the
// reveal ("a heart react for the daily diary", "the interesting part was
// what came after the prompt"). Render only when the item is revealed.
//
//   mine    my reaction / reply on this item
//   theirs  the partner's reaction / reply on it
//   readOnly  history views: show what is there, no input

export interface ReactionSide {
  reaction?: boolean;
  reply?: string;
  // When the reply was FIRST written (ms). The earlier one is shown on top;
  // an edit keeps its original time. Absent on replies from before Sep 19
  // 2026: then the partner's line comes first, as it always did.
  replyAt?: number;
}

export const REPLY_MAX = 200;

export function ReactionRow({ mine, theirs, partnerName, onReact, onReply, compact, readOnly }: {
  mine: ReactionSide;
  theirs: ReactionSide;
  partnerName: string;
  onReact?: (on: boolean) => void;
  // keepTime is true when an existing reply is being edited, so the host
  // does not move it behind the partner's by re-stamping it.
  onReply?: (text: string, keepTime?: boolean) => void | Promise<void>;
  compact?: boolean;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(mine.reply ?? '');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const canWrite = !readOnly && !!onReact && !!onReply;
  if (readOnly && !mine.reaction && !theirs.reaction && !mine.reply && !theirs.reply) return null;

  const send = async () => {
    if (!onReply || sending) return;
    setSending(true);
    try {
      await onReply(draft.trim().slice(0, REPLY_MAX), !!mine.reply && !!draft.trim());
      setEditing(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => { if (!canWrite) return; Haptics.selectionAsync().catch(() => {}); onReact?.(!mine.reaction); }}
          disabled={!canWrite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityState={{ selected: !!mine.reaction }}
          accessibilityLabel={mine.reaction ? 'Remove your heart' : 'Send a heart'}
        >
          <Text style={[styles.heart, mine.reaction && styles.heartOn]}>{mine.reaction ? '❤️' : '♡'}</Text>
        </TouchableOpacity>
        {theirs.reaction && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{partnerName} ❤️</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {canWrite && !editing && !mine.reply && (
          <TouchableOpacity onPress={() => { setDraft(''); setEditing(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button">
            <Text style={styles.replyLink}>Reply</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Whoever replied first is on top. Without both times (older replies)
          the partner's line leads, as before. */}
      {(() => {
        const theirsLine = theirs.reply ? (
          <Text key="theirs" style={styles.theirReply}><Text style={styles.who}>{partnerName}: </Text>{theirs.reply}</Text>
        ) : null;
        const mineLine = mine.reply && !editing ? (
          <TouchableOpacity key="mine" onPress={() => { if (!canWrite) return; setDraft(mine.reply ?? ''); setEditing(true); }} disabled={!canWrite} accessibilityRole="button" accessibilityLabel="Edit your reply">
            <Text style={styles.myReply}><Text style={styles.who}>You: </Text>{mine.reply}</Text>
          </TouchableOpacity>
        ) : null;
        const mineFirst = typeof mine.replyAt === 'number' && (typeof theirs.replyAt !== 'number' ? false : mine.replyAt < theirs.replyAt);
        return mineFirst ? [mineLine, theirsLine] : [theirsLine, mineLine];
      })()}

      {/* The reply is written in a bottom sheet, not inline (Sep 2026): an
          input that mounts inside a long scrolling reveal got scrolled off
          screen when the keyboard opened. Same keyboard-safe shape as the
          other sheets: spacer on top, the card shrinks with the keyboard. */}
      <Modal
        visible={editing && canWrite}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(false)}
        // autoFocus inside a Modal is unreliable on Android (cursor shows,
        // keyboard does not): focus once the sheet is actually on screen.
        onShow={() => setTimeout(() => inputRef.current?.focus(), 80)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEditing(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Reply to {partnerName}</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={draft}
              onChangeText={(t) => setDraft(t.slice(0, REPLY_MAX))}
              placeholder="A few words about this answer"
              placeholderTextColor={Colors.muted}
              maxLength={REPLY_MAX}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Your reply"
            />
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setEditing(false)} accessibilityRole="button">
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetSend, (sending || (!draft.trim() && !mine.reply)) && { opacity: 0.5 }]}
                onPress={send}
                disabled={sending || (!draft.trim() && !mine.reply)}
                accessibilityRole="button"
              >
                <Text style={styles.send}>{sending ? '…' : mine.reply && !draft.trim() ? 'Remove' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.sm, gap: 6 },
  wrapCompact: { marginTop: 6, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heart: { fontSize: 20, color: Colors.muted },
  heartOn: { color: Colors.burgundy },
  chip: { backgroundColor: Colors.blush, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.burgundy },
  replyLink: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  who: { fontFamily: Fonts.bodyBold, color: Colors.burgundy },
  theirReply: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },
  myReply: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },
  overlay: { flex: 1, backgroundColor: 'rgba(61,26,36,0.5)' },
  sheet: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  sheetTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy },
  input: {
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text, minHeight: 72,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md,
  },
  sheetBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  sheetCancel: { flex: 1, paddingVertical: 12, borderRadius: Radius.full, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  sheetSend: { flex: 1, paddingVertical: 12, borderRadius: Radius.full, alignItems: 'center', backgroundColor: Colors.burgundy },
  cancel: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  send: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
