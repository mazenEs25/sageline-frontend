import { MeasureStatus } from '../shared/enums/measure-status.enum';

export interface MatchedMeasure {
  /** Present only on import-log responses; omitted by preview-log. */
  id?: number;
  measureCode: string;
  label: string;
  value: number;
  unit: string;
  status: MeasureStatus;
  lower: number;
  upper: number;
  templateId: number;
}
