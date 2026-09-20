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
  subscribeResetRequests, clearMine, requestReset, confirmReset, cancelReset, resetDateLabel, isOpenReset, resetAnswerFor,
} from '../services/resetService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

// Reset (Sep 19 2026): erase one part of the shared history. Opened from
// Profile → Reset. The rule is in services/resetService.ts:
//   yours  -> you, alone, now
//   your partner's -> your partner has to agree
//   about both (Intimacy Log) -> either of you; 7 days, or now if both agree
type Pending = { kind: 'mine' | 'request' | 'confirm'; row: ResetRow } | null;

export default function ResetScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple(user?.uid, profile?.coupleId);
  useTrackScreen('reset');
  const uid = user?.uid ?? '';
  const coupleId = profile?.coupleId;
  const partnerName = partner?.name ?? 'your partner';

  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cleared, setCleared] = useState<Record<string, 'mine' | 'all'>>({});
  const [failed, setFailed] = useState<ResetKey | null>(null);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeResetRequests(coupleId, setRequests);
  }, [coupleId]);

  const act = async (key: ResetKey, fn: () => Promise<void>, mark?: 'mine' | 'all') => {
    if (!coupleId || busy) return;
    setBusy(key);
    setFailed(null);
    try {
      await fn();
      if (mark) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCleared((s) => ({ ...s, [key]: mark }));
      }
    } catch {
      setFailed(key);
    } finally {
      setBusy(null);
    }
  };

  const pushAnswered = () => {
    if (!coupleId) return;
    // The asker reads the answer in the app (the callable leaves it on the
    // request); this is the nudge to open it. The same neutral words for yes
    // and for not now, so the lock screen says neither.
    const title = `${profile?.name ?? 'Your partner'} answered you`;
    notifyPartner(coupleId, uid, title, 'Open Profile, then Reset.', { title, body: 'Open the app to see.' }).catch(() => {});
  };

  const onConfirmed = async () => {
    const p = pending;
    setPending(null);
    if (!p || !coupleId) return;
    const { row } = p;
    if (p.kind === 'mine') return act(row.key, () => clearMine(coupleId, row.key), row.kind === 'derived' ? 'all' : 'mine');
    if (p.kind === 'confirm') {
      await act(row.key, () => confirmReset(coupleId, row.key), 'all');
      pushAnswered();
      return;
    }
    await act(row.key, () => requestReset(coupleId, row.key));
    // Neutral on the lock screen: never the subject of the request.
    const title = `${profile?.name ?? 'Your partner'} asked you something`;
    notifyPartner(coupleId, uid, title, 'Open Profile, then Reset, to answer.', { title, body: 'Open the app to answer.' }).catch(() => {});
  };

  const renderRow = (row: ResetRow) => {
    const found = requests.find((r) => r.key === row.key);
    const req = found && isOpenReset(found) ? found : undefined;
    const answer = found ? resetAnswerFor(found, uid) : null;
    const mineReq = req?.uid === uid;
    const theirReq = !!req && !mineReq;
    const joint = row.kind === 'joint';
    const isBusy = busy === row.key;
    const when = req?.autoAt ? resetDateLabel(req.autoAt) : '';
    const hint =
      failed === row.key ? 'That did not work. Check your connection and try again.'
      : answer === 'agreed' ? `${partnerName} agreed. It is cleared for both of you and starts from empty again.`
      : answer === 'notNow' ? `${partnerName} said not now, so nothing was cleared. Your own part is still yours to clear.`
      : theirReq && joint ? `${partnerName} is clearing this on ${when}. Agree and it clears now.`
      : theirReq ? `${partnerName} asked to clear this for both of you.`
      : mineReq && joint ? `Clears on ${when}. If ${partnerName} agrees it clears now. You can cancel until then.`
      : mineReq ? `Waiting for ${partnerName} to agree. Your own part you can clear right now.`
      : cleared[row.key] === 'all' ? 'Cleared. It starts from empty again.'
      : cleared[row.key] === 'mine' ? `Your part is cleared. ${partnerName}'s is untouched.`
      : joint ? `${row.all} Every entry is about both of you, so either of you may clear it. It clears after seven days, or at once if ${partnerName} agrees.`
      : row.kind === 'derived' ? row.all
      : row.mine;
    return (
      <View key={row.key} style={styles.row}>
        <Text style={styles.rowEmoji}>{row.emoji}</Text>
        <View style={styles.rowBody}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowHint}>{hint}</Text>
          <View style={styles.rowActions}>
            {row.kind !== 'joint' && (
              <TouchableOpacity style={styles.quietBtn} disabled={isBusy} onPress={() => setPending({ kind: 'mine', row })} accessibilityRole="button" accessibilityHint="Cannot be undone">
                <Text style={styles.quietBtnText}>{isBusy ? '…' : row.kind === 'derived' ? 'Clear' : 'Clear mine'}</Text>
              </TouchableOpacity>
            )}
            {row.kind !== 'derived' && !!partner && (
              answer ? (
                <TouchableOpacity style={styles.quietBtn} disabled={isBusy} onPress={() => coupleId && act(row.key, () => cancelReset(coupleId, row.key))} accessibilityRole="button">
                  <Text style={styles.quietBtnText}>OK</Text>
                </TouchableOpacity>
              ) : theirReq ? (
                <>
                  <TouchableOpacity style={styles.dangerBtn} disabled={isBusy} onPress={() => setPending({ kind: 'confirm', row })} accessibilityRole="button">
                    <Text style={styles.dangerBtnText}>{joint ? 'Agree to clear it now' : 'Agree and clear'}</Text>
                  </TouchableOpacity>
                  {/* No "Not now" on a joint row: the partner can speed an
                      erasure up, never stop it. */}
                  {!joint && (
                    <TouchableOpacity style={styles.quietBtn} disabled={isBusy} onPress={async () => { if (!coupleId) return; await act(row.key, () => cancelReset(coupleId, row.key)); pushAnswered(); }} accessibilityRole="button">
                      <Text style={styles.quietBtnText}>Not now</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : mineReq ? (
                <TouchableOpacity style={styles.quietBtn} disabled={isBusy} onPress={() => coupleId && act(row.key, () => cancelReset(coupleId, row.key))} accessibilityRole="button">
                  <Text style={styles.quietBtnText}>Cancel</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.quietBtn} disabled={isBusy} onPress={() => setPending({ kind: 'request', row })} accessibilityRole="button">
                  <Text style={styles.quietBtnText}>{joint ? 'Clear the log' : 'Clear for both'}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </View>
    );
  };

  const copy = ((): { title: string; message: string; label: string; destructive: boolean } => {
    if (!pending) return { title: '', message: '', label: '', destructive: false };
    const { row, kind } = pending;
    if (kind === 'mine') {
      return row.kind === 'derived'
        ? { title: `Clear ${row.label}?`, message: `${row.all} It cannot be undone.`, label: 'Clear', destructive: true }
        : { title: `Clear your part of ${row.label}?`, message: `${row.mine} ${partnerName}'s part stays. It cannot be undone.`, label: 'Clear mine', destructive: true };
    }
    if (kind === 'request') {
      return row.kind === 'joint'
        ? { title: 'Clear the Intimacy Log?', message: `${row.all} It clears in seven days, or at once if ${partnerName} agrees. You can cancel until then, and ${partnerName} will see that you started this.`, label: 'Start', destructive: true }
        : { title: `Ask ${partnerName}?`, message: `${row.all} Nothing of ${partnerName}'s is cleared unless ${partnerName} agrees. Your own part you can clear yourself at any time.`, label: 'Ask', destructive: false };
    }
    return { title: `Clear ${row.label} for both?`, message: `${row.all} It cannot be undone.`, label: 'Clear', destructive: true };
  })();

  const personal = RESET_ROWS.filter((r) => r.kind === 'personal');
  const joint = RESET_ROWS.filter((r) => r.kind === 'joint');
  const derived = RESET_ROWS.filter((r) => r.kind === 'derived');

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
          Start over in one part of the app. What you made is yours to clear, alone and at once. What {partnerName} made needs {partnerName}. Nothing here touches your account or your pairing.
        </Text>

        <Text style={styles.sectionLabel}>Yours and {partnerName}'s</Text>
        <Text style={styles.sectionHint}>"Clear mine" is instant. "Clear for both" asks {partnerName} first, and a request waits for seven days.</Text>
        <View style={styles.card}>{personal.map(renderRow)}</View>

        {!!partner && (
          <>
            <Text style={styles.sectionLabel}>About both of you</Text>
            <View style={styles.card}>{joint.map(renderRow)}</View>
          </>
        )}

        <Text style={styles.sectionLabel}>Built from the rest</Text>
        <View style={styles.card}>{derived.map(renderRow)}</View>

        <Text style={styles.foot}>
          Good to know: after Daily or Sunday Check-in is cleared, Memory Lane has less to ask about for a while, and your year in review counts from here.
        </Text>
      </ScrollView>

      <ConfirmModal
        visible={!!pending}
        title={copy.title}
        message={copy.message}
        confirmLabel={copy.label}
        destructive={copy.destructive}
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
