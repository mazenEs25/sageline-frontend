import { TicketStatus } from '../shared/enums/ticket.enum';

export interface WorkflowReadinessMissingMeasure {
  measureCode: string;
  label: string;
  required: boolean;
  catalogTemplateId: number | null;
}

export interface WorkflowReadinessOutOfRangeMeasure {
  measureId: number;
  measureCode: string;
  label: string;
  measuredValue: number;
  unit: string;
  lowerBound: number;
  upperBound: number;
  deviationPct: number;
}

export interface WorkflowReadiness {
  ticketId: number;
  currentStatus: TicketStatus;
  targetStatus: TicketStatus;
  mandatoryTotal: number;
  mandatoryFilled: number;
  mandatoryMissing: number;
  missingMeasures: WorkflowReadinessMissingMeasure[];
  outOfRangeMeasures: WorkflowReadinessOutOfRangeMeasure[];
  canTransition: boolean;
  blockingReasons: string[];
}
