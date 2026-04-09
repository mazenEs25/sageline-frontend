export enum AnomalyType {
  DEVIATION = 'DEVIATION',
  HORAIRE = 'HORAIRE',
  DUREE = 'DUREE',
  FREQUENCE = 'FREQUENCE'
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  [AnomalyType.DEVIATION]: 'Écart mesure',
  [AnomalyType.HORAIRE]: 'Horaire inhabituel',
  [AnomalyType.DUREE]: 'Durée anormale',
  [AnomalyType.FREQUENCE]: "Fréquence d'échec"
};

export const ANOMALY_TYPE_ICONS: Record<AnomalyType, string> = {
  [AnomalyType.DEVIATION]: 'pi pi-chart-line',
  [AnomalyType.HORAIRE]: 'pi pi-clock',
  [AnomalyType.DUREE]: 'pi pi-hourglass',
  [AnomalyType.FREQUENCE]: 'pi pi-exclamation-triangle'
};

export enum Severity {
  ALERTE = 'ALERTE',
  CRITIQUE = 'CRITIQUE'
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  [Severity.ALERTE]: 'Alerte',
  [Severity.CRITIQUE]: 'Critique'
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  [Severity.ALERTE]: '#f59e0b',
  [Severity.CRITIQUE]: '#ef4444'
};

export const SEVERITY_TAG: Record<Severity, string> = {
  [Severity.ALERTE]: 'warning',
  [Severity.CRITIQUE]: 'danger'
};