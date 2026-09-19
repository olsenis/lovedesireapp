import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useSpicyConsent } from '../hooks/useSpicyConsent';
import { useCouple } from '../hooks/useCouple';
import { usePaidAccess } from '../hooks/usePaidAccess';
import { PremiumEndedBanner } from '../components/PremiumEndedBanner';
import { ReactionRow } from '../components/ReactionRow';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { useToast } from '../components/Toast';
import { notifyPartner } from '../services/notificationService';
import { addTodo } from '../services/todoService';
import { FantasyWishesItem, FWVote, FWState, CustomWish, subscribeFWState, subscribeCustomWishes, composeFWItems, cleanupLegacyFantasyWishes, addFantasyWishesItem, voteOnFantasyWish, isFWMatch, resetFantasyWishes, markFWAddToListAtomic, fwBothWantToAdd, setFWCategory, reactToFantasyWish, replyToFantasyWish } from '../services/fantasyWishesService';
import { ConfirmModal } from '../components/ConfirmModal';
import { FANTASY_WISHES_CATEGORY_CONFIG, FW_CATEGORY_ORDER, FantasyWishesCategory } from '../constants/content';
import { personalise } from '../services/personalise';
import { seededPick } from '../services/seed';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';
import { noteHappyMoment } from '../services/reviewPromptService';

