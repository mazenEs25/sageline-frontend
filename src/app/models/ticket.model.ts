import { Priority } from "../shared/enums/ticket.enum";

/**
 * 2026-04 line-ticket model: the ticket is attached to a production line;
 * every required poste of the line is automatically seeded as a sub-row on
 * the server. `validationZoneId` is optional and only used to hint which
 * poste is the "primary" one (defaults to the first poste of the line).
 */
export interface TicketCreateRequest {
  productionLineId: number;
  validationZoneId?: number;
  /**
   * Optional subset of the line's postes to cover. Omit (or pass all line
   * poste ids) to include every poste — default behaviour. When non-empty,
   * every id must belong to the selected productionLineId.
   */
  includedZoneIds?: number[];
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