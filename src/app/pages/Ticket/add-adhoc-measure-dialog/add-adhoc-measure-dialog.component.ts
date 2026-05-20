import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { CreateValidationMeasureRequest } from '../../../models/create-validation-measure.dto';
import { MEASURE_CATEGORY_LABELS, MeasureCategory } from '../../../shared/enums/measure-category.enum';

type PreviewStatus = 'OK' | 'OUT_OF_RANGE' | 'NOT_EXECUTED';

@Component({
  selector: 'app-add-adhoc-measure-dialog',
  templateUrl: './add-adhoc-measure-dialog.component.html',
  styleUrls: ['./add-adhoc-measure-dialog.component.scss'],
  standalone: false
})
export class AddAdhocMeasureDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() validationId!: number;
  /** Zone ID of the target poste — passed through to the backend for per-poste scoping. */
  @Input() zoneId: number | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<void>();

  submitting = false;
  rfContextOpen = false;

  form: FormGroup = this.fb.group({
    measureCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
    measureLabel: ['', Validators.required],
    category: ['OTHER', Validators.required],
    unit: ['', Validators.required],
    lowerBound: [null, Validators.required],
    upperBound: [null, Validators.required],
    antenna: [null],
    frequencyMhz: [null],
    modulationScheme: [null],
    measuredValue: [null, Validators.required],
  }, { validators: this.boundsValidator });

  categoryOptions = (Object.entries(MEASURE_CATEGORY_LABELS) as [MeasureCategory, string][])
    .map(([value, label]) => ({ value, label }));

  constructor(
    private fb: FormBuilder,
    private measureService: ValidationMeasureService,
    private messageService: MessageService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.form.reset({ category: 'OTHER' });
      this.submitting = false;
      this.rfContextOpen = false;
    }
  }

  private boundsValidator(group: FormGroup) {
    const lo = group.get('lowerBound')?.value;
    const hi = group.get('upperBound')?.value;
    if (lo !== null && hi !== null && lo >= hi) return { bounds: true };
    return null;
  }

  toggleRfContext() {
    this.rfContextOpen = !this.rfContextOpen;
  }

  // -------- Live preview helpers --------
  get tolerancePreview(): string | null {
    const lo = this.form.get('lowerBound')?.value;
    const hi = this.form.get('upperBound')?.value;
    const unit = this.form.get('unit')?.value;
    if (lo === null || lo === undefined || hi === null || hi === undefined) return null;
    if (Number.isNaN(Number(lo)) || Number.isNaN(Number(hi))) return null;
    const u = unit ? ' ' + unit : '';
    return `[${lo} → ${hi}]${u}`;
  }

  get previewStatus(): PreviewStatus | null {
    const v = this.form.get('measuredValue')?.value;
    const lo = this.form.get('lowerBound')?.value;
    const hi = this.form.get('upperBound')?.value;
    if (lo === null || lo === undefined || hi === null || hi === undefined) return null;
    if (lo >= hi) return null;
    if (v === null || v === undefined) return 'NOT_EXECUTED';
    if (v < lo || v > hi) return 'OUT_OF_RANGE';
    return 'OK';
  }
  get previewIcon(): string {
    const map: Record<PreviewStatus, string> = {
      OK: 'pi pi-check-circle',
      OUT_OF_RANGE: 'pi pi-times-circle',
      NOT_EXECUTED: 'pi pi-clock'
    };
    return this.previewStatus ? map[this.previewStatus] : '';
  }
  get previewLabel(): string {
    const map: Record<PreviewStatus, string> = {
      OK: 'OK — dans la tolérance',
      OUT_OF_RANGE: 'OUT_OF_RANGE — hors tolérance',
      NOT_EXECUTED: 'NOT_EXECUTED — non saisi'
    };
    return this.previewStatus ? map[this.previewStatus] : '';
  }
  get previewDeviation(): number | null {
    const v = this.form.get('measuredValue')?.value;
    const lo = this.form.get('lowerBound')?.value;
    const hi = this.form.get('upperBound')?.value;
    if (v === null || v === undefined || lo === null || hi === null || lo >= hi) return null;
    const center = (lo + hi) / 2;
    const halfRange = (hi - lo) / 2;
    return Math.abs(v - center) / halfRange * 100;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.value;
    const dto: CreateValidationMeasureRequest = {
      measureCode: raw.measureCode,
      measureLabel: raw.measureLabel,
      category: raw.category,
      unit: raw.unit,
      lowerBound: raw.lowerBound,
      upperBound: raw.upperBound,
      measuredValue: raw.measuredValue,
      ...(raw.antenna ? { antenna: raw.antenna } : {}),
      ...(raw.frequencyMhz != null ? { frequencyMhz: raw.frequencyMhz } : {}),
      ...(raw.modulationScheme ? { modulationScheme: raw.modulationScheme } : {}),
      ...(this.zoneId != null ? { zoneId: this.zoneId } : {}),
    };
    this.submitting = true;
    this.measureService.create(this.validationId, dto).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Mesure ajoutée',
          detail: `${dto.measureCode} créée avec son verdict calculé.`
        });
        this.submitting = false;
        this.close();
        this.created.emit();
      },
      error: (err) => {
        this.submitting = false;
        const fieldErrors: Record<string, string> | undefined = err?.error?.errors;
        if (fieldErrors) {
          Object.keys(fieldErrors).forEach(field => {
            const control = this.form.get(field);
            if (control) {
              control.setErrors({ server: fieldErrors[field] });
              control.markAsTouched();
            }
          });
          this.messageService.add({
            severity: 'error',
            summary: 'Validation échouée',
            detail: 'Voir les indications sous chaque champ.'
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
