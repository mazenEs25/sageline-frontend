import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HandoverService } from '../../../services/handover.service';
import { MessageService } from 'primeng/api';
import { HandoverStatus } from '../../../shared/enums/handover-status.enum';
import { HandoverResponse } from '../../../models/handover.model';

@Component({
  selector: 'app-handover-accept-panel',
  templateUrl: './handover-accept-panel.component.html',
  styleUrls: ['./handover-accept-panel.component.scss'],
  providers: [MessageService]
})
export class HandoverAcceptPanelComponent implements OnInit {
  handover: HandoverResponse | null = null;
  loading = true;
  accepting = false;
  ticketId!: number;
  HandoverStatus = HandoverStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private handoverService: HandoverService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.ticketId = parseInt(this.route.snapshot.params['id'], 10);
    this.loadHandover();
  }

  private loadHandover(): void {
    this.loading = true;
    this.handoverService.getHandoverHistory(this.ticketId).subscribe({
      next: (handovers) => {
        const pending = handovers.find(h => h.status === HandoverStatus.PENDING);
        this.handover = pending || null;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Erreur lors du chargement de la passation.'
        });
      }
    });
  }

  accept(): void {
    if (!this.handover) return;

    this.accepting = true;
    this.handoverService.acceptHandover(this.handover.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Passation acceptée avec succès.'
        });
        this.router.navigate(['/validations', this.ticketId]);
      },
      error: (error) => {
        this.accepting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Erreur lors de l\'acceptation de la passation.'
        });
      }
    });
  }
}
