import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HandoverService } from '../../../services/handover.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../auth/auth.service';
import { MessageService } from 'primeng/api';
import { HandoverResponse } from '../../../models/handover.model';
import { HandoverStatus } from '../../../shared/enums/handover-status.enum';
import { Validation } from '../../../models/validation.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-handover-banner',
  templateUrl: './handover-banner.component.html',
  styleUrls: ['./handover-banner.component.scss'],
  providers: [MessageService]
})
export class HandoverBannerComponent implements OnInit {
  @Input() ticket!: Validation;
  @Output() actionCompleted = new EventEmitter<void>();

  pendingHandover: HandoverResponse | null = null;
  techVals: User[] = [];
  selectedTechId: number | null = null;
  assigning = false;

  constructor(
    private handoverService: HandoverService,
    private userService: UserService,
    public authService: AuthService,
    private messageService: MessageService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadPendingHandover();

    if (this.authService.getRoles().includes('CHEF_SECTEUR') || this.authService.getRoles().includes('ADMIN_IT')) {
      this.userService.getByRole('TECH_VAL').subscribe({
        next: (users) => {
          this.techVals = users;
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
  }

  loadPendingHandover(): void {
    this.handoverService.getHandoverHistory(this.ticket.id).subscribe({
      next: (handovers) => {
        this.pendingHandover = handovers.find(h => h.status === HandoverStatus.PENDING) || null;
      },
      error: () => {
        // Silent error - the banner just won't show if loading fails
      }
    });
  }

  accept(): void {
    this.router.navigate(['/validations', this.ticket.id, 'handover']);
  }

  assign(): void {
    if (!this.selectedTechId || !this.pendingHandover) return;

    this.assigning = true;
    this.handoverService.assignHandover(this.pendingHandover.id, this.selectedTechId).subscribe({
      next: () => {
        this.assigning = false;
        this.selectedTechId = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Technicien assigné avec succès.'
        });
        this.actionCompleted.emit();
        this.loadPendingHandover();
      },
      error: (error) => {
        this.assigning = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Erreur lors de l\'assignation.'
        });
      }
    });
  }
}
