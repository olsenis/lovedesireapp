import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useSubscription } from '../hooks/useSubscription';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { useToast } from '../components/Toast';
import { notifyPartner } from '../services/notificationService';
import { addTodo } from '../services/todoService';
import { FantasyWishesItem, FWVote, subscribeFantasyWishes, addFantasyWishesItem, voteOnFantasyWish, isFWMatch, clearAndReloadFantasyWishes, markFWAddToListAtomic, fwBothWantToAdd } from '../services/fantasyWishesService';
import { FANTASY_WISHES_PRESETS } from '../constants/content';
import { personalise } from '../services/personalise';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { trackEvent } from '../services/statsService';

export default function FantasyWishesScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const { isSubscribed, isLoading: subLoading } = useSubscription();
  useTrackScreen('fantasy_wishes');
  // Screen-level paywall gate: this feature is paid-tier only. Guarding here
  // (instead of only on the Discover card + Us tab card) covers every entry
  // point — including Home nudges that route directly here — so a non-
  // subscribed user cannot bypass the paywall via deep link.
  useEffect(() => {
    if (!subLoading && !isSubscribed) {
      trackEvent('upgrade_cta_tapped');
      router.replace('/upgrade' as any);
    }
  }, [subLoading, isSubscribed]);
  const [items, setItems] = useState<FantasyWishesItem[]>([]);
  const [activeTab, setActiveTab] = useState<'explore' | 'matches'>('explore');
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Session-only skip set. Skipping doesn't record a vote — it just moves
  // the card to the back of the deck so the user can defer without either
  // saying yes/maybe/no or reloading the whole feature. Cleared on Reset.
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  // Session pacing. Every SESSION_BATCH votes we show a friendly pause
  // prompt with two paths: "Keep going" (dismiss, extend threshold by
  // another batch) or "Save for later" (park the deck at a rest state
  // with a "change my mind" affordance). Prevents decision-fatigue
  // grinding through 200+ presets in one sitting without gating anyone
  // who wants to keep exploring.
  const SESSION_BATCH = 8;
  const [votedInSession, setVotedInSession] = useState(0);
  const [nextPromptAt, setNextPromptAt] = useState(SESSION_BATCH);
  const [pausedForLater, setPausedForLater] = useState(false);
  // Match celebration: subtle. newMatchId names the wish card to render
  // in glow-highlight mode for ~2s after a fresh mutual Yes, plus a
  // small tappable toast that jumps to the Matches tab. Full-screen
  // celebration was tried Aug 2026 and reverted — too loud, interrupted
  // flow when matches happened rapidly.
  const [newMatchId, setNewMatchId] = useState<string | null>(null);
  // Migrated to shared useToast hook Aug 2026 (H7 Phase 2). Same visual
  // as the inline version; adds a second toast for the Intimacy Log
  // cross-flow prompt after a match. Match toast is emphasis-style
  // (burgundy fill), info toasts (+Add confirmation) are default style.
  const { toast, showToast } = useToast();
  // Track which items were already matched at last render so we only
  // celebrate NEW mutual Yes events, not historical ones on mount.
  const prevMatchIdsRef = useRef<Set<string> | null>(null);
  const help = useHelp('fantasy-wishes');

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeFantasyWishes(coupleId, setItems);
  }, [coupleId]);

  // Detect fresh mutual Yes matches. On first snapshot we snapshot existing
  // matches into the ref without celebrating (those are historical). Any
  // new match id that appears after that fires a celebration — either from
  // my own Yes landing on partner's Yes, or from partner's Yes landing on
  // mine while I'm looking at the screen.
  useEffect(() => {
    if (!partnerId || items.length === 0) return;
    const currentMatchIds = new Set(
      items.filter((i) => isFWMatch(i, uid, partnerId)).map((i) => i.id),
    );
    if (prevMatchIdsRef.current === null) {
      prevMatchIdsRef.current = currentMatchIds;
      return;
    }
    const freshMatchIds = [...currentMatchIds].filter((id) => !prevMatchIdsRef.current!.has(id));
    if (freshMatchIds.length > 0) {
      const matchedItem = items.find((i) => i.id === freshMatchIds[0]);
      if (matchedItem) {
        setNewMatchId(matchedItem.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast("It's a Match! ✨ Tap to see", {
          emphasis: true,
          onTap: () => setActiveTab('matches'),
        });
        // Clear the match highlight after the animation window so the
        // Matches list card returns to its normal appearance.
        setTimeout(() => setNewMatchId(null), 2200);
        // H26 delta 2 (Aug 2026): removed the "Did you try this? Log the
        // moment" cross-flow toast that fired ~3.6s after the match.
        // FW matches are aspirational ("someday we'd like to try this"),
        // not action moments — the log prompt was misreading the moment.
        // The +Add to Together List button on match cards is the correct
        // hand-off for planning; if the couple later acts on the wish,
        // they open Intimacy Log manually.
      }
    }
    prevMatchIdsRef.current = currentMatchIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, partnerId, uid]);

  // Partner-added toast. On mount we snapshot every id we already saw so
  // historical items don't fire a spurious "New wish" toast; any id that
  // shows up later gets one — unless it was added locally (own +Add call),
  // in which case the "Added ✓" toast handles it instead.
  const seenItemIdsRef = useRef<Set<string>>(new Set());
  const initialSeenRef = useRef<boolean>(false);
  useEffect(() => {
    if (items.length === 0) return;
    if (!initialSeenRef.current) {
      items.forEach((i) => seenItemIdsRef.current.add(i.id));
      initialSeenRef.current = true;
      return;
    }
    const newIds = items.filter((i) => !seenItemIdsRef.current.has(i.id)).map((i) => i.id);
    if (newIds.length === 0) return;
    newIds.forEach((id) => seenItemIdsRef.current.add(id));
    // Only fire the partner-added toast for items the partner (not us)
    // added. If we added the item locally, handleAdd already showed
    // "Added ✓" and we'd otherwise race two toasts against each other.
    const partnerOnlyIds = newIds.filter((id) => !locallyAddedIdsRef.current.has(id));
    if (partnerOnlyIds.length > 0 && !isLocallyAddingRef.current) {
      showToast('✨ New wish added');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handleVote = async (item: FantasyWishesItem, vote: FWVote) => {
    if (!coupleId || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voteOnFantasyWish(coupleId, item.id, uid, vote, partnerId);
    if (vote === 'yes' && partnerId) {
      const updated = { ...item, votes: { ...item.votes, [uid]: 'yes' as const } };
      if (isFWMatch(updated, uid, partnerId)) {
        notifyPartner(coupleId, uid, 'New match ✨', 'You have a shared fantasy wish').catch(() => {});
      }
    }
    // Deck auto-advances naturally: the item leaves unvotedInDeck via the
    // subscription round-trip, and currentItem recomputes to the next one.
    setVotedInSession((v) => v + 1);
  };

  const handleKeepGoing = () => {
    Haptics.selectionAsync();
    setNextPromptAt((n) => n + SESSION_BATCH);
    setPausedForLater(false);
  };
  const handleSaveForLater = () => {
    Haptics.selectionAsync();
    setPausedForLater(true);
  };

  const handleSkip = (item: FantasyWishesItem) => {
    Haptics.selectionAsync();
    // Skipped items move to the back of the derived deck order — the user
    // can still get to them later this session by finishing everything else,
    // and reset clears the skip set entirely.
    setSkipped((s) => {
      const next = new Set(s);
      next.add(item.id);
      return next;
    });
  };

  // Ids the local user just added. The partner-added-detection effect
  // reads this to skip firing its own toast for local additions,
  // otherwise "Partner added a wish" races over "Added ✓" and both
  // flash so fast the user can't read either.
  const locallyAddedIdsRef = useRef<Set<string>>(new Set());
  const isLocallyAddingRef = useRef(false);
  const handleAdd = async () => {
    if (!newText.trim() || !coupleId) return;
    isLocallyAddingRef.current = true;
    try {
      const newId = await addFantasyWishesItem(coupleId, newText.trim());
      locallyAddedIdsRef.current.add(newId);
      setNewText('');
      setShowAdd(false);
      showToast('Added ✓ · At the end of your deck');
    } finally {
      isLocallyAddingRef.current = false;
    }
  };

  const loadPresets = async () => {
    const id = profile?.coupleId;
    if (!id || loadingPresets) return;
    setLoadingPresets(true);
    try {
      await Promise.all(FANTASY_WISHES_PRESETS.map((p) => addFantasyWishesItem(id, p.text)));
    } finally {
      setLoadingPresets(false);
    }
  };

  const handleReset = async () => {
    const id = profile?.coupleId;
    if (!id || resetting) return;
    setResetting(true);
    try {
      await clearAndReloadFantasyWishes(id, FANTASY_WISHES_PRESETS);
      setSkipped(new Set());
      // Refs get re-populated by the initial-seen guard when the new items
      // land via the subscription. Clear so celebrations for the fresh set
      // fire correctly if a match happens right away.
      prevMatchIdsRef.current = null;
      seenItemIdsRef.current = new Set();
      initialSeenRef.current = false;
    } finally {
      setResetting(false);
    }
  };

  const handleAddToTogether = async (item: FantasyWishesItem) => {
    if (!coupleId || !user) return;
    if ((item.addToList ?? []).includes(uid)) return; // fast-path idempotency
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Atomic: reads addToList + writes + reports completedNow inside a
    // single transaction. Prevents the race where both partners press within
    // the same tick, each sees a stale snapshot without the other's uid, and
    // neither branch creates the todo.
    const { completedNow } = await markFWAddToListAtomic(coupleId, uid, partnerId, item.id);
    if (completedNow) {
      await addTodo(coupleId, item.text, 'intimacy', uid, 'fantasy-wishes');
    }
  };

  const myVote = (item: FantasyWishesItem): FWVote | null =>
    item.votes[uid] as FWVote ?? null;

  // Matches list ordered by the moment the mutual YES completed (matchedAt),
  // stamped atomically by voteOnFantasyWish when the second YES lands.
  // Legacy matches from before matchedAt existed fall back to createdAt so
  // ordering still works during the transition period.
  const matched = useMemo(
    () => items
      .filter((i) => partnerId && isFWMatch(i, uid, partnerId))
      .sort((a, b) => (b.matchedAt ?? b.createdAt) - (a.matchedAt ?? a.createdAt)),
    [items, partnerId, uid],
  );
  const votedCount = useMemo(() => items.filter((i) => myVote(i) !== null).length, [items, uid]);
  const totalCount = items.length;

  // Deck order: unvoted items in createdAt order, but any id in `skipped`
  // moves to the back so the user's Skip actions defer without dropping the
  // card entirely. Voting removes items from this list (they're no longer
  // unvoted); Skip just re-sorts to move them out of the front.
  const deck = useMemo(() => {
    const unvoted = items.filter((i) => myVote(i) === null);
    const front = unvoted.filter((i) => !skipped.has(i.id));
    const back = unvoted.filter((i) => skipped.has(i.id));
    return [...front, ...back];
  }, [items, skipped, uid]);
  const currentItem = deck[0] ?? null;
  const allDone = totalCount > 0 && deck.length === 0;
  // Show pacing prompt when session votes have crossed the current
  // threshold — unless the whole deck is empty (DoneState wins) or the
  // user has already parked the session (pausedForLater wins).
  const showSessionPrompt = !allDone && !pausedForLater && votedInSession >= nextPromptAt;

  // Partner-progress hint: how many wishes the partner still hasn't voted on.
  // Used in the DoneState to show whether they're behind us or caught up.
  const partnerLeft = useMemo(() => {
    if (!partnerId) return 0;
    return items.filter((i) => !i.votes[partnerId]).length;
  }, [items, partnerId]);

  // While the paywall check resolves or the user is being redirected away,
  // render nothing so a free user doesn't briefly see the FW UI flash
  // before the router.replace to /upgrade takes effect.
  if (subLoading || !isSubscribed) return null;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Fantasy Wishes</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleReset} disabled={resetting} accessibilityRole="button" accessibilityLabel="Reset wishes" accessibilityHint="Cannot be undone">
              <Text style={styles.resetBtn}>{resetting ? '…' : '↺'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowAdd(true)} accessibilityRole="button" accessibilityLabel="Add wish">
            <Text style={styles.addBtn}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>✨ Vote privately, only mutual Yes matches are ever revealed</Text>
      </View>

      {/* Shared toast (components/Toast.tsx) — fires on new match
          (emphasis + onTap→Matches tab) and on +Add / partner add
          (default, passive). H26 delta 2 (Aug 2026) removed the FW
          cross-flow log prompt; FW matches are aspirational, not
          immediate. Together List hand-off via +Add button on match
          cards remains. */}
      {toast}

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'explore' && styles.tabActive]} onPress={() => setActiveTab('explore')} accessibilityRole="button">
          <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'matches' && styles.tabActive]} onPress={() => setActiveTab('matches')} accessibilityRole="button">
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>✓ Matches ({matched.length})</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'explore' && (
        <View style={styles.exploreBody}>
          {items.length === 0 ? (
            <TouchableOpacity style={styles.emptyCard} onPress={loadPresets} disabled={loadingPresets} activeOpacity={0.7} accessibilityRole="button">
              <Text style={styles.emptyEmoji}>{loadingPresets ? '⏳' : '✨'}</Text>
              <Text style={styles.emptyTitle}>{loadingPresets ? 'Loading…' : 'Explore together'}</Text>
              <Text style={styles.emptyText}>
                {loadingPresets
                  ? 'Adding 120 wishes, this takes a moment'
                  : 'Tap to load explicit sexual scenarios. Only mutual Yes is ever revealed.'}
              </Text>
            </TouchableOpacity>
          ) : allDone ? (
            <DoneState
              votedCount={votedCount}
              totalCount={totalCount}
              matchesCount={matched.length}
              partnerLeft={partnerLeft}
              partnerName={partner?.name ?? 'partner'}
              onViewMatches={() => setActiveTab('matches')}
            />
          ) : pausedForLater ? (
            <SessionPausedState
              votedInSession={votedInSession}
              matchesCount={matched.length}
              onContinue={handleKeepGoing}
              onViewMatches={() => setActiveTab('matches')}
            />
          ) : showSessionPrompt ? (
            <SessionPromptCard
              votedInSession={votedInSession}
              matchesCount={matched.length}
              onKeepGoing={handleKeepGoing}
              onSaveForLater={handleSaveForLater}
            />
          ) : currentItem ? (
            <>
              {/* Session batch progress — fills 0→8 within the current
                  pause window. Not a quest meter to 394; just visual
                  rhythm for the "Load 8 more / Save for later" pacing
                  we already ship. Slim, textless, unshowy. */}
              <View style={styles.batchBarTrack}>
                <View
                  style={[
                    styles.batchBarFill,
                    { width: `${(Math.min(SESSION_BATCH, votedInSession - (nextPromptAt - SESSION_BATCH)) / SESSION_BATCH) * 100}%` },
                  ]}
                />
              </View>
              <WishDeckCard item={currentItem} onVote={handleVote} partnerName={partner?.name} />
              <TouchableOpacity style={styles.skipLink} onPress={() => handleSkip(currentItem)} activeOpacity={0.7} accessibilityRole="button">
                <Text style={styles.skipLinkText}>Skip for later ›</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}

      {activeTab === 'matches' && (
        <FlatList
          data={matched}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.matchesList}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>💫</Text>
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptyText}>When you both say Yes to something, it appears here</Text>
            </View>
          }
          renderItem={({ item }) => {
            const iPressed = (item.addToList ?? []).includes(uid);
            const theyPressed = !!partnerId && (item.addToList ?? []).includes(partnerId);
            const bothPressed = fwBothWantToAdd(item, uid, partnerId ?? '');
            const celebrating = item.id === newMatchId;
            return (
              <View style={[styles.matchCard, celebrating && styles.matchCardCelebrating]}>
                <Text style={styles.matchEmoji}>✨</Text>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchText}>{personalise(item.text, partner?.name)}</Text>
                  <Text style={styles.matchBadge}>✓ You both want this</Text>
                  {bothPressed ? (
                    <TouchableOpacity
                      onPress={() => router.push('/todo' as any)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Open Together List"
                    >
                      <Text style={styles.addedText}>✓ Added to Together List →</Text>
                    </TouchableOpacity>
                  ) : iPressed ? (
                    <Text style={styles.waitingText}>Waiting for {partner?.name ?? 'partner'} ✓</Text>
                  ) : (
                    <TouchableOpacity style={styles.addToListBtn} onPress={() => handleAddToTogether(item)} activeOpacity={0.8} accessibilityRole="button">
                      <Text style={styles.addToListBtnText}>
                        {theyPressed ? `${partner?.name ?? 'Partner'} wants to add, tap to confirm` : '+ Add to Together List'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add a wish</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe something you'd love to try…"
              placeholderTextColor={Colors.muted}
              value={newText}
              onChangeText={setNewText}
              multiline
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} accessibilityRole="button">
                <Text style={styles.saveBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Fantasy Wishes"
        description="A private list of explicit sexual scenarios. Vote independently, only mutual Yes is ever revealed to both of you."
        tips={[
          `One wish at a time, tap Yes or No. ${partner?.name ?? 'Your partner'} never sees your choices`,
          'Not sure yet? Skip for later, it goes to the back of your deck',
          'When you both say Yes → it appears in Matches',
          'Tap matches to add them to your Together List',
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </KeyboardAvoidingView>
  );
}

function WishDeckCard({ item, onVote, partnerName }: {
  item: FantasyWishesItem;
  onVote: (item: FantasyWishesItem, vote: FWVote) => void;
  partnerName?: string;
}) {
  // Maybe was dropped Aug 2026 — it added decision friction without value
  // (didn't count as match, effectively same outcome as No). Skip covers
  // "not sure yet". Existing Maybe votes in Firestore are preserved but
  // no longer surfaced anywhere in the UI.
  return (
    <View style={styles.deckCard}>
      <View style={styles.deckCardAccent} />
      <View style={styles.deckCardInner}>
        <View style={styles.deckCardBody}>
          <Text style={styles.deckWishText}>{personalise(item.text, partnerName)}</Text>
        </View>
        <View style={styles.deckVoteRow}>
          {(['yes', 'no'] as const).map((v) => {
            const labels = { yes: '✓ Yes', no: '✗ No' };
            const colors = { yes: Colors.success, no: Colors.error };
            return (
              <TouchableOpacity
                key={v}
                style={styles.deckVoteBtn}
                onPress={() => onVote(item, v)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={labels[v]}
              >
                <Text style={[styles.deckVoteText, { color: colors[v] }]}>{labels[v]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function DoneState({ votedCount, totalCount, matchesCount, partnerLeft, partnerName, onViewMatches }: {
  votedCount: number; totalCount: number; matchesCount: number;
  partnerLeft: number; partnerName: string; onViewMatches: () => void;
}) {
  return (
    <View style={styles.doneWrap}>
      <Text style={styles.doneEmoji}>✨</Text>
      <Text style={styles.doneTitle}>You've explored everything</Text>
      <View style={styles.doneStatsRow}>
        <Text style={styles.doneStat}>{matchesCount} matches</Text>
        <Text style={styles.doneStatDivider}>·</Text>
        <Text style={styles.doneStat}>{votedCount} voted</Text>
      </View>
      <Text style={styles.donePartnerHint}>
        {partnerLeft === 0 ? "You're both caught up ✓" : `${partnerName} has ${partnerLeft} left to explore`}
      </Text>
      <TouchableOpacity
        style={[styles.doneMatchesBtn, matchesCount === 0 && styles.doneMatchesBtnDisabled]}
        onPress={onViewMatches}
        disabled={matchesCount === 0}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.doneMatchesBtnText}>
          {matchesCount === 0 ? 'No matches yet' : `View ${matchesCount} match${matchesCount === 1 ? '' : 'es'} ›`}
        </Text>
      </TouchableOpacity>
      <Text style={styles.doneComeBack}>
        New wishes appear when either of you adds one, or use ↺ to reload the deck.
      </Text>
    </View>
  );
}

// Fires every SESSION_BATCH votes. Deliberate friendly friction — not a
// gate, just a "want a break?" nudge. Both buttons keep the user in
// control: keep going = extend the threshold, save for later = park the
// deck with a change-my-mind button on the paused state.
function SessionPromptCard({ votedInSession, matchesCount, onKeepGoing, onSaveForLater }: {
  votedInSession: number; matchesCount: number;
  onKeepGoing: () => void; onSaveForLater: () => void;
}) {
  return (
    <View style={styles.pauseWrap}>
      <Text style={styles.pauseEmoji}>💗</Text>
      <Text style={styles.pauseTitle}>You've explored {votedInSession} today</Text>
      {matchesCount > 0 && (
        <Text style={styles.pauseSub}>{matchesCount} match{matchesCount === 1 ? '' : 'es'} so far ✨</Text>
      )}
      <Text style={styles.pauseHint}>
        Coming back fresh tomorrow keeps each Yes meaningful. Or keep exploring if you're in the flow.
      </Text>
      <View style={styles.pauseBtnRow}>
        <TouchableOpacity style={[styles.pauseSecondaryBtn, { flex: 1 }]} onPress={onSaveForLater} activeOpacity={0.7} accessibilityRole="button">
          <Text style={styles.pauseSecondaryText}>Save for later</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pausePrimaryBtn, { flex: 1 }]} onPress={onKeepGoing} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.pausePrimaryText}>Load 8 more ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Shown after user picks "Save for later". Confirms the pause, offers
// a peek at matches so far, and a small change-my-mind link that flips
// straight back into the deck (same session state — no lost progress).
function SessionPausedState({ votedInSession, matchesCount, onContinue, onViewMatches }: {
  votedInSession: number; matchesCount: number;
  onContinue: () => void; onViewMatches: () => void;
}) {
  return (
    <View style={styles.pauseWrap}>
      <Text style={styles.pauseEmoji}>🕯️</Text>
      <Text style={styles.pauseTitle}>See you tomorrow</Text>
      <Text style={styles.pauseSub}>
        You explored {votedInSession} today
        {matchesCount > 0 && ` · ${matchesCount} match${matchesCount === 1 ? '' : 'es'} ✨`}
      </Text>
      <TouchableOpacity
        style={[styles.pausePrimaryBtn, matchesCount === 0 && styles.doneMatchesBtnDisabled, { marginTop: Spacing.md }]}
        onPress={onViewMatches}
        disabled={matchesCount === 0}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.pausePrimaryText}>
          {matchesCount === 0 ? 'No matches yet' : `View ${matchesCount} match${matchesCount === 1 ? '' : 'es'} ›`}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.pauseChangeMind} onPress={onContinue} activeOpacity={0.7} accessibilityRole="button">
        <Text style={styles.pauseChangeMindText}>Change my mind, keep exploring</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  addBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  resetBtn: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.muted },

  infoBanner: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm, backgroundColor: '#F3E5F5', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  infoText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: '#6A1B9A', textAlign: 'center' },

  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.burgundy },
  tabText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  tabTextActive: { color: Colors.cream },

  exploreBody: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  matchesList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },

  // ─── Batch progress bar (session pacing to SESSION_BATCH) ─────────────
  batchBarTrack: {
    height: 3, backgroundColor: Colors.border, borderRadius: 2,
    marginTop: Spacing.sm, overflow: 'hidden',
  },
  batchBarFill: { height: 3, backgroundColor: Colors.rose, borderRadius: 2 },

  // ─── Deck card ────────────────────────────────────────────────────────
  // Blush tint + rose left-border stripe to differentiate from Daily's white
  // card. Bigger vertical padding and centred heading font make it feel like
  // a moment rather than a list row.
  deckCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F8',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  deckCardAccent: { width: 4, backgroundColor: Colors.rose },
  // Inner column: text grows in the body, vote row stays at the bottom
  // in a stable padded row. Fixes the earlier bug where absolute-position
  // vote row overlapped long wish text.
  deckCardInner: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
    minHeight: 260,
  },
  deckCardBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  deckWishText: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 30,
  },
  deckVoteRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  deckVoteBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  deckVoteText: { fontFamily: Fonts.bodyBold, fontSize: 15 },

  skipLink: { alignSelf: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
  skipLinkText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted },

  // ─── Done state ───────────────────────────────────────────────────────
  doneWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  doneEmoji: { fontSize: 56 },
  doneTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy, textAlign: 'center' },
  doneStatsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  doneStat: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.text },
  doneStatDivider: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
  donePartnerHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center' },
  doneMatchesBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: Colors.burgundy,
    alignItems: 'center',
  },
  doneMatchesBtnDisabled: { backgroundColor: Colors.border },
  doneMatchesBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream, letterSpacing: 0.4 },
  doneComeBack: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center', marginTop: Spacing.md, paddingHorizontal: Spacing.lg, lineHeight: 18 },

  // ─── Matches tab (unchanged) ──────────────────────────────────────────
  emptyCard: { alignItems: 'center', padding: Spacing.xxl, backgroundColor: Colors.white, borderRadius: Radius.xl, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },

  matchCard: { borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#F3E5F5' },
  matchCardCelebrating: { borderColor: Colors.burgundy, borderWidth: 2, backgroundColor: '#FCE4EC' },
  matchEmoji: { fontSize: 28, marginTop: 2 },
  matchInfo: { flex: 1, gap: 4 },
  matchText: { fontFamily: Fonts.heading, fontSize: 17, color: Colors.text, lineHeight: 24 },
  matchBadge: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.success },
  addToListBtn: { marginTop: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  addToListBtnText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.cream },
  addedText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.success, marginTop: 4 },
  waitingText: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 4 },

  // Toast styles moved to components/Toast.tsx Aug 2026.

  // ─── Add modal (unchanged) ────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  // ─── Session pause card (every 8 votes) ────────────────────────────
  pauseWrap: {
    backgroundColor: '#FFF5F8',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  pauseEmoji: { fontSize: 48 },
  pauseTitle: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.burgundy, textAlign: 'center' },
  pauseSub: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text, textAlign: 'center' },
  pauseHint: {
    fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted,
    textAlign: 'center', lineHeight: 20, marginTop: 4, paddingHorizontal: Spacing.sm,
  },
  pauseBtnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, alignSelf: 'stretch' },
  pauseSecondaryBtn: {
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', minWidth: 120,
  },
  pauseSecondaryText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  pausePrimaryBtn: {
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full, backgroundColor: Colors.burgundy,
    alignItems: 'center', justifyContent: 'center',
  },
  pausePrimaryText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream, letterSpacing: 0.3 },
  pauseChangeMind: { marginTop: Spacing.md, paddingVertical: Spacing.sm },
  pauseChangeMindText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
});
