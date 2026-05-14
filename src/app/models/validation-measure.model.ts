import { MeasureCategory } from '../shared/enums/measure-category.enum';
import { MeasureStatus } from '../shared/enums/measure-status.enum';

export interface ValidationMeasure {
  id: number;
  validationId: number;
  catalogTemplateId: number | null;
  measureCode: string;
  measureLabel: string;
  category: MeasureCategory;
  measuredValue: number | null;
  unit: string;
  lowerBound: number;
  upperBound: number;
  status: MeasureStatus;
  antenna: string | null;
  frequencyMhz: number | null;
  modulationScheme: string | null;
  deviationPct: number;
  measuredAt: string;
  enteredById: number;
  enteredByUsername: string;
  sourceLogFile: string | null;
}
