import { AssignmentRole, AssignmentStatus } from "../shared/enums/ticket.enum";

export interface ValidationAssignment {
  id: number;
  validationId: number;
  ticketCode: string;
  userId: number;
  username: string;
  userRole: string;
  assignmentRole: AssignmentRole;
  zoneId: number;
  zoneName: string;
  status: AssignmentStatus;
  assignedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface AssignmentRequest {
  validationId: number;
  userId: number;
  assignmentRole: AssignmentRole;
  zoneId: number;
  notes?: string;
}

export interface AssignmentBatchRequest {
  assignments: AssignmentRequest[];
}