import { ValidationMeasure } from './validation-measure.model';
import { CreateValidationMeasureRequest } from './create-validation-measure.dto';

export interface BatchCreateValidationMeasureRequest {
  items: CreateValidationMeasureRequest[];
}

export interface BatchUpdateValidationMeasureItem {
  id: number;
  measuredValue: number | null;
}

export interface BatchUpdateValidationMeasureRequest {
  items: BatchUpdateValidationMeasureItem[];
}

export interface BatchValidationMeasureResponseItem {
  index: number;
  status: 'ok' | 'error';
  measure?: ValidationMeasure;
  error?: { code: string; message: string };
}

export interface BatchValidationMeasureResponse {
  results: BatchValidationMeasureResponseItem[];
  summary: { succeeded: number; failed: number };
}

export interface FromCatalogSeedResponse {
  created: number;
  skipped: number;
  measures: ValidationMeasure[];
}
