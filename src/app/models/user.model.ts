import { Role } from '../shared/enums/role.enum';

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;

  role: Role;
  secteurId?: number;
  secteurCode?: string;
  secteurName?: string;

  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserRequest {
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;

  role: Role;
  secteurId?: number;

  active?: boolean;
}