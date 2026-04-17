export interface ProductionLine {
  id: number;
  code: string;
  name: string;
  active: boolean;
  
   // NEW
  phaseId?: number;
  phaseCode?: string;
  phaseName?: string;
  secteurId?: number;
  secteurCode?: string;
  secteurName?: string;
  lineNumber?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionLineRequest {
  code: string;
  name: string;
  active: boolean;
   // NEW
  phaseId?: number;
  lineNumber?: number;
}