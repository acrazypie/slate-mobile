// The report types on their own, so the data layer can use them without
// importing the calculations (which need the repository).

export type ReportKind = 'hours' | 'counts' | 'overtime' | 'pay';
export const REPORT_KINDS: ReportKind[] = ['hours', 'counts', 'overtime', 'pay'];

/** A report the user added to the summary. Its numbers are worked out from the period on screen. */
export interface Report {
  id: string;
  kind: ReportKind;
  created_at: string;
}
