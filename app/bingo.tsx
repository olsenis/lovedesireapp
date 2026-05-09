import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { ActivityCardsSession, MAX_PASSES, subscribeActivityCards, flipCard, usePass, resetActivityCards } from '../services/bingoService';
import { notifyPartner } from '../services/notificationService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

export default function ActivityCardsScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const [session, setSession] = useState<ActivityCardsSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const help = useHelp('bingo');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'Partner';
  const isMyTurn = session?.turnUid === uid;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeActivityCards(coupleId, uid, (s) => { setSession(s); setLoading(false); });
  }, [coupleId, uid]);

  // Animate reveal modal
  useEffect(() => {
    if (revealIndex !== null) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    }
  }, [revealIndex]);

  const handleCardTap = (index: number) => {
    if (!session || !isMyTurn) return;
    if ((session.revealed ?? []).includes(index)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRevealIndex(index);
  };

  const handleAccept = async () => {
    if (!coupleId || !session || revealIndex === null || !partnerId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const activity = session.squares[revealIndex];
    await flipCard(coupleId, uid, revealIndex, partnerId);
    notifyPartner(coupleId, uid, 'Activity Cards 🃏', `${profile?.name ?? 'Your partner'} picked "${activity}" — your turn!`).catch(() => {});
    setRevealIndex(null);
  };

  const handlePass = async () => {
    if (!coupleId || !session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await usePass(coupleId, uid, session);
    setRevealIndex(null);
  };

  const passesUsed = session?.passes?.[uid] ?? 0;
  const passesLeft = MAX_PASSES - passesUsed;

  const handleReset = async () => {
    if (!coupleId || !session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await resetActivityCards(coupleId, session, uid);
    setConfirmReset(false);
  };

  if (loading || !session) return null;

  const revealed = session.revealed ?? [];
  const revealedSet = new Set(revealed);
  const remaining = 25 - revealed.length;
  const currentMonthName = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Activity Cards</Text>
        <TouchableOpacity onPress={() => setConfirmReset(true)} style={styles.resetBtn}>
          <Text style={styles.resetBtnText}>↺ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.month}>{currentMonthName}</Text>

        {/* Turn indicator */}
        <View style={[styles.turnBadge, { backgroundColor: isMyTurn ? Colors.burgundy : Colors.blush }]}>
          <Text style={[styles.turnText, { color: isMyTurn ? Colors.white : Colors.burgundy }]}>
            {isMyTurn ? 'Your turn — pick any card' : `${partnerName}'s turn to pick`}
          </Text>
        </View>

        {/* Progress + passes */}
        <Text style={styles.progressText}>{revealed.length} of 25 flipped · {remaining} remaining</Text>
        {isMyTurn && (
          <Text style={styles.passesText}>
            {passesLeft > 0 ? `${passesLeft} pass${passesLeft !== 1 ? 'es' : ''} left` : 'No passes left — must accept next card'}
          </Text>
        )}

        {/* 5×5 Card grid */}
        <View style={styles.grid}>
          {session.squares.map((activity, index) => {
            const isRevealed = revealedSet.has(index);
            const revealedByMe = (session.revealedBy ?? {})[index] === uid;
            const canTap = isMyTurn && !isRevealed;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.card,
                  isRevealed && styles.cardRevealed,
                  canTap && styles.cardCanTap,
                ]}
                onPress={() => handleCardTap(index)}
                disabled={isRevealed || !isMyTurn}
                activeOpacity={canTap ? 0.75 : 1}
              >
                {isRevealed ? (
                  <>
                    <Text style={styles.cardRevealedText} numberOfLines={3}>{activity}</Text>
                    <Text style={styles.cardRevealedBy}>{revealedByMe ? 'You' : partnerName}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.cardBack}>✦</Text>
                    {canTap && <Text style={styles.cardTapHint}>tap</Text>}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.hint}>Take turns picking a card. Do the activity together.</Text>
      </ScrollView>

      {/* Reveal modal */}
      <Modal visible={revealIndex !== null} transparent animationType="fade" onRequestClose={() => setRevealIndex(null)}>
        <View style={styles.revealOverlay}>
          <Animated.View style={[styles.revealCard, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.revealLabel}>Your challenge</Text>
            <Text style={styles.revealActivity}>
              {revealIndex !== null ? session.squares[revealIndex] : ''}
            </Text>
            <Text style={styles.revealHint}>Do this together, then it's {partnerName}'s turn</Text>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.85}>
              <Text style={styles.acceptBtnText}>✓ Accept this challenge</Text>
            </TouchableOpacity>
            {passesLeft > 0 ? (
              <TouchableOpacity style={styles.cancelRevealBtn} onPress={handlePass}>
                <Text style={styles.cancelRevealText}>Pass — put it back ({passesLeft} left)</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noPassesText}>No passes left — you must accept</Text>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Reset confirmation */}
      <Modal visible={confirmReset} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New deck?</Text>
            <Text style={styles.modalText}>This will shuffle a fresh set of 25 activity cards.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmReset(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleReset}>
                <Text style={styles.confirmText}>↺ New deck</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Activity Cards"
        description="25 face-down cards, each with an intimate activity. Take turns picking one — you never know what you'll get!"
        tips={[
          "Take turns picking a face-down card",
          "Tap 'Accept this challenge' to flip it and pass the turn",
          "Do the activity together whenever you're ready",
          "Tap '↺ New' for a fresh deck any time",
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
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
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  resetBtn: { width: 60, alignItems: 'flex-end' },
  resetBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },

  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.md, alignItems: 'center' },
  month: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },

  turnBadge: { paddingVertical: 12, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, alignItems: 'center' },
  turnText: { fontFamily: Fonts.bodyBold, fontSize: 14 },

  progressText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%' },

  card: {
    width: '18.4%', aspectRatio: 0.75,
    backgroundColor: Colors.burgundy, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center', padding: 4,
    ...Shadow.sm,
  },
  cardCanTap: { backgroundColor: '#A01060', borderWidth: 1.5, borderColor: Colors.rose },
  cardRevealed: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  cardBack: { fontSize: 20, color: 'rgba(255,255,255,0.4)' },
  cardTapHint: { fontFamily: Fonts.bodyItalic, fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  cardRevealedText: { fontFamily: Fonts.body, fontSize: 7, color: Colors.text, textAlign: 'center', lineHeight: 10 },
  cardRevealedBy: { fontFamily: Fonts.bodyBold, fontSize: 6, color: Colors.muted, marginTop: 2 },

  hint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },

  revealOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  revealCard: {
    backgroundColor: Colors.cream, borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.md, width: '100%', ...Shadow.md,
    borderWidth: 2, borderColor: Colors.rose,
  },
  revealLabel: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  revealActivity: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy, textAlign: 'center', lineHeight: 32 },
  revealHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },
  acceptBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, width: '100%', alignItems: 'center' },
  acceptBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
  cancelRevealBtn: { paddingVertical: Spacing.xs },
  cancelRevealText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  noPassesText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.error, textAlign: 'center' },
  passesText: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },
  modalText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  confirmBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  confirmText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.white },
});
