import { HandoverStatus } from '../shared/enums/handover-status.enum';
import { TriggerType } from '../shared/enums/trigger-type.enum';

export interface HandoverResponse {
  id: number;
  validationId: number;
  ticketCode: string;
  fromTechUsername: string;
  toTechUsername?: string;
  handoverNote: string;
  progressSummary: string;
  status: HandoverStatus;
  triggeredBy: TriggerType;
  scheduledAt: string;
  acceptedAt?: string;
}

export interface HandoverInitiateRequest {
  handoverNote: string;
  progressSummary: string;
}

export interface HandoverAssignRequest {
  techId: number;
}
