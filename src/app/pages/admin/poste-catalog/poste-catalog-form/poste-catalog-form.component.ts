import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PosteCatalogService } from '../../../../services/poste-catalog.service';
import {
  PosteMeasureCatalog,
  CreatePosteMeasureCatalogRequest,
  UpdatePosteMeasureCatalogRequest
} from '../../../../models/poste-measure-catalog.model';
import { PosteType, POSTE_TYPE_VALUES } from '../../../../shared/enums/ticket.enum';
import {
  MeasureCategory,
  MEASURE_CATEGORY_LABELS,
  MEASURE_CATEGORY_ICONS
} from '../../../../shared/enums/measure-category.enum';

interface CategoryOption { label: string; value: MeasureCategory; icon: string; }

@Component({
  selector: 'app-poste-catalog-form',
  templateUrl: './poste-catalog-form.component.html',
  styleUrl: './poste-catalog-form.component.scss',
  standalone: false
})
export class PosteCatalogFormComponent implements OnChanges {
  @Input() visible = false;
  @Input() initial: PosteMeasureCatalog | null = null;
  @Input() lockedPosteType: PosteType | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  form!: FormGroup;
  submitting = false;
  rfContextOpen = false;

  posteTypeOptions = POSTE_TYPE_VALUES.map(v => ({ label: v, value: v }));
  categoryOptions: CategoryOption[] = (Object.entries(MEASURE_CATEGORY_LABELS) as [MeasureCategory, string][])
    .map(([value, label]) => ({
      label,
      value,
      icon: MEASURE_CATEGORY_ICONS[value] ?? 'pi pi-tag'
    }));

  constructor(
    private fb: FormBuilder,
    private service: PosteCatalogService,
    private messageService: MessageService
  ) {
    this.initForm();
  }

  private initForm() {
    this.form = this.fb.group(
      {
        posteType: [null as PosteType | null, Validators.required],
        measureCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
        measureLabel: ['', Validators.required],
        category: [null as MeasureCategory | null, Validators.required],
        defaultUnit: ['', Validators.required],
        defaultLowerBound: [null as number | null, Validators.required],
        defaultUpperBound: [null as number | null, Validators.required],
        mandatory: [false],
        displayOrder: [0, [Validators.required, Validators.min(0)]],
        antenna: [null as string | null],
        frequencyMhz: [null as number | null, Validators.min(0)],
        modulationScheme: [null as string | null]
      },
      { validators: this.boundsValidator }
    );
  }

  private boundsValidator(control: AbstractControl): ValidationErrors | null {
    const lowerBound = control.get('defaultLowerBound')?.value;
    const upperBound = control.get('defaultUpperBound')?.value;

    if (lowerBound !== null && lowerBound !== undefined && upperBound !== null && upperBound !== undefined) {
      if (Number(upperBound) <= Number(lowerBound)) {
        return { boundsOrder: true };
      }
    }
    return null;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.form) {
      return;
    }
    if (changes['initial']) {
      if (this.initial) {
        this.form.reset();
        this.form.patchValue(this.initial);
        this.form.get('posteType')?.disable();
        this.form.get('measureCode')?.disable();
        // Auto-open RF section when editing if context already exists
        this.rfContextOpen = !!(this.initial.antenna || this.initial.frequencyMhz || this.initial.modulationScheme);
      } else {
        this.form.reset({
          mandatory: false,
          displayOrder: 0,
          posteType: this.lockedPosteType ?? null
        });
        this.form.get('posteType')?.enable();
        this.form.get('measureCode')?.enable();
        this.rfContextOpen = false;
      }
    } else if (changes['lockedPosteType'] && !this.initial) {
      this.form.get('posteType')?.setValue(this.lockedPosteType ?? null);
    }
  }

  /** Live preview of the tolerance range, e.g. "[13.5 → 16.5] dBm". */
  get tolerancePreview(): string | null {
    const lo = this.form?.get('defaultLowerBound')?.value;
    const hi = this.form?.get('defaultUpperBound')?.value;
    const unit = this.form?.get('defaultUnit')?.value;
    if (lo === null || lo === undefined || hi === null || hi === undefined) return null;
    if (Number.isNaN(Number(lo)) || Number.isNaN(Number(hi))) return null;
    const u = unit ? ' ' + unit : '';
    return `[${lo} → ${hi}]${u}`;
  }

  toggleRfContext() {
    this.rfContextOpen = !this.rfContextOpen;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulaire incomplet',
        detail: 'Veuillez corriger les champs en rouge avant de continuer.'
      });
      return;
    }

    this.submitting = true;
    const formValue = { ...this.form.getRawValue() };
    const nullableString = (v: any): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      return s.length === 0 ? null : s;
    };
    const nullableNumber = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    if (this.initial === null) {
      const createDto: CreatePosteMeasureCatalogRequest = {
        posteType: formValue.posteType,
        measureCode: formValue.measureCode,
        measureLabel: formValue.measureLabel,
        category: formValue.category,
        defaultUnit: formValue.defaultUnit,
        defaultLowerBound: Number(formValue.defaultLowerBound),
        defaultUpperBound: Number(formValue.defaultUpperBound),
        mandatory: !!formValue.mandatory,
        displayOrder: Number(formValue.displayOrder),
        antenna: nullableString(formValue.antenna),
        frequencyMhz: nullableNumber(formValue.frequencyMhz),
        modulationScheme: nullableString(formValue.modulationScheme)
      };
      this.service.create(createDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Mesure créée',
            detail: `${createDto.measureCode} ajoutée au catalogue ${createDto.posteType}.`
          });
          this.saved.emit();
          this.visibleChange.emit(false);
          this.submitting = false;
        },
        error: (err) => this.handleSaveError(err)
      });
    } else {
      const updateDto: UpdatePosteMeasureCatalogRequest = {
        measureLabel: formValue.measureLabel,
        category: formValue.category,
        defaultUnit: formValue.defaultUnit,
        defaultLowerBound: Number(formValue.defaultLowerBound),
        defaultUpperBound: Number(formValue.defaultUpperBound),
        mandatory: !!formValue.mandatory,
        displayOrder: Number(formValue.displayOrder),
        antenna: nullableString(formValue.antenna),
        frequencyMhz: nullableNumber(formValue.frequencyMhz),
        modulationScheme: nullableString(formValue.modulationScheme)
      };
      this.service.update(this.initial.id, updateDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Mesure mise à jour',
            detail: `${this.initial!.measureCode} modifiée.`
          });
          this.saved.emit();
          this.visibleChange.emit(false);
          this.submitting = false;
        },
        error: (err) => this.handleSaveError(err)
      });
    }
  }

  /** Map backend errors to inline form controls + a friendly toast. */
  private handleSaveError(err: any) {
    this.submitting = false;
    const status = err?.status;
    const fieldErrors: Record<string, string> | undefined = err?.error?.errors;

    if (status === 409) {
      this.form.get('measureCode')?.setErrors({ duplicate: true });
      this.messageService.add({
        severity: 'warn',
        summary: 'Code déjà utilisé',
        detail: 'Ce code mesure existe déjà pour ce poste.'
      });
      return;
    }

    if (status === 400 && fieldErrors) {
      // Map backend field errors back to form controls.
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
        detail: 'Des champs sont invalides : voyez les indications sous chaque entrée.'
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: err?.error?.message || 'Échec de l\'enregistrement.'
    });
  }

  onCancel() {
    this.visibleChange.emit(false);
  }
}
