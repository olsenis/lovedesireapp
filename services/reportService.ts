import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import { trackEvent } from './statsService';

const functions = getFunctions(app);

export type ReportCategory = 'csam' | 'ncii' | 'harassment' | 'other';
export type ReportContentType =
  | 'moment' | 'flash' | 'note' | 'todo'
  | 'truthdare' | 'fantasy-wish' | 'wyr-custom';

export interface ReportInput {
  contentType: ReportContentType;
  contentPath: string;             // e.g. "couples/{coupleId}/moments/{id}"
  contentSnippet: string;          // truncated preview or descriptor
  contentStorageUrl?: string;      // Storage URL for photo/video/voice
  category: ReportCategory;
  detail?: string;                 // free-text from reporter
  targetUid: string;               // partner uid
  coupleId: string;
  disconnect: boolean;             // also disconnect the couple
}

export interface ReportResult {
  reportId: string;
  disconnected: boolean;
}

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  csam: 'Sexualises a minor',
  ncii: 'Non-consensual intimate content',
  harassment: 'Harassment or abuse',
  other: 'Other',
};

export function reportCategoryLabel(category: ReportCategory): string {
  return CATEGORY_LABELS[category];
}

// Categories where the disconnect checkbox is pre-checked and the copy
// pushes hard toward disconnect. CSAM + NCII are strict-liability content
// categories under Icelandic §210a and international law.
export function shouldPrecheckDisconnect(category: ReportCategory): boolean {
  return category === 'csam' || category === 'ncii';
}

export function offersDisconnect(category: ReportCategory): boolean {
  return category !== 'other';
}

export async function submitReport(input: ReportInput): Promise<ReportResult> {
  const fn = httpsCallable<ReportInput, ReportResult>(functions, 'submitReport');
  try {
    const result = await fn(input);
    trackEvent('report_submitted');
    return result.data;
  } catch (e: any) {
    console.error('[submitReport] error:', e);
    throw e;
  }
}
