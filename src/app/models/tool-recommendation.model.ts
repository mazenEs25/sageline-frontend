import { ToolStatus } from '../shared/enums/tool-status.enum';

export interface ToolRecommendation {
  id: number;
  name: string;
  description?: string;
  toolStatus: ToolStatus;        // matches backend field name
  successRate?: number;
  usageCount?: number;
  avgValidationTime?: number;
  compatibleZones?: string;
  compatibleLines?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  confidenceScore?: number;
  recommendedAt?: string;
  createdAt?: string;
}

export interface ToolRecommendationRequest {
  name: string;
  description?: string;
  toolStatus: ToolStatus;
  successRate?: number;
  usageCount?: number;
  avgValidationTime?: number;
  compatibleZones?: string;
  compatibleLines?: string;
  confidenceScore?: number;
}