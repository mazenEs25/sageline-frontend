import { Role } from '../shared/enums/role.enum';

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;    // ← Add this

  role: Role;
  productionLineId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserRequest {
  username: string;
  email: string;
  password?: string;    // ← Add this

  role: Role;
  productionLineId?: number;
}