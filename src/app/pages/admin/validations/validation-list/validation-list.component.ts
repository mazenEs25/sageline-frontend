import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProductionLine } from '../../../../models/production-line.model';
import { ValidationZone } from '../../../../models/validation-zone.model';
import { Validation } from '../../../../models/validation.model';
import { ProductionLineService } from '../../../../services/production-line.service';
import { ValidationZoneService } from '../../../../services/validation-zone.service';
import { ValidationService } from '../../../../services/validation.service';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-validation-list',
  templateUrl: './validation-list.component.html',
  styleUrls: ['./validation-list.component.scss']
})
export class ValidationListComponent implements OnInit {

  validations: Validation[] = [];
  lines: ProductionLine[] = [];
  zones: ValidationZone[] = [];
  loading = true;

  // Filters
  selectedStatus: string | null = null;
  selectedLineId: number | null = null;

  statusOptions = [
    { label: 'Tous les statuts', value: null },
    { label: 'En cours', value: 'EN_COURS' },
    { label: 'Conforme', value: 'CONFORME' },
    { label: 'Non conforme', value: 'NON_CONFORME' }
  ];

  lineFilterOptions: any[] = [];
  canCreate = false;
  canDelete = false;

  constructor(
    private validationService: ValidationService,
    private lineService: ProductionLineService,
    private zoneService: ValidationZoneService,
    private messageService: MessageService,
    private confirmService: ConfirmationService,
    private keycloak: KeycloakService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadValidations();
    this.loadLines();
    this.loadZones();
    const roles = this.keycloak.getUserRoles();
    this.canCreate = ['ADMIN_IT', 'CHEF_SECTEUR', 'TECH_VALIDATION'].some(r => roles.includes(r));
    this.canDelete = ['ADMIN_IT', 'CHEF_SECTEUR'].some(r => roles.includes(r));
  }

  loadValidations(): void {
    this.loading = true;
    // Role-based scoping: TECH_VAL / TECH_PREP only see tickets they're assigned to.
    // ADMIN_IT / CHEF_SECTEUR / EXPERT see everything.
    const roles = this.keycloak.getUserRoles();
    const restrictedRole = !roles.includes('ADMIN_IT')
      && !roles.includes('CHEF_SECTEUR')
      && !roles.includes('EXPERT')
      && (roles.includes('TECH_VAL') || roles.includes('TECH_PREP'));

    const stream$ = restrictedRole
      ? this.validationService.getMyTickets()
      : this.validationService.getAll();

    stream$.subscribe({
      next: (data) => {
        this.validations = data.sort(
          (a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime()
        );
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les validations'
        });
        this.loading = false;
      }
    });
  }

  loadLines(): void {
    this.lineService.getAll().subscribe({
      next: (data) => {
        this.lines = data;
        this.lineFilterOptions = [
          { label: 'Toutes les lignes', value: null },
          ...data.map(l => ({ label: `${l.code} — ${l.name}`, value: l.id }))
        ];
      }
    });
  }

  loadZones(): void {
    this.zoneService.getAll().subscribe({
      next: (data) => this.zones = data
    });
  }

  // ─── Filtered Data ───

  get filteredValidations(): Validation[] {
    let result = this.validations;

    if (this.selectedStatus) {
      result = result.filter(v => v.status === this.selectedStatus);
    }

    if (this.selectedLineId) {
      // Get zone IDs for this line
      const zoneIds = this.zones
        .filter(z => z.productionLineId === this.selectedLineId)
        .map(z => z.id);
      result = result.filter(v => zoneIds.includes(v.validationZoneId));
    }

    return result;
  }

  clearFilters(): void {
    this.selectedStatus = null;
    this.selectedLineId = null;
  }

  get hasActiveFilters(): boolean {
    return this.selectedStatus !== null || this.selectedLineId !== null;
  }

  // ─── Navigation ───

  navigateToCreate(): void {
    this.router.navigate(['/validations/create']);
  }

  viewDetail(validation: Validation): void {
    this.router.navigate(['/validations', validation.id]);
  }

  // ─── Delete ───

  deleteValidation(validation: Validation): void {
    this.confirmService.confirm({
      message: `Supprimer la validation #${validation.id} ? Cette action est irréversible.`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.validationService.delete(validation.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: `Validation #${validation.id} supprimée`
            });
            this.loadValidations();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Impossible de supprimer cette validation'
            });
          }
        });
      }
    });
  }

  // ─── Helpers ───

  getZoneName(zoneId: number): string {
    const zone = this.zones.find(z => z.id === zoneId);
    return zone ? zone.name : '—';
  }

  getLineName(zoneId: number): string {
    const zone = this.zones.find(z => z.id === zoneId);
    if (!zone) return '—';
    const line = this.lines.find(l => l.id === zone.productionLineId);
    return line ? line.code : '—';
  }

  getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    switch (status) {
      case 'EN_COURS': return 'warning';
      case 'CONFORME': return 'success';
      case 'NON_CONFORME': return 'danger';
      default: return 'info';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'EN_COURS': return 'En cours';
      case 'CONFORME': return 'Conforme';
      case 'NON_CONFORME': return 'Non conforme';
      default: return status;
    }
  }

  getRiskSeverity(level?: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    switch (level) {
      case 'BAS': return 'success';
      case 'MOYEN': return 'warning';
      case 'RISQUE': return 'warning';
      case 'CRITIQUE': return 'danger';
      default: return 'info';
    }
  }

  getRiskIcon(level?: string): string {
    switch (level) {
      case 'BAS': return 'pi pi-check-circle';
      case 'MOYEN': return 'pi pi-info-circle';
      case 'RISQUE': return 'pi pi-exclamation-triangle';
      case 'CRITIQUE': return 'pi pi-times-circle';
      default: return 'pi pi-minus';
    }
  }

  // Stats
  get activeCount(): number {
    return this.validations.filter(v => v.status === 'EN_COURS').length;
  }

  get conformCount(): number {
    return this.validations.filter(v => v.status === 'CONFORME').length;
  }

  get nonConformCount(): number {
    return this.validations.filter(v => v.status === 'NON_CONFORME').length;
  }

  get criticalCount(): number {
    return this.validations.filter(v => v.riskLevel === 'CRITIQUE' || v.riskLevel === 'RISQUE').length;
  }
}