import { useEffect, useMemo, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import {
  adminGetOverview, adminGetStats, adminGrantPremium, adminRevokePremium,
  adminSearchUser, adminGetSessionStats, adminGetTimeInsights,
  AdminOverview, AdminUserResult,
  ScreenSessionStats, LeaderboardEntry,
} from '../adminService';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReportsTab } from '../components/ReportsTab';

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

function formatDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AdminScreen() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [curStats, setCurStats] = useState<Record<string, number>>({});
  const [prevStats, setPrevStats] = useState<Record<string, number>>({});
  const [sessionStats, setSessionStats] = useState<ScreenSessionStats[]>([]);
  const [heat, setHeat] = useState<number[][]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
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
    // Fire each callable independently and settle results — one failing
    // callable (e.g. adminGetSessionStats hitting a missing composite index)
    // must not cascade-hide the four that DO succeed. Errors go to the
    // console per-call with a label so we can spot which one is broken.
    const label = <T,>(name: string, p: Promise<T>) =>
      p.catch((err: any) => {
        // eslint-disable-next-line no-console
        console.error(`[admin] ${name} failed:`, err?.message ?? err);
        return null;
      });
    const [ov, cur, prev, sess, insights] = await Promise.all([
      label('adminGetOverview', adminGetOverview()),
      label('adminGetStats(current)', adminGetStats(currentMonthKey(0))),
      label('adminGetStats(previous)', adminGetStats(currentMonthKey(-1))),
      label('adminGetSessionStats', adminGetSessionStats(currentMonthKey(0))),
      label('adminGetTimeInsights', adminGetTimeInsights(currentMonthKey(0))),
    ]);
    if (ov) setOverview(ov);
    if (cur) setCurStats(cur.counts ?? {});
    if (prev) setPrevStats(prev.counts ?? {});
    if (sess) setSessionStats(sess.screens ?? []);
    if (insights) {
      setHeat(insights.heat ?? []);
      setLeaderboard(insights.leaderboard ?? []);
    }
    // Surface a compact status line naming which calls failed (if any) —
    // helpful diagnostic without cluttering the UI when everything works.
    const failed = [
      !ov && 'overview',
      !cur && 'current stats',
      !prev && 'previous stats',
      !sess && 'session stats',
      !insights && 'time insights',
    ].filter(Boolean);
    if (failed.length > 0) {
      setStatsError(`Failed to load: ${failed.join(', ')}. Check Cloud Function logs.`);
    }
    setStatsLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    } catch (err: any) {
      const msg = err?.message ?? '';
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
      const email = searchResult.email ?? searchEmail.trim().toLowerCase();
      const [res, ov] = await Promise.all([adminSearchUser(email), adminGetOverview()]);
      setSearchResult(res);
      setOverview(ov);
      setConfirmAction(null);
    } catch (err: any) {
      setConfirmError(err?.message ?? 'Action failed.');
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

  const sessionByScreen = useMemo(() => {
    const map = new Map<string, ScreenSessionStats>();
    for (const s of sessionStats) map.set(s.screen, s);
    return map;
  }, [sessionStats]);

  const heatMax = useMemo(() => {
    let m = 0;
    for (const row of heat) for (const v of row) if (v > m) m = v;
    return m;
  }, [heat]);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Desire Admin</h1>
          <p className="admin-sub">{overview?.month ?? currentMonthKey(0)} · signed in as {auth.currentUser?.email}</p>
        </div>
        <div className="admin-header-actions">
          <button className="secondary-btn" onClick={handleRefresh} disabled={refreshing || statsLoading}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="secondary-btn" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </header>

      {/* ─── Section 1: Overview ─── */}
      <div className="section-label">Overview · {overview?.month ?? currentMonthKey(0)}</div>
      <div className="grid">
        <StatTile label="Total users" value={overview?.totalUsers} />
        <StatTile label="Couples" value={overview?.totalCouples} />
        <StatTile label="Paired" value={overview?.pairedCouples} />
        <StatTile label="Paid" value={overview?.paidCouples} accent />
        <StatTile label="Active" value={overview?.activeCouplesThisMonth} />
        <StatTile label="New this month" value={overview?.signupsThisMonth} />
      </div>
      {overview && (
        <div className="mrr">
          <div className="mrr-label">MRR estimate</div>
          <div className="mrr-value">${overview.mrrEstimate.toFixed(2)}</div>
          <div className="mrr-hint">at blended $9.99 · {overview.paidCouples} paid couples</div>
        </div>
      )}
      {statsError && <p className="error-text">{statsError}</p>}

      {/* ─── Section 2: Feature usage ─── */}
      <div className="section-label">Feature usage</div>
      <div className="tabs">
        <button className={`tab ${activeTab === 'screens' ? 'active' : ''}`} onClick={() => setActiveTab('screens')}>Screens</button>
        <button className={`tab ${activeTab === 'actions' ? 'active' : ''}`} onClick={() => setActiveTab('actions')}>Actions</button>
        <button className={`tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin</button>
      </div>
      <div className="usage-card">
        {statsLoading && <div className="empty-row">Loading…</div>}
        {!statsLoading && rows.length === 0 && (
          <div className="empty-row">No events in this bucket yet for {currentMonthKey(0)}.</div>
        )}
        {rows.map(({ key, label, count, prev, deltaPct }) => {
          const isRedFlag = count < 10;
          let deltaLabel = '—';
          let deltaClass = 'delta-neutral';
          if (prev === 0 && count > 0) {
            deltaLabel = 'NEW';
            deltaClass = 'delta-up';
          } else if (deltaPct !== null) {
            const sign = deltaPct > 0 ? '+' : '';
            deltaLabel = `${sign}${deltaPct}%`;
            if (deltaPct >= 20) deltaClass = 'delta-up';
            else if (deltaPct <= -20) deltaClass = 'delta-down';
          }
          const timing = activeTab === 'screens' ? sessionByScreen.get(label) : undefined;
          return (
            <div key={key} className={`usage-row${activeTab === 'screens' ? ' usage-row-with-timing' : ''}`}>
              <span className={`usage-label${isRedFlag ? ' red-flag' : ''}`}>{label}</span>
              <span className={`usage-count${isRedFlag ? ' red-flag' : ''}`}>{formatCount(count)}</span>
              <span className={`usage-delta ${deltaClass}`}>{deltaLabel}</span>
              {activeTab === 'screens' && (
                <>
                  <span className="usage-time-cell">{formatDuration(timing?.avgSec ?? null)}</span>
                  <span className="usage-time-cell muted">{formatDuration(timing?.minSec ?? null)}</span>
                  <span className="usage-time-cell muted">{formatDuration(timing?.maxSec ?? null)}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
      {activeTab === 'screens' && !statsLoading && rows.length > 0 && (
        <div className="table-legend">count · MoM % · <strong>avg · min · max</strong> time per opening</div>
      )}

      {/* ─── Reports queue (H33) ─── */}
      <div className="section-label">Reports queue</div>
      <ReportsTab />

      {/* ─── Section 3: Time-of-day heatmap ─── */}
      <div className="section-label">When couples use the app · {currentMonthKey(0)}</div>
      <div className="heatmap-card">
        {statsLoading && <div className="empty-row">Loading…</div>}
        {!statsLoading && heatMax === 0 && (
          <div className="empty-row">No session data yet for {currentMonthKey(0)}.</div>
        )}
        {!statsLoading && heatMax > 0 && (
          <>
            <div className="heatmap-grid">
              <div className="heatmap-corner" />
              {DOW_LABELS.map((d) => <div key={d} className="heatmap-dow-label">{d}</div>)}
              {Array.from({ length: 24 }, (_, h) => (
                <>
                  <div key={`h-${h}`} className="heatmap-hour-label">{h.toString().padStart(2, '0')}</div>
                  {DOW_LABELS.map((_, d) => {
                    const v = heat[h]?.[d] ?? 0;
                    const alpha = v === 0 ? 0 : Math.max(0.08, v / heatMax);
                    return (
                      <div
                        key={`c-${h}-${d}`}
                        className="heatmap-cell"
                        style={{ backgroundColor: `rgba(136, 14, 79, ${alpha})` }}
                        title={`${DOW_LABELS[d]} ${h}:00 · ${v} sessions`}
                      />
                    );
                  })}
                </>
              ))}
            </div>
            <div className="heatmap-legend">
              <span>Less</span>
              <div className="heatmap-legend-gradient" />
              <span>More ({heatMax} sessions in busiest hour)</span>
            </div>
          </>
        )}
      </div>

      {/* ─── Section 4: Per-couple leaderboard ─── */}
      <div className="section-label">Most active couples · {currentMonthKey(0)}</div>
      <div className="usage-card">
        {statsLoading && <div className="empty-row">Loading…</div>}
        {!statsLoading && leaderboard.length === 0 && (
          <div className="empty-row">No active couples with session data yet.</div>
        )}
        {leaderboard.map((entry, i) => (
          <div key={entry.coupleId} className="leaderboard-row">
            <span className="leaderboard-rank">#{i + 1}</span>
            <div className="leaderboard-body">
              <div className="leaderboard-names">
                {entry.names.length === 0 ? '(unknown couple)' : entry.names.join(' & ')}
                {entry.isPremium && <span className="pill paid" style={{ marginLeft: 8 }}>✓ Paid</span>}
              </div>
              <div className="leaderboard-coupleid mono">{entry.coupleId}</div>
            </div>
            <span className="leaderboard-count">{formatCount(entry.sessionCount)}</span>
          </div>
        ))}
      </div>

      {/* ─── Section 3: User lookup ─── */}
      <div className="section-label">User lookup</div>
      <form className="search-row" onSubmit={handleSearch}>
        <input
          className="field-input"
          type="email"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          placeholder="email@example.com"
          autoComplete="off"
          disabled={searching}
        />
        <button className="primary-btn" type="submit" disabled={searching}>
          {searching ? '…' : 'Search'}
        </button>
      </form>
      {searchError && <p className="error-text">{searchError}</p>}
      {!searchResult && !searchError && (
        <p className="empty-hint">Search a user by email to see their profile and grant or revoke premium.</p>
      )}
      {searchResult && !searchResult.found && (
        <div className="user-card">
          <div className="empty-row">No user with that email.</div>
        </div>
      )}
      {searchResult?.found && (
        <div className="user-card">
          <div className="user-header">
            <div className="user-header-body">
              <h2 className="user-name">{searchResult.name || '(no name)'}</h2>
              <p className="user-meta">
                {searchResult.email} · joined {formatJoined(searchResult.joinedAt)}
              </p>
            </div>
            <span className={`pill ${searchResult.isPremium ? 'paid' : 'free'}`}>
              {searchResult.isPremium ? '✓ Paid' : 'Free'}
            </span>
          </div>
          <div className="user-divider" />
          <div className="user-body">
            <span className="user-field">uid</span>
            <span className="user-value mono">{searchResult.uid}</span>
            <span className="user-field">Couple ID</span>
            <span className="user-value mono">{searchResult.coupleId ?? 'Not paired'}</span>
            {searchResult.partner && (
              <>
                <span className="user-field">Paired with</span>
                <span className="user-value">
                  {searchResult.partner.name || '(no name)'} · <span className="mono" style={{ fontSize: 11 }}>{searchResult.partner.uid}</span>
                </span>
              </>
            )}
          </div>
          <div className="user-divider" />
          <div className="action-row">
            <button
              className="primary-btn"
              disabled={!searchResult.coupleId}
              onClick={() => { setConfirmError(null); setConfirmAction('grant'); }}
            >
              Grant premium
            </button>
            <button
              className="destructive-btn"
              disabled={!searchResult.coupleId}
              onClick={() => { setConfirmError(null); setConfirmAction('revoke'); }}
            >
              Revoke premium
            </button>
          </div>
          {confirmError && <p className="error-text" style={{ padding: '0 20px 20px' }}>{confirmError}</p>}
        </div>
      )}

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
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value?: number; accent?: boolean }) {
  return (
    <div className={`tile${accent ? ' accent' : ''}`}>
      <div className="tile-value">{value === undefined || value === null ? '—' : formatCount(value)}</div>
      <div className="tile-label">{label}</div>
    </div>
  );
}
