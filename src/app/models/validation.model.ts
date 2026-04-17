import { TicketStatus, Priority } from '../shared/enums/ticket.enum';
import { ValidationAssignment } from './validation-assignment.model';

export interface Validation {
  id: number;
  ticketCode: string;
  status: TicketStatus;
  priority: Priority;

  // Zone info
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

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}
export interface ValidationRequest {
  validationZoneId: number;
  comments?: string;
}
