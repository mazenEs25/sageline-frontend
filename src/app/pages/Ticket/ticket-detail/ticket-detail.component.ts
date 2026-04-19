import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '../../../auth/auth.service';
import { Validation } from '../../../models/validation.model';
import { TicketService } from '../../../services/ticket.service';
import { ValidationResultService } from '../../../services/validation-result.service';
import { WebSocketService } from '../../../services/websocket.service';


@Component({
  selector: 'app-ticket-detail',
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class TicketDetailComponent implements OnInit, OnDestroy {
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

  // Add Result dialog
  showResultDialog = false;
  savingResult = false;
  newResult = {
    parameter: '',
    measuredValue: null as number | null,
    expectedValue: null as number | null
  };

  private wsTopic: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private resultService: ValidationResultService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public authService: AuthService,
    private wsService: WebSocketService
  ) {}

  ngOnInit() {
    this.ticketId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTicket();
    this.subscribeToTicketUpdates();
  }

  ngOnDestroy() {
    if (this.wsTopic) {
      this.wsService.unsubscribe(this.wsTopic);
      this.wsTopic = null;
    }
  }

  /**
   * Subscribe to real-time updates for THIS specific ticket.
   * Any workflow transition (startPrep, validatePrep, startValidation, …)
   * broadcasts the refreshed ticket DTO to /topic/tickets.{id} on the backend,
   * so we can update the view without a manual reload.
   */
  private subscribeToTicketUpdates(): void {
    this.wsTopic = `/topic/tickets.${this.ticketId}`;
    this.wsService.subscribe(this.wsTopic, (msg: any) => {
      if (msg && msg.id === this.ticketId) {
        this.ticket = msg as Validation;
      } else {
        // Fallback: re-fetch if payload shape is unexpected
        this.loadTicket();
      }
    });
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

  /** Only TECH_VAL and CHEF_SECTEUR can add results, and only while the ticket is EN_COURS */
  canAddResult(): boolean {
    if (this.ticket?.status !== 'EN_COURS') return false;
    const roles = this.authService.getRoles();
    return roles.includes('TECH_VAL') || roles.includes('CHEF_SECTEUR') || roles.includes('ADMIN_IT');
  }

  openResultDialog(): void {
    this.newResult = { parameter: '', measuredValue: null, expectedValue: null };
    this.showResultDialog = true;
  }

  saveResult(): void {
    if (!this.newResult.parameter.trim() ||
        this.newResult.measuredValue === null ||
        this.newResult.expectedValue === null) {
      this.messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Tous les champs sont obligatoires' });
      return;
    }

    this.savingResult = true;
    this.resultService.create({
      validationId: this.ticketId,
      parameter: this.newResult.parameter.trim(),
      measuredValue: this.newResult.measuredValue,
      expectedValue: this.newResult.expectedValue
    } as any).subscribe({
      next: (result) => {
        const label = result.conform ? '✓ Conforme' : '✗ Non conforme';
        this.messageService.add({
          severity: result.conform ? 'success' : 'warn',
          summary: 'Résultat enregistré',
          detail: `${result.parameter} — ${label}`
        });
        this.showResultDialog = false;
        this.savingResult = false;
        this.loadTicket(); // refresh counts
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Erreur',
          detail: err?.error?.message || 'Impossible d\'enregistrer le résultat' });
        this.savingResult = false;
      }
    });
  }

  /** Live preview: is the measure conformant (measured ≤ expected)? */
  get resultIsConform(): boolean | null {
    if (this.newResult.measuredValue === null || this.newResult.expectedValue === null) return null;
    return this.newResult.measuredValue <= this.newResult.expectedValue;
  }

  private success(msg: string) {
    this.messageService.add({ severity: 'success', summary: 'Succès', detail: msg });
  }
  private error(err: any) {
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur' });
  }
}