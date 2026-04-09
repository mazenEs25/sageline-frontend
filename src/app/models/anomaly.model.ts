import { AnomalyType, Severity } from '../shared/enums/anomaly.enum';

export interface AnomalyResult {
  type: AnomalyType;
  severity: Severity;
  description: string;
  score: number;
  parameter: string;
}

export interface AnomalyDetection {
  id: number;
  validationId: number;
  anomalyType: AnomalyType;
  severity: Severity;
  description: string;
  detectedAt: string;
}

export interface ZoneAnomalyReport {
  zoneId: number;
  period: string;
  totalAnomalies: number;
  critical: number;
  warning: number;
  anomalies: AnomalyDetection[];
}