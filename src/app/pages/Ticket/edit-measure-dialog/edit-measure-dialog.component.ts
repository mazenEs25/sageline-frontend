import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { ValidationMeasure } from '../../../models/validation-measure.model';
import { UpdateValidationMeasureRequest } from '../../../models/update-validation-measure.dto';

type PreviewStatus = 'OK' | 'OUT_OF_RANGE' | 'NOT_EXECUTED';

/**
 * Edit-measure dialog. Lets the user adjust measuredValue plus bounds, unit and the
 * RF context (antenna, frequency, modulation). Whitespace-only / empty optional
 * fields are sent as null so the server can clear them.
 *
 * The verdict preview re-computes locally from the form state so the user sees the
 * expected status flip before they save.
 */
@Component({
  selector: 'app-edit-measure-dialog',
  templateUrl: './edit-measure-dialog.component.html',
  styleUrls: ['./edit-measure-dialog.component.scss'],
  standalone: false
})
export class EditMeasureDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() validationId!: number;
  @Input() measure: ValidationMeasure | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  submitting = false;
  rfContextOpen = false;

  form: FormGroup = this.fb.group(
    {
      measuredValue: [null as number | null],
      lowerBound:    [null as number | null, Validators.required],
      upperBound:    [null as number | null, Validators.required],
      unit:          ['', Validators.required],
      antenna:       [null as string | null],
      frequencyMhz:  [null as number | null],
      modulationScheme: [null as string | null]
    },
    { validators: (g) => this.boundsValidator(g as FormGroup) }
  );

  constructor(
    private fb: FormBuilder,
    private measureService: ValidationMeasureService,
    private messageService: MessageService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['visible'] || changes['measure']) && this.visible && this.measure) {
      this.form.reset({
        measuredValue: this.measure.measuredValue,
        lowerBound: this.measure.lowerBound,
        upperBound: this.measure.upperBound,
        unit: this.measure.unit,
        antenna: this.measure.antenna,
        frequencyMhz: this.measure.frequencyMhz,
        modulationScheme: this.measure.modulationScheme
      });
      this.rfContextOpen = !!(this.measure.antenna || this.measure.frequencyMhz || this.measure.modulationScheme);
      this.submitting = false;
    }
  }

  private boundsValidator(group: FormGroup) {
    const lo = group.get('lowerBound')?.value;
    const hi = group.get('upperBound')?.value;
    if (lo == null || hi == null) return null;
    return Number(lo) < Number(hi) ? null : { bounds: true };
  }

  toggleRfContext() { this.rfContextOpen = !this.rfContextOpen; }

  // ── Live verdict preview ──
  get previewStatus(): PreviewStatus | null {
    const v  = this.form.get('measuredValue')?.value;
    const lo = this.form.get('lowerBound')?.value;
    const hi = this.form.get('upperBound')?.value;
    if (lo == null || hi == null || lo >= hi) return null;
    if (v == null) return 'NOT_EXECUTED';
    return (v < lo || v > hi) ? 'OUT_OF_RANGE' : 'OK';
  }
  get previewIcon(): string {
    return { OK: 'pi pi-check-circle', OUT_OF_RANGE: 'pi pi-times-circle', NOT_EXECUTED: 'pi pi-clock' }
      [this.previewStatus ?? 'NOT_EXECUTED'];
  }
  get previewLabel(): string {
    return {
      OK: 'OK — dans la tolérance',
      OUT_OF_RANGE: 'OUT_OF_RANGE — hors tolérance',
      NOT_EXECUTED: 'NOT_EXECUTED — valeur vide'
    }[this.previewStatus ?? 'NOT_EXECUTED'];
  }
  get previewDeviation(): number | null {
    const v  = this.form.get('measuredValue')?.value;
    const lo = this.form.get('lowerBound')?.value;
    const hi = this.form.get('upperBound')?.value;
    if (v == null || lo == null || hi == null || lo >= hi) return null;
    const center = (lo + hi) / 2;
    const halfRange = (hi - lo) / 2;
    return Math.abs(v - center) / halfRange * 100;
  }

  submit(): void {
    if (!this.measure) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.value;

    const nullableString = (s: any) => {
      if (s == null) return null;
      const t = String(s).trim();
      return t.length === 0 ? null : t;
    };
    const nullableNumber = (n: any) => {
      if (n == null || n === '') return null;
      const v = Number(n);
      return Number.isFinite(v) ? v : null;
    };

    const dto: UpdateValidationMeasureRequest = {
      measuredValue: nullableNumber(raw.measuredValue),
      lowerBound: Number(raw.lowerBound),
      upperBound: Number(raw.upperBound),
      unit: String(raw.unit),
      antenna: nullableString(raw.antenna),
      frequencyMhz: nullableNumber(raw.frequencyMhz),
      modulationScheme: nullableString(raw.modulationScheme)
    };

    this.submitting = true;
    this.measureService.update(this.validationId, this.measure.id, dto).subscribe({
      next: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Mesure mise à jour',
          detail: `${this.measure!.measureCode} enregistrée.`
        });
        this.saved.emit();
        this.close();
      },
      error: (err) => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Échec de la mise à jour.'
        });
      }
    });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
