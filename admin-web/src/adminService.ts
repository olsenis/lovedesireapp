import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Client-side allowlist — mirrors ADMIN_UIDS in functions/src/index.ts.
// UX helper only for hiding the dashboard from non-admin auth accounts.
// The real security gate is assertAdmin(req) inside each Cloud Function.
// Do NOT rely on this for anything that matters.
const ADMIN_UIDS = new Set<string>([
  'fL9brG7iuSe0XNomrRkDZ3N7PAl1', // Óli (olsenis@gmail.com)
]);

export function isCurrentUserAdmin(uid: string | undefined | null): boolean {
  return !!uid && ADMIN_UIDS.has(uid);
}

export interface AdminOverview {
  month: string;
  totalUsers: number;
  totalCouples: number;
  pairedCouples: number;
  paidCouples: number;
  activeCouplesThisMonth: number;
  signupsThisMonth: number;
  mrrEstimate: number;
}

export interface AdminStats {
  month: string;
  counts: Record<string, number>;
}

export interface AdminUserResult {
  found: boolean;
  uid?: string;
  email?: string;
  name?: string;
  coupleId?: string | null;
  isPremium?: boolean;
  joinedAt?: number | string;
  partner?: { uid: string; name: string } | null;
}

export interface ScreenSessionStats {
  screen: string;
  count: number;
  totalSec: number;
  avgSec: number;
  minSec: number | null;
  maxSec: number | null;
}

export interface AdminSessionStats {
  month: string;
  screens: ScreenSessionStats[];
}

export interface LeaderboardEntry {
  coupleId: string;
  sessionCount: number;
  names: string[];
  isPremium: boolean;
}

export interface AdminTimeInsights {
  month: string;
  heat: number[][]; // 24 hours × 7 days-of-week (Sun=0)
  leaderboard: LeaderboardEntry[];
}

export type ReportCategory = 'csam' | 'ncii' | 'harassment' | 'other';
export type ReportContentType =
  | 'moment' | 'flash' | 'note' | 'todo'
  | 'truthdare' | 'fantasy-wish' | 'wyr-custom';
export type ReportStatus = 'pending' | 'dismissed' | 'content_removed' | 'couple_disconnected';
export type ReportAction = 'dismiss' | 'remove_content' | 'disconnect_couple';

export interface Report {
  id: string;
  reporterUid: string;
  coupleId: string;
  targetUid: string;
  contentType: ReportContentType;
  contentPath: string;
  contentSnippet: string;
  contentStorageUrl: string | null;
  category: ReportCategory;
  detail: string;
  disconnected: boolean;
  status: ReportStatus;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
  resolveNotes?: string;
  reporterEmail: string | null;
  targetEmail: string | null;
}

const _adminGetOverview = httpsCallable<void, AdminOverview>(functions, 'adminGetOverview');
const _adminGetStats = httpsCallable<{ month: string }, AdminStats>(functions, 'adminGetStats');
const _adminGrantPremium = httpsCallable<{ coupleId: string }, { ok: true; coupleId: string }>(
  functions,
  'adminGrantPremium',
);
const _adminRevokePremium = httpsCallable<{ coupleId: string }, { ok: true; coupleId: string }>(
  functions,
  'adminRevokePremium',
);
const _adminSearchUser = httpsCallable<{ email: string }, AdminUserResult>(
  functions,
  'adminSearchUser',
);
const _adminGetSessionStats = httpsCallable<{ month: string }, AdminSessionStats>(
  functions,
  'adminGetSessionStats',
);
const _adminGetTimeInsights = httpsCallable<{ month: string }, AdminTimeInsights>(
  functions,
  'adminGetTimeInsights',
);
const _adminGetReports = httpsCallable<{ status?: ReportStatus; limit?: number }, { reports: Report[] }>(
  functions,
  'adminGetReports',
);
const _adminResolveReport = httpsCallable<
  { reportId: string; action: ReportAction; notes?: string },
  { ok: true; action: ReportAction; newStatus: ReportStatus }
>(functions, 'adminResolveReport');

export async function adminGetOverview(): Promise<AdminOverview> {
  const res = await _adminGetOverview();
  return res.data;
}

export async function adminGetStats(month: string): Promise<AdminStats> {
  const res = await _adminGetStats({ month });
  return res.data;
}

export async function adminGrantPremium(coupleId: string): Promise<void> {
  await _adminGrantPremium({ coupleId });
}

export async function adminRevokePremium(coupleId: string): Promise<void> {
  await _adminRevokePremium({ coupleId });
}

export async function adminSearchUser(email: string): Promise<AdminUserResult> {
  const res = await _adminSearchUser({ email });
  return res.data;
}

export async function adminGetSessionStats(month: string): Promise<AdminSessionStats> {
  const res = await _adminGetSessionStats({ month });
  return res.data;
}

export async function adminGetTimeInsights(month: string): Promise<AdminTimeInsights> {
  const res = await _adminGetTimeInsights({ month });
  return res.data;
}

export async function adminGetReports(status: ReportStatus = 'pending', limit = 50): Promise<Report[]> {
  const res = await _adminGetReports({ status, limit });
  return res.data.reports;
}

export async function adminResolveReport(
  reportId: string, action: ReportAction, notes?: string,
): Promise<{ action: ReportAction; newStatus: ReportStatus }> {
  const res = await _adminResolveReport({ reportId, action, notes });
  return { action: res.data.action, newStatus: res.data.newStatus };
}
