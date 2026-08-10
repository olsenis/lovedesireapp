import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/useAuth';
import { useCouple } from '../hooks/useCouple';
import { useSubscription } from '../hooks/useSubscription';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import {
  DailyWishDoc, DailyVote,
  subscribeDailyWishes, voteDailyWish, isMatch, markAddToListAtomic, bothWantToAdd,
} from '../services/dailyWishService';
import {
  DailyQuestionDoc,
  subscribeDailyQuestions, submitAnswer, bothAnswered,
} from '../services/dailyQuestionsService';
import { addTodo } from '../services/todoService';
import { notifyPartner } from '../services/notificationService';
import { DAILY_WISH_CATEGORY_CONFIG, QUESTION_CATEGORY_CONFIG, DailyWishCategory, QuestionCategory, Question } from '../constants/content';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';

// The merged screen uses the QUESTION_CATEGORY_CONFIG naming (playful /
// deep / spicy) as the surface identity — Daily Picks' original sweet /
// flirty categories become sub-pools that render under Playful and Spicy
// respectively. Deep has no actions; that's by design (see plan).
type MergedCategory = QuestionCategory;
const MERGED_CATEGORIES: MergedCategory[] = ['playful', 'deep', 'spicy'];
const PAID_MERGED_CATEGORIES: MergedCategory[] = ['deep', 'spicy'];

// Which underlying DP categories flow into each merged bucket. Deep gained
// its own action pool in August 2026 — the tab was previously questions-
// only which felt thin at 3 cards next to Playful (8) and Spicy (13).
const DP_SOURCES: Record<MergedCategory, DailyWishCategory[]> = {
  playful: ['sweet'],
  deep: ['deep'],
  spicy: ['flirty', 'spicy'],
};

// Per-category tagline shown as the italic subtitle on the progress card.
// Each cat gets its own voice matching its energy.
const CATEGORY_TAGLINES: Record<MergedCategory, string> = {
  playful: 'A little mix. Quick picks, a couple of questions.',
  deep: "Slow evening. Talk, listen, choose what you'd like to do together.",
  spicy: "A big menu. Vote what you're into, answer what you dare.",
};

// Spread-interleave: place minor items evenly through major items after a
// warmup band of majors so an early open-text question doesn't summon the
// keyboard and hide every action below (original "actions first" concern
// preserved with fewer items).
//
// Playful  (major=5A, minor=3Q, warmup=2, interval=1) → A,A,A,Q,A,Q,A,Q
// Spicy    (major=10A, minor=3Q, warmup=2, interval=2) → A,A,A,A,Q,A,A,Q,A,A,Q,A,A
// Deep     (major=3Q, minor=0A) → Q,Q,Q (early-return, no interleave needed)
//
// Pure function of two arrays — inputs are already deterministic per
// date+couple+cat via the underlying services' shuffles, so both partners
// end up on the exact same row sequence.
function interleaveRows<T>(major: T[], minor: T[]): T[] {
  if (minor.length === 0) return major;
  const warmup = Math.min(2, Math.max(0, major.length - minor.length));
  const rest = major.slice(warmup);
  const out = major.slice(0, warmup);
  const interval = Math.max(1, Math.floor(rest.length / minor.length));
  let mi = 0, ni = 0, toNext = interval;
  while (mi < rest.length) {
    out.push(rest[mi++]);
    if (--toNext === 0 && ni < minor.length) {
      out.push(minor[ni++]);
      toNext = interval;
    }
  }
  while (ni < minor.length) out.push(minor[ni++]);
  return out;
}

