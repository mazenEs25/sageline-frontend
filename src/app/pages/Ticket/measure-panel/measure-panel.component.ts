import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { ValidationMeasure } from '../../../models/validation-measure.model';
import { MeasureStatus, MEASURE_STATUS_LABELS } from '../../../shared/enums/measure-status.enum';
import { AuthService } from '../../../auth/auth.service';
import { Role } from '../../../shared/enums/role.enum';
import { BatchUpdateValidationMeasureItem, BatchValidationMeasureResponse } from '../../../models/batch-validation-measure.model';

@Component({
  selector: 'app-measure-panel',
  templateUrl: './measure-panel.component.html',
  styleUrls: ['./measure-panel.component.scss'],
  standalone: false,
  providers: [MessageService]
})
export class MeasurePanelComponent implements OnChanges {
  @Input() validationId!: number;
  @Input() posteType: string | null = null;

  measures: ValidationMeasure[] = [];
  loading = false;
  statusFilter: 'ALL' | MeasureStatus = 'ALL';
  addMeasureVisible = false;
  addAdhocVisible = false;
  seeding = false;
  bulkEditMode = false;
  drafts: Record<number, number | null> = {};
  rowErrors: Record<number, string> = {};
  savingBatch = false;

  readonly STATUS_LABELS = MEASURE_STATUS_LABELS;
  readonly STATUS_OPTIONS: { label: string; value: 'ALL' | MeasureStatus }[] = [
    { label: 'Tous', value: 'ALL' },
    { label: 'Conforme', value: 'OK' },
    { label: 'Hors tolérance', value: 'OUT_OF_RANGE' },
    { label: 'Non exécuté', value: 'NOT_EXECUTED' },
  ];

  constructor(
    private measureService: ValidationMeasureService,
    private messageService: MessageService,
    private authService: AuthService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['validationId'] && this.validationId) this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.measureService.list(this.validationId).subscribe({
      next: (data) => { this.measures = data; this.loading = false; },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les mesures.' });
      }
    });
  }

  get filteredMeasures(): ValidationMeasure[] {
    if (this.statusFilter === 'ALL') return this.measures;
    return this.measures.filter(m => m.status === this.statusFilter);
  }

  get canMutate(): boolean {
    const roles = this.authService.getRoles() ?? [];
    return [Role.TECH_VAL, Role.TECH_PREP, Role.CHEF_SECTEUR, Role.ADMIN_IT].some(r => roles.includes(r));
  }

  get canAddAdhoc(): boolean {
    const roles = this.authService.getRoles() ?? [];
    return [Role.CHEF_SECTEUR, Role.ADMIN_IT].some(r => roles.includes(r));
  }

  openAddMeasure(): void { this.addMeasureVisible = true; }

  openAddAdhoc(): void { this.addAdhocVisible = true; }

  onMeasureCreated(): void { this.refresh(); }

  instantiateAll(): void {
    if (!this.canMutate || this.measures.length > 0) return;
    this.seeding = true;
    this.measureService.fromCatalog(this.validationId).subscribe({
      next: () => {
        this.seeding = false;
        this.refresh();
        this.messageService.add({ severity: 'success', summary: 'Modèles instanciés', detail: 'Les mesures du catalogue ont été ajoutées.' });
      },
      error: (err) => {
        this.seeding = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Échec de l\'instanciation.' });
      }
    });
  }

  get canInstantiate(): boolean { return this.canMutate && this.measures.length === 0 && !this.loading; }

  enterBulkEdit(): void {
    if (!this.canMutate) return;
    this.bulkEditMode = true;
    this.rowErrors = {};
    this.drafts = {};
    for (const m of this.measures) this.drafts[m.id] = m.measuredValue;
  }

  cancelBulkEdit(): void {
    this.bulkEditMode = false;
    this.drafts = {};
    this.rowErrors = {};
  }

  saveBulk(): void {
    const items: BatchUpdateValidationMeasureItem[] = this.measures
      .filter(m => this.drafts[m.id] !== m.measuredValue)
      .map(m => ({ id: m.id, measuredValue: this.drafts[m.id] }));
    if (items.length === 0) { this.cancelBulkEdit(); return; }
    this.savingBatch = true;
    this.rowErrors = {};
    this.measureService.updateBatch(this.validationId, { items }).subscribe({
      next: (resp: BatchValidationMeasureResponse) => {
        this.savingBatch = false;
        for (const r of resp.results) {
          if (r.status === 'error') {
            const id = items[r.index].id;
            this.rowErrors[id] = r.error?.message ?? 'Erreur';
          }
        }
        this.messageService.add({
          severity: resp.summary.failed > 0 ? 'warn' : 'success',
          summary: 'Lot enregistré',
          detail: `${resp.summary.succeeded} enregistrée(s), ${resp.summary.failed} en échec.`
        });
        if (resp.summary.failed === 0) this.cancelBulkEdit();
        this.refresh();
      },
      error: () => {
        this.savingBatch = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Le lot a été rejeté.' });
      }
    });
  }
}
