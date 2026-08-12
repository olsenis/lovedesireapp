import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useSubscription } from '../hooks/useSubscription';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { ActivityCardsSession, MAX_PASSES, subscribeActivityCards, flipCard, usePass, markCardDone, skipReceivedCard, resetActivityCards, uncompleteCard } from '../services/bingoService';
import { addTodo } from '../services/todoService';
import { notifyPartner } from '../services/notificationService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';

export default function ActivityCardsScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const { isSubscribed, isLoading: subLoading } = useSubscription();
  useTrackScreen('activity_cards');
  // Screen-level paywall gate — Discover card is gated but Home nudges
  // route directly here and could bypass the paywall for non-subscribed
  // users. Enforce at the screen so every entry point is covered.
  useEffect(() => {
    if (!subLoading && !isSubscribed) {
      router.replace('/upgrade' as any);
    }
  }, [subLoading, isSubscribed]);
  const [session, setSession] = useState<ActivityCardsSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [undoCard, setUndoCard] = useState<{ index: number; text: string } | null>(null);
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
    notifyPartner(coupleId, uid, 'Activity Cards 🃏', `${profile?.name ?? 'Your partner'} picked "${activity}", your turn!`).catch(() => {});
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
  const completed = session?.completed ?? [];
  const completedSet = new Set(completed);
  const hasPendingCard = session?.pendingCard !== null && session?.pendingCard !== undefined;
  // flipCard sets turnUid to the partner (the receiver), so when you ARE the
  // receiver, isMyTurn is true AND there's a pending card. The previous
  // `!isMyTurn` was inverted and meant receivers never saw the accept/skip modal.
  const isReceiver = hasPendingCard && isMyTurn;

  const handleMarkDone = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Alternation: whoever just confirmed the challenge picks the next
    // card. Previously nextTurn was set back to partnerId, which meant
    // the original picker kept picking every round and the receiver
    // never got to choose. Passing `uid` makes turns alternate cleanly.
    await markCardDone(coupleId, session.pendingCard!, uid);
    notifyPartner(coupleId, uid, 'Activity Cards ✓', `${profile?.name ?? 'Your partner'} confirmed the challenge, they're picking next`).catch(() => {});
  };

  // Two-phase acceptance: "Let's do this now" commits the round + turn,
  // then a lightweight follow-up asks about capturing a photo. Splitting
  // the ex-double-primary ("We did it!" + "Capture this moment") means
  // capturing is a bonus offered after the commitment, not a competing
  // primary CTA that made the modal feel busy.
  const [showCaptureQ, setShowCaptureQ] = useState(false);
  const handleDoItNow = async () => {
    await handleMarkDone();
    setShowCaptureQ(true);
  };

  const handleSkipReceived = async () => {
    if (!coupleId || !session || !partnerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Same alternation as markCardDone — skipping still counts as
    // resolving the round, so the next pick belongs to the receiver.
    await skipReceivedCard(coupleId, uid, session, uid);
    notifyPartner(coupleId, uid, 'Activity Cards', `${profile?.name ?? 'Your partner'} skipped this one, they're picking next`).catch(() => {});
  };

  // Save-for-later: some activities (skinny dipping, weekend trips, etc.)
  // can't be done in the moment. Instead of forcing "we did it" or losing
  // the card via skip, save it to the Together List for later. Card is
  // removed from the deck like a normal completion, turn alternates.
  // Toast surfaces briefly so the user knows the save actually happened
  // and where the item went — tap the toast to jump straight to the list.
  const [savedToast, setSavedToast] = useState(false);
  const handleSaveForLater = async () => {
    if (!coupleId || !session || !partnerId) return;
    if (session.pendingCard === null || session.pendingCard === undefined) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const activityText = session.squares[session.pendingCard];
    try {
      await addTodo(coupleId, activityText, 'intimacy', uid, 'activity-cards');
    } catch { /* non-fatal */ }
    await markCardDone(coupleId, session.pendingCard, uid);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 6000);
    notifyPartner(coupleId, uid, 'Activity Cards 💾', `${profile?.name ?? 'Your partner'} saved this challenge to your Together List`).catch(() => {});
  };

  // Don't render the deck while paywall check resolves or during redirect
  // to /upgrade, otherwise a free user briefly sees the UI flash.
  if (subLoading || !isSubscribed) return null;
  if (loading || !session) return null;

  const revealed = session.revealed ?? [];
  const revealedSet = new Set(revealed);
  const remaining = 25 - revealed.length;
  const currentMonthName = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.screen}>
      {/* Save-to-list toast: tap to jump to the list where the item now lives. */}
      {savedToast && (
        <TouchableOpacity
          style={styles.savedToast}
          onPress={() => { setSavedToast(false); router.push('/todo' as any); }}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="View Together List"
        >
          <Text style={styles.savedToastText}>💾 Saved to Together List — tap to view</Text>
        </TouchableOpacity>
      )}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Activity Cards</Text>
        <TouchableOpacity onPress={() => setConfirmReset(true)} style={styles.resetBtn} accessibilityRole="button" accessibilityLabel="Reset deck">
          <Text style={styles.resetBtnText}>↺ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.month}>{currentMonthName}</Text>

        {/* Turn indicator */}
        <View style={[styles.turnBadge, { backgroundColor: isReceiver ? '#E8F5E9' : isMyTurn ? Colors.burgundy : Colors.blush }]}>
          <Text style={[styles.turnText, { color: isReceiver ? '#2E7D32' : isMyTurn ? Colors.white : Colors.burgundy }]}>
            {isReceiver
              ? `${partnerName} sent you a challenge!`
              : isMyTurn
              ? 'Your turn, pick any card'
              : `${partnerName}'s turn to pick`}
          </Text>
        </View>
        {/* Deck mode indicator — helps users understand why some
            planned/seasonal cards aren't showing up. Absent = legacy
            doc from before deckMode existed, treat as quick. */}
        <Text style={styles.deckModeText}>
          {(session.deckMode ?? 'quick') === 'quick' ? '✨ Quick deck, tap ↺ New for bucket-list mode' : '🌙 Bucket-list deck'}
        </Text>

        {/* Progress + passes */}
        <Text style={styles.progressText}>{revealed.length} of 25 flipped · {remaining} remaining</Text>
        {isMyTurn && (
          <Text style={styles.passesText}>
            {passesLeft > 0 ? `${passesLeft} pass${passesLeft !== 1 ? 'es' : ''} left` : 'No passes left, must accept next card'}
          </Text>
        )}

        {/* 5×5 Card grid */}
        <View style={styles.grid}>
          {session.squares.map((activity, index) => {
            const isDone = completedSet.has(index);
            const isPending = session.pendingCard === index;
            const isRevealed = revealedSet.has(index);
            const canTap = isMyTurn && !isRevealed && !isReceiver;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.card,
                  isRevealed && !isDone && styles.cardPending,
                  isDone && styles.cardDone,
                  isPending && styles.cardPendingHighlight,
                  canTap && styles.cardCanTap,
                ]}
                onPress={() => handleCardTap(index)}
                onLongPress={isDone ? () => setUndoCard({ index, text: activity }) : undefined}
                disabled={!canTap && !isDone}
                activeOpacity={canTap ? 0.75 : 1}
               accessibilityRole="button">
                {isDone ? (
                  <>
                    <Text style={styles.cardDoneEmoji}>✓</Text>
                    <Text style={styles.cardDoneText} numberOfLines={2}>{activity}</Text>
                  </>
                ) : isRevealed ? (
                  <>
                    <Text style={styles.cardRevealedText} numberOfLines={3}>{activity}</Text>
                    {isPending && <Text style={styles.cardPendingLabel}>!</Text>}
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

        <Text style={styles.hint}>🟣 Pick · 🟡 Pending · 🟢 Done</Text>
      </ScrollView>

      {/* Receiver modal — shown when partner sent a card */}
      <Modal visible={isReceiver} transparent animationType="fade">
        <View style={styles.revealOverlay}>
          <Animated.View style={styles.revealCard}>
            <Text style={styles.revealLabel}>{partnerName} sent you a challenge</Text>
            <Text style={styles.revealActivity}>
              {hasPendingCard ? session.squares[session.pendingCard!] : ''}
            </Text>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleDoItNow} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.acceptBtnText}>✨ Let's do this now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveLaterBtn} onPress={handleSaveForLater} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.saveLaterBtnText}>💾 Save to Together List for later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelRevealBtn} onPress={handleSkipReceived} accessibilityRole="button">
              <Text style={styles.cancelRevealText}>Skip, not for us</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Follow-up capture modal — fires after "Let's do this now" so
          capturing a memory is offered as a bonus rather than a
          competing primary CTA in the initial challenge modal. */}
      <Modal visible={showCaptureQ} transparent animationType="fade" onRequestClose={() => setShowCaptureQ(false)}>
        <View style={styles.revealOverlay}>
          <View style={styles.revealCard}>
            <Text style={styles.revealLabel}>Nice one</Text>
            <Text style={[styles.revealActivity, { fontSize: 24 }]}>
              Want to capture this moment together?
            </Text>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => { setShowCaptureQ(false); router.push('/moments' as any); }} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.acceptBtnText}>📸 Yes, capture it</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelRevealBtn} onPress={() => setShowCaptureQ(false)} accessibilityRole="button">
              <Text style={styles.cancelRevealText}>Not this time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reveal modal */}
      <Modal visible={revealIndex !== null} transparent animationType="fade" onRequestClose={() => setRevealIndex(null)}>
        <View style={styles.revealOverlay}>
          <Animated.View style={[styles.revealCard, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.revealLabel}>Your challenge</Text>
            <Text style={styles.revealActivity}>
              {revealIndex !== null ? session.squares[revealIndex] : ''}
            </Text>
            <Text style={styles.revealHint}>Do this together, then it's {partnerName}'s turn</Text>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.acceptBtnText}>✓ Accept this challenge</Text>
            </TouchableOpacity>
            {passesLeft > 0 ? (
              <TouchableOpacity style={styles.cancelRevealBtn} onPress={handlePass} accessibilityRole="button">
                <Text style={styles.cancelRevealText}>Pass — put it back ({passesLeft} left)</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noPassesText}>No passes left — you must accept</Text>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Undo completed card */}
      {undoCard && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Unmark this card?</Text>
              <Text style={styles.modalText}>"{undoCard.text}"</Text>
              <Text style={[styles.modalText, { fontSize: 13, marginTop: 4 }]}>
                It'll go back to pending. Use this if you tapped done by mistake.
              </Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setUndoCard(null)} accessibilityRole="button">
                  <Text style={styles.cancelText}>Keep done</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={async () => {
                    if (!coupleId) return;
                    await uncompleteCard(coupleId, undoCard.index);
                    setUndoCard(null);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmText}>Unmark</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Reset confirmation with deck-mode picker: quick-only for
          spontaneous "do this tonight" activities, all-in for bucket-list
          mode that includes planned items like weekend trips or seasonal
          things (skinny dipping, sunrise, day trips). */}
      <Modal visible={confirmReset} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New deck?</Text>
            <Text style={styles.modalText}>Pick which activities to shuffle in:</Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={async () => {
                if (!coupleId || !session) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await resetActivityCards(coupleId, session, uid, 'quick');
                setConfirmReset(false);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>✨ Quick only, do tonight</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.burgundy, marginTop: 8 }]}
              onPress={async () => {
                if (!coupleId || !session) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await resetActivityCards(coupleId, session, uid, 'all');
                setConfirmReset(false);
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.confirmText, { color: Colors.burgundy }]}>🌙 Bucket list, includes planned</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 8 }]} onPress={() => setConfirmReset(false)} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Activity Cards"
        description="25 face-down cards, each with an intimate activity. Take turns picking one, you never know what you'll get!"
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
  cardPending: { backgroundColor: '#FFF9C4', borderWidth: 1, borderColor: '#F9A825' },
  cardPendingHighlight: { borderWidth: 2, borderColor: Colors.burgundy },
  cardDone: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#4CAF50' },
  cardDoneEmoji: { fontSize: 14, color: '#2E7D32' },
  cardDoneText: { fontFamily: Fonts.body, fontSize: 6, color: '#2E7D32', textAlign: 'center', lineHeight: 9 },
  cardPendingLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.burgundy },
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
  captureBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  captureBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  saveLaterBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  saveLaterBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  deckModeText: { fontFamily: Fonts.bodyItalic, fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: 4 },
  // Floating confirmation toast after Save to Together List — sits on top
  // of the screen so it's visible whether the user is at the deck or has
  // scrolled. Burgundy fill matches the celebratory Fantasy Wishes match
  // toast so users learn one visual language for "action succeeded".
  savedToast: {
    position: 'absolute', top: 60, left: Spacing.lg, right: Spacing.lg,
    backgroundColor: Colors.burgundy, borderRadius: Radius.full,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
    zIndex: 10, ...Shadow.md,
  },
  savedToastText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream, textAlign: 'center' },
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
