import { Priority } from "../shared/enums/ticket.enum";

export interface TicketCreateRequest {
  validationZoneId: number;
  plannedDate?: string;
  plannedWeekStart?: string;
  plannedWeekEnd?: string;
  priority?: Priority;
  comments?: string;
  assignments?: TicketAssignment[];
}

export interface TicketAssignment {
  userId: number;
  assignmentRole: string; // 'TECH_VALIDATION' | 'TECH_PREPARATION'
  zoneId?: number;
}

export interface TicketWeekPlanRequest {
  weekStart: string;
  weekEnd: string;
  tickets: TicketCreateRequest[];
}

export interface PrepValidationRequest {
  toolsAvailable: boolean;
  prepComments?: string;
}

export interface TicketCloseRequest {
  finalStatus: string; // 'CONFORME' | 'NON_CONFORME'
  reviewComments?: string;
}