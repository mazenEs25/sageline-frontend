import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ProductionLine } from '../../../../models/production-line.model';
import { ValidationZone } from '../../../../models/validation-zone.model';
import { ProductionLineService } from '../../../../services/production-line.service';
import { ValidationZoneService } from '../../../../services/validation-zone.service';
import { ValidationService } from '../../../../services/validation.service';


@Component({
  selector: 'app-validation-create',
  templateUrl: './validation-create.component.html',
  styleUrls: ['./validation-create.component.scss']
})
export class ValidationCreateComponent implements OnInit {

  lines: ProductionLine[] = [];
  zones: ValidationZone[] = [];
  filteredZones: ValidationZone[] = [];

  // Form
  selectedLineId: number | null = null;
  selectedZoneId: number | null = null;
  comments = '';

  // UI state
  submitting = false;

  // Dropdown options
  lineOptions: any[] = [];
  zoneOptions: any[] = [];

  constructor(
    private validationService: ValidationService,
    private lineService: ProductionLineService,
    private zoneService: ValidationZoneService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLines();
    this.loadZones();
  }

  loadLines(): void {
    this.lineService.getActive().subscribe({
      next: (data) => {
        this.lines = data;
        this.lineOptions = data.map(l => ({
          label: `${l.code} — ${l.name}`,
          value: l.id
        }));
      }
    });
  }

  loadZones(): void {
    this.zoneService.getAll().subscribe({
      next: (data) => this.zones = data
    });
  }

  onLineChange(): void {
    if (this.selectedLineId) {
      this.filteredZones = this.zones.filter(
        z => z.productionLineId === this.selectedLineId
      );
      this.zoneOptions = this.filteredZones.map(z => ({
        label: z.name,
        value: z.id
      }));
    } else {
      this.filteredZones = [];
      this.zoneOptions = [];
    }
    this.selectedZoneId = null;
  }

  get selectedLineName(): string {
    const line = this.lines.find(l => l.id === this.selectedLineId);
    return line ? `${line.code} — ${line.name}` : '';
  }

  get selectedZoneName(): string {
    const zone = this.zones.find(z => z.id === this.selectedZoneId);
    return zone ? zone.name : '';
  }

  get isFormValid(): boolean {
    return !!this.selectedZoneId;
  }

  // ─── Submit ───

  submit(): void {
    if (!this.isFormValid || this.submitting) return;

    this.submitting = true;

    this.validationService.create({
      validationZoneId: this.selectedZoneId!,
      comments: this.comments || undefined
    }).subscribe({
      next: (validation) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Validation lancée',
          detail: `Validation #${validation.id} créée — Risque initial: ${validation.riskLevel || 'N/A'}`
        });
        this.router.navigate(['/validations', validation.id]);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || 'Impossible de lancer la validation'
        });
        this.submitting = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/validations']);
  }
}