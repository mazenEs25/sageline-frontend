export interface ProductionLine {
  id: number;
  code: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionLineRequest {
  code: string;
  name: string;
  active: boolean;
}