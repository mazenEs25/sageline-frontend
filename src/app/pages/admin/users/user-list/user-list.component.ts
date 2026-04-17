import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { UserService } from '../../../../services/user.service';
import { SecteurService } from '../../../../services/secteur.service';
import { User, UserRequest } from '../../../../models/user.model';
import { Secteur } from '../../../../models/secteur.model';
import { Role, ROLE_LABELS, ROLE_COLORS } from '../../../../shared/enums/role.enum';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {

  users: User[] = [];
  secteurs: Secteur[] = [];
  loading = true;

  // Dialog
  userDialog = false;
  isEdit = false;
  selectedUser: User | null = null;

  showPassword = false;

  // Form
  form: UserRequest = {
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: Role.TECH_VAL,
    secteurId: undefined,
    password: ''
  };

  // Dropdown options
  roles = Object.values(Role).map(r => ({
    label: ROLE_LABELS[r],
    value: r
  }));

  constructor(
    private userService: UserService,
    private secteurService: SecteurService,
    private messageService: MessageService,
    private confirmService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.secteurService.getActive().subscribe(data => this.secteurs = data);
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getAll().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les utilisateurs'
        });
        this.loading = false;
      }
    });
  }

  // ─── Dialog ───

  openNew(): void {
    this.form = {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      role: Role.TECH_VAL,
      secteurId: undefined,
      password: ''
    };
    this.isEdit = false;
    this.selectedUser = null;
    this.showPassword = false;
    this.userDialog = true;
  }

  editUser(user: User): void {
    this.form = {
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      secteurId: user.secteurId,
      password: ''
    };
    this.isEdit = true;
    this.selectedUser = user;
    this.showPassword = false;
    this.userDialog = true;
  }

  saveUser(): void {
    if (!this.form.username || !this.form.email) return;

    if (this.isEdit && this.selectedUser) {
      this.userService.update(this.selectedUser.id, this.form).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: `Utilisateur "${this.form.username}" modifié`
          });
          this.loadUsers();
          this.userDialog = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Échec de la modification'
          });
        }
      });
    } else {
      this.userService.create(this.form).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: `Utilisateur "${this.form.username}" créé`
          });
          this.loadUsers();
          this.userDialog = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Échec de la création'
          });
        }
      });
    }
  }

  // ─── Delete ───

  deleteUser(user: User): void {
    this.confirmService.confirm({
      message: `Supprimer l'utilisateur "${user.username}" ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.userService.delete(user.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: `"${user.username}" supprimé`
            });
            this.loadUsers();
          }
        });
      }
    });
  }

  // ─── Helpers ───

  getRoleLabel(role: Role): string {
    return ROLE_LABELS[role] || role;
  }

  getRoleSeverity(role: Role): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    return (ROLE_COLORS[role] as any) || 'info';
  }
}
