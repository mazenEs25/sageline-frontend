import { Component, OnInit, OnDestroy } from '@angular/core';
import { HandoverService } from '../../../services/handover.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../auth/auth.service';
import { WebSocketService } from '../../../services/websocket.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { HandoverResponse } from '../../../models/handover.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-handover-queue-panel',
  templateUrl: './handover-queue-panel.component.html',
  styleUrls: ['./handover-queue-panel.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class HandoverQueuePanelComponent implements OnInit, OnDestroy {
  handovers: HandoverResponse[] = [];
  techVals: User[] = [];
  selectedTechId: { [key: number]: number } = {};
  loading = true;
  refreshing = false;

  activeHandoverId: number | null = null;
  techSearch = '';

  private secteurId = 0;

  constructor(
    private handoverService: HandoverService,
    private userService: UserService,
    private authService: AuthService,
    private wsService: WebSocketService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.loadHandovers();
    this.loadTechVals();

    this.secteurId = this.authService.getCurrentUserSecteurId();
    if (this.secteurId > 0) {
      this.wsService.subscribe('/topic/handover.secteur.' + this.secteurId, () => {
        this.loadHandovers(true);
      });
    } else {
      console.warn('[HandoverQueuePanel] secteurId unavailable — live updates disabled. ' +
        'Verify /api/users/me returns secteurId (the current user must be linked to a secteur).');
    }
  }

  ngOnDestroy(): void {
    if (this.secteurId > 0) {
      this.wsService.unsubscribe('/topic/handover.secteur.' + this.secteurId);
    }
  }

  loadHandovers(isRefresh = false): void {
    if (isRefresh) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }
    this.handoverService.getPendingHandovers().subscribe({
      next: (handovers) => {
        this.handovers = handovers;
        this.loading = false;
        this.refreshing = false;
      },
      error: (error) => {
        this.loading = false;
        this.refreshing = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Erreur lors du chargement des passations.'
        });
      }
    });
  }

  loadTechVals(): void {
    this.userService.getAll().subscribe({
      next: (users) => {
        this.techVals = users.filter(u => u.role === 'TECH_VAL');
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du chargement des techniciens.'
        });
      }
    });
  }

  // ─── Tech picker overlay ──────────────────────────────────────────

  openTechPanel(event: Event, handoverId: number, op: any): void {
    this.activeHandoverId = handoverId;
    this.techSearch = '';
    op.toggle(event);
  }

  selectTech(userId: number, op: any): void {
    if (this.activeHandoverId !== null) {
      this.selectedTechId[this.activeHandoverId] = userId;
    }
    op.hide();
  }

  filteredTechs(): User[] {
    const q = this.techSearch.trim().toLowerCase();
    if (!q) return this.techVals;
    return this.techVals.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.firstName || '').toLowerCase().includes(q) ||
      (u.lastName || '').toLowerCase().includes(q));
  }

  getTech(id: number): User {
    return this.techVals.find(u => u.id === id) ?? { id: 0, username: '?', role: 'TECH_VAL' } as User;
  }

  userInitials(u: User): string {
    const first = (u.firstName || u.username || '?').charAt(0);
    const second = (u.lastName || u.username?.charAt(1) || '').charAt(0);
    return (first + second).toUpperCase();
  }

  userDisplay(u: User): string {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name || u.username;
  }

  avatarTone(u: User): string {
    return `tone-${(u.id ?? 0) % 8}`;
  }

  // ─── Actions ─────────────────────────────────────────────────────

  assign(handoverId: number): void {
    const techId = this.selectedTechId[handoverId];
    if (!techId) return;

    this.handoverService.assignHandover(handoverId, techId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Technicien assigné avec succès.'
        });
        this.loadHandovers();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Erreur lors de l\'assignation.'
        });
      }
    });
  }

  confirmCancel(handoverId: number): void {
    this.confirmationService.confirm({
      message: 'Annuler cette passation?',
      accept: () => this.cancel(handoverId)
    });
  }

  cancel(handoverId: number): void {
    this.handoverService.cancelHandover(handoverId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Passation annulée.'
        });
        this.loadHandovers();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Erreur lors de l\'annulation.'
        });
      }
    });
  }
}
