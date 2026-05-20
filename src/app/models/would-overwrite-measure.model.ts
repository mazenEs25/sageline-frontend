import { MeasureStatus } from '../shared/enums/measure-status.enum';

/**
 * Mirrors backend {@code WouldOverwriteMeasureDTO}. Each entry describes a measure
 * that already exists on the ticket — the importer would replace its current value
 * if {@code overwriteExisting=true}, or skip it otherwise.
 */
export interface WouldOverwriteMeasure {
  measureCode: string;
  currentValue: number | null;
  currentStatus: MeasureStatus;
  currentEnteredManually: boolean;
  newValue: number | null;
  newComputedStatus: MeasureStatus;
}
