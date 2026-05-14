import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { CreateValidationMeasureRequest } from '../../../models/create-validation-measure.dto';
import { MEASURE_CATEGORY_LABELS } from '../../../shared/enums/measure-category.enum';

@Component({
  selector: 'app-add-adhoc-measure-dialog',
  templateUrl: './add-adhoc-measure-dialog.component.html',
  styleUrls: ['./add-adhoc-measure-dialog.component.scss'],
  standalone: false
})
export class AddAdhocMeasureDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() validationId!: number;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<void>();

  submitting = false;

  form: FormGroup = this.fb.group({
    measureCode: ['', Validators.required],
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

  categoryOptions = Object.entries(MEASURE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

  constructor(
    private fb: FormBuilder,
    private measureService: ValidationMeasureService,
    private messageService: MessageService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.form.reset({ category: 'OTHER' });
      this.submitting = false;
    }
  }

  private boundsValidator(group: FormGroup) {
    const lo = group.get('lowerBound')?.value;
    const hi = group.get('upperBound')?.value;
    if (lo !== null && hi !== null && lo >= hi) return { bounds: true };
    return null;
  }

  submit(): void {
    if (this.form.invalid) return;
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
    };
    this.submitting = true;
    this.measureService.create(this.validationId, dto).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Mesure ajoutée', detail: 'La mesure a été enregistrée.' });
        this.submitting = false;
        this.close();
        this.created.emit();
      },
      error: (err) => {
        this.submitting = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Échec de l\'ajout.' });
      }
    });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
