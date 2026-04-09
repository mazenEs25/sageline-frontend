export interface ToolScore {
  id: number;
  name: string;
  description?: string;
  toolStatus: string;
  score: number;
  scoreBreakdown: {
    successRate: number;
    availability: number;
    maintenance: number;
    experience: number;
    compatibility: number;
  };
  successRate?: number;
  usageCount?: number;
  lastMaintenance?: string;
}