export default function FantasyWishesScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  useTrackScreen('fantasy_wishes');
  // Storage like Daily (Sep 19 2026): the deck is the app's own list, the
  // couple has ONE state doc (votes, matches, hearts) plus docs for wishes
  // they wrote themselves. No seeding and no loading: the first card is
  // there at once. See services/fantasyWishesService.ts.
  const [fwState, setFwState] = useState<FWState | null>(null);
  const [customs, setCustoms] = useState<CustomWish[]>([]);
  const [loaded, setLoaded] = useState(false);
  const items = useMemo(() => composeFWItems(fwState, customs), [fwState, customs]);
  // Paid screen with a read view (USER_VOICE A2): a lapsed couple keeps
  // their Matches, loses the deck, adding and reset. Nothing to read →
  // /upgrade as before. "Something to read" = at least one match.
  const hasMatches = Object.keys(fwState?.matched ?? {}).length > 0;
  const { ready, readOnly } = usePaidAccess(loaded ? hasMatches : null);
  // Spicy session consent (Sep 2026): the whole feature is explicit, so
  // ask once per day on entry; "Not tonight" leaves the screen. Applies
  // to the read view too (matches are explicit text).
  const { spicyOk, requireSpicyConsent, spicyGate } = useSpicyConsent(user?.uid ?? '');
  const consentAskedRef = useRef(false);
  useEffect(() => {
    if (!ready || spicyOk !== false || consentAskedRef.current) return;
    consentAskedRef.current = true;
    requireSpicyConsent('solo', () => {}, () => router.back());
  }, [ready, spicyOk, requireSpicyConsent]);
  // Home's match cards deep-link straight to Matches (?tab=matches).
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'explore' | 'matches'>(tabParam === 'matches' ? 'matches' : 'explore');
  useEffect(() => { if (readOnly) setActiveTab('matches'); }, [readOnly]);
  const [showAdd, setShowAdd] = useState(false);
  // Category choice sheet (USER_VOICE A6). The choice itself lives on the
  // couple doc; this is only the sheet's visibility plus a one-time hint.
  const [showCategories, setShowCategories] = useState(false);
  // "Draw one for tonight" (USER_VOICE C12): a seeded pick from the
  // matches, same on both phones the same day; nothing is written.
  const [drawCount, setDrawCount] = useState(0);
  const [drawnId, setDrawnId] = useState<string | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [newText, setNewText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
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
    const u1 = subscribeFWState(coupleId, (st) => { setFwState(st); setLoaded(true); });
    const u2 = subscribeCustomWishes(coupleId, setCustoms);
    return () => { u1(); u2(); };
  }, [coupleId]);

  // A couple from before the storage change still has the copied preset
  // docs. Remove them once, in the background; nothing on screen waits.
  const legacyCleanedRef = useRef(false);
  useEffect(() => {
    if (!coupleId || legacyCleanedRef.current) return;
    if (!customs.some((c) => c.votes !== undefined)) return;
    legacyCleanedRef.current = true;
    cleanupLegacyFantasyWishes(coupleId).catch(() => { legacyCleanedRef.current = false; });
  }, [coupleId, customs]);

  // Detect fresh mutual Yes matches. On first snapshot we snapshot existing
  // matches into the ref without celebrating (those are historical). Any
  // new match id that appears after that fires a celebration — either from
  // my own Yes landing on partner's Yes, or from partner's Yes landing on
  // mine while I'm looking at the screen.
  useEffect(() => {
    if (!partnerId || !loaded) return;
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
    const own = customs.filter((c) => c.votes === undefined);
    if (!initialSeenRef.current) {
      if (!loaded) return;
      own.forEach((i) => seenItemIdsRef.current.add(i.id));
      initialSeenRef.current = true;
      return;
    }
    const newIds = own.filter((i) => !seenItemIdsRef.current.has(i.id)).map((i) => i.id);
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
  }, [customs, loaded]);

  const handleVote = async (item: FantasyWishesItem, vote: FWVote) => {
    if (!coupleId || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { newMatch } = await voteOnFantasyWish(coupleId, item, uid, vote, partnerId);
    if (newMatch) {
      if (partnerId) {
        notifyPartner(
          coupleId, uid,
          'New match ✨', 'You have a shared fantasy wish',
          { title: 'Fantasy Wishes', body: 'Something new for the two of you.' },
        ).catch(() => {});
        noteHappyMoment('fw_match');
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
      const newId = await addFantasyWishesItem(coupleId, newText.trim(), uid);
      locallyAddedIdsRef.current.add(newId);
      setNewText('');
      setShowAdd(false);
      showToast('Added ✓ · At the end of your deck');
    } finally {
      isLocallyAddingRef.current = false;
    }
  };

  // "Start over": clears BOTH partners' votes, matches, hearts and lines.
  // The couple's own wishes stay. Always behind a confirm (it used to be a
  // single tap on ↺).
  const handleReset = async () => {
    const id = profile?.coupleId;
    if (!id || resetting) return;
    setConfirmReset(false);
    setResetting(true);
    try {
      await resetFantasyWishes(id);
      setSkipped(new Set());
      setDrawnId(null);
      prevMatchIdsRef.current = null;
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
  // Category choice (USER_VOICE A6): couples/{id}.fwCategories, absent = on.
  // Items without a category (couple-written, or loaded before categories
  // existed) are always in play. Matches are never filtered.
  const fwCats = couple?.fwCategories ?? {};
  const catOn = (c?: FantasyWishesCategory) => !c || fwCats[c] !== false;
  const categoriesOff = FW_CATEGORY_ORDER.filter((c) => fwCats[c] === false);
  // Retired cards (matched once, no longer in the pool) live in Matches only.
  const playable = useMemo(() => items.filter((i) => !i.retired && catOn(i.category)), [items, couple?.fwCategories]);
  const drawOne = () => {
    if (matched.length < 2 || !coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = drawCount + 1;
    const day = new Date().toISOString().slice(0, 10);
    const pick = seededPick(matched, 1, `${day}::${coupleId}::${next}`)[0];
    setDrawCount(next);
    setDrawnId(pick?.id ?? null);
  };
  const matchesList = useMemo(() => {
    if (!drawnId) return matched;
    const drawn = matched.find((i) => i.id === drawnId);
    return drawn ? [drawn, ...matched.filter((i) => i.id !== drawnId)] : matched;
  }, [matched, drawnId]);
  const votedCount = useMemo(() => playable.filter((i) => myVote(i) !== null).length, [playable, uid]);
  const totalCount = playable.length;
  const nothingOn = playable.length === 0;

  // Deck order: unvoted playable items, gentle categories first (sensual,
  // roleplay, explicit, bdsm, then uncategorised), createdAt within a
  // category, and any id in `skipped` moves to the back so Skip defers
  // without dropping the card. Voting removes items (no longer unvoted).
  const deck = useMemo(() => {
    const rank = (c?: FantasyWishesCategory) => (c ? FW_CATEGORY_ORDER.indexOf(c) : FW_CATEGORY_ORDER.length);
    const unvoted = playable
      .filter((i) => myVote(i) === null)
      .sort((a, b) => rank(a.category) - rank(b.category) || a.createdAt - b.createdAt);
    const front = unvoted.filter((i) => !skipped.has(i.id));
    const back = unvoted.filter((i) => skipped.has(i.id));
    return [...front, ...back];
  }, [playable, skipped, uid]);
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
    return playable.filter((i) => !i.votes[partnerId]).length;
  }, [playable, partnerId]);

  // Nothing until the gate has decided (no UI flash for a redirect).
  if (!ready) return null;

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
        {readOnly ? <View style={{ width: 60 }} /> : <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setShowCategories(true)} accessibilityRole="button" accessibilityLabel="Choose categories">
            <Text style={styles.resetBtn}>☰</Text>
          </TouchableOpacity>
          {!!fwState && (
            <TouchableOpacity onPress={() => setConfirmReset(true)} disabled={resetting} accessibilityRole="button" accessibilityLabel="Start over" accessibilityHint="Clears votes and matches for both of you">
              <Text style={styles.resetBtn}>{resetting ? '…' : '↺'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowAdd(true)} accessibilityRole="button" accessibilityLabel="Add wish">
            <Text style={styles.addBtn}>+ Add</Text>
          </TouchableOpacity>
        </View>}
      </View>

      {readOnly ? <PremiumEndedBanner /> : <View style={styles.infoBanner}>
        <Text style={styles.infoText}>✨ Vote privately, only mutual Yes matches are ever revealed</Text>
      </View>}
      {!readOnly && Object.keys(fwCats).length === 0 && !hintDismissed && (
        <TouchableOpacity style={styles.catHint} onPress={() => { setHintDismissed(true); setShowCategories(true); }} activeOpacity={0.7} accessibilityRole="button">
          <Text style={styles.catHintText}>Sensual comes first. Choose what is for the two of you ›</Text>
        </TouchableOpacity>
      )}

      {/* Shared toast (components/Toast.tsx) — fires on new match
          (emphasis + onTap→Matches tab) and on +Add / partner add
          (default, passive). H26 delta 2 (Aug 2026) removed the FW
          cross-flow log prompt; FW matches are aspirational, not
          immediate. Together List hand-off via +Add button on match
          cards remains. */}
      {toast}
      {spicyGate}

      {!readOnly && <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'explore' && styles.tabActive]} onPress={() => setActiveTab('explore')} accessibilityRole="button">
          <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'matches' && styles.tabActive]} onPress={() => setActiveTab('matches')} accessibilityRole="button">
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>✓ Matches ({matched.length})</Text>
        </TouchableOpacity>
      </View>}

      {activeTab === 'explore' && !readOnly && (
        <View style={styles.exploreBody}>
          {nothingOn ? (
            <TouchableOpacity style={styles.emptyCard} onPress={() => setShowCategories(true)} activeOpacity={0.7} accessibilityRole="button">
              <Text style={styles.emptyEmoji}>☰</Text>
              <Text style={styles.emptyTitle}>Every category is off</Text>
              <Text style={styles.emptyText}>Turn one back on to keep exploring. Your matches are still in the Matches tab.</Text>
            </TouchableOpacity>
          ) : allDone ? (
            <DoneState
              votedCount={votedCount}
              totalCount={totalCount}
              matchesCount={matched.length}
              partnerLeft={partnerLeft}
              partnerName={partner?.name ?? 'partner'}
              onViewMatches={() => setActiveTab('matches')}
              categoriesOff={categoriesOff.length}
              onOpenCategories={() => setShowCategories(true)}
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
          data={matchesList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.matchesList}
          ListHeaderComponent={matched.length >= 2 ? (
            <TouchableOpacity style={styles.drawBtn} onPress={drawOne} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Draw one of your matches for tonight">
              <Text style={styles.drawBtnText}>{drawnId ? '🎲 Draw again' : '🎲 Draw one for tonight'}</Text>
            </TouchableOpacity>
          ) : null}
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
            const celebrating = item.id === newMatchId || item.id === drawnId;
            return (
              <View style={[styles.matchCard, celebrating && styles.matchCardCelebrating]}>
                <Text style={styles.matchEmoji}>✨</Text>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchText}>{personalise(item.text, partner?.name)}</Text>
                  <Text style={styles.matchBadge}>{item.id === drawnId ? "🎲 Tonight's draw" : '✓ You both want this'}</Text>
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
                  {/* A heart and one line on the match (USER_VOICE C2); works in the read view too, the match is the couple's own data. */}
                  <ReactionRow
                    mine={{ reaction: !!item.reactions?.[uid], reply: item.replies?.[uid] }}
                    theirs={{ reaction: !!(partnerId && item.reactions?.[partnerId]), reply: partnerId ? item.replies?.[partnerId] : undefined }}
                    partnerName={partner?.name ?? 'Partner'}
                    onReact={(on) => { if (coupleId) reactToFantasyWish(coupleId, uid, item.id, on).catch(() => {}); }}
                    onReply={async (t) => {
                      if (!coupleId) return;
                      await replyToFantasyWish(coupleId, uid, item.id, t);
                      const clean = t.trim();
                      if (clean) {
                        const title = `${profile?.name ?? 'Your partner'} replied 💬`;
                        notifyPartner(coupleId, uid, title, clean.slice(0, 80), { title, body: 'Open to read it.' }).catch(() => {});
                      }
                    }}
                  />
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

      {/* Category choice sheet (USER_VOICE A6). Both partners see the
          same deck because the choice lives on the couple doc. */}
      <Modal visible={showCategories} transparent animationType="slide" onRequestClose={() => setShowCategories(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Categories</Text>
            <Text style={styles.catNote}>Turn off anything that is not for the two of you. Nothing is deleted; turned-off cards just stay out of the deck. Either of you can change this.</Text>
            {FW_CATEGORY_ORDER.map((c) => {
              const cfg = FANTASY_WISHES_CATEGORY_CONFIG[c];
              const on = fwCats[c] !== false;
              return (
                <View key={c} style={styles.catRow}>
                  <Text style={styles.catEmoji}>{cfg.emoji}</Text>
                  <View style={styles.catText}>
                    <Text style={styles.catLabel}>{cfg.label}</Text>
                    <Text style={styles.catDesc}>{cfg.description}</Text>
                  </View>
                  <Switch
                    value={on}
                    onValueChange={(next) => { if (coupleId) setFWCategory(coupleId, c, next).catch(() => {}); }}
                    trackColor={{ false: Colors.border, true: Colors.rose }}
                    thumbColor={on ? Colors.burgundy : Colors.muted}
                    accessibilityLabel={`${cfg.label} ${on ? 'on' : 'off'}`}
                  />
                </View>
              );
            })}
            <TouchableOpacity style={styles.saveBtn} onPress={() => setShowCategories(false)} accessibilityRole="button">
              <Text style={styles.saveBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmReset}
        title="Start over?"
        message={`This clears the votes, matches, hearts and replies of both you and ${partner?.name ?? 'your partner'}. Wishes you wrote yourselves stay. It cannot be undone.`}
        confirmLabel="Start over"
        destructive
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
      <HelpModal
        visible={help.visible}
        title="Fantasy Wishes"
        description={`Explicit scenarios for the two of you. You each vote in private, and only a Yes from both is ever shown.`}
        tips={[
          `Yes or No, one card at a time. ${partner?.name ?? 'your partner'} never sees your votes`,
          `Skip for later if you are not sure. ☰ turns off whole categories`,
          `A Yes from both lands in Matches, where 🎲 draws one for tonight`,
          `Someone who says Yes to everything would see all your Yeses. Vote honestly`,
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

function DoneState({ votedCount, totalCount, matchesCount, partnerLeft, partnerName, onViewMatches, categoriesOff, onOpenCategories }: {
  votedCount: number; totalCount: number; matchesCount: number;
  partnerLeft: number; partnerName: string; onViewMatches: () => void;
  categoriesOff: number; onOpenCategories: () => void;
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
      {categoriesOff > 0 && (
        <TouchableOpacity onPress={onOpenCategories} activeOpacity={0.7} accessibilityRole="button">
          <Text style={styles.doneCategoriesLink}>
            {categoriesOff === 1 ? 'One category is off. Turn it on to keep going ›' : `${categoriesOff} categories are off. Turn one on to keep going ›`}
          </Text>
        </TouchableOpacity>
      )}
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
          <Text style={styles.pauseSecondaryText} numberOfLines={1}>Save for later</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pausePrimaryBtn, { flex: 1 }]} onPress={onKeepGoing} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.pausePrimaryText} numberOfLines={1}>Load 8 more ›</Text>
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
  catHint: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  catHintText: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.burgundy, textAlign: 'center' },
  catNote: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 19, marginBottom: Spacing.sm },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  catEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  catText: { flex: 1 },
  catLabel: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  catDesc: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  doneCategoriesLink: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, textAlign: 'center', marginTop: Spacing.sm },

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
  drawBtn: { backgroundColor: Colors.burgundy, borderRadius: Radius.full, paddingVertical: 12, alignItems: 'center' },
  drawBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
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
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pauseSecondaryText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.muted },
  pausePrimaryBtn: {
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full, backgroundColor: Colors.burgundy,
    alignItems: 'center', justifyContent: 'center',
  },
  pausePrimaryText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.cream, letterSpacing: 0.3 },
  pauseChangeMind: { marginTop: Spacing.md, paddingVertical: Spacing.sm },
  pauseChangeMindText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
});
