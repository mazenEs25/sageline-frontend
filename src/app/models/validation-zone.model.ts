export interface ValidationZone {
  id: number;
  name: string;
  description?: string;
  productionLineId: number;

  // NEW
  posteType?: string;
  orderInLine?: number;
  requiresToolCheck?: boolean;
  lineId?: number;
  lineCode?: string;
  phaseId?: number;
  phaseCode?: string;
  secteurId?: number;
  secteurCode?: string;

  // existing
  lineName?: string;
  lineActive?: boolean;
  createdAt?: string;
}

export interface ValidationZoneRequest {
  name: string;
  description?: string;
  productionLineId: number;
}