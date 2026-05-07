import { Role } from '../shared/enums/role.enum';

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;

  role: Role;
  /** Sector the user is bound to — used by CHEF_SECTEUR to subscribe
   *  to /topic/handover.secteur.{secteurId}. Provided by GET /api/users/me. */
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