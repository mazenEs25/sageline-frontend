export enum HandoverStatus {
  PENDING   = 'PENDING',
  ACCEPTED  = 'ACCEPTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  [HandoverStatus.PENDING]:   'En attente',
  [HandoverStatus.ACCEPTED]:  'Assignée',
  [HandoverStatus.COMPLETED]: 'Terminée',
  [HandoverStatus.CANCELLED]: 'Annulée'
};

export const HANDOVER_STATUS_SEVERITY: Record<HandoverStatus, string> = {
  [HandoverStatus.PENDING]:   'warning',
  [HandoverStatus.ACCEPTED]:  'info',
  [HandoverStatus.COMPLETED]: 'success',
  [HandoverStatus.CANCELLED]: 'danger'
};
