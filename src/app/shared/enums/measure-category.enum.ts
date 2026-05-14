export type MeasureCategory =
  | 'POWER' | 'VOLTAGE' | 'CURRENT' | 'FREQUENCY' | 'TIME'
  | 'TEMPERATURE' | 'PER' | 'RSSI' | 'EVM' | 'OTHER';

export const MEASURE_CATEGORY_LABELS: Record<MeasureCategory, string> = {
  POWER: 'Puissance', VOLTAGE: 'Tension', CURRENT: 'Courant',
  FREQUENCY: 'Fréquence', TIME: 'Temps', TEMPERATURE: 'Température',
  PER: 'PER', RSSI: 'RSSI', EVM: 'EVM', OTHER: 'Autre',
};

export const MEASURE_CATEGORY_COLORS: Record<MeasureCategory, string> = {
  POWER: 'warning', VOLTAGE: 'info', CURRENT: 'info',
  FREQUENCY: 'help', TIME: 'secondary', TEMPERATURE: 'danger',
  PER: 'warning', RSSI: 'help', EVM: 'warning', OTHER: 'secondary',
};

export const MEASURE_CATEGORY_ICONS: Record<MeasureCategory, string> = {
  POWER: 'pi pi-bolt', VOLTAGE: 'pi pi-chart-line', CURRENT: 'pi pi-sliders-h',
  FREQUENCY: 'pi pi-wave-pulse', TIME: 'pi pi-clock',
  TEMPERATURE: 'pi pi-sun', PER: 'pi pi-percentage',
  RSSI: 'pi pi-wifi', EVM: 'pi pi-chart-bar', OTHER: 'pi pi-tag',
};
