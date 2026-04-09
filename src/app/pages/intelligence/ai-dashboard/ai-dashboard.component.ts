import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { ToolService } from '../../../services/tool.service';
import { ToolScore } from '../../../models/tool-score.model';
import { TOOL_STATUS_LABELS } from '../../../shared/enums/tool-status.enum';
import { AnomalyService } from '../../../services/anomaly.service';
import { AnomalyResult } from '../../../models/anomaly.model';
import { AnomalyType, Severity, ANOMALY_TYPE_LABELS, ANOMALY_TYPE_ICONS, SEVERITY_COLORS, SEVERITY_TAG } from '../../../shared/enums/anomaly.enum';
import { ValidationService } from '../../../services/validation.service';
import { ProductionLineService } from '../../../services/production-line.service';
import { ValidationZoneService } from '../../../services/validation-zone.service';
import { Validation } from '../../../models/validation.model';
import { ProductionLine } from '../../../models/production-line.model';
import { ValidationZone } from '../../../models/validation-zone.model';

@Component({
  selector: 'app-ai-dashboard',
  templateUrl: './ai-dashboard.component.html',
  styleUrls: ['./ai-dashboard.component.scss']
})
export class AiDashboardComponent implements OnInit {

  // Data
  validations: Validation[] = [];
  lines: ProductionLine[] = [];
  zones: ValidationZone[] = [];
  loading = true;

  // Model 2: Tool Recommendations
  toolRecommendations: ToolScore[] = [];
  selectedZoneForTools: number | null = null;
  selectedLineForTools: number | null = null;
  toolsLoading = false;

  // Model 3: Anomaly Detection
  anomalies: AnomalyResult[] = [];
  anomaliesLoading = false;
  selectedValidationForAnomaly: number | null = null;

  // Dropdowns
  zoneOptions: any[] = [];
  lineOptions: any[] = [];
  validationOptions: any[] = [];

  // Active tab
  activeTab = 0;

  constructor(
    private toolService: ToolService,
    private anomalyService: AnomalyService,
    private validationService: ValidationService,
    private lineService: ProductionLineService,
    private zoneService: ValidationZoneService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadBaseData();
  }

  loadBaseData(): void {
    this.loading = true;

    forkJoin({
      validations: this.validationService.getAll(),
      lines: this.lineService.getAll(),
      zones: this.zoneService.getAll()
    }).subscribe({
      next: ({ validations, lines, zones }) => {
        this.validations = validations;
        this.lines = lines;
        this.zones = zones;

        this.lineOptions = [
          { label: 'Toutes les lignes', value: null },
          ...lines.map(l => ({ label: `${l.code} — ${l.name}`, value: l.id }))
        ];

        this.zoneOptions = [
          { label: 'Toutes les zones', value: null },
          ...zones.map(z => ({ label: z.name, value: z.id }))
        ];

        this.validationOptions = validations
          .filter(v => v.status === 'EN_COURS')
          .map(v => ({
            label: `#${v.id} — ${this.getZoneName(v.validationZoneId)} (En cours)`,
            value: v.id
          }));

        this.loading = false;

        // Auto-load recommendations
        this.loadToolRecommendations();
        this.scanAnomalies();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les données' });
        this.loading = false;
      }
    });
  }

  // ─── Model 2: Tool Recommendations ───

  loadToolRecommendations(): void {
    this.toolsLoading = true;
    this.toolService.getRecommendations(
      this.selectedZoneForTools || undefined,
      this.selectedLineForTools || undefined
    ).subscribe({
      next: (data) => {
        this.toolRecommendations = data;
        this.toolsLoading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les recommandations' });
        this.toolsLoading = false;
      }
    });
  }

  onToolFilterChange(): void {
    this.loadToolRecommendations();
  }

  getScoreColor(score: number): string {
    if (score >= 0.8) return '#10b981';
    if (score >= 0.6) return '#3b82f6';
    if (score >= 0.4) return '#f59e0b';
    return '#ef4444';
  }

  getScorePercent(score: number): number {
    return Math.round(score * 100);
  }

  // ─── Model 3: Anomaly Detection ───

  scanAnomalies(): void {
    this.anomaliesLoading = true;
    this.anomalyService.scanAllActive().subscribe({
      next: (data) => {
        this.anomalies = data;
        this.anomaliesLoading = false;
      },
      error: () => {
        this.anomaliesLoading = false;
      }
    });
  }

  detectForValidation(): void {
    if (!this.selectedValidationForAnomaly) return;

    this.anomaliesLoading = true;
    this.anomalyService.detectForValidation(this.selectedValidationForAnomaly).subscribe({
      next: (data) => {
        this.anomalies = data;
        this.anomaliesLoading = false;
        this.messageService.add({
          severity: data.length > 0 ? 'warn' : 'success',
          summary: data.length > 0 ? `${data.length} anomalie(s) détectée(s)` : 'Aucune anomalie',
          detail: data.length > 0 ? 'Consultez les détails ci-dessous' : 'Tout est normal pour cette validation'
        });
      },
      error: () => {
        this.anomaliesLoading = false;
      }
    });
  }

  getAnomalyIcon(type: AnomalyType): string {
    return ANOMALY_TYPE_ICONS[type] || 'pi pi-info-circle';
  }

  getAnomalyTypeLabel(type: AnomalyType): string {
    return ANOMALY_TYPE_LABELS[type] || type;
  }

  getSeverityColor(severity: Severity): string {
    return SEVERITY_COLORS[severity] || '#64748b';
  }

  getSeverityTag(severity: Severity): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    return (SEVERITY_TAG[severity] as any) || 'info';
  }

  // ─── Helpers ───

  getZoneName(zoneId: number): string {
    return this.zones.find(z => z.id === zoneId)?.name || '—';
  }

  get criticalCount(): number {
    return this.anomalies.filter(a => a.severity === Severity.CRITIQUE).length;
  }

  get warningCount(): number {
    return this.anomalies.filter(a => a.severity === Severity.ALERTE).length;
  }
}