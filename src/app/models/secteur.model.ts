import { Phase } from "./phase.model";

export interface Secteur {
  id: number;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  phaseCount: number;
  lineCount: number;
  userCount: number;
  phases?: Phase[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SecteurRequest {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
}

