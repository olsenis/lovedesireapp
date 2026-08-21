import { useState, useCallback } from 'react';
import type { ReportInput } from '../services/reportService';

// The parts of ReportInput the caller provides at "open report on this
// content" time. Category / detail / disconnect are collected inside the
// modal itself.
export type ReportContentRef = Omit<ReportInput, 'category' | 'detail' | 'disconnect'>;

export function useReport() {
  const [contentRef, setContentRef] = useState<ReportContentRef | null>(null);

  const openReport = useCallback((ref: ReportContentRef) => {
    setContentRef(ref);
  }, []);

  const closeReport = useCallback(() => {
    setContentRef(null);
  }, []);

  return {
    reportContentRef: contentRef,
    openReport,
    closeReport,
  };
}
