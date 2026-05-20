import { MeasureStatus } from '../shared/enums/measure-status.enum';

export interface SkippedMeasure {
  measureCode: string;
  existingValue: number | null;
  existingStatus: MeasureStatus;
  incomingValue: number;
}
