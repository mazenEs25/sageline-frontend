import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '../../../auth/auth.service';
import { Validation } from '../../../models/validation.model';
import { TicketService } from '../../../services/ticket.service';


@Component({
  selector: 'app-ticket-detail',
  templateUrl: './ticket-detail.component.html',
  providers: [MessageService, ConfirmationService]
})
export class TicketDetailComponent implements OnInit {
  ticket: Validation | null = null;
  loading = true;
  ticketId!: number;

  // Prep dialog
  showPrepDialog = false;
  toolsAvailable = true;
  prepComments = '';

  // Close dialog
  showCloseDialog = false;
  finalStatus = 'CONFORME';
  reviewComments = '';

  // Cancel dialog
  showCancelDialog = false;
  cancelReason = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.ticketId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTicket();
  }

  loadTicket() {
    this.loading = true;
    this.ticketService.getById(this.ticketId).subscribe({
      next: (data) => { this.ticket = data; this.loading = false; },
      error: () => { this.loading = false; this.router.navigate(['/validations']); }
    });
  }

  // ===== WORKFLOW ACTIONS =====

  startPrep() {
    this.ticketService.startPrep(this.ticketId).subscribe({
      next: () => { this.success('Préparation démarrée'); this.loadTicket(); },
      error: (err) => this.error(err)
    });
  }

  submitPrepValidation() {
    this.ticketService.validatePrep(this.ticketId, {
      toolsAvailable: this.toolsAvailable,
      prepComments: this.prepComments
    }).subscribe({
      next: () => {
        this.success(this.toolsAvailable ? 'Outillage validé' : 'Outillage non disponible signalé');
        this.showPrepDialog = false;
        this.loadTicket();
      },
      error: (err) => this.error(err)
    });
  }

  startValidation() {
    this.ticketService.startValidation(this.ticketId).subscribe({
      next: () => { this.success('Validation démarrée'); this.loadTicket(); },
      error: (err) => this.error(err)
    });
  }

  submitForReview() {
    this.confirmationService.confirm({
      message: 'Soumettre ce ticket pour revue ? Cette action est irréversible.',
      accept: () => {
        this.ticketService.submitForReview(this.ticketId).subscribe({
          next: () => { this.success('Soumis pour revue'); this.loadTicket(); },
          error: (err) => this.error(err)
        });
      }
    });
  }

  closeTicket() {
    this.ticketService.closeTicket(this.ticketId, {
      finalStatus: this.finalStatus,
      reviewComments: this.reviewComments
    }).subscribe({
      next: () => {
        this.success(`Ticket clôturé: ${this.finalStatus}`);
        this.showCloseDialog = false;
        this.loadTicket();
      },
      error: (err) => this.error(err)
    });
  }

  cancelTicket() {
    this.ticketService.cancelTicket(this.ticketId, this.cancelReason).subscribe({
      next: () => {
        this.success('Ticket annulé');
        this.showCancelDialog = false;
        this.loadTicket();
      },
      error: (err) => this.error(err)
    });
  }

  // ===== UI HELPERS =====

  canStartPrep(): boolean { return this.ticket?.status === 'PLANIFIE'; }
  canValidatePrep(): boolean { return this.ticket?.status === 'EN_ATTENTE_PREP'; }
  canStartValidation(): boolean { return this.ticket?.status === 'PREP_VALIDEE'; }
  canSubmitReview(): boolean { return this.ticket?.status === 'EN_COURS'; }
  canClose(): boolean { return this.ticket?.status === 'EN_REVUE'; }
  canCancel(): boolean { return !['CONFORME', 'NON_CONFORME', 'ANNULE'].includes(this.ticket?.status || ''); }

  private success(msg: string) {
    this.messageService.add({ severity: 'success', summary: 'Succès', detail: msg });
  }
  private error(err: any) {
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur' });
  }
}