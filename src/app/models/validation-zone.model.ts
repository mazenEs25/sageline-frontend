export interface ValidationZone {
  id: number;
  name: string;
  description?: string;
  productionLineId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidationZoneRequest {
  name: string;
  description?: string;
  productionLineId: number;
}