import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProductionLineService } from '../../../../services/production-line.service';
import { UserService } from '../../../../services/user.service';
import { ValidationZoneService } from '../../../../services/validation-zone.service';
import { ProductionLine, ProductionLineRequest } from '../../../../models/production-line.model';
import { KeycloakService } from 'keycloak-angular';
@Component({
  selector: 'app-line-list',
  templateUrl: './line-list.component.html',
  styleUrls: ['./line-list.component.scss']
})
export class LineListComponent implements OnInit {

  lines: ProductionLine[] = [];
  loading = true;

  // Dialog
  lineDialog = false;
  isEdit = false;
  selectedLine: ProductionLine | null = null;

  // Form
  form: ProductionLineRequest = {
    code: '',
    name: '',
    active: true
  };

  // Stats
  zoneCountMap: Record<number, number> = {};
  userCountMap: Record<number, number> = {};
  canCreate = false;
  canDelete = false;

  constructor(
    private lineService: ProductionLineService,
    private zoneService: ValidationZoneService,
    private userService: UserService,
    private messageService: MessageService,
    private keycloak: KeycloakService,
    private confirmService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.loadLines();
    const roles = this.keycloak.getUserRoles();
    this.canCreate = ['ADMIN_IT', 'CHEF_SECTEUR'].some(r => roles.includes(r));
    this.canDelete = roles.includes('ADMIN_IT');
  }

  loadLines(): void {
    this.loading = true;
    this.lineService.getAll().subscribe({
      next: (data) => {
        this.lines = data;
        this.loading = false;
        this.loadRelatedCounts();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les lignes de production'
        });
        this.loading = false;
      }
    });
  }

  loadRelatedCounts(): void {
    // Load zone counts and user counts per line
    this.lines.forEach(line => {
      this.zoneService.getByLine(line.id).subscribe({
        next: (zones) => this.zoneCountMap[line.id] = zones.length
      });
      this.userService.getByLine(line.id).subscribe({
        next: (users) => this.userCountMap[line.id] = users.length
      });
    });
  }

  // ─── Dialog ───

  openNew(): void {
    this.form = { code: '', name: '', active: true };
    this.isEdit = false;
    this.selectedLine = null;
    this.lineDialog = true;
  }

  editLine(line: ProductionLine): void {
    this.form = {
      code: line.code,
      name: line.name,
      active: line.active
    };
    this.isEdit = true;
    this.selectedLine = line;
    this.lineDialog = true;
  }

  saveLine(): void {
    if (!this.form.code || !this.form.name) return;

    // Force uppercase code
    this.form.code = this.form.code.toUpperCase();

    if (this.isEdit && this.selectedLine) {
      this.lineService.update(this.selectedLine.id, this.form).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: `Ligne "${this.form.code}" modifiée`
          });
          this.loadLines();
          this.lineDialog = false;
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
      this.lineService.create(this.form).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: `Ligne "${this.form.code}" créée`
          });
          this.loadLines();
          this.lineDialog = false;
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

  deleteLine(line: ProductionLine): void {
    this.confirmService.confirm({
      message: `Supprimer la ligne "${line.code} — ${line.name}" ? Toutes les zones et validations associées seront affectées.`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.lineService.delete(line.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: `Ligne "${line.code}" supprimée`
            });
            this.loadLines();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: err?.error?.message || 'Impossible de supprimer cette ligne'
            });
          }
        });
      }
    });
  }

  // ─── Toggle Active/Inactive ───

  toggleActive(line: ProductionLine): void {
    const action$ = line.active
      ? this.lineService.deactivate(line.id)
      : this.lineService.activate(line.id);

    action$.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: `Ligne "${line.code}" ${line.active ? 'désactivée' : 'activée'}`
        });
        this.loadLines();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de changer le statut'
        });
      }
    });
  }

  // ─── Helpers ───

  getZoneCount(lineId: number): number {
    return this.zoneCountMap[lineId] ?? 0;
  }

  getUserCount(lineId: number): number {
    return this.userCountMap[lineId] ?? 0;
  }

  get activeCount(): number {
    return this.lines.filter(l => l.active).length;
  }

  get inactiveCount(): number {
    return this.lines.filter(l => !l.active).length;
  }

  get totalZones(): number {
    return Object.values(this.zoneCountMap).reduce((sum, c) => sum + c, 0);
  }
}