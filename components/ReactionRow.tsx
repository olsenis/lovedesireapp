import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
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
}

export const REPLY_MAX = 200;

export function ReactionRow({ mine, theirs, partnerName, onReact, onReply, compact, readOnly }: {
  mine: ReactionSide;
  theirs: ReactionSide;
  partnerName: string;
  onReact?: (on: boolean) => void;
  onReply?: (text: string) => void | Promise<void>;
  compact?: boolean;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(mine.reply ?? '');
  const [sending, setSending] = useState(false);
  const canWrite = !readOnly && !!onReact && !!onReply;
  if (readOnly && !mine.reaction && !theirs.reaction && !mine.reply && !theirs.reply) return null;

  const send = async () => {
    if (!onReply || sending) return;
    setSending(true);
    try {
      await onReply(draft.trim().slice(0, REPLY_MAX));
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

      {theirs.reply ? (
        <Text style={styles.theirReply}><Text style={styles.who}>{partnerName}: </Text>{theirs.reply}</Text>
      ) : null}

      {mine.reply && !editing ? (
        <TouchableOpacity onPress={() => { if (!canWrite) return; setDraft(mine.reply ?? ''); setEditing(true); }} disabled={!canWrite} accessibilityRole="button" accessibilityLabel="Edit your reply">
          <Text style={styles.myReply}><Text style={styles.who}>You: </Text>{mine.reply}</Text>
        </TouchableOpacity>
      ) : null}

      {editing && canWrite && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, REPLY_MAX))}
            placeholder={`One line for ${partnerName}`}
            placeholderTextColor={Colors.muted}
            maxLength={REPLY_MAX}
            returnKeyType="send"
            onSubmitEditing={send}
            autoFocus
            accessibilityLabel="Your reply"
          />
          <TouchableOpacity onPress={() => setEditing(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button">
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={send} disabled={sending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button">
            <Text style={styles.send}>{sending ? '…' : mine.reply && !draft.trim() ? 'Remove' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      )}
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
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  input: {
    flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.text,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
  },
  cancel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  send: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
});
