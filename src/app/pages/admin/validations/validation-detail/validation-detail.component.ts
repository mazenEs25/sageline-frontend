import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProductionLine } from '../../../../models/production-line.model';
import { ValidationResult, ValidationResultRequest } from '../../../../models/validation-result.model';
import { ValidationZone } from '../../../../models/validation-zone.model';
import { Validation } from '../../../../models/validation.model';
import { ProductionLineService } from '../../../../services/production-line.service';
import { ValidationResultService } from '../../../../services/validation-result.service';
import { ValidationZoneService } from '../../../../services/validation-zone.service';
import { ValidationService } from '../../../../services/validation.service';

@Component({
  selector: 'app-validation-detail',
  templateUrl: './validation-detail.component.html',
  styleUrls: ['./validation-detail.component.scss']
})
export class ValidationDetailComponent implements OnInit {

  validation: Validation | null = null;
  results: ValidationResult[] = [];
  zone: ValidationZone | null = null;
  line: ProductionLine | null = null;
  loading = true;

  // Add Result Dialog
  resultDialog = false;
  resultForm: ValidationResultRequest = {
    validationId: 0,
    parameter: '',
    measuredValue: 0,
    expectedValue: 0
  };

  // Close Validation Dialog
  closeDialog = false;
  closeStatus: string = 'CONFORME';
  closeComments: string = '';
  closeStatusOptions = [
    { label: 'Conforme', value: 'CONFORME' },
    { label: 'Non conforme', value: 'NON_CONFORME' }
  ];

  // Common parameters for quick selection
  commonParameters = [
    { label: 'Température (°C)', value: 'Température' },
    { label: 'Pression (bar)', value: 'Pression' },
    { label: 'Tension (V)', value: 'Tension' },
    { label: 'Courant (A)', value: 'Courant' },
    { label: 'Résistance (Ω)', value: 'Résistance' },
    { label: 'Humidité (%)', value: 'Humidité' },
    { label: 'Vibration (mm/s)', value: 'Vibration' },
    { label: 'Poids (kg)', value: 'Poids' },
    { label: 'Dimension (mm)', value: 'Dimension' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private validationService: ValidationService,
    private resultService: ValidationResultService,
    private lineService: ProductionLineService,
    private zoneService: ValidationZoneService,
    private messageService: MessageService,
    private confirmService: ConfirmationService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadValidation(id);
    }
  }

  loadValidation(id: number): void {
    this.loading = true;
    this.validationService.getById(id).subscribe({
      next: (data) => {
        this.validation = data;
        this.loadResults(id);
        this.loadZoneAndLine(data.validationZoneId);
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Validation introuvable'
        });
        this.router.navigate(['/validations']);
      }
    });
  }

  loadResults(validationId: number): void {
    this.resultService.getByValidation(validationId).subscribe({
      next: (data) => this.results = data
    });
  }

  loadZoneAndLine(zoneId: number): void {
    this.zoneService.getById(zoneId).subscribe({
      next: (zone) => {
        this.zone = zone;
        this.lineService.getById(zone.productionLineId).subscribe({
          next: (line) => this.line = line
        });
      }
    });
  }

  // ─── Add Result ───

  openAddResult(): void {
    this.resultForm = {
      validationId: this.validation!.id,
      parameter: '',
      measuredValue: 0,
      expectedValue: 0
    };
    this.resultDialog = true;
  }

  saveResult(): void {
    if (!this.resultForm.parameter) return;

    this.resultService.create(this.resultForm).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Résultat ajouté',
          detail: `"${this.resultForm.parameter}" enregistré — IA recalculée`
        });
        this.resultDialog = false;
        // Reload everything (AI prediction gets updated on backend)
        this.loadValidation(this.validation!.id);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || 'Impossible d\'ajouter le résultat'
        });
      }
    });
  }

  // ─── Delete Result ───

  deleteResult(result: ValidationResult): void {
    this.confirmService.confirm({
      message: `Supprimer le résultat "${result.parameter}" ?`,
      header: 'Confirmer',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.resultService.delete(result.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Supprimé',
              detail: `Résultat "${result.parameter}" supprimé`
            });
            this.loadValidation(this.validation!.id);
          }
        });
      }
    });
  }

  // ─── Close Validation ───

  openCloseDialog(): void {
    this.closeStatus = this.suggestedCloseStatus;
    this.closeComments = '';
    this.closeDialog = true;
  }

  closeValidation(): void {
    this.validationService.close(
      this.validation!.id,
      this.closeStatus,
      this.closeComments || undefined
    ).subscribe({
      next: (updated) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Validation clôturée',
          detail: `Statut final: ${this.getStatusLabel(updated.status)} — KPIs recalculés`
        });
        this.closeDialog = false;
        this.loadValidation(this.validation!.id);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || 'Impossible de clôturer'
        });
      }
    });
  }

  // ─── Computed ───

  get conformCount(): number {
    return this.results.filter(r => r.conform).length;
  }

  get nonConformCount(): number {
    return this.results.filter(r => !r.conform).length;
  }

  get conformRate(): number {
    if (this.results.length === 0) return 0;
    return (this.conformCount / this.results.length) * 100;
  }

  get avgDeviation(): number {
    if (this.results.length === 0) return 0;
    const sum = this.results.reduce((acc, r) => {
      return acc + Math.abs(r.measuredValue - r.expectedValue) / r.expectedValue * 100;
    }, 0);
    return sum / this.results.length;
  }

  get maxDeviation(): number {
    if (this.results.length === 0) return 0;
    return Math.max(...this.results.map(r =>
      Math.abs(r.measuredValue - r.expectedValue) / r.expectedValue * 100
    ));
  }

  get suggestedCloseStatus(): string {
    if (this.nonConformCount > 0) return 'NON_CONFORME';
    return 'CONFORME';
  }

  get isActive(): boolean {
    return this.validation?.status === 'EN_COURS';
  }

  // ─── Helpers ───

  getDeviation(result: ValidationResult): number {
    if (result.expectedValue === 0) return 0;
    return Math.abs(result.measuredValue - result.expectedValue) / result.expectedValue * 100;
  }

  getDeviationClass(result: ValidationResult): string {
    const dev = this.getDeviation(result);
    if (dev > 20) return 'deviation-critical';
    if (dev > 10) return 'deviation-warning';
    if (dev > 5) return 'deviation-medium';
    return 'deviation-ok';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'EN_COURS': return 'En cours';
      case 'CONFORME': return 'Conforme';
      case 'NON_CONFORME': return 'Non conforme';
      default: return status;
    }
  }

  getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    switch (status) {
      case 'EN_COURS': return 'warning';
      case 'CONFORME': return 'success';
      case 'NON_CONFORME': return 'danger';
      default: return 'info';
    }
  }

  getRiskColor(level?: string): string {
    switch (level) {
      case 'CRITIQUE': return '#ef4444';
      case 'RISQUE': return '#f97316';
      case 'MOYEN': return '#f59e0b';
      case 'BAS': return '#10b981';
      default: return '#64748b';
    }
  }

  goBack(): void {
    this.router.navigate(['/validations']);
  }
  getPreviewDeviation(): number {
  if (this.resultForm.expectedValue === 0) return 0;
  return Math.abs(this.resultForm.measuredValue - this.resultForm.expectedValue)
    / this.resultForm.expectedValue * 100;
}
}