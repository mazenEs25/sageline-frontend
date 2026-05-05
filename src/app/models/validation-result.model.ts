export interface ValidationResult {
  id: number;
  validationId: number;
  /** Per-poste link (2026-04 line-ticket model). May be null on legacy rows. */
  zoneId?: number | null;
  zoneName?: string | null;
  parameter: string;
  measuredValue: number;
  expectedValue: number;
  conform: boolean;
  createdAt?: string;
}

export interface ValidationResultRequest {
  validationId: number;
  /** Optional per-poste link. When set, the backend validates the poste belongs to the ticket's line. */
  zoneId?: number | null;
  parameter: string;
  measuredValue: number;
  expectedValue: number;
}