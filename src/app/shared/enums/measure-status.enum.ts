export type MeasureStatus = 'OK' | 'OUT_OF_RANGE' | 'NOT_EXECUTED';

export const MEASURE_STATUS_LABELS: Record<MeasureStatus, string> = {
  OK: 'Conforme', OUT_OF_RANGE: 'Hors tolérance', NOT_EXECUTED: 'Non exécuté',
};

export const MEASURE_STATUS_COLORS: Record<MeasureStatus, string> = {
  OK: 'success', OUT_OF_RANGE: 'danger', NOT_EXECUTED: 'secondary',
};

export const MEASURE_STATUS_ICONS: Record<MeasureStatus, string> = {
  OK: 'pi pi-check-circle',
  OUT_OF_RANGE: 'pi pi-times-circle',
  NOT_EXECUTED: 'pi pi-minus-circle',
};
