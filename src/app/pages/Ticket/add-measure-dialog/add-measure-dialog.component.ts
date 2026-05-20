import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PosteCatalogService } from '../../../services/poste-catalog.service';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { PosteMeasureCatalog } from '../../../models/poste-measure-catalog.model';
import { CreateValidationMeasureRequest } from '../../../models/create-validation-measure.dto';

type PreviewStatus = 'OK' | 'OUT_OF_RANGE' | 'NOT_EXECUTED';

@Component({
  selector: 'app-add-measure-dialog',
  templateUrl: './add-measure-dialog.component.html',
  styleUrls: ['./add-measure-dialog.component.scss'],
  standalone: false
})
export class AddMeasureDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() validationId!: number;
  @Input() posteType: string | null = null;
  /**
   * Zone ID of the target poste. Passed through to the backend so it can
   * disambiguate when a line has multiple postes of the same type.
   */
  @Input() zoneId: number | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<void>();

  templates: PosteMeasureCatalog[] = [];
  loadingTemplates = false;
  submitting = false;

  form: FormGroup = this.fb.group({
    templateId: [null as number | null, Validators.required],
    // measuredValue is optional — null means create as NOT_EXECUTED
    measuredValue: [null as number | null],
  });

  selectedTemplate: PosteMeasureCatalog | null = null;

  constructor(
    private fb: FormBuilder,
    private posteCatalogService: PosteCatalogService,
    private measureService: ValidationMeasureService,
    private messageService: MessageService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.reset();
      if (this.posteType) this.loadTemplates(this.posteType);
    }
  }

  private reset(): void {
    this.form.reset();
    this.selectedTemplate = null;
    this.submitting = false;
  }

  private loadTemplates(posteType: string): void {
    this.loadingTemplates = true;
    this.templates = [];
    this.posteCatalogService.getMeasuresByPosteType(posteType as any).subscribe({
      next: (data) => {
        this.templates = data ?? [];
        this.loadingTemplates = false;
      },
      error: () => {
        this.loadingTemplates = false;
        this.templates = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les templates du catalogue.'
        });
      }
    });
  }

  onTemplateChange(id: number | null): void {
    this.selectedTemplate = this.templates.find(t => t.id === id) ?? null;
  }

  // -------- Live preview helpers --------
  get previewStatus(): PreviewStatus {
    const v = this.form.get('measuredValue')?.value;
    const t = this.selectedTemplate;
    if (v === null || v === undefined || !t) return 'NOT_EXECUTED';
    if (v < t.defaultLowerBound || v > t.defaultUpperBound) return 'OUT_OF_RANGE';
    return 'OK';
  }
  get previewIcon(): string {
    return {
      OK: 'pi pi-check-circle',
      OUT_OF_RANGE: 'pi pi-times-circle',
      NOT_EXECUTED: 'pi pi-clock'
    }[this.previewStatus];
  }
  get previewLabel(): string {
    return {
      OK: 'OK — dans la tolérance',
      OUT_OF_RANGE: 'OUT_OF_RANGE — hors tolérance',
      NOT_EXECUTED: 'NOT_EXECUTED — non saisi'
    }[this.previewStatus];
  }
  get previewDeviation(): number | null {
    const v = this.form.get('measuredValue')?.value;
    const t = this.selectedTemplate;
    if (v === null || v === undefined || !t) return null;
    const center = (t.defaultLowerBound + t.defaultUpperBound) / 2;
    const halfRange = (t.defaultUpperBound - t.defaultLowerBound) / 2;
    if (halfRange === 0) return null;
    return Math.abs(v - center) / halfRange * 100;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { templateId, measuredValue } = this.form.value;

    // Backend DTO field is `templateId`. We deliberately do NOT send `catalogTemplateId`:
    // the backend's CreateMeasureRequest rejects unknown fields with 400, and Jackson's
    // default FAIL_ON_UNKNOWN_PROPERTIES is on. The legacy field stays on the TS interface
    // for back-compat with any other callers but is never put on the wire from here.
    const dto: CreateValidationMeasureRequest = {
      templateId: templateId,
      measuredValue: (measuredValue === undefined ? null : measuredValue),
      ...(this.zoneId != null ? { zoneId: this.zoneId } : {})
    };

    this.submitting = true;
    this.measureService.create(this.validationId, dto).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Mesure ajoutée',
          detail: 'La mesure a été enregistrée avec son verdict calculé.'
        });
        this.submitting = false;
        this.close();
        this.created.emit();
      },
      error: (err) => {
        this.submitting = false;
        const fieldErrors: Record<string, string> | undefined = err?.error?.errors;
        if (fieldErrors) {
          const summary = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v}`).join(' • ');
          this.messageService.add({
            severity: 'error',
            summary: 'Validation backend échouée',
            detail: summary,
            life: 8000
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err?.error?.message ?? 'Échec de l\'ajout.'
          });
        }
      }
    });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