export default function DailyScreen() {
  const { user, profile } = useAuth();
  const { couple, partner } = useCouple(user?.uid, profile?.coupleId);
  const { isSubscribed } = useSubscription();
  const help = useHelp('daily');
  const params = useLocalSearchParams<{ category?: string }>();

  const coupleId = profile?.coupleId;
  const uid = user?.uid ?? '';
  const partnerId = couple?.partner1Uid === uid ? couple?.partner2Uid : couple?.partner1Uid;
  const partnerName = partner?.name ?? 'Partner';

  const [wishDoc, setWishDoc] = useState<DailyWishDoc | null>(null);
  const [qDoc, setQDoc] = useState<DailyQuestionDoc | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [showMatches, setShowMatches] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Deck-per-screen navigation. User sees one card at a time; skip pushes
  // the card to the back of the deck so it comes around again after the
  // rest. Answered/voted cards stay visible so the reveal / matched state
  // is seen before advancing. Reset on category switch — each tab is its
  // own deck. `skipped` uses row identity (kind + gi) so category changes
  // don't leak skips across decks.
  const [deckPos, setDeckPos] = useState(0);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  // Deep-link default: /daily with no ?category= → Playful. Never default
  // to a paid category — a free user tapping a push notification would hit
  // the paywall instead of any content. Validate the param against the
  // known set so a stale/typo'd URL just falls through to Playful.
  const initialCategory: MergedCategory = (() => {
    const raw = params.category;
    if (raw && (MERGED_CATEGORIES as string[]).includes(raw)) return raw as MergedCategory;
    return 'playful';
  })();
  const [selectedCat, setSelectedCat] = useState<MergedCategory>(initialCategory);
  const [autoSelected, setAutoSelected] = useState(false); // Guard: only auto-pick once

  useEffect(() => {
    if (!coupleId) return;
    return subscribeDailyWishes(coupleId, setWishDoc);
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeDailyQuestions(coupleId, setQDoc, { isLDR: !!couple?.isLongDistance });
  }, [coupleId, couple?.isLongDistance]);

  // Auto-select the category where partner has activity user hasn't
  // matched. Runs once after both docs first arrive, and only when no
  // ?category= was in the URL. Once the user manually taps a tab, the
  // guard keeps the auto-selector from stealing focus back.
  useEffect(() => {
    if (autoSelected) return;
    if (params.category) { setAutoSelected(true); return; } // Respect deep-link
    if (!wishDoc || !qDoc || !partnerId) return;
    const behind = pickCategoryPartnerAheadOf(wishDoc, qDoc, uid, partnerId, isSubscribed);
    if (behind && behind !== selectedCat) setSelectedCat(behind);
    setAutoSelected(true);
  }, [wishDoc, qDoc, partnerId, autoSelected, params.category, uid, isSubscribed, selectedCat]);

  const cfg = QUESTION_CATEGORY_CONFIG[selectedCat];

  // Build the render row list in a single memo so both subscriptions
  // committing back-to-back produces one paint, not two. Actions and
  // questions are spread-interleaved (see interleaveRows above) so the
  // scroll doesn't feel like two walls of same-shape cards clustered
  // by type. A 2-action warmup band before the first question keeps the
  // keyboard-hides-actions problem from biting on small screens.
  type ActionRow = { kind: 'action'; gi: number; text: string; category: DailyWishCategory; inPerson?: boolean };
  type QuestionRow = { kind: 'question'; gi: number; q: Question };
  type Row = ActionRow | QuestionRow;

  const rows = useMemo<Row[]>(() => {
    const actions: Row[] = [];
    const questions: Row[] = [];
    const dpSources = DP_SOURCES[selectedCat];
    if (wishDoc && dpSources.length > 0) {
      wishDoc.items.forEach((item, gi) => {
        if (dpSources.includes(item.category)) {
          actions.push({ kind: 'action', gi, text: item.text, category: item.category, inPerson: item.inPerson });
        }
      });
    }
    if (qDoc) {
      qDoc.items.forEach((q, gi) => {
        if (q.category === selectedCat) {
          questions.push({ kind: 'question', gi, q });
        }
      });
    }
    // Pick major = whichever has more items so warmup + spread still makes
    // sense if content pool ever inverts. Current pool always has more
    // actions than questions (Playful 5:3, Spicy 10:3, Deep 0:3 handled
    // by early-return in interleaveRows), but algorithm stays generic.
    return actions.length >= questions.length
      ? interleaveRows(actions, questions)
      : interleaveRows(questions, actions);
  }, [wishDoc, qDoc, selectedCat]);

  const rowId = (r: Row): string => `${r.kind}-${r.gi}`;

  // Deck order: not-skipped first (in original interleaved order), then
  // skipped at the end. Skipped cards come around again after the user
  // has passed through everything else — matches "skip for now" mental
  // model.
  const deck = useMemo<Row[]>(() => {
    const notSk = rows.filter((r) => !skipped.has(rowId(r)));
    const sk = rows.filter((r) => skipped.has(rowId(r)));
    return [...notSk, ...sk];
  }, [rows, skipped]);

  // Reset deck position + skipped set when the user switches category —
  // each tab is its own deck experience. Also clamp deckPos if the deck
  // shrinks (e.g. Firestore subscription trims a row somehow).
  useEffect(() => {
    setSkipped(new Set());
    setDeckPos(0);
  }, [selectedCat]);
  useEffect(() => {
    if (deck.length > 0 && deckPos >= deck.length) setDeckPos(deck.length - 1);
  }, [deck.length, deckPos]);

  // Action helpers — mirror daily-wishes.tsx behavior verbatim so vote
  // and save-to-list races stay covered by the existing atomic transaction
  // in markAddToListAtomic.
  const myVote = (gi: number): DailyVote | null => wishDoc?.votes[uid]?.[gi] ?? null;
  const partnerVoted = (gi: number): boolean => !!partnerId && wishDoc?.votes[partnerId]?.[gi] !== undefined;
  const matched = (gi: number): boolean => !!partnerId && !!wishDoc && isMatch(wishDoc, gi, uid, partnerId);
  const myAddedToList = (gi: number): boolean => (wishDoc?.addToList?.[gi] ?? []).includes(uid);
  const partnerAddedToList = (gi: number): boolean => !!partnerId && (wishDoc?.addToList?.[gi] ?? []).includes(partnerId);
  const alreadyAdded = (gi: number): boolean => !!partnerId && !!wishDoc && bothWantToAdd(wishDoc, gi, uid, partnerId);

  const handleVote = async (gi: number, vote: DailyVote) => {
    if (!coupleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await voteDailyWish(coupleId, uid, gi, vote);
  };

  const handleAddToList = async (gi: number) => {
    if (!coupleId || !wishDoc || !partnerId) return;
    if (myAddedToList(gi)) return; // Fast-path idempotent guard
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { completedNow } = await markAddToListAtomic(coupleId, uid, partnerId, gi);
    if (completedNow) {
      const item = wishDoc.items[gi];
      const cat = item.category === 'sweet' ? 'dates' : 'intimacy';
      await addTodo(coupleId, item.text, cat, uid, 'daily-picks');
    }
  };

  // Question helpers — mirror questions-game.tsx behavior verbatim.
  const myAnswer = (gi: number) => qDoc?.answers?.[uid]?.[String(gi)] ?? null;
  const partnerAnswer = (gi: number) => (partnerId ? qDoc?.answers?.[partnerId]?.[String(gi)] ?? null : null);
  const revealed = (gi: number) => !!partnerId && !!qDoc && bothAnswered(qDoc, gi, uid, partnerId);

  const submitValue = async (gi: number, value: string) => {
    if (!coupleId || !qDoc || !value) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await submitAnswer(coupleId, uid, gi, value);
    setDrafts((d) => { const n = { ...d }; delete n[gi]; return n; });
    // Race note (documented in questions-game.tsx): both partners answering
    // in the same tick may each see a stale doc where the other hasn't
    // landed yet and both fire notify. Client-side rate limit in
    // notificationService suppresses duplicates.
    const partnerAlreadyAnswered = !!(partnerId && qDoc.answers?.[partnerId]?.[String(gi)]);
    if (!partnerAlreadyAnswered) {
      notifyPartner(coupleId, uid, 'Daily 💬', `${profile?.name ?? 'Your partner'} played today, your turn!`);
    }
  };

  const handleSubmit = (gi: number) => submitValue(gi, (drafts[gi] ?? '').trim());

  // Progress summary — combines both data sources for the selected cat.
  const actionCount = rows.filter((r) => r.kind === 'action').length;
  const questionCount = rows.filter((r) => r.kind === 'question').length;
  const votedCount = rows.filter((r) => r.kind === 'action' && myVote(r.gi) !== null).length;
  const answeredCount = rows.filter((r) => r.kind === 'question' && !!myAnswer(r.gi)).length;
  const isHandled = (r: Row): boolean =>
    r.kind === 'action' ? myVote(r.gi) !== null : !!myAnswer(r.gi);
  const revealedCount = rows.filter((r) => r.kind === 'question' && revealed(r.gi)).length;

  // Partner progress for the current category — used by DoneState to nudge
  // partner-still-catching-up messaging. Mirrors handled-check logic.
  const partnerDoneCount = useMemo(() => {
    if (!partnerId) return 0;
    let count = 0;
    const dpSources = DP_SOURCES[selectedCat];
    wishDoc?.items.forEach((item, gi) => {
      if (dpSources.includes(item.category) && wishDoc.votes[partnerId]?.[gi] !== undefined) count++;
    });
    qDoc?.items.forEach((q, gi) => {
      if (q.category === selectedCat && qDoc.answers?.[partnerId]?.[String(gi)]) count++;
    });
    return count;
  }, [partnerId, selectedCat, wishDoc, qDoc]);

  const allHandled = rows.length > 0 && rows.every(isHandled);
  const currentCard = deck[deckPos];
  // Combined completion counter — the split (voted/actionCount +
  // answered/questionCount) read as "you're done" the moment either half
  // hit its own denominator (5/5 shown next to 0/3 felt contradictory to
  // users). A single done/total number matches the mental model of a
  // daily task list where completion means the whole thing is finished.
  const doneCount = votedCount + answeredCount;
  const totalCount = actionCount + questionCount;

  const allMatches = (wishDoc?.items ?? [])
    .map((item, gi) => ({ item, gi }))
    .filter(({ gi }) => matched(gi));
  const totalMatchCount = allMatches.length;

  const loading = !wishDoc || !qDoc;
  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Daily</Text>
          <View style={{ width: 60 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Daily</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Category tabs */}
      <View style={styles.catSegment}>
        {MERGED_CATEGORIES.map((cat) => {
          const c = QUESTION_CATEGORY_CONFIG[cat];
          const active = selectedCat === cat;
          const locked = PAID_MERGED_CATEGORIES.includes(cat) && !isSubscribed;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catTab, active && { backgroundColor: c.color }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (locked) { router.push('/upgrade' as any); return; }
                setAutoSelected(true); // Any manual tap disables auto-pick
                setSelectedCat(cat);
                scrollRef.current?.scrollTo({ y: 0, animated: false });
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${c.label}${locked ? ', locked, tap to upgrade' : ''}`}
            >
              <Text style={styles.catTabEmoji}>{c.emoji}</Text>
              <Text style={[styles.catTabLabel, active && { color: Colors.text, fontFamily: Fonts.bodyBold }]}>
                {c.label}{locked ? ' 🔒' : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress card. One combined done/total counter + a Matches tap
            column when the couple has any mutual-yes matches to view. */}
        <View style={[styles.progressCard, { borderLeftColor: cfg.color }]}>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={styles.progressNum}>{doneCount}/{totalCount}</Text>
              <Text style={styles.progressLabel}>Done today</Text>
            </View>
            {totalMatchCount > 0 && (
              <>
                <View style={styles.progressDivider} />
                <TouchableOpacity style={styles.progressItem} onPress={() => setShowMatches(true)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${totalMatchCount} total matches, tap to view`}>
                  <Text style={[styles.progressNum, { color: Colors.burgundy }]}>{totalMatchCount}</Text>
                  <Text style={[styles.progressLabel, styles.progressLabelTap]}>Matches ›</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.progressHint}>
            {CATEGORY_TAGLINES[selectedCat]}
          </Text>
        </View>

        {/* LDR banner: many picks are written for co-located couples.
            Nudge LDR pairs to Yes-vote in-person items and save them to
            their Together List for the next visit, rather than expecting
            everything to be do-able today. */}
        {!!couple?.isLongDistance && (
          <View style={styles.ldrBanner}>
            <Text style={styles.ldrBannerText}>
              🌐 Some picks are for when you're together. Yes-vote to save them for your next visit.
            </Text>
          </View>
        )}

        {/* Deck view — one card at a time. Rows come from interleaveRows
            (same order as before), we just render deck[deckPos] instead of
            the full scroll. Skipped cards live at the end of deck via the
            deck memo above, so passing through them again is automatic. */}
        {rows.length === 0 ? (
          <Text style={styles.emptyText}>Nothing for this category today.</Text>
        ) : allHandled ? (
          <DoneState
            matchesCount={totalMatchCount}
            revealedCount={revealedCount}
            totalCount={totalCount}
            partnerName={partnerName}
            partnerDoneCount={partnerDoneCount}
            onOpenMatches={() => setShowMatches(true)}
          />
        ) : currentCard ? (
          <>
            <Text style={styles.deckCounter}>
              Card {deckPos + 1} of {deck.length}
            </Text>

            {currentCard.kind === 'action' ? (
              <ActionCard
                key={`a-${currentCard.gi}`}
                gi={currentCard.gi}
                text={currentCard.text}
                partnerName={partnerName}
                vote={myVote(currentCard.gi)}
                theyVoted={partnerVoted(currentCard.gi)}
                didMatch={matched(currentCard.gi)}
                iAdded={myAddedToList(currentCard.gi)}
                theyAdded={partnerAddedToList(currentCard.gi)}
                bothAddedToList={alreadyAdded(currentCard.gi)}
                onVote={handleVote}
                onAdd={handleAddToList}
                showInPersonPill={!!couple?.isLongDistance && !!currentCard.inPerson}
              />
            ) : (
              <QuestionCard
                key={`q-${currentCard.gi}`}
                gi={currentCard.gi}
                q={currentCard.q}
                partnerName={partnerName}
                mine={myAnswer(currentCard.gi)}
                theirs={partnerAnswer(currentCard.gi)}
                both={revealed(currentCard.gi)}
                draft={drafts[currentCard.gi] ?? ''}
                onDraftChange={(t) => setDrafts((d) => ({ ...d, [currentCard.gi]: t }))}
                onSubmit={() => handleSubmit(currentCard.gi)}
                onQuickSubmit={(value) => submitValue(currentCard.gi, value)}
                cardBg={cfg.color}
              />
            )}

            {/* Progress dots — visual position + which cards are handled */}
            <View style={styles.dotsRow}>
              {deck.map((r, i) => (
                <View
                  key={`dot-${r.kind}-${r.gi}`}
                  style={[
                    styles.dot,
                    isHandled(r) && styles.dotHandled,
                    i === deckPos && styles.dotActive,
                  ]}
                />
              ))}
            </View>

            {/* Skip (always) + Next (enabled after user handles the card).
                Skip is a soft push to end of deck — comes around again. */}
            <View style={styles.deckBtnRow}>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const id = rowId(currentCard);
                  setSkipped((s) => new Set([...s, id]));
                  // deckPos stays; adding to skipped rebuilds `deck` so the
                  // next unhandled card slides into this position naturally.
                }}
                accessibilityRole="button"
                accessibilityLabel="Skip this card for now"
              >
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, !isHandled(currentCard) && styles.nextBtnDisabled]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDeckPos((p) => Math.min(p + 1, deck.length - 1));
                }}
                disabled={!isHandled(currentCard)}
                accessibilityRole="button"
                accessibilityLabel="Next card"
              >
                <Text style={styles.nextBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        <Text style={styles.refreshHint}>Fresh set every day ✨</Text>
      </ScrollView>

      {/* All-matches modal (unchanged from Daily Picks) */}
      <Modal visible={showMatches} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Matches 🌹</Text>
              <TouchableOpacity onPress={() => setShowMatches(false)} accessibilityRole="button" accessibilityLabel="Close matches">
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: Spacing.md, paddingBottom: Spacing.xl }}>
              {allMatches.length === 0 ? (
                <Text style={styles.emptyText}>No matches yet today.</Text>
              ) : (
                allMatches.map(({ item, gi }) => {
                  const iAdded = myAddedToList(gi);
                  const theyAdded = partnerAddedToList(gi);
                  const both = alreadyAdded(gi);
                  const dpCfg = DAILY_WISH_CATEGORY_CONFIG[item.category];
                  return (
                    <View key={gi} style={styles.matchModalCard}>
                      <View style={[styles.catBadgeSm, { backgroundColor: dpCfg.color }]}>
                        <Text style={[styles.catBadgeSmText, { color: dpCfg.textColor }]}>{dpCfg.emoji} {dpCfg.label}</Text>
                      </View>
                      <Text style={styles.matchModalText}>{item.text}</Text>
                      {both ? (
                        <TouchableOpacity
                          onPress={() => { setShowMatches(false); router.push('/todo' as any); }}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                          accessibilityLabel="Added to Together List. Tap to view."
                        >
                          <Text style={styles.addedText}>✓ Added to Together List · View ›</Text>
                        </TouchableOpacity>
                      ) : iAdded ? (
                        <Text style={styles.waitingText}>Waiting for {partnerName} ✓</Text>
                      ) : (
                        <TouchableOpacity style={styles.addBtn} onPress={() => handleAddToList(gi)} activeOpacity={0.8} accessibilityRole="button">
                          <Text style={styles.addBtnText}>
                            {theyAdded ? `${partnerName} wants to add, tap to confirm` : '+ Add to Together List'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Daily"
        description="Every day: a mix of picks to vote on together and questions to answer privately. Votes stay hidden until both say yes, answers reveal side by side when you're both done."
        tips={[
          'Actions come first — quick Yes / Not for me on each',
          'When you both say Yes → tap Add to save it to your Together List',
          'Questions are private until both partners answer, then reveal at the same time',
          'Playful is free · Deep and Spicy unlock with subscription',
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

// Helper: pick the merged category where the partner has activity ahead
// of the current user. Ranks Question activity above Action activity when
// both are non-zero — an unanswered reveal is more urgent than an unvoted
// pick because the partner is actively waiting for a text answer. Skips
// paid categories for free users so the auto-pick doesn't dump them at a
// paywall.
function pickCategoryPartnerAheadOf(
  wishDoc: DailyWishDoc,
  qDoc: DailyQuestionDoc,
  uid: string,
  partnerId: string,
  isSubscribed: boolean,
): MergedCategory | null {
  const results: { cat: MergedCategory; qBehind: number; aBehind: number }[] = [];
  for (const cat of MERGED_CATEGORIES) {
    if (!isSubscribed && PAID_MERGED_CATEGORIES.includes(cat)) continue;
    // Count questions where partner has answered but I haven't.
    let qBehind = 0;
    qDoc.items.forEach((q, gi) => {
      if (q.category !== cat) return;
      const partnerHas = !!qDoc.answers?.[partnerId]?.[String(gi)];
      const iHave = !!qDoc.answers?.[uid]?.[String(gi)];
      if (partnerHas && !iHave) qBehind++;
    });
    // Count actions where partner has voted but I haven't.
    let aBehind = 0;
    const dpSources = DP_SOURCES[cat];
    if (dpSources.length > 0) {
      wishDoc.items.forEach((item, gi) => {
        if (!dpSources.includes(item.category)) return;
        const partnerHas = wishDoc.votes[partnerId]?.[gi] !== undefined;
        const iHave = wishDoc.votes[uid]?.[gi] !== undefined;
        if (partnerHas && !iHave) aBehind++;
      });
    }
    if (qBehind > 0 || aBehind > 0) results.push({ cat, qBehind, aBehind });
  }
  if (results.length === 0) return null;
  // Sort: q behind first, then actions behind. First non-zero wins.
  results.sort((a, b) => b.qBehind - a.qBehind || b.aBehind - a.aBehind);
  return results[0].cat;
}

function DoneState({
  matchesCount,
  revealedCount,
  totalCount,
  partnerName,
  partnerDoneCount,
  onOpenMatches,
}: {
  matchesCount: number;
  revealedCount: number;
  totalCount: number;
  partnerName: string;
  partnerDoneCount: number;
  onOpenMatches: () => void;
}) {
  const partnerBehind = partnerDoneCount < totalCount;
  return (
    <View style={styles.doneWrap}>
      <Text style={styles.doneEmoji}>✨</Text>
      <Text style={styles.doneTitle}>Done for today</Text>
      <View style={styles.doneStatsRow}>
        <View style={styles.doneStat}>
          <Text style={styles.doneStatNum}>{matchesCount}</Text>
          <Text style={styles.doneStatLabel}>{matchesCount === 1 ? 'match' : 'matches'}</Text>
        </View>
        <View style={styles.doneStatDivider} />
        <View style={styles.doneStat}>
          <Text style={styles.doneStatNum}>{revealedCount}</Text>
          <Text style={styles.doneStatLabel}>revealed</Text>
        </View>
      </View>
      {partnerBehind ? (
        <Text style={styles.donePartnerHint}>
          {partnerName} still has {totalCount - partnerDoneCount} to go
        </Text>
      ) : (
        <Text style={styles.donePartnerHint}>You&apos;re both caught up ✓</Text>
      )}
      {matchesCount > 0 && (
        <TouchableOpacity style={styles.doneMatchesBtn} onPress={onOpenMatches} accessibilityRole="button">
          <Text style={styles.doneMatchesBtnText}>View all matches ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActionCard({
  gi, text, partnerName, vote, theyVoted, didMatch, iAdded, theyAdded, bothAddedToList, onVote, onAdd, showInPersonPill,
}: {
  gi: number;
  text: string;
  partnerName: string;
  vote: DailyVote | null;
  theyVoted: boolean;
  didMatch: boolean;
  iAdded: boolean;
  theyAdded: boolean;
  bothAddedToList: boolean;
  onVote: (gi: number, v: DailyVote) => void;
  onAdd: (gi: number) => void;
  showInPersonPill?: boolean;
}) {
  return (
    <View style={[styles.card, styles.actionCard, didMatch && styles.cardMatched]}>
      <View style={styles.pillRow}>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>PICK</Text>
        </View>
        {showInPersonPill && (
          <View style={styles.inPersonPill}>
            <Text style={styles.inPersonPillText}>IN-PERSON</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardText}>{text}</Text>
      {didMatch ? (
        <View style={styles.matchSection}>
          <View style={styles.matchBanner}>
            <Text style={styles.matchBannerText}>✓ You both want this!</Text>
          </View>
          {bothAddedToList ? (
            <TouchableOpacity
              style={styles.addedBadge}
              onPress={() => router.push('/todo' as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Added to Together List. Tap to view."
            >
              <Text style={styles.addedText}>✓ Added to Together List · View ›</Text>
            </TouchableOpacity>
          ) : iAdded ? (
            <Text style={styles.waitingText}>Waiting for {partnerName} to add ✓</Text>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(gi)} activeOpacity={0.8} accessibilityRole="button">
              <Text style={styles.addBtnText}>
                {theyAdded ? `${partnerName} wants to add, tap to confirm` : '+ Add to Together List'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {theyVoted && !vote && (
            <Text style={styles.partnerVotedHint}>{partnerName} has voted ✓</Text>
          )}
          <View style={styles.voteRow}>
            <TouchableOpacity
              style={[styles.voteBtn, vote === 'yes' && { backgroundColor: Colors.success, borderColor: Colors.success }]}
              onPress={() => onVote(gi, 'yes')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Vote yes"
            >
              <Text style={[styles.voteBtnText, vote === 'yes' && styles.voteBtnTextActive]}>✓ Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.voteBtn, vote === 'no' && { backgroundColor: Colors.muted, borderColor: Colors.muted }]}
              onPress={() => onVote(gi, 'no')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Vote not for me"
            >
              <Text style={[styles.voteBtnText, vote === 'no' && styles.voteBtnTextActive]}>✗ Not for me</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function QuestionCard({
  gi, q, partnerName, mine, theirs, both, draft, onDraftChange, onSubmit, onQuickSubmit, cardBg,
}: {
  gi: number;
  q: Question;
  partnerName: string;
  mine: string | null;
  theirs: string | null;
  both: boolean;
  draft: string;
  onDraftChange: (t: string) => void;
  onSubmit: () => void;
  onQuickSubmit: (value: string) => void;
  cardBg: string;
}) {
  return (
    <View style={[styles.card, styles.questionCard, { backgroundColor: both ? '#F1F8E9' : cardBg }, both && { borderColor: Colors.success }]}>
      <View style={styles.typePill}>
        <Text style={styles.typePillText}>QUESTION</Text>
      </View>
      <Text style={styles.cardQuestion}>{q.text}</Text>

      {both && (
        <View style={styles.revealWrap}>
          <View style={styles.revealBox}>
            <Text style={styles.revealName}>You</Text>
            <Text style={styles.revealAnswer}>{mine}</Text>
          </View>
          <View style={[styles.revealBox, { backgroundColor: '#C8E6C9' }]}>
            <Text style={styles.revealName}>{partnerName}</Text>
            <Text style={styles.revealAnswer}>{theirs}</Text>
          </View>
        </View>
      )}

      {mine && !both && (
        <View style={styles.waitBanner}>
          <Text style={styles.waitText}>✓ Sent! Waiting for {partnerName}…</Text>
          <Text style={styles.waitAnswer}>Your answer: {mine}</Text>
        </View>
      )}

      {!mine && (
        <View style={styles.inputWrap}>
          {theirs && (
            <Text style={styles.partnerWaiting}>{partnerName} already answered, your turn!</Text>
          )}
          {q.format === 'binary' && q.options ? (
            <View style={styles.binaryWrap}>
              <TouchableOpacity style={styles.binaryBtn} onPress={() => onQuickSubmit(q.options![0])} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.binaryBtnText}>{q.options[0]}</Text>
              </TouchableOpacity>
              <View style={styles.binaryOr}><Text style={styles.binaryOrText}>or</Text></View>
              <TouchableOpacity style={styles.binaryBtn} onPress={() => onQuickSubmit(q.options![1])} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.binaryBtnText}>{q.options[1]}</Text>
              </TouchableOpacity>
            </View>
          ) : q.format === 'scale' ? (
            <View style={styles.scaleWrap}>
              <Text style={styles.scaleHint}>1 = not at all · 5 = completely</Text>
              <View style={styles.scaleRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} style={styles.scaleBtn} onPress={() => onQuickSubmit(String(n))} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Score ${n}`}>
                    <Text style={styles.scaleNum}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Type your answer..."
                placeholderTextColor={Colors.muted}
                value={draft}
                onChangeText={onDraftChange}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, !draft.trim() && { opacity: 0.4 }]}
                onPress={onSubmit}
                disabled={!draft.trim()}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Send answer"
              >
                <Text style={styles.sendBtnText}>Send answer →</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
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
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },

  catSegment: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border, overflow: 'hidden',
  },
  catTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 3 },
  catTabEmoji: { fontSize: 18 },
  catTabLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.md },

  progressCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, ...Shadow.sm,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressItem: { flex: 1, alignItems: 'center', gap: 2 },
  progressNum: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text },
  progressLabel: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  progressLabelTap: { color: Colors.burgundy, fontFamily: Fonts.bodyBold },
  progressDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  progressHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },

  card: {
    borderRadius: Radius.xl, padding: Spacing.lg,
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  // Left border stripe: rose for Actions (softer/kinetic), muted for
  // Questions (heavier/reflective). Subtle enough not to shout, clear
  // enough on scan to tell the two apart.
  actionCard: { backgroundColor: Colors.white, borderLeftWidth: 4, borderLeftColor: Colors.rose },
  questionCard: { borderLeftWidth: 4, borderLeftColor: Colors.muted },
  // Bumped left border to 6px on the matched state so matched actions still
  // pop when the interleaved layout sandwiches them between question cards.
  // Progress card's Matches counter is still the canonical find-all-matches
  // path; this is scan-level polish, not a discoverability fix.
  cardMatched: { borderColor: Colors.rose, backgroundColor: '#FFF8FB', borderLeftWidth: 6 },
  cardText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.text, lineHeight: 24 },
  cardQuestion: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text, lineHeight: 30 },

  // Filled burgundy pill instead of the previous 5%-black + muted-gray text
  // combo, which was near-invisible on both card backgrounds. Same 9px size
  // keeps it label-shaped (not chip-shaped) so the pill doesn't compete
  // with card content. Category identity still comes from card background
  // + left border colour; the pill just says "this is a pick / a question".
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  typePill: {
    alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 8,
    backgroundColor: Colors.burgundy, borderRadius: Radius.full,
  },
  inPersonPill: {
    paddingVertical: 2, paddingHorizontal: 8,
    backgroundColor: 'rgba(136,14,79,0.12)', borderRadius: Radius.full,
  },
  inPersonPillText: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.burgundy, letterSpacing: 0.8 },
  // LDR banner sits above the row list to set expectation once, so the
  // per-card IN-PERSON pill reads as an inline label, not a warning.
  ldrBanner: {
    backgroundColor: '#FFF4E8', borderRadius: Radius.md,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(136,14,79,0.10)',
  },
  ldrBannerText: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.text, lineHeight: 18 },
  typePillText: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.cream, letterSpacing: 0.8 },

  // Action states
  matchSection: { gap: Spacing.sm },
  matchBanner: { backgroundColor: '#E8F5E9', borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  matchBannerText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.success },
  addBtn: { paddingVertical: 10, paddingHorizontal: Spacing.lg, borderRadius: Radius.full, backgroundColor: Colors.burgundy, alignItems: 'center' },
  addBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.cream },
  addedBadge: { backgroundColor: '#E8F5E9', borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  addedText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.success },
  waitingText: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },
  partnerVotedHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },
  voteRow: { flexDirection: 'row', gap: Spacing.sm },
  voteBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  voteBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.muted },
  voteBtnTextActive: { color: Colors.white },

  // Question states
  revealWrap: { flexDirection: 'row', gap: Spacing.sm },
  revealBox: { flex: 1, backgroundColor: '#DCEDC8', borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  revealName: { fontFamily: Fonts.bodyBold, fontSize: 11, color: '#33691E', textTransform: 'uppercase', letterSpacing: 0.6 },
  revealAnswer: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },
  waitBanner: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  waitText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.success },
  waitAnswer: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  partnerWaiting: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  inputWrap: { gap: Spacing.sm },
  input: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
    minHeight: 72, borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  sendBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  binaryWrap: { gap: Spacing.sm },
  binaryBtn: { backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  binaryBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.text },
  binaryOr: { alignItems: 'center', paddingVertical: 4 },
  binaryOrText: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted },
  scaleWrap: { gap: Spacing.sm },
  scaleHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center' },
  scaleRow: { flexDirection: 'row', gap: Spacing.sm },
  scaleBtn: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  scaleNum: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.text },

  refreshHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: Spacing.sm },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', paddingVertical: Spacing.xl },

  // Deck navigation — dots row + skip/next buttons under the current card.
  deckCounter: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted, textAlign: 'center', letterSpacing: 0.6, textTransform: 'uppercase' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotHandled: { backgroundColor: Colors.success, opacity: 0.5 },
  dotActive: { width: 24, backgroundColor: Colors.burgundy, opacity: 1 },
  deckBtnRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  skipBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  skipBtnText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },
  nextBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },

  // Done state — end-of-deck summary shown when every row is handled.
  doneWrap: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
  doneEmoji: { fontSize: 56 },
  doneTitle: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  doneStatsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.sm },
  doneStat: { alignItems: 'center', gap: 2, minWidth: 80 },
  doneStatNum: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.text },
  doneStatLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  doneStatDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  donePartnerHint: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center', marginTop: Spacing.sm },
  doneMatchesBtn: { marginTop: Spacing.lg, backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full },
  doneMatchesBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  // Matches modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(61,26,36,0.55)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  modalClose: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.muted, padding: Spacing.xs },
  matchModalCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  catBadgeSm: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.full },
  catBadgeSmText: { fontFamily: Fonts.bodyBold, fontSize: 11 },
  matchModalText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
});
