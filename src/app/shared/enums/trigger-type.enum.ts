export enum TriggerType {
  MANUAL         = 'MANUAL',
  SHIFT_END_AUTO = 'SHIFT_END_AUTO',
  ADMIN_FORCE    = 'ADMIN_FORCE'
}

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  [TriggerType.MANUAL]:         'Manuelle',
  [TriggerType.SHIFT_END_AUTO]: 'Automatique (fin de shift)',
  [TriggerType.ADMIN_FORCE]:    'Forcée (admin)'
};

export const TRIGGER_TYPE_SEVERITY: Record<TriggerType, string> = {
  [TriggerType.MANUAL]:         'info',
  [TriggerType.SHIFT_END_AUTO]: 'warning',
  [TriggerType.ADMIN_FORCE]:    'danger'
};
