export enum ToolStatus {
  DISPONIBLE = 'DISPONIBLE',
  EN_UTILISATION = 'EN_UTILISATION',
  EN_MAINTENANCE = 'EN_MAINTENANCE'
}

export const TOOL_STATUS_LABELS: Record<ToolStatus, string> = {
  [ToolStatus.DISPONIBLE]: 'Disponible',
  [ToolStatus.EN_UTILISATION]: 'En utilisation',
  [ToolStatus.EN_MAINTENANCE]: 'En maintenance'
};

export const TOOL_STATUS_COLORS: Record<ToolStatus, string> = {
  [ToolStatus.DISPONIBLE]: 'success',
  [ToolStatus.EN_UTILISATION]: 'warning',
  [ToolStatus.EN_MAINTENANCE]: 'danger'
};