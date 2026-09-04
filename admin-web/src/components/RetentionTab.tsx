import { useEffect, useMemo, useState } from 'react';
import {
  adminGetCohortRetention, adminGetDauMau, adminGetFunnelStats,
  adminGetFeatureFrequency,
  CohortRetention, DauMauSeries, FunnelStats, FeatureFrequency,
} from '../adminService';

// Retention analytics tab. Backed by four callables that all read
// aggregate coupleId-granularity data — no per-user timelines.
// Cards: cohort retention curve, DAU/MAU trend, onboarding funnel,
// feature frequency table.
export function RetentionTab() {
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const [month, setMonth] = useState(currentMonth);
  const [dauStart, setDauStart] = useState(thirtyDaysAgo);
  const [dauEnd, setDauEnd] = useState(today);

  const [cohort, setCohort] = useState<CohortRetention | null>(null);
  const [dauMau, setDauMau] = useState<DauMauSeries | null>(null);
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);
  const [freq, setFreq] = useState<FeatureFrequency | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [c, d, f, ff] = await Promise.all([
        adminGetCohortRetention(month),
        adminGetDauMau(dauStart, dauEnd),
        adminGetFunnelStats(month),
        adminGetFeatureFrequency(month),
      ]);
      setCohort(c);
      setDauMau(d);
      setFunnel(f);
      setFreq(ff);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load retention data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="retention-tab">
      <div className="retention-controls">
        <label>
          Month (funnel + freq + cohort):
          <input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="2026-09" />
        </label>
        <label>
          DAU/MAU range:
          <input value={dauStart} onChange={(e) => setDauStart(e.target.value)} placeholder="2026-09-01" />
          <span>→</span>
          <input value={dauEnd} onChange={(e) => setDauEnd(e.target.value)} placeholder="2026-09-30" />
        </label>
        <button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</button>
      </div>

      {err && <div className="error-row">{err}</div>}

      {/* ── Cohort retention curve ── */}
      <div className="section-label">Cohort retention · {month}</div>
      {cohort && cohort.cohortSize === 0 && (
        <div className="empty-row">No couples signed up in {month}.</div>
      )}
      {cohort && cohort.cohortSize > 0 && (
        <div className="cohort-card">
          <div className="cohort-header">
            <span>Cohort size: <strong>{cohort.cohortSize}</strong> couples</span>
          </div>
          <div className="cohort-bars">
            {cohort.days.map(({ day, activeCount }) => {
              const pct = cohort.cohortSize > 0 ? (activeCount / cohort.cohortSize) * 100 : 0;
              return (
                <div key={day} className="cohort-bar-row">
                  <span className="cohort-day">D{day}</span>
                  <div className="cohort-bar-track">
                    <div className="cohort-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="cohort-pct">{Math.round(pct)}%</span>
                  <span className="cohort-count">{activeCount}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DAU / MAU trend ── */}
      <div className="section-label">DAU / MAU · {dauStart} → {dauEnd}</div>
      {dauMau && dauMau.days.length === 0 && <div className="empty-row">No active-couples data in range.</div>}
      {dauMau && dauMau.days.length > 0 && (
        <div className="daumau-card">
          <div className="daumau-header">
            <span>Latest DAU: <strong>{dauMau.days[dauMau.days.length - 1].dau}</strong></span>
            <span>Latest MAU (28d): <strong>{dauMau.days[dauMau.days.length - 1].mau}</strong></span>
            <span>Stickiness (DAU/MAU): <strong>{dauMau.days[dauMau.days.length - 1].ratio}</strong></span>
          </div>
          <div className="daumau-rows">
            {dauMau.days.slice().reverse().map(({ date, dau, mau, ratio }) => (
              <div key={date} className="daumau-row">
                <span className="daumau-date">{date}</span>
                <span className="daumau-num">DAU {dau}</span>
                <span className="daumau-num muted">MAU {mau}</span>
                <span className="daumau-num muted">{Math.round(ratio * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Onboarding + subscription funnel ── */}
      <div className="section-label">Funnel · {month}</div>
      {funnel && funnel.steps.length > 0 && (
        <div className="funnel-card">
          {funnel.steps.map((step) => (
            <div key={step.name} className="funnel-row">
              <span className="funnel-step">{step.name.replace(/_/g, ' ')}</span>
              <span className="funnel-count">{step.count}</span>
              <span className={`funnel-dropoff${step.dropoffPct && step.dropoffPct > 50 ? ' warn' : ''}`}>
                {step.dropoffPct === null ? '—' : `↓ ${step.dropoffPct}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Feature frequency (opens per active couple) ── */}
      <div className="section-label">Feature frequency · opens per active couple · {month}</div>
      {freq && freq.rows.length > 0 && (
        <div className="freq-card">
          <div className="freq-header">
            <span>Active couples this month: <strong>{freq.activeCount}</strong></span>
          </div>
          <div className="freq-rows">
            {freq.rows.map(({ screen, opens, perCouple }) => (
              <div key={screen} className="freq-row">
                <span className="freq-screen">{screen}</span>
                <span className="freq-opens muted">{opens} opens</span>
                <span className="freq-per">
                  <strong>{perCouple.toFixed(2)}</strong> /couple
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
