/**
 * Update payload for {@code PUT /api/validations/{id}/measures/{measureId}}.
 *
 * Mirrors backend {@code UpdateMeasureRequest}. All fields are optional except
 * {@code measuredValue}, which is always sent (null = reset to NOT_EXECUTED).
 * When bounds/unit/RF context are omitted the existing values are preserved.
 */
export interface UpdateValidationMeasureRequest {
  /** Required on the wire — null means "reset to NOT_EXECUTED". */
  measuredValue: number | null;
  lowerBound?: number;
  upperBound?: number;
  unit?: string;
  antenna?: string | null;
  frequencyMhz?: number | null;
  modulationScheme?: string | null;
}
