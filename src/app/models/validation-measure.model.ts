import { MeasureCategory } from '../shared/enums/measure-category.enum';
import { MeasureStatus } from '../shared/enums/measure-status.enum';

export interface ValidationMeasure {
  id: number;
  validationId: number;
  /**
   * Specific poste of the line this measure belongs to.
   * Added with the V5.0 backend schema migration. Null for legacy ad-hoc rows
   * whose backfill couldn't resolve a poste.
   */
  posteStatusId: number | null;
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
