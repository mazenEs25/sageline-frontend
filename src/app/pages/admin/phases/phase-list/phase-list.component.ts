import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Phase, PhaseRequest } from '../../../../models/phase.model';
import { Secteur } from '../../../../models/secteur.model';
import { PhaseService } from '../../../../services/phase.service';
import { SecteurService } from '../../../../services/secteur.service';

@Component({
  selector: 'app-phase-list',
  templateUrl: './phase-list.component.html',
  styleUrl: './phase-list.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class PhaseListComponent implements OnInit {
  phases: Phase[] = [];
  filteredPhases: Phase[] = [];
  secteurs: Secteur[] = [];
  loading = true;
  displayDialog = false;
  isEdit = false;
  selectedPhase: Phase | null = null;

  // Secteur filter
  selectedSecteurFilter: number | null = null;

  form: PhaseRequest = { code: '', name: '', secteurId: 0, orderIndex: 1, active: true };

  constructor(
    private phaseService: PhaseService,
    private secteurService: SecteurService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadSecteurs();
    this.loadPhases();
  }

  loadSecteurs() {
    this.secteurService.getActive().subscribe({
      next: (data) => this.secteurs = data,
      error: () => this.messageService.add({
        severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les secteurs'
      })
    });
  }

  loadPhases() {
    this.loading = true;
    this.phaseService.getAll().subscribe({
      next: (data) => {
        this.phases = data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() {
    if (this.selectedSecteurFilter) {
      this.filteredPhases = this.phases.filter(p => p.secteurId === this.selectedSecteurFilter);
    } else {
      this.filteredPhases = [...this.phases];
    }
  }

  clearFilter() {
    this.selectedSecteurFilter = null;
    this.applyFilter();
  }

  openNew() {
    this.form = {
      code: '',
      name: '',
      secteurId: this.selectedSecteurFilter || (this.secteurs[0]?.id || 0),
      orderIndex: (this.phases.length ? Math.max(...this.phases.map(p => p.orderIndex)) + 1 : 1),
      active: true
    };
    this.isEdit = false;
    this.selectedPhase = null;
    this.displayDialog = true;
  }

  editPhase(phase: Phase) {
    this.form = {
      code: phase.code,
      name: phase.name,
      secteurId: phase.secteurId,
      orderIndex: phase.orderIndex,
      active: phase.active
    };
    this.selectedPhase = phase;
    this.isEdit = true;
    this.displayDialog = true;
  }

  save() {
    if (!this.form.code || !this.form.name || !this.form.secteurId) {
      this.messageService.add({
        severity: 'warn', summary: 'Champs requis',
        detail: 'Code, nom et secteur sont obligatoires'
      });
      return;
    }

    // Force uppercase code
    this.form.code = this.form.code.toUpperCase();

    if (this.isEdit && this.selectedPhase) {
      this.phaseService.update(this.selectedPhase.id, this.form).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Phase modifiée' });
          this.displayDialog = false;
          this.loadPhases();
        },
        error: (err) => this.messageService.add({
          severity: 'error', summary: 'Erreur',
          detail: err.error?.message || 'Erreur lors de la modification'
        })
      });
    } else {
      this.phaseService.create(this.form).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Phase créée' });
          this.displayDialog = false;
          this.loadPhases();
        },
        error: (err) => this.messageService.add({
          severity: 'error', summary: 'Erreur',
          detail: err.error?.message || 'Erreur lors de la création'
        })
      });
    }
  }

  deletePhase(phase: Phase) {
    this.confirmationService.confirm({
      message: `Supprimer la phase ${phase.code} ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.phaseService.delete(phase.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: 'Phase supprimée' });
            this.loadPhases();
          },
          error: (err) => this.messageService.add({
            severity: 'error', summary: 'Erreur',
            detail: err.error?.message || 'Impossible de supprimer'
          })
        });
      }
    });
  }
}
