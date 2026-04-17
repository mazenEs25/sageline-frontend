export interface Phase {
  id: number;
  code: string;
  name: string;
  secteurId: number;
  secteurCode: string;
  secteurName: string;
  orderIndex: number;
  active: boolean;
  lineCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PhaseRequest {
  code: string;
  name: string;
  secteurId: number;
  orderIndex: number;
  active?: boolean;
}