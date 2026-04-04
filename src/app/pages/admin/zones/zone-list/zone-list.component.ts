import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ValidationZoneService } from '../../../../services/validation-zone.service';
import { ProductionLineService } from '../../../../services/production-line.service';
import { ValidationZone, ValidationZoneRequest } from '../../../../models/validation-zone.model';
import { ProductionLine } from '../../../../models/production-line.model';

@Component({
  selector: 'app-zone-list',
  templateUrl: './zone-list.component.html',
  styleUrls: ['./zone-list.component.scss']
})
export class ZoneListComponent implements OnInit {

  zones: ValidationZone[] = [];
  lines: ProductionLine[] = [];
  loading = true;

  // Dialog
  zoneDialog = false;
  isEdit = false;
  selectedZone: ValidationZone | null = null;

  // Form
  form: ValidationZoneRequest = {
    name: '',
    description: '',
    productionLineId: 0
  };

  // Dropdown options
  lineOptions: any[] = [];

  // Filter
  selectedLineFilter: number | null = null;
  lineFilterOptions: any[] = [];

  constructor(
    private zoneService: ValidationZoneService,
    private lineService: ProductionLineService,
    private messageService: MessageService,
    private confirmService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadLines();
    this.loadZones();
  }

  loadZones(): void {
    this.loading = true;
    this.zoneService.getAll().subscribe({
      next: (data) => {
        this.zones = data;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les zones'
        });
        this.loading = false;
      }
    });
  }

  loadLines(): void {
    this.lineService.getAll().subscribe({
      next: (data) => {
        this.lines = data;

        // For the form dropdown (only active lines)
        this.lineOptions = data
          .filter(l => l.active)
          .map(l => ({ label: `${l.code} — ${l.name}`, value: l.id }));

        // For the filter dropdown (all lines)
        this.lineFilterOptions = [
          { label: 'Toutes les lignes', value: null },
          ...data.map(l => ({ label: `${l.code} — ${l.name}`, value: l.id }))
        ];
      }
    });
  }

  // ─── Filtered Data ───

  get filteredZones(): ValidationZone[] {
    if (!this.selectedLineFilter) return this.zones;
    return this.zones.filter(z => z.productionLineId === this.selectedLineFilter);
  }

  // ─── Dialog ───

  openNew(): void {
    this.form = {
      name: '',
      description: '',
      productionLineId: 0
    };
    this.isEdit = false;
    this.selectedZone = null;
    this.zoneDialog = true;
  }

  editZone(zone: ValidationZone): void {
    this.form = {
      name: zone.name,
      description: zone.description || '',
      productionLineId: zone.productionLineId
    };
    this.isEdit = true;
    this.selectedZone = zone;
    this.zoneDialog = true;
  }

  saveZone(): void {
    if (!this.form.name || !this.form.productionLineId) return;

    if (this.isEdit && this.selectedZone) {
      this.zoneService.update(this.selectedZone.id, this.form).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: `Zone "${this.form.name}" modifiée`
          });
          this.loadZones();
          this.zoneDialog = false;
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err?.error?.message || 'Échec de la modification'
          });
        }
      });
    } else {
      this.zoneService.create(this.form).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: `Zone "${this.form.name}" créée`
          });
          this.loadZones();
          this.zoneDialog = false;
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err?.error?.message || 'Échec de la création'
          });
        }
      });
    }
  }

  // ─── Delete ───

  deleteZone(zone: ValidationZone): void {
    this.confirmService.confirm({
      message: `Supprimer la zone "${zone.name}" ? Les validations associées seront affectées.`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.zoneService.delete(zone.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: `Zone "${zone.name}" supprimée`
            });
            this.loadZones();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: err?.error?.message || 'Impossible de supprimer cette zone'
            });
          }
        });
      }
    });
  }

  // ─── Helpers ───

  getLineCode(lineId: number): string {
    const line = this.lines.find(l => l.id === lineId);
    return line ? line.code : '—';
  }

  getLineName(lineId: number): string {
    const line = this.lines.find(l => l.id === lineId);
    return line ? line.name : '—';
  }

  getLineLabel(lineId: number): string {
    const line = this.lines.find(l => l.id === lineId);
    return line ? `${line.code} — ${line.name}` : '—';
  }

  isLineActive(lineId: number): boolean {
    const line = this.lines.find(l => l.id === lineId);
    return line ? line.active : false;
  }

  getZonesPerLine(lineId: number): number {
    return this.zones.filter(z => z.productionLineId === lineId).length;
  }

  get uniqueLineCount(): number {
    const lineIds = new Set(this.zones.map(z => z.productionLineId));
    return lineIds.size;
  }
}