export interface DashboardData {
  conformityRate: number;
  totalValidations: number;
  activeValidations: number;
  conformeCount: number;
  nonConformeCount: number;
  aiAlertsCount: number;
  recentValidations: any[];
}

export interface KPI {
  id: number;
  name: string;
  value: number;
  productionLineId: number;
  calculationDate: string;
  createdAt?: string;
}

export interface KPIEvolution {
  date: string;
  value: number;
}

export interface GlobalSummary {
  totalLines: number;
  totalValidations: number;
  globalConformityRate: number;
  totalNonConformities: number;
}