import { ValidationStatus } from '../shared/enums/validation-status.enum';

export interface Validation {
  startDate: string | number | Date;
  id: number;
  zoneId: number;
  userId: number;
  status: ValidationStatus;
  comments?: string;
  validatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  endDate?: string | Date;
  // Relations
  validationZoneId: number;
  zoneName?: string;
  lineName?: string;
  lineId?: number;

  // Computed
  resultsCount?: number;
  conformCount?: number;
  nonConformCount?: number;

  // AI Prediction
  riskScore?: number;
  riskLevel?: 'BAS' | 'MOYEN' | 'RISQUE' | 'CRITIQUE';
  confidence?: number;
}
export interface ValidationRequest {
  validationZoneId: number;
  comments?: string;
}
