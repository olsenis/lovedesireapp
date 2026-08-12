import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import {
  adminGetOverview, adminGetStats, adminGrantPremium, adminRevokePremium,
  adminSearchUser, isCurrentUserAdmin,
  AdminOverview, AdminUserResult,
} from '../services/adminService';
import { ConfirmModal } from '../components/ConfirmModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius, Shadow } from '../constants/spacing';
import { useTrackScreen } from '../hooks/useTrackScreen';

type StatsTab = 'screens' | 'actions' | 'admin';

function currentMonthKey(offsetMonths = 0): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + offsetMonths);
  return d.toISOString().slice(0, 7);
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString('en-GB');
}

function formatJoined(v: number | string | undefined): string {
  if (!v) return '—';
  const t = typeof v === 'string' ? Date.parse(v) : v;
  if (!t || isNaN(t)) return '—';
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminScreen() {
  const { user, loading } = useAuth();
  const isAdmin = isCurrentUserAdmin(user?.uid);
  useTrackScreen('admin');

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/(tabs)' as any);
  }, [loading, isAdmin]);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [curStats, setCurStats] = useState<Record<string, number>>({});
  const [prevStats, setPrevStats] = useState<Record<string, number>>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<StatsTab>('screens');

  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<AdminUserResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<'grant' | 'revoke' | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const loadAll = async () => {
    setStatsError(null);
    try {
      const [ov, cur, prev] = await Promise.all([
        adminGetOverview(),
        adminGetStats(currentMonthKey(0)),
        adminGetStats(currentMonthKey(-1)),
      ]);
      setOverview(ov);
      setCurStats(cur.counts ?? {});
      setPrevStats(prev.counts ?? {});
    } catch (e: any) {
      setStatsError(e?.message ?? 'Could not load stats.');
    } finally {
      setStatsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
  }, [isAdmin]);

  if (loading || !isAdmin) return null;

  const handleRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const handleSearch = async () => {
    const email = searchEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setSearchError('Enter a valid email.');
      setSearchResult(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const res = await adminSearchUser(email);
      setSearchResult(res);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('Too many')) setSearchError('Too many searches. Wait a minute.');
      else setSearchError(msg || 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || !searchResult?.coupleId) return;
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      if (confirmAction === 'grant') {
        await adminGrantPremium(searchResult.coupleId);
      } else {
        await adminRevokePremium(searchResult.coupleId);
      }
      // Refresh the displayed user + overview to reflect new premium state.
      const email = searchResult.email ?? searchEmail.trim().toLowerCase();
      const [res, ov] = await Promise.all([
        adminSearchUser(email),
        adminGetOverview(),
      ]);
      setSearchResult(res);
      setOverview(ov);
      setConfirmAction(null);
    } catch (e: any) {
      setConfirmError(e?.message ?? 'Action failed.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const rows = useMemo(() => {
    const prefix = activeTab === 'screens' ? 'screen_' : activeTab === 'admin' ? 'admin_' : null;
    const entries = Object.entries(curStats).filter(([key]) => {
      if (activeTab === 'screens') return key.startsWith('screen_');
      if (activeTab === 'admin') return key.startsWith('admin_');
      return !key.startsWith('screen_') && !key.startsWith('admin_');
    });
    entries.sort((a, b) => b[1] - a[1]);
    return entries.map(([key, count]) => {
      const label = prefix ? key.slice(prefix.length) : key;
      const prev = prevStats[key] ?? 0;
      let deltaPct: number | null = null;
      if (prev > 0) deltaPct = Math.round(((count - prev) / prev) * 100);
      return { key, label, count, prev, deltaPct };
    });
  }, [curStats, prevStats, activeTab]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin</Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.burgundy} />}
      >
        {/* ─── Section 1: Overview strip ─── */}
        <Text style={styles.sectionLabel}>Overview · {overview?.month ?? currentMonthKey(0)}</Text>
        <View style={styles.grid}>
          <StatTile label="Total users" value={overview?.totalUsers} />
          <StatTile label="Couples" value={overview?.totalCouples} />
          <StatTile label="Paired" value={overview?.pairedCouples} />
          <StatTile label="Paid" value={overview?.paidCouples} accent />
          <StatTile label="Active" value={overview?.activeCouplesThisMonth} />
          <StatTile label="New this month" value={overview?.signupsThisMonth} />
        </View>
        {overview && (
          <View style={styles.mrrCard}>
            <Text style={styles.mrrLabel}>MRR estimate</Text>
            <Text style={styles.mrrValue}>${overview.mrrEstimate.toFixed(2)}</Text>
            <Text style={styles.mrrHint}>at blended $9.99 · {overview.paidCouples} paid couples</Text>
          </View>
        )}
        {statsError && <Text style={styles.errorText}>{statsError}</Text>}

        {/* ─── Section 2: Feature usage ─── */}
        <Text style={styles.sectionLabel}>Feature usage</Text>
        <View style={styles.tabs}>
          <TabButton label="Screens" active={activeTab === 'screens'} onPress={() => setActiveTab('screens')} />
          <TabButton label="Actions" active={activeTab === 'actions'} onPress={() => setActiveTab('actions')} />
          <TabButton label="Admin" active={activeTab === 'admin'} onPress={() => setActiveTab('admin')} />
        </View>
        <View style={styles.card}>
          {statsLoading && <Text style={styles.emptyRow}>Loading…</Text>}
          {!statsLoading && rows.length === 0 && (
            <Text style={styles.emptyRow}>
              No events in this bucket yet for {currentMonthKey(0)}.
            </Text>
          )}
          {rows.map(({ key, label, count, prev, deltaPct }, i) => {
            const isRedFlag = count < 10;
            let deltaLabel = '—';
            let deltaColor: string = Colors.muted;
            if (prev === 0 && count > 0) {
              deltaLabel = 'NEW';
              deltaColor = Colors.success;
            } else if (deltaPct !== null) {
              const sign = deltaPct > 0 ? '+' : '';
              deltaLabel = `${sign}${deltaPct}%`;
              if (deltaPct >= 20) deltaColor = Colors.success;
              else if (deltaPct <= -20) deltaColor = Colors.error;
            }
            return (
              <View key={key}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.usageRow}>
                  <Text
                    style={[styles.usageLabel, isRedFlag && styles.redFlag]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Text style={[styles.usageCount, isRedFlag && styles.redFlag]}>
                    {formatCount(count)}
                  </Text>
                  <Text style={[styles.usageDelta, { color: deltaColor }]}>{deltaLabel}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ─── Section 3: User lookup ─── */}
        <Text style={styles.sectionLabel}>User lookup</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchEmail}
            onChangeText={setSearchEmail}
            placeholder="email@example.com"
            placeholderTextColor={Colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            editable={!searching}
          />
          <TouchableOpacity
            style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={searching}
          >
            <Text style={styles.searchBtnText}>{searching ? '…' : 'Search'}</Text>
          </TouchableOpacity>
        </View>
        {searchError && <Text style={styles.errorText}>{searchError}</Text>}

        {!searchResult && !searchError && (
          <Text style={styles.emptyHint}>
            Search a user by email to see their profile and grant or revoke premium.
          </Text>
        )}

        {searchResult && !searchResult.found && (
          <View style={styles.card}>
            <View style={styles.notFoundRow}>
              <Text style={styles.notFoundText}>No user with that email.</Text>
            </View>
          </View>
        )}

        {searchResult?.found && (
          <View style={styles.card}>
            <View style={styles.userHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{searchResult.name || '(no name)'}</Text>
                <Text style={styles.userMeta}>
                  {searchResult.email} · joined {formatJoined(searchResult.joinedAt)}
                </Text>
              </View>
              <View style={[styles.pill, searchResult.isPremium ? styles.pillPaid : styles.pillFree]}>
                <Text style={[styles.pillText, searchResult.isPremium ? styles.pillTextPaid : styles.pillTextFree]}>
                  {searchResult.isPremium ? '✓ Paid' : 'Free'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.userBody}>
              <Text style={styles.userField}>uid</Text>
              <Text style={styles.userValueMono}>{searchResult.uid}</Text>
              <Text style={styles.userField}>Couple ID</Text>
              <Text style={styles.userValueMono}>{searchResult.coupleId ?? 'Not paired'}</Text>
              {searchResult.partner && (
                <>
                  <Text style={styles.userField}>Paired with</Text>
                  <Text style={styles.userValue}>{searchResult.partner.name || '(no name)'} · {searchResult.partner.uid}</Text>
                </>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.grantBtn, !searchResult.coupleId && styles.actionBtnDisabled]}
                onPress={() => { setConfirmError(null); setConfirmAction('grant'); }}
                disabled={!searchResult.coupleId}
              >
                <Text style={styles.grantText}>Grant premium</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.revokeBtn, !searchResult.coupleId && styles.actionBtnDisabled]}
                onPress={() => { setConfirmError(null); setConfirmAction('revoke'); }}
                disabled={!searchResult.coupleId}
              >
                <Text style={styles.revokeText}>Revoke premium</Text>
              </TouchableOpacity>
            </View>
            {confirmError && <Text style={[styles.errorText, { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }]}>{confirmError}</Text>}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      <ConfirmModal
        visible={confirmAction !== null}
        title={confirmAction === 'grant' ? 'Grant premium?' : 'Revoke premium?'}
        message={
          confirmAction === 'grant'
            ? `This bypasses RevenueCat and unlocks paid features on ${searchResult?.name || 'this'}'s couple immediately.`
            : `${searchResult?.name || 'This'}'s couple will lose access to Fantasy Wishes, Sensate, Fire and Desire challenge programs, and Spicy content on their next app refresh.`
        }
        confirmLabel={confirmAction === 'grant' ? 'Grant' : 'Revoke'}
        destructive={confirmAction === 'revoke'}
        loading={confirmLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => { if (!confirmLoading) setConfirmAction(null); }}
      />
    </KeyboardAvoidingView>
  );
}

function StatTile({ label, value, accent }: { label: string; value?: number; accent?: boolean }) {
  return (
    <View style={[styles.tile, accent && styles.tileAccent]}>
      <Text style={[styles.tileValue, accent && styles.tileValueAccent]}>
        {value === undefined || value === null ? '—' : formatCount(value)}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
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

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.sm },

  sectionLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.md,
  },

  // Section 1: overview
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: {
    flexGrow: 1, flexBasis: '30%', minWidth: 100,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'flex-start',
    ...Shadow.sm,
  },
  tileAccent: { borderColor: Colors.burgundy, backgroundColor: Colors.blush },
  tileValue: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.text, lineHeight: 30 },
  tileValueAccent: { color: Colors.burgundy },
  tileLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4,
  },
  mrrCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, ...Shadow.sm,
  },
  mrrLabel: {
    fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  mrrValue: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy, marginTop: 2 },
  mrrHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 2 },

  // Section 2: feature usage
  tabs: { flexDirection: 'row', gap: Spacing.xs, marginTop: 4 },
  tab: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.full,
    backgroundColor: Colors.blush, alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: { backgroundColor: Colors.burgundy },
  tabText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy },
  tabTextActive: { color: Colors.cream },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm },
  usageRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 12, gap: Spacing.sm },
  usageLabel: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
  usageCount: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text, width: 70, textAlign: 'right' },
  usageDelta: { fontFamily: Fonts.bodyBold, fontSize: 12, width: 60, textAlign: 'right' },
  redFlag: { color: Colors.error },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
  emptyRow: {
    fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted,
    padding: Spacing.lg, textAlign: 'center',
  },

  // Section 3: user lookup
  searchRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  searchInput: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text,
  },
  searchBtn: {
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.burgundy, borderRadius: Radius.full, alignItems: 'center',
  },
  searchBtnDisabled: { opacity: 0.6 },
  searchBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },
  emptyHint: { fontFamily: Fonts.bodyItalic, fontSize: 13, color: Colors.muted, marginTop: Spacing.xs },
  errorText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.error, marginTop: Spacing.xs },

  notFoundRow: { padding: Spacing.lg, alignItems: 'center' },
  notFoundText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted },

  userHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  userName: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.text },
  userMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  pill: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full },
  pillPaid: { backgroundColor: Colors.success },
  pillFree: { backgroundColor: Colors.border },
  pillText: { fontFamily: Fonts.bodyBold, fontSize: 12 },
  pillTextPaid: { color: Colors.cream },
  pillTextFree: { color: Colors.muted },
  userBody: { padding: Spacing.lg, gap: 4 },
  userField: {
    fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4,
  },
  userValue: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
  userValueMono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12, color: Colors.text },

  actionRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg },
  actionBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.full,
    alignItems: 'center', borderWidth: 1.5,
  },
  actionBtnDisabled: { opacity: 0.4 },
  grantBtn: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  grantText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },
  revokeBtn: { backgroundColor: Colors.cream, borderColor: Colors.error },
  revokeText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.error },
});
