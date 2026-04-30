import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { BingoSession, subscribeBingo, checkBingoSquare, hasBingo } from '../services/bingoService';
import { BINGO_REWARDS } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function BingoScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [session, setSession] = useState<BingoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [reward] = useState(() => pickRandom(BINGO_REWARDS));
  const help = useHelp('bingo');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeBingo(coupleId, (s) => { setSession(s); setLoading(false); });
  }, [coupleId]);

  const handleSquare = async (index: number) => {
    if (!coupleId || !session) return;
    if (session.checked.includes(index)) return; // already checked
    setSelectedSquare(index);
  };

  const confirmCheck = async () => {
    if (!coupleId || !session || selectedSquare === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await checkBingoSquare(coupleId, uid, selectedSquare, session);
    setSelectedSquare(null);
  };

  if (loading || !session) return null;

  const checkedSet = new Set(session.checked);
  const winnerName = session.winner === uid ? 'You' : partner?.name ?? 'Partner';
  const currentMonthName = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Intimacy Bingo</Text>
        <Text style={styles.month}>{currentMonthName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Complete activities together to mark them off. First to get 5 in a row wins!</Text>

        {session.winner && (
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerEmoji}>🎉</Text>
            <Text style={styles.winnerTitle}>{winnerName} got Bingo!</Text>
            <Text style={styles.winnerReward}>Reward: {reward}</Text>
          </View>
        )}

        <View style={styles.progress}>
          <Text style={styles.progressText}>{session.checked.length}/25 completed</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(session.checked.length / 25) * 100}%` }]} />
          </View>
        </View>

        {/* 5×5 Grid */}
        <View style={styles.grid}>
          {session.squares.map((activity, index) => {
            const isChecked = checkedSet.has(index);
            const checkedByMe = session.checkedBy[index] === uid;
            const row = Math.floor(index / 5);
            const col = index % 5;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.square, isChecked && styles.squareChecked]}
                onPress={() => handleSquare(index)}
                disabled={isChecked}
                activeOpacity={0.8}
              >
                {isChecked ? (
                  <>
                    <Text style={styles.checkEmoji}>✓</Text>
                    <Text style={styles.checkedBy} numberOfLines={1}>{checkedByMe ? 'You' : (partner?.name ?? 'Partner')}</Text>
                  </>
                ) : (
                  <Text style={styles.squareText} numberOfLines={3}>{activity}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.hint}>Tap a square after you've done it together to mark it off.</Text>
      </ScrollView>

      {/* Confirm modal */}
      <Modal visible={selectedSquare !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Mark as done?</Text>
            <Text style={styles.modalText}>{selectedSquare !== null ? session.squares[selectedSquare] : ''}</Text>
            <Text style={styles.modalHint}>Only mark this if you've both actually done it together.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedSquare(null)}>
                <Text style={styles.cancelText}>Not yet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmCheck}>
                <Text style={styles.confirmText}>✓ Done it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Intimacy Bingo"
        description="A shared 5×5 bingo card with activities to try together. New card every month. First to get 5 in a row wins!"
        tips={["Tap a square after you've done the activity together","Both partners see the same card in real time","Get 5 in a row (horizontal, vertical, or diagonal) to win","Winner gets to choose a reward from the list"]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
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
  month: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted, width: 60, textAlign: 'right' },

  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.md },
  intro: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md },

  winnerBanner: { backgroundColor: '#FFF9C4', borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: '#F57F17' },
  winnerEmoji: { fontSize: 40 },
  winnerTitle: { fontFamily: Fonts.heading, fontSize: 24, color: '#F57F17' },
  winnerReward: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, textAlign: 'center' },

  progress: { gap: 6 },
  progressText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.burgundy, borderRadius: 3 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  square: {
    width: '19%', aspectRatio: 1,
    backgroundColor: Colors.white, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    padding: 4, alignItems: 'center', justifyContent: 'center',
  },
  squareChecked: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  squareText: { fontFamily: Fonts.body, fontSize: 9, color: Colors.text, textAlign: 'center', lineHeight: 13 },
  checkEmoji: { fontSize: 18, color: Colors.white },
  checkedBy: { fontFamily: Fonts.bodyBold, fontSize: 8, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  hint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  modalText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  modalHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  confirmBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  confirmText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
