import { useEffect, useState, useCallback } from 'react';
import {
  adminGetReports, adminResolveReport,
  type Report, type ReportAction, type ReportStatus, type ReportCategory,
} from '../adminService';

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  csam: 'Sexualises a minor',
  ncii: 'Non-consensual intimate content',
  harassment: 'Harassment or abuse',
  other: 'Other',
};

const CATEGORY_COLORS: Record<ReportCategory, string> = {
  csam: '#B71C1C',
  ncii: '#B71C1C',
  harassment: '#E65100',
  other: '#616161',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pending',
  dismissed: 'Dismissed',
  content_removed: 'Content removed',
  couple_disconnected: 'Couple disconnected',
};

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function contentTypeLabel(t: string): string {
  switch (t) {
    case 'moment': return 'Moments photo';
    case 'flash': return 'Tease';
    case 'note': return 'Love note';
    case 'todo': return 'Together List item';
    case 'truthdare': return 'Truth or Dare answer';
    case 'fantasy-wish': return 'Fantasy Wish';
    case 'wyr-custom': return 'WYR custom question';
    default: return t;
  }
}

export function ReportsTab() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus>('pending');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Report | null>(null);
  const [actioning, setActioning] = useState(false);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminGetReports(statusFilter, 100);
      setReports(list);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (action: ReportAction) => {
    if (!selected) return;
    setActioning(true);
    try {
      await adminResolveReport(selected.id, action, notes.trim() || undefined);
      setSelected(null);
      setNotes('');
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Action failed');
    } finally {
      setActioning(false);
    }
  };

  return (
    <div className="reports-tab">
      <div className="reports-header">
        <div className="reports-filter-row">
          {(['pending', 'dismissed', 'content_removed', 'couple_disconnected'] as ReportStatus[]).map((s) => (
            <button
              key={s}
              className={`reports-filter ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button className="reports-refresh" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className="reports-error">{error}</div>}

      {!loading && reports.length === 0 && (
        <div className="reports-empty">No {STATUS_LABELS[statusFilter].toLowerCase()} reports.</div>
      )}

      {reports.map((r) => (
        <div key={r.id} className="report-row" onClick={() => { setSelected(r); setNotes(r.resolveNotes ?? ''); }}>
          <div className="report-row-top">
            <span
              className="report-category-pill"
              style={{ backgroundColor: CATEGORY_COLORS[r.category] }}
            >
              {CATEGORY_LABELS[r.category]}
            </span>
            <span className="report-content-type">{contentTypeLabel(r.contentType)}</span>
            <span className="report-time">{formatTs(r.createdAt)}</span>
          </div>
          <div className="report-snippet">"{r.contentSnippet || '(no preview)'}"</div>
          <div className="report-meta">
            <span>Reporter: {r.reporterEmail ?? r.reporterUid.slice(0, 8)}</span>
            <span>Target: {r.targetEmail ?? r.targetUid.slice(0, 8)}</span>
            {r.disconnected && <span className="report-disc">· Reporter also disconnected</span>}
          </div>
          {r.detail && <div className="report-detail">Detail: "{r.detail}"</div>}
        </div>
      ))}

      {selected && (
        <div className="report-modal-overlay" onClick={() => setSelected(null)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Resolve report</h3>

            <div className="report-modal-info">
              <div><b>Category:</b> {CATEGORY_LABELS[selected.category]}</div>
              <div><b>Content:</b> {contentTypeLabel(selected.contentType)}</div>
              <div><b>Path:</b> <code>{selected.contentPath}</code></div>
              {selected.contentStorageUrl && (
                <div>
                  <b>Storage:</b>{' '}
                  <a href={selected.contentStorageUrl} target="_blank" rel="noreferrer">
                    Open blob
                  </a>
                </div>
              )}
              <div><b>Reporter:</b> {selected.reporterEmail ?? selected.reporterUid}</div>
              <div><b>Target:</b> {selected.targetEmail ?? selected.targetUid}</div>
              <div><b>Couple:</b> <code>{selected.coupleId}</code></div>
              <div><b>Snippet:</b> "{selected.contentSnippet || '(none)'}"</div>
              {selected.detail && <div><b>Reporter detail:</b> "{selected.detail}"</div>}
              {selected.disconnected && (
                <div className="report-modal-flag">Reporter already disconnected from the couple.</div>
              )}
            </div>

            {selected.status === 'pending' ? (
              <>
                <textarea
                  className="report-notes"
                  placeholder="Admin notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                />

                <div className="report-actions">
                  <button
                    className="report-action-btn report-action-dismiss"
                    onClick={() => handleAction('dismiss')}
                    disabled={actioning}
                  >
                    Dismiss
                  </button>
                  <button
                    className="report-action-btn report-action-remove"
                    onClick={() => handleAction('remove_content')}
                    disabled={actioning}
                  >
                    Remove content
                  </button>
                  {!selected.disconnected && (
                    <button
                      className="report-action-btn report-action-disconnect"
                      onClick={() => handleAction('disconnect_couple')}
                      disabled={actioning}
                    >
                      Disconnect couple
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="report-resolved-info">
                <div><b>Status:</b> {STATUS_LABELS[selected.status]}</div>
                {selected.resolvedAt && <div><b>Resolved:</b> {formatTs(selected.resolvedAt)}</div>}
                {selected.resolvedBy && <div><b>By:</b> {selected.resolvedBy.slice(0, 8)}</div>}
                {selected.resolveNotes && <div><b>Notes:</b> "{selected.resolveNotes}"</div>}
              </div>
            )}

            <button className="report-modal-close" onClick={() => setSelected(null)} disabled={actioning}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
