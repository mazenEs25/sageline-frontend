import { MeasureCategory } from '../shared/enums/measure-category.enum';

export interface CreateValidationMeasureRequest {
  catalogTemplateId?: number;
  measureCode?: string;
  measureLabel?: string;
  category?: MeasureCategory;
  unit?: string;
  lowerBound?: number;
  upperBound?: number;
  antenna?: string;
  frequencyMhz?: number;
  modulationScheme?: string;
  measuredValue?: number | null;
}
