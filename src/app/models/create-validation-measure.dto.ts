import { MeasureCategory } from '../shared/enums/measure-category.enum';

export interface CreateValidationMeasureRequest {
  /** Canonical template id consumed by the backend DTO. */
  templateId?: number;
  /** @deprecated Legacy field name kept temporarily for back-compat with older callers. */
  catalogTemplateId?: number;
  /**
   * Zone ID of the target poste. Required when a line has multiple postes of
   * the same type (e.g. two WIFI_CONDUIT). When set, the backend uses this to
   * resolve the target ValidationPosteStatus directly.
   */
  zoneId?: number;
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
