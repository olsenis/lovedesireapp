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
