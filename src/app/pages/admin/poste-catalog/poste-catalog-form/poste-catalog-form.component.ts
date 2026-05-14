import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PosteCatalogService } from '../../../../services/poste-catalog.service';
import { PosteMeasureCatalog, CreatePosteMeasureCatalogRequest, UpdatePosteMeasureCatalogRequest } from '../../../../models/poste-measure-catalog.model';
import { PosteType, POSTE_TYPE_VALUES } from '../../../../shared/enums/ticket.enum';
import { MEASURE_CATEGORY_LABELS } from '../../../../shared/enums/measure-category.enum';

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
  posteTypeOptions = POSTE_TYPE_VALUES.map(v => ({ label: v, value: v }));
  categoryOptions = Object.entries(MEASURE_CATEGORY_LABELS).map(([value, label]) => ({ label, value }));

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
        category: [null, Validators.required],
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
      } else {
        this.form.reset({
          mandatory: false,
          displayOrder: 0,
          posteType: this.lockedPosteType ?? null
        });
        this.form.get('posteType')?.enable();
        this.form.get('measureCode')?.enable();
      }
    } else if (changes['lockedPosteType'] && !this.initial) {
      this.form.get('posteType')?.setValue(this.lockedPosteType ?? null);
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
            severity: 'success', summary: 'Succès', detail: 'Mesure créée'
          });
          this.saved.emit();
          this.visibleChange.emit(false);
          this.submitting = false;
        },
        error: (err) => {
          this.submitting = false;
          if (err.status === 409) {
            this.form.get('measureCode')?.setErrors({ duplicate: true });
            this.messageService.add({
              severity: 'warn', summary: 'Avertissement', detail: 'Code déjà utilisé pour ce poste.'
            });
          } else {
            this.messageService.add({
              severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Échec de l\'enregistrement'
            });
          }
        }
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
            severity: 'success', summary: 'Succès', detail: 'Mesure mise à jour'
          });
          this.saved.emit();
          this.visibleChange.emit(false);
          this.submitting = false;
        },
        error: (err) => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Échec de l\'enregistrement'
          });
        }
      });
    }
  }

  onCancel() {
    this.visibleChange.emit(false);
  }
}
