export interface ValidationResult {
  id: number;
  validationId: number;
  parameter: string;
  measuredValue: number;
  expectedValue: number;
  conform: boolean;
  createdAt?: string;
}

export interface ValidationResultRequest {
  validationId: number;
  parameter: string;
  measuredValue: number;
  expectedValue: number;
}