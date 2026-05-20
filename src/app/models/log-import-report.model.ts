import { MatchedMeasure } from './matched-measure.model';
import { UnmatchedMeasure } from './unmatched-measure.model';
import { SkippedMeasure } from './skipped-measure.model';
import { WouldOverwriteMeasure } from './would-overwrite-measure.model';

export type LogFormat = 'BNFT' | 'BWC' | 'BTF';

/**
 * Mirrors backend {@code LogImportReportDTO}.
 *
 * <p>Note: the backend currently uses {@code wouldOverwrite[]} (typed
 * {@link WouldOverwriteMeasure}) — {@code skipped[]} is kept on this interface as an
 * optional legacy field to avoid breaking older code paths that referenced it.</p>
 */
export interface LogImportReport {
  detectedFormat: LogFormat;
  totalParsed: number;
  matched: MatchedMeasure[];
  unmatched: UnmatchedMeasure[];
  wouldOverwrite: WouldOverwriteMeasure[];
  warnings: string[];
  ticketId?: number;
  dryRun?: boolean;
  /** @deprecated Use {@link wouldOverwrite}. Kept for back-compat with older code. */
  skipped?: SkippedMeasure[];
}
