import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
  /**
   * When set, the panel scopes its list to a single poste of the line — calling
   * {@code GET /api/validations/{id}/postes/{zoneId}/measures} instead of the
   * ticket-level list. Writes still go through the ticket-level POST (backend
   * resolves the right posteStatus from the catalog template's posteType).
   * Added with the Phase D per-poste UI rewrite.
   */
  @Input() zoneId: number | null = null;
  @Output() measuresChanged = new EventEmitter<void>();

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
  snippetVisible = false;
  snippetMeasureId: number | null = null;

  // Edit-measure dialog state
  editMeasureVisible = false;
  editingMeasure: ValidationMeasure | null = null;

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
    // Refresh on either validationId OR zoneId change so a per-poste panel
    // reloads when the user expands a different poste's drawer.
    // NOTE: initial load must NOT emit measuresChanged — otherwise the parent
    // calls silentReloadTicket(), which replaces this.ticket, which re-creates
    // the panel, which fires ngOnChanges again → infinite flicker loop.
    if ((changes['validationId'] || changes['zoneId']) && this.validationId) {
      this.refresh(false);
    }
  }

  /**
   * Reload measures from the API.
   * @param emitChange  When true, emits {@link measuresChanged} after load.
   *                    Pass true after mutations (add/edit/delete/seed) so the
   *                    parent can refresh readiness and poste counts.
   *                    Pass false for the initial load triggered by ngOnChanges
   *                    to avoid a parent → child → parent infinite loop.
   */
  refresh(emitChange = true): void {
    this.loading = true;
    const source$ = this.zoneId
      ? this.measureService.listByPoste(this.validationId, this.zoneId)
      : this.measureService.list(this.validationId);
    source$.subscribe({
      next: (data) => {
        this.measures = data;
        this.loading = false;
        if (emitChange) {
          this.measuresChanged.emit();
        }
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les mesures.' });
      }
    });
  }

  scrollToMeasureCode(code: string): void {
    const target = document.querySelector<HTMLElement>(
      `[data-measure-code="${code}"]`
    );
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('is-highlighted');
    setTimeout(() => target.classList.remove('is-highlighted'), 1500);
  }

  get filteredMeasures(): ValidationMeasure[] {
    if (this.statusFilter === 'ALL') return this.measures;
    return this.measures.filter(m => m.status === this.statusFilter);
  }

  /** Header stats — small badges shown above the table. */
  get stats(): { total: number; ok: number; outOfRange: number; notExecuted: number; mandatory: number; } {
    const ok = this.measures.filter(m => m.status === 'OK').length;
    const oor = this.measures.filter(m => m.status === 'OUT_OF_RANGE').length;
    const ne = this.measures.filter(m => m.status === 'NOT_EXECUTED').length;
    const mand = this.measures.filter(m => (m as any).mandatoryAtCreation).length;
    return { total: this.measures.length, ok, outOfRange: oor, notExecuted: ne, mandatory: mand };
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

  public reload(): void {
    this.refresh();
  }

  openSnippet(measureId: number): void {
    this.snippetMeasureId = measureId;
    this.snippetVisible = true;
  }

  /** Row action: open the edit-measure dialog pre-filled with the row data. */
  openEditMeasure(m: ValidationMeasure): void {
    if (!this.canMutate || this.bulkEditMode) return;
    this.editingMeasure = m;
    this.editMeasureVisible = true;
  }

  onMeasureEdited(): void { this.refresh(); }

  /** trackBy for the measure-card grid — keeps DOM stable on refresh. */
  trackMeasure = (_: number, m: ValidationMeasure): number => m.id;

  /**
   * Position (in %) of the measured value inside the tolerance band, used to
   * render the marker on the tolerance gauge. Returns null when bounds are
   * missing or the value is not yet recorded. Values outside [lower; upper]
   * are clamped to 0/100 so the marker stays visible at the rail edge.
   */
  markerPct(m: ValidationMeasure): number | null {
    if (m.measuredValue === null || m.measuredValue === undefined) return null;
    if (m.lowerBound === null || m.lowerBound === undefined) return null;
    if (m.upperBound === null || m.upperBound === undefined) return null;
    const span = m.upperBound - m.lowerBound;
    if (span <= 0) return null;
    const raw = ((m.measuredValue - m.lowerBound) / span) * 100;
    return Math.max(0, Math.min(100, raw));
  }
}
