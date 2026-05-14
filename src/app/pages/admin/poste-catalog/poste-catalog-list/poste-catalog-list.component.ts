import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PosteCatalogService } from '../../../../services/poste-catalog.service';
import { AuthService } from '../../../../auth/auth.service';
import { PosteMeasureCatalog } from '../../../../models/poste-measure-catalog.model';
import { PosteType, POSTE_TYPE_VALUES } from '../../../../shared/enums/ticket.enum';
import { MEASURE_CATEGORY_LABELS, MEASURE_CATEGORY_COLORS, MEASURE_CATEGORY_ICONS } from '../../../../shared/enums/measure-category.enum';

@Component({
  selector: 'app-poste-catalog-list',
  templateUrl: './poste-catalog-list.component.html',
  styleUrl: './poste-catalog-list.component.scss',
  providers: [MessageService, ConfirmationService],
  standalone: false
})
export class PosteCatalogListComponent implements OnInit {
  entries: PosteMeasureCatalog[] = [];
  loading = true;
  selectedPosteType: PosteType = 'TEST_FONCTIONNEL';
  includeInactive = false;
  posteTypeOptions = POSTE_TYPE_VALUES.map(v => ({ label: v, value: v }));

  dialogVisible = false;
  bulkVisible = false;
  selectedEntry: PosteMeasureCatalog | null = null;

  readonly MEASURE_CATEGORY_LABELS = MEASURE_CATEGORY_LABELS;
  readonly MEASURE_CATEGORY_COLORS = MEASURE_CATEGORY_COLORS;
  readonly MEASURE_CATEGORY_ICONS = MEASURE_CATEGORY_ICONS;

  constructor(
    private service: PosteCatalogService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.loadEntries();
  }

  loadEntries() {
    this.loading = true;
    this.service.getMeasuresByPosteType(this.selectedPosteType, this.includeInactive).subscribe({
      next: (data) => {
        this.entries = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error', summary: 'Erreur', detail: 'Impossible de charger le catalogue'
        });
      }
    });
  }

  onPosteTypeChange() {
    this.loadEntries();
  }

  onIncludeInactiveChange() {
    this.loadEntries();
  }

  openCreate() {
    this.selectedEntry = null;
    this.dialogVisible = true;
  }

  openEdit(row: PosteMeasureCatalog) {
    this.selectedEntry = row;
    this.dialogVisible = true;
  }

  confirmDelete(row: PosteMeasureCatalog) {
    this.confirmationService.confirm({
      header: 'Supprimer la mesure',
      message: `Confirmer la désactivation de la mesure « ${row.measureCode} » ? Les tickets existants conservent leur référence.`,
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptIcon: 'pi pi-trash',
      accept: () => {
        this.service.delete(row.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success', summary: 'Succès', detail: 'Mesure supprimée'
            });
            this.loadEntries();
          },
          error: () => {
            this.messageService.add({
              severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer la mesure'
            });
          }
        });
      }
    });
  }

  openBulk() {
    this.bulkVisible = true;
  }

  get canMutate(): boolean {
    const roles = this.auth.getRoles?.() ?? [];
    return roles.includes('ADMIN_IT') || roles.includes('CHEF_SECTEUR');
  }

  categoryLabel(row: PosteMeasureCatalog): string {
    return MEASURE_CATEGORY_LABELS[row.category];
  }

  categoryColor(row: PosteMeasureCatalog): any {
    return MEASURE_CATEGORY_COLORS[row.category];
  }
}
