import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PosteCatalogService } from '../../../services/poste-catalog.service';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { PosteMeasureCatalog } from '../../../models/poste-measure-catalog.model';
import { CreateValidationMeasureRequest } from '../../../models/create-validation-measure.dto';

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
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<void>();

  templates: PosteMeasureCatalog[] = [];
  loadingTemplates = false;
  submitting = false;

  form: FormGroup = this.fb.group({
    templateId: [null, Validators.required],
    measuredValue: [null, Validators.required],
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
    this.posteCatalogService.getMeasuresByPosteType(posteType as any).subscribe({
      next: (data) => { this.templates = data; this.loadingTemplates = false; },
      error: () => { this.loadingTemplates = false; this.templates = []; }
    });
  }

  onTemplateChange(id: number | null): void {
    this.selectedTemplate = this.templates.find(t => t.id === id) ?? null;
  }

  submit(): void {
    if (this.form.invalid) return;
    const { templateId, measuredValue } = this.form.value;
    const dto: CreateValidationMeasureRequest = { catalogTemplateId: templateId, measuredValue };
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
