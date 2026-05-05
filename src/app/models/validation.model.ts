import { TicketStatus, Priority } from '../shared/enums/ticket.enum';
import { ValidationAssignment } from './validation-assignment.model';

/**
 * Per-poste sub-status row of a line-level ticket (2026-04 model).
 * One row per required poste of the line.
 */
export interface PosteStatus {
  id: number;
  validationId: number;

  zoneId: number;
  zoneName: string;
  posteType?: string;
  orderInLine?: number;

  status: TicketStatus;

  validatedById?: number;
  validatedByUsername?: string;
  validatedAt?: string;

  notes?: string;

  /**
   * Per-poste measurement counters (2026-04 line-ticket model).
   * Number of {@link ValidationResult} rows attached to this poste.
   */
  resultsCount?: number;
  nonConformCount?: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface Validation {
  id: number;
  ticketCode: string;
  status: TicketStatus;
  priority: Priority;

  // Primary/legacy zone info (kept for backwards compatibility with older
  // consumers; for new line-tickets this is the line's first poste).
  validationZoneId: number;
  zoneName: string;
  posteType?: string;

  // Line info
  lineId?: number;
  lineCode?: string;
  lineName?: string;

  // Phase info
  phaseId?: number;
  phaseCode?: string;
  phaseName?: string;

  // Secteur info
  secteurId?: number;
  secteurCode?: string;

  // Creator
  createdById?: number;
  createdByUsername?: string;

  // Planning
  plannedDate?: string;
  plannedWeekStart?: string;
  plannedWeekEnd?: string;

  // Dates
  startDate?: string;
  endDate?: string;

  // Comments
  comments?: string;
  prepComments?: string;
  reviewComments?: string;

  // Tool verification
  toolsVerified?: boolean;
  toolsVerifiedAt?: string;
  toolsVerifiedByUsername?: string;

  // Results summary
  resultsCount?: number;
  conformCount?: number;
  nonConformCount?: number;
  conformityRate?: number;

  // AI Prediction
  riskScore?: number;
  riskLevel?: string;
  confidence?: number;

  // Assignments
  assignments?: ValidationAssignment[];

  // Per-poste sub-statuses (2026-04 line-ticket model)
  posteStatuses?: PosteStatus[];
  posteTotal?: number;
  posteDone?: number;
  posteConforme?: number;
  posteNonConforme?: number;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}
/**
 * Legacy interface used only by the unrouted admin/validations/* pages.
 * The authoritative creation payload is `TicketCreateRequest` in ticket.model.ts
 * (which makes productionLineId required — line-ticket model 2026-04).
 */
export interface ValidationRequest {
  productionLineId?: number;
  validationZoneId?: number;
  comments?: string;
}

/**
 * Payload for PATCH /api/validations/{id}/postes/{zoneId}/complete
 */
export interface PosteCompleteRequest {
  finalStatus: 'CONFORME' | 'NON_CONFORME';
  notes?: string;
}
