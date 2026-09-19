import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { ConfirmModal } from '../components/ConfirmModal';
import { notifyPartner } from '../services/notificationService';
import {
  RESET_ROWS, ResetRow, ResetKey, ResetRequest,
  subscribeResetRequests, runReset, requestReset, confirmReset, cancelReset,
} from '../services/resetService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

// Reset (Sep 19 2026): start over in ONE part of the app. Opened from
// Profile → Reset. Rare, irreversible, and it touches the partner's data
// too, which is why it lives here and not on each feature's own screen.
// Small rows clear after a confirm; big rows ask the partner first. See
// services/resetService.ts for the rule and the callable for the deleting.
type Pending =
  | { kind: 'run' | 'request' | 'confirm'; row: ResetRow }
  | null;

export default function ResetScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple(user?.uid, profile?.coupleId);
  useTrackScreen('reset');
  const uid = user?.uid ?? '';
  const coupleId = profile?.coupleId;
  const partnerName = partner?.name ?? 'your partner';

  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState<ResetKey | null>(null);
  const [cleared, setCleared] = useState<Set<ResetKey>>(new Set());
  const [failed, setFailed] = useState<ResetKey | null>(null);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeResetRequests(coupleId, setRequests);
  }, [coupleId]);

  const act = async (key: ResetKey, fn: () => Promise<void>, markCleared: boolean) => {
    if (!coupleId || busy) return;
    setBusy(key);
    setFailed(null);
    try {
      await fn();
      if (markCleared) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCleared((s) => new Set(s).add(key));
      }
    } catch {
      setFailed(key);
    } finally {
      setBusy(null);
    }
  };

  const onConfirmed = async () => {
    const p = pending;
    setPending(null);
    if (!p || !coupleId) return;
    const { row } = p;
    if (p.kind === 'run') return act(row.key, () => runReset(coupleId, row.key), true);
    if (p.kind === 'confirm') return act(row.key, () => confirmReset(coupleId, row.key), true);
    await act(row.key, () => requestReset(coupleId, row.key), false);
    // Neutral on the lock screen: never the subject of the request.
    const title = `${profile?.name ?? 'Your partner'} asked you something`;
    notifyPartner(coupleId, uid, title, 'Open Profile, then Reset, to answer.', { title, body: 'Open the app to answer.' }).catch(() => {});
  };

  const small = RESET_ROWS.filter((r) => !r.both);
  const big = RESET_ROWS.filter((r) => r.both);

  const renderRow = (row: ResetRow) => {
    const req = requests.find((r) => r.key === row.key);
    const mine = req?.uid === uid;
    const theirs = !!req && !mine;
    const isBusy = busy === row.key;
    const done = cleared.has(row.key) && !req;
    return (
      <View key={row.key} style={styles.row}>
        <Text style={styles.rowEmoji}>{row.emoji}</Text>
        <View style={styles.rowBody}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowHint}>
            {failed === row.key ? 'That did not work. Check your connection and try again.'
              : done ? 'Cleared. It starts from empty again.'
              : theirs ? `${partnerName} asked to clear this for both of you.`
              : mine ? `Waiting for ${partnerName} to agree.`
              : row.clears}
          </Text>
          <View style={styles.rowActions}>
            {theirs ? (
              <>
                <TouchableOpacity style={styles.dangerBtn} disabled={isBusy} onPress={() => setPending({ kind: 'confirm', row })} accessibilityRole="button">
                  <Text style={styles.dangerBtnText}>{isBusy ? '…' : 'Agree and clear'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quietBtn} disabled={isBusy} onPress={() => coupleId && act(row.key, () => cancelReset(coupleId, row.key), false)} accessibilityRole="button">
                  <Text style={styles.quietBtnText}>Not now</Text>
                </TouchableOpacity>
              </>
            ) : mine ? (
              <TouchableOpacity style={styles.quietBtn} disabled={isBusy} onPress={() => coupleId && act(row.key, () => cancelReset(coupleId, row.key), false)} accessibilityRole="button">
                <Text style={styles.quietBtnText}>{isBusy ? '…' : 'Cancel'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.quietBtn} disabled={isBusy} onPress={() => setPending({ kind: row.both ? 'request' : 'run', row })} accessibilityRole="button" accessibilityHint="Cannot be undone">
                <Text style={styles.quietBtnText}>{isBusy ? '…' : row.both ? `Ask ${partnerName}` : 'Clear'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const confirmCopy = (): { title: string; message: string; label: string } => {
    if (!pending) return { title: '', message: '', label: '' };
    const { row, kind } = pending;
    if (kind === 'request') {
      return {
        title: `Ask ${partnerName}?`,
        message: `${row.label}: ${row.clears} Nothing is cleared until ${partnerName} agrees, and you can cancel until then.`,
        label: 'Ask',
      };
    }
    return {
      title: `Clear ${row.label}?`,
      message: `${row.clears} This is for both you and ${partnerName}, and it cannot be undone.`,
      label: 'Clear',
    };
  };
  const copy = confirmCopy();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reset</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Start over in one part of the app. Each of these clears that part of your shared history for both of you. Nothing here touches your account or your pairing.
        </Text>

        {!partner ? (
          <View style={styles.card}>
            <Text style={styles.rowHint}>This is for a paired couple. There is nothing shared to clear yet.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>You can clear these yourself</Text>
            <View style={styles.card}>{small.map(renderRow)}</View>

            <Text style={styles.sectionLabel}>These need both of you</Text>
            <Text style={styles.sectionHint}>
              Something one of you wrote or photographed. You ask, {partnerName} agrees, and only then is it cleared. A request waits for seven days.
            </Text>
            <View style={styles.card}>{big.map(renderRow)}</View>

            <Text style={styles.foot}>
              Good to know: after Daily or Sunday Check-in is cleared, Memory Lane has less to ask about for a while, and your year in review counts from here.
            </Text>
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!pending}
        title={copy.title}
        message={copy.message}
        confirmLabel={copy.label}
        destructive={pending?.kind !== 'request'}
        onConfirm={onConfirmed}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  intro: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, lineHeight: 21, marginBottom: Spacing.sm },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: Colors.muted, marginTop: Spacing.md },
  sectionHint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 19 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.lg, ...Shadow.sm },
  row: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowEmoji: { fontSize: 22, width: 30, textAlign: 'center', marginTop: 2 },
  rowBody: { flex: 1, gap: 4 },
  rowLabel: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  rowHint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 19 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: 6 },
  quietBtn: { paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  quietBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  dangerBtn: { paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.error },
  dangerBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.cream },
  foot: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, lineHeight: 18, marginTop: Spacing.md },
});
