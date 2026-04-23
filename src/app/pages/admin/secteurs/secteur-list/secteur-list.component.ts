import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Secteur, SecteurRequest } from '../../../../models/secteur.model';
import { SecteurService } from '../../../../services/secteur.service';

@Component({
  selector: 'app-secteur-list',
  templateUrl: './secteur-list.component.html',
  styleUrls: ['./secteur-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class SecteurListComponent implements OnInit {
  secteurs: Secteur[] = [];
  loading = true;
  displayDialog = false;
  isEdit = false;
  selectedSecteur: Secteur | null = null;

  // Filters
  statusFilter: boolean | null = null;
  statusOptions = [
    { label: 'Actifs', value: true },
    { label: 'Inactifs', value: false }
  ];

  form: SecteurRequest = { code: '', name: '', description: '', active: true };

  constructor(
    private secteurService: SecteurService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() { this.loadSecteurs(); }

  loadSecteurs() {
    this.loading = true;
    this.secteurService.getAll().subscribe({
      next: (data) => { this.secteurs = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openNew() {
    this.form = { code: '', name: '', description: '', active: true };
    this.isEdit = false;
    this.displayDialog = true;
  }

  editSecteur(secteur: Secteur) {
    this.form = { code: secteur.code, name: secteur.name, description: secteur.description, active: secteur.active };
    this.selectedSecteur = secteur;
    this.isEdit = true;
    this.displayDialog = true;
  }

  save() {
    if (this.isEdit && this.selectedSecteur) {
      this.secteurService.update(this.selectedSecteur.id, this.form).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Secteur modifié' });
          this.displayDialog = false;
          this.loadSecteurs();
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur' })
      });
    } else {
      this.secteurService.create(this.form).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Secteur créé' });
          this.displayDialog = false;
          this.loadSecteurs();
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur' })
      });
    }
  }

  deleteSecteur(secteur: Secteur) {
    this.confirmationService.confirm({
      message: `Supprimer le secteur ${secteur.code} ?`,
      accept: () => {
        this.secteurService.delete(secteur.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: 'Secteur supprimé' });
            this.loadSecteurs();
          }
        });
      }
    });
  }
